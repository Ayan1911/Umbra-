import { InitialAPI, ConnectedAPI, WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction } from "@midnight-ntwrk/midnight-js-types";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import * as Rx from "rxjs";

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

/**
 * Polls for the 1AM wallet's InitialAPI in the window object.
 */
export async function detect1AmWallet(timeoutMs = 5000, pollIntervalMs = 100): Promise<InitialAPI | null> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    if (window.midnight) {
      // Find the entry that has a name indicating it's 1AM.
      const entry = Object.values(window.midnight).find((api) => {
        const nameStr = String(api?.name || "").toLowerCase();
        return nameStr.includes("1am") || nameStr.includes("1 am") || nameStr.includes("lace");
      });
      
      if (entry) {
        return entry;
      }
    }
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return null;
}

export const createWalletAndMidnightProvider = async (wallet: ConnectedAPI) => {
  // ConnectedAPI has getShieldedAddresses(), etc.
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await wallet.getShieldedAddresses();
  
  return {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx(tx: any, newCoins: any[]): Promise<any> {
      return wallet
        .balanceUnsealedTransaction(tx.serialize(getNetworkId()))
        .then((result: any) => Transaction.deserialize(result.tx, getNetworkId()));
    },
    submitTx(tx: any): Promise<any> {
      return wallet.submitTransaction(tx.serialize(getNetworkId()));
    },
  };
};