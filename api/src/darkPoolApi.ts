import { Contract, ledger } from "../../contract/build/contract/index.js";
import { witnesses, type DarkPoolPrivateState, type Order } from "../../contract/src/witnesses.js";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { deployContract, submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { CostModel, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  createWalletProvider,
  createMidnightProvider,
  createWalletProviderFromArms,
  createMidnightProviderFromArms,
} from "@midnight-ntwrk/midnight-js-types";

import { MidnightBech32m } from "@midnightntwrk/wallet-sdk-address-format";

export function toCleanContractAddress(address: string): string {
  if (!address || typeof address !== "string") return address;
  let clean = address.trim();
  if (clean.startsWith("0x") || clean.startsWith("0X")) {
    clean = clean.slice(2);
  }
  // Midnight contract addresses are 32 bytes (64 hex characters).
  // Tagged 34-byte addresses (68 hex chars) starting with 0200, 0000, 0100 have their prefix trimmed.
  if (clean.length === 68 && (clean.startsWith("0200") || clean.startsWith("0000") || clean.startsWith("0100"))) {
    clean = clean.slice(4);
  }
  return clean;
}

export type NetworkEnv = "preview" | "local";

export interface NetworkConfig {
  env: NetworkEnv;
  networkId: string;
  indexerHttpUrl: string;
  indexerWsUrl: string;
  zkirBaseUrl: string;
}

export const NETWORK_CONFIGS: Record<NetworkEnv, NetworkConfig> = {
  preview: {
    env: "preview",
    networkId: "preview",
    indexerHttpUrl: "https://indexer.preview.midnight.network/api/v4/graphql",
    indexerWsUrl: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
    zkirBaseUrl: typeof window !== "undefined" ? `${window.location.origin}/zkir` : "/zkir",
  },
  local: {
    env: "local",
    networkId: "undeclared",
    indexerHttpUrl: "http://127.0.0.1:8088/api/v1/graphql",
    indexerWsUrl: "ws://127.0.0.1:8088/api/v1/graphql/ws",
    zkirBaseUrl: typeof window !== "undefined" ? `${window.location.origin}/zkir` : "/zkir",
  },
};

export interface DarkPoolProviders {
  privateStateProvider: any;
  publicDataProvider: any;
  zkConfigProvider: FetchZkConfigProvider<string>;
  proofProvider: any;
  walletProvider: any;
  midnightProvider: any;
}

export interface DarkPoolState {
  reserveA: bigint;
  reserveB: bigint;
  activeCommitments: number;
  settledCount: number;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashOrder(order: Order): Promise<Uint8Array> {
  const buffer = new Uint8Array(4 + 8 + 32);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, Number(order.side), false);
  view.setBigUint64(4, order.amount, false);
  buffer.set(order.nonce, 12);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

export async function deriveNullifier(nonce: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", nonce as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

export class ResilientZkConfigProvider extends FetchZkConfigProvider<string> {
  private fallbackBaseUrl: string;

  constructor(baseUrl: string, fallbackBaseUrl: string = "") {
    super(baseUrl, {
      fetchFunc: typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : fetch,
      verify: "off",
    });
    this.fallbackBaseUrl = fallbackBaseUrl || baseUrl;
  }

  private cleanId(circuitId: string): string {
    return circuitId.includes("#") ? circuitId.split("#").pop()! : circuitId;
  }

  override async getVerifierKey(circuitId: string): Promise<any> {
    const id = this.cleanId(circuitId);
    try {
      return await super.getVerifierKey(id);
    } catch (err) {
      console.warn(`[ResilientZK] super.getVerifierKey(${id}) failed, trying direct fallback:`, err);
      const candidates = [
        `${this.fallbackBaseUrl}/keys/${id}.verifier`,
        `/keys/${id}.verifier`,
        `/zkir/keys/${id}.verifier`,
      ];
      for (const url of candidates) {
        try {
          const res = await (typeof window !== "undefined" ? window.fetch(url) : fetch(url));
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return new Uint8Array(buf);
          }
        } catch (_) {}
      }
      throw err;
    }
  }

  override async getProverKey(circuitId: string): Promise<any> {
    const id = this.cleanId(circuitId);
    try {
      return await super.getProverKey(id);
    } catch (err) {
      console.warn(`[ResilientZK] super.getProverKey(${id}) failed, trying direct fallback:`, err);
      const candidates = [
        `${this.fallbackBaseUrl}/keys/${id}.prover`,
        `/keys/${id}.prover`,
        `/zkir/keys/${id}.prover`,
      ];
      for (const url of candidates) {
        try {
          const res = await (typeof window !== "undefined" ? window.fetch(url) : fetch(url));
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return new Uint8Array(buf);
          }
        } catch (_) {}
      }
      throw err;
    }
  }

  override async getZKIR(circuitId: string): Promise<any> {
    const id = this.cleanId(circuitId);
    try {
      return await super.getZKIR(id);
    } catch (err) {
      console.warn(`[ResilientZK] super.getZKIR(${id}) failed, trying direct fallback:`, err);
      const candidates = [
        `${this.fallbackBaseUrl}/zkir/${id}.bzkir`,
        `/zkir/${id}.bzkir`,
        `/zkir/${id}.zkir`,
      ];
      for (const url of candidates) {
        try {
          const res = await (typeof window !== "undefined" ? window.fetch(url) : fetch(url));
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return new Uint8Array(buf);
          }
        } catch (_) {}
      }
      throw err;
    }
  }

  override async getArtifactRuntimeVersion(): Promise<string> {
    return "0.16.0";
  }
}

