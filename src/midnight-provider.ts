import { InitialAPI, ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction } from "@midnight-ntwrk/ledger";


declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export interface AvailableWallet {
  id: string;
  name: string;
  isLace: boolean;
  api: InitialAPI;
}

/**
 * Returns all detected Midnight wallet APIs currently injected in window.midnight.
 * Midnight Lace is always sorted to the front.
 */
export function getAvailableMidnightWallets(): AvailableWallet[] {
  if (typeof window === "undefined" || !window.midnight) return [];
  const entries: AvailableWallet[] = [];
  
  for (const [key, val] of Object.entries(window.midnight)) {
    if (!val || typeof val !== "object") continue;
    const api = val as InitialAPI;
    const keyLower = key.toLowerCase();
    const nameLower = String(api.name || "").toLowerCase();
    const isLace = keyLower.includes("lace") || nameLower.includes("lace") || key === "mnLace";
    const displayName = isLace ? "Midnight Lace" : (api.name || key);
    
    entries.push({
      id: key,
      name: displayName,
      isLace,
      api,
    });
  }
  
  // Always prioritize Midnight Lace
  entries.sort((a, b) => (b.isLace ? 1 : 0) - (a.isLace ? 1 : 0));
  return entries;
}

/**
 * Detects Midnight Lace Wallet.
 * Specifically polls for Lace (window.midnight['mnLace'] or name containing 'lace').
 * If Lace is found, it returns Lace immediately.
 * If Lace is not injected after timeoutMs, falls back to any available Midnight wallet.
 */
export async function detectMidnightWallet(timeoutMs = 3000, pollIntervalMs = 100): Promise<InitialAPI | null> {
  const start = Date.now();
  let fallbackWallet: InitialAPI | null = null;
  
  while (Date.now() - start < timeoutMs) {
    if (typeof window !== "undefined" && window.midnight) {
      // 1. Direct key check for Midnight Lace
      if (window.midnight["mnLace"]) {
        return window.midnight["mnLace"];
      }
      
      // 2. Scan all entries for Lace
      for (const [key, api] of Object.entries(window.midnight)) {
        if (!api) continue;
        const keyLower = key.toLowerCase();
        const nameLower = String(api.name || "").toLowerCase();
        if (keyLower.includes("lace") || nameLower.includes("lace") || key === "mnLace") {
          return api;
        }
        if (!fallbackWallet) {
          fallbackWallet = api;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  // If Lace was not detected after full timeout, return fallback if available
  return fallbackWallet;
}

export const detect1AmWallet = detectMidnightWallet;
export const detectLaceWallet = detectMidnightWallet;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export const createWalletAndMidnightProvider = async (wallet: ConnectedAPI) => {
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await wallet.getShieldedAddresses();
  
  return {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    async balanceTx(tx: any): Promise<any> {
      const netId = getNetworkId() as any;
      const serialized = bytesToHex(tx.serialize(netId));
      const result = await wallet.balanceUnsealedTransaction(serialized);
      const balancedBytes = hexToBytes(result.tx);
      return Transaction.deserialize(balancedBytes, netId);
    },
    async submitTx(tx: any): Promise<any> {
      const netId = getNetworkId() as any;
      const serialized = bytesToHex(tx.serialize(netId));
      return wallet.submitTransaction(serialized);
    },
  };
};