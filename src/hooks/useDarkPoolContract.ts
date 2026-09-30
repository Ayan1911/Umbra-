import { useState, useEffect, useCallback } from "react";
import { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import {
  initDarkPoolProviders,
  commitOrderToDarkPool,
  settleOrderInDarkPool,
  cancelOrderInDarkPool,
  fetchDarkPoolLedger,
  deployDarkPoolContract,
  toCleanContractAddress,
  type DarkPoolProviders,
  type DarkPoolState,
  type NetworkEnv,
} from "../../api/src/darkPoolApi";
import type { Order } from "../../contract/src/witnesses";

export interface UserOrder {
  id: string;
  amount: string;
  side: "BUY" | "SELL";
  status: "Committed" | "Settled" | "Cancelled";
  txHash: string;
  timestamp: number;
  orderData: {
    side: string;
    amount: string;
    nonce: string; // hex
  };
}

export type TxStage = "idle" | "generating_proof" | "signing" | "submitting" | "confirmed" | "error";

const LOCAL_STORAGE_ORDERS_KEY = "umbra_dark_pool_orders_v1";
const LOCAL_STORAGE_CONTRACT_KEY = "umbra_contract_address_v1";

// Default pre-deployed preview address (clean 32-byte / 64-hex hex format)
const DEFAULT_CONTRACT_ADDRESS = "58b73ad6c18f3a388b3941eb058728b9d883aa36e1c441c098fa55db6c24f605";

export function getDeepErrorMessage(err: any): string {
  if (!err) return "Unknown error occurred";
  let cur = err;
  const parts: string[] = [];
  while (cur && parts.length < 5) {
    const message = cur.message || (typeof cur === "string" ? cur : null);
    if (message && !parts.includes(message)) {
      parts.push(message);
    }
    cur = cur.cause;
  }
  // If the top message is midnight-js's redacted wrapper, prioritize the inner cause
  if (parts.length > 1 && parts[0].includes("redacted of anything that could carry transaction")) {
    return parts.slice(1).join(" -> ");
  }
  return parts.join(" -> ") || String(err);
}

export function formatErrorMessage(err: any): string {
  const msg = getDeepErrorMessage(err);
  if (msg.includes("Connection expired") || msg.includes("reconnect")) {
    return "Wallet connection expired. Please click 'Reconnect Wallet' to reconnect.";
  }
  if (msg.includes("User rejected") || msg.includes("Declined") || msg.includes("cancelled") || msg.includes("canceled")) {
    return "Transaction was cancelled or declined in your wallet.";
  }
  if (msg.includes("insufficient") || msg.includes("not enough")) {
    return "Insufficient balance: Your wallet does not have enough tDUST to pay transaction fees. Request testnet tDUST from the Midnight faucet.";
  }
  if (msg.includes("Unable to deserialize Transaction") || (msg.includes("v12") && msg.includes("v9"))) {
    return "Wallet Transaction Serialization Error: The connected wallet expected a v9 transaction format.";
  }
  return msg;
}

export function useDarkPoolContract() {
  const [contractAddress, setContractAddressState] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CONTRACT_KEY);
    return toCleanContractAddress(saved || DEFAULT_CONTRACT_ADDRESS);
  });

  const [poolState, setPoolState] = useState<DarkPoolState>({
    reserveA: 10000n,
    reserveB: 10000n,
    activeCommitments: 0,
    settledCount: 0,
  });

  const [myOrders, setMyOrders] = useState<UserOrder[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [txStage, setTxStage] = useState<TxStage>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [providerInstance, setProviderInstance] = useState<{
    providers: DarkPoolProviders;
    compiledContract: any;
  } | null>(null);

  // Save orders to localStorage on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(myOrders));
  }, [myOrders]);

  const setContractAddress = (addr: string) => {
    const clean = toCleanContractAddress(addr);
    setContractAddressState(clean);
    localStorage.setItem(LOCAL_STORAGE_CONTRACT_KEY, clean);
  };

  const getProviders = async (wallet: ConnectedAPI, env: NetworkEnv = "preview") => {
    if (providerInstance) return providerInstance;
    setIsInitializing(true);
    try {
      const instance = await initDarkPoolProviders(wallet, env);
      setProviderInstance(instance);
      return instance;
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshPoolState = useCallback(async (wallet?: ConnectedAPI) => {
    if (!contractAddress) return;
    try {
      let instance = providerInstance;
      if (!instance && wallet) {
        instance = await initDarkPoolProviders(wallet);
        setProviderInstance(instance);
      }
      if (instance) {
        const state = await fetchDarkPoolLedger(instance.providers, contractAddress);
        if (state) {
          setPoolState(state);
        }
      }
    } catch (err) {
      console.warn("Could not refresh pool state:", err);
    }
  }, [contractAddress, providerInstance]);

  // Periodic poll of ledger state
  useEffect(() => {
    if (providerInstance && contractAddress) {
      refreshPoolState();
      const interval = setInterval(() => {
        refreshPoolState();
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [providerInstance, contractAddress, refreshPoolState]);

  const deployNewPool = async (wallet: ConnectedAPI, env: NetworkEnv = "preview"): Promise<string | null> => {
    setTxStage("generating_proof");
    setTxError(null);
    try {
      const { providers, compiledContract } = await getProviders(wallet, env);
      setTxStage("signing");
      const address = await deployDarkPoolContract(providers, compiledContract);
      setContractAddress(address);
      setTxStage("confirmed");
      await refreshPoolState(wallet);
      return address;
    } catch (err: any) {
      console.error("Deploy failed message:", err?.message || String(err));
      console.error("Deploy failed stack:", err?.stack);
      console.error("Deploy failed full error:", err);
      setProviderInstance(null);
      const formatted = formatErrorMessage(err);
      console.error("Deploy failed formatted error:", formatted);
      setTxError(formatted);
      setTxStage("error");
      return null;
    }
  };

  const commitOrder = async (
    wallet: ConnectedAPI,
    amount: number,
    isBuy: boolean,
    env: NetworkEnv = "preview"
  ): Promise<string | null> => {
    if (!contractAddress) {
      setTxError("Contract address is not configured");
      setTxStage("error");
      return null;
    }

    setTxStage("generating_proof");
    setTxError(null);

    try {
      const { providers, compiledContract } = await getProviders(wallet, env);
      setTxStage("submitting");

      const result = await commitOrderToDarkPool(
        providers,
        compiledContract,
        contractAddress,
        isBuy ? "BUY" : "SELL",
        BigInt(amount)
      );

      const newOrder: UserOrder = {
        id: Array.from(result.commitmentHash).map(b => b.toString(16).padStart(2, "0")).join(""),
        amount: amount.toString(),
        side: isBuy ? "BUY" : "SELL",
        status: "Committed",
        txHash: result.txHash,
        timestamp: Date.now(),
        orderData: {
          side: result.order.side.toString(),
          amount: result.order.amount.toString(),
          nonce: Array.from(result.order.nonce).map(b => b.toString(16).padStart(2, "0")).join(""),
        },
      };

      setMyOrders(prev => [newOrder, ...prev]);
      setLatestTxHash(result.txHash);
      setTxStage("confirmed");

      // Update pool counts optimistically then sync
      setPoolState(prev => ({
        ...prev,
        activeCommitments: prev.activeCommitments + 1,
      }));
      setTimeout(() => refreshPoolState(wallet), 3000);

      return result.txHash;
    } catch (err: any) {
      console.error("commitOrder error:", err);
      setProviderInstance(null);
      setTxError(formatErrorMessage(err));
      setTxStage("error");
      return null;
    }
  };

  const settleOrder = async (
    wallet: ConnectedAPI,
    userOrder: UserOrder,
    env: NetworkEnv = "preview"
  ): Promise<string | null> => {
    if (!contractAddress) return null;
    setTxStage("generating_proof");
    setTxError(null);

    try {
      const { providers, compiledContract } = await getProviders(wallet, env);
      setTxStage("submitting");

      // Reconstruct order struct from saved orderData
      const nonceBytes = new Uint8Array(
        userOrder.orderData.nonce.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      const orderStruct: Order = {
        side: BigInt(userOrder.orderData.side),
        amount: BigInt(userOrder.orderData.amount),
        nonce: nonceBytes,
      };

      const result = await settleOrderInDarkPool(
        providers,
        compiledContract,
        contractAddress,
        orderStruct
      );

      setMyOrders(prev =>
        prev.map(o => (o.id === userOrder.id ? { ...o, status: "Settled", txHash: result.txHash } : o))
      );
      setLatestTxHash(result.txHash);
      setTxStage("confirmed");

      setTimeout(() => refreshPoolState(wallet), 3000);
      return result.txHash;
    } catch (err: any) {
      console.error("settleOrder error:", err);
      setProviderInstance(null);
      setTxError(formatErrorMessage(err));
      setTxStage("error");
      return null;
    }
  };

  const cancelOrder = async (
    wallet: ConnectedAPI,
    userOrder: UserOrder,
    env: NetworkEnv = "preview"
  ): Promise<string | null> => {
    if (!contractAddress) return null;
    setTxStage("generating_proof");
    setTxError(null);

    try {
      const { providers, compiledContract } = await getProviders(wallet, env);
      setTxStage("submitting");

      const nonceBytes = new Uint8Array(
        userOrder.orderData.nonce.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      const orderStruct: Order = {
        side: BigInt(userOrder.orderData.side),
        amount: BigInt(userOrder.orderData.amount),
        nonce: nonceBytes,
      };

      const result = await cancelOrderInDarkPool(
        providers,
        compiledContract,
        contractAddress,
        orderStruct
      );

      setMyOrders(prev =>
        prev.map(o => (o.id === userOrder.id ? { ...o, status: "Cancelled", txHash: result.txHash } : o))
      );
      setLatestTxHash(result.txHash);
      setTxStage("confirmed");

      setTimeout(() => refreshPoolState(wallet), 3000);
      return result.txHash;
    } catch (err: any) {
      console.error("cancelOrder error:", err);
      setProviderInstance(null);
      setTxError(formatErrorMessage(err));
      setTxStage("error");
      return null;
    }
  };

  return {
    contractAddress,
    setContractAddress,
    poolState,
    myOrders,
    txStage,
    txError,
    latestTxHash,
    isInitializing,
    commitOrder,
    settleOrder,
    cancelOrder,
    deployNewPool,
    refreshPoolState,
    resetTxStage: () => setTxStage("idle"),
  };
}