export async function initDarkPoolProviders(
  wallet: ConnectedAPI,
  env: NetworkEnv = "preview"
): Promise<{ providers: DarkPoolProviders; compiledContract: any }> {
  const config = NETWORK_CONFIGS[env];

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await wallet.getShieldedAddresses();
  const unshieldedAddresses = await wallet.getUnshieldedAddress();
  const accountId = unshieldedAddresses.unshieldedAddress;

  // Auto-detect the exact network ID from the connected wallet's address format
  let effectiveNetworkId = config.networkId;
  try {
    const parsed = MidnightBech32m.parse(shieldedCoinPublicKey);
    if (parsed.network && typeof parsed.network === "string") {
      effectiveNetworkId = parsed.network;
    }
  } catch (e) {
    console.warn("Could not parse wallet bech32 network, using config:", config.networkId);
  }

  try {
    setNetworkId(effectiveNetworkId as any);
  } catch (e) {
    // Ignore if already set
  }

  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const zkConfigProvider = new ResilientZkConfigProvider(config.zkirBaseUrl, fallbackOrigin);
  const costModel = CostModel.initialCostModel();

  const proofProvider = await dappConnectorProofProvider(
    wallet,
    zkConfigProvider,
    costModel
  );

  const walletProvider = createWalletProviderFromArms({
    getCoinPublicKey: () => shieldedCoinPublicKey as any,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey as any,
    currentEra: async (unboundTx) => {
      const netId = getNetworkId() as any;
      const serialized = bytesToHex(
        typeof (unboundTx as any).serialize === "function" && (unboundTx as any).serialize.length > 0
          ? (unboundTx as any).serialize(netId)
          : (unboundTx as any).serialize()
      );
      const balanced = await wallet.balanceUnsealedTransaction(serialized);
      const balancedBytes = hexToBytes(balanced.tx);
      return Transaction.deserialize("signature", "proof", "binding", balancedBytes);
    },
    retainedEras: {
      v8: async (txBytes: Uint8Array): Promise<Uint8Array> => {
        try {
          console.log("[balanceTx:v8] Balancing retained era v8 transaction with Lace, length:", txBytes.length);
          const serialized = bytesToHex(txBytes);
          console.log("[balanceTx:v8] Wire prefix:", serialized.slice(0, 80));
          const balanced = await wallet.balanceUnsealedTransaction(serialized, { payFees: true });
          console.log("[balanceTx:v8] Lace wallet balanced transaction successfully!");
          return hexToBytes(balanced.tx);
        } catch (walletErr: any) {
          console.error("[balanceTx:v8 ERROR from Lace]:", walletErr?.message || walletErr, walletErr);
          throw walletErr;
        }
      },
    },
  });

  const midnightProvider = createMidnightProviderFromArms({
    currentEra: async (finalizedTx) => {
      const netId = getNetworkId() as any;
      const serialized = bytesToHex(
        typeof (finalizedTx as any).serialize === "function" && (finalizedTx as any).serialize.length > 0
          ? (finalizedTx as any).serialize(netId)
          : (finalizedTx as any).serialize()
      );
      await wallet.submitTransaction(serialized);
      return typeof (finalizedTx as any).identifier === "function" ? (finalizedTx as any).identifier() : "submitted";
    },
    retainedEras: {
      v8: async (txBytes: Uint8Array): Promise<string> => {
        try {
          console.log("[submitTx:v8] Submitting retained era v8 transaction with Lace, length:", txBytes.length);
          const serialized = bytesToHex(txBytes);
          await wallet.submitTransaction(serialized);
          console.log("[submitTx:v8] Transaction submitted successfully!");
          return "submitted";
        } catch (submitErr: any) {
          console.error("[submitTx:v8 ERROR from Lace]:", submitErr?.message || submitErr, submitErr);
          throw submitErr;
        }
      },
    },
  });

  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: "umbra-darkpool-store",
    accountId,
    privateStoragePasswordProvider: () => "UmbraConfidentialKey_2026!",
  });

  const publicDataProvider = indexerPublicDataProvider(
    config.indexerHttpUrl,
    config.indexerWsUrl
  );

  const providers: DarkPoolProviders = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };

  const compiledContract = new Contract(witnesses as any);

  return { providers, compiledContract };
}

export async function deployDarkPoolContract(
  providers: DarkPoolProviders,
  compiledContract: any
): Promise<string> {
  const initialPrivateState: DarkPoolPrivateState = {
    currentOrder: null,
    orderHistory: [],
  };

  const deployed: any = await deployContract(providers as any, {
    privateStateId: "darkPoolState",
    initialPrivateState,
    compiledContract,
    args: [],
  });

  const contractAddress =
    deployed?.deployTxData?.public?.contractAddress ||
    deployed?.deployTxData?.contractAddress ||
    deployed?.contractAddress;

  return toCleanContractAddress(contractAddress);
}

export async function commitOrderToDarkPool(
  providers: DarkPoolProviders,
  compiledContract: any,
  contractAddress: string,
  side: "BUY" | "SELL",
  amount: bigint
): Promise<{ txHash: string; order: Order; commitmentHash: Uint8Array }> {
  const cleanAddress = toCleanContractAddress(contractAddress);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const order: Order = {
    side: side === "BUY" ? 0n : 1n,
    amount,
    nonce,
  };

  const commitmentHash = await hashOrder(order);

  // Store in private state before proving
  await providers.privateStateProvider.set("darkPoolState", {
    currentOrder: order,
    orderHistory: [order],
  });

  const tx: any = await submitCallTx(providers as any, {
    privateStateId: "darkPoolState",
    compiledContract,
    contractAddress: cleanAddress,
    circuitId: "commitOrder",
    args: [commitmentHash],
  });

  return {
    txHash: tx.public.txHash || tx.public.txId || "confirmed",
    order,
    commitmentHash,
  };
}

export async function settleOrderInDarkPool(
  providers: DarkPoolProviders,
  compiledContract: any,
  contractAddress: string,
  order: Order
): Promise<{ txHash: string; nullifier: Uint8Array }> {
  const cleanAddress = toCleanContractAddress(contractAddress);
  const nullifier = await deriveNullifier(order.nonce);

  await providers.privateStateProvider.set("darkPoolState", {
    currentOrder: order,
    orderHistory: [order],
  });

  const tx: any = await submitCallTx(providers as any, {
    privateStateId: "darkPoolState",
    compiledContract,
    contractAddress: cleanAddress,
    circuitId: "settleOrder",
    args: [nullifier],
  });

  return {
    txHash: tx.public.txHash || tx.public.txId || "settled",
    nullifier,
  };
}

export async function cancelOrderInDarkPool(
  providers: DarkPoolProviders,
  compiledContract: any,
  contractAddress: string,
  order: Order
): Promise<{ txHash: string; nullifier: Uint8Array }> {
  const cleanAddress = toCleanContractAddress(contractAddress);
  const nullifier = await deriveNullifier(order.nonce);

  await providers.privateStateProvider.set("darkPoolState", {
    currentOrder: order,
    orderHistory: [order],
  });

  const tx: any = await submitCallTx(providers as any, {
    privateStateId: "darkPoolState",
    compiledContract,
    contractAddress: cleanAddress,
    circuitId: "cancelOrder",
    args: [nullifier],
  });

  return {
    txHash: tx.public.txHash || tx.public.txId || "cancelled",
    nullifier,
  };
}

export async function fetchDarkPoolLedger(
  providers: DarkPoolProviders,
  contractAddress: string
): Promise<DarkPoolState | null> {
  try {
    const cleanAddress = toCleanContractAddress(contractAddress);
    const rawContractState = await providers.publicDataProvider.queryContractState(cleanAddress);
    if (!rawContractState || !rawContractState.data) {
      return null;
    }

    const state = ledger(rawContractState.data);
    return {
      reserveA: state.reserveA,
      reserveB: state.reserveB,
      activeCommitments: Number(state.commitmentPool.size()),
      settledCount: Number(state.nullifiers.size()),
    };
  } catch (err) {
    console.warn("Failed to query dark pool ledger state:", err);
    return null;
  }
}
