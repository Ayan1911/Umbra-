import { useEffect, useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import LandingPage from "./LandingPage";
import TradingInterface from "./TradingInterface";
import { detect1AmWallet, getAvailableMidnightWallets, type AvailableWallet } from "./midnight-provider";
import { InitialAPI, ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { NetworkEnv } from "../api/src/darkPoolApi";

type WalletState = {
  connectedAPI: ConnectedAPI | null;
  address?: string; 
  tDustBalance?: string;
  providerName?: string;
};

export default function App() {
  const [launched, setLaunched] = useState(false);
  const [networkEnv, setNetworkEnv] = useState<NetworkEnv>("preview");
  
  const [initialAPI, setInitialAPI] = useState<InitialAPI | null>(null);
  const [availableWallets, setAvailableWallets] = useState<AvailableWallet[]>([]);
  const [walletState, setWalletState] = useState<WalletState>({ connectedAPI: null });
  const [isDetecting, setIsDetecting] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshWallets = useCallback(() => {
    const wallets = getAvailableMidnightWallets();
    setAvailableWallets(wallets);
    if (wallets.length > 0) {
      // Prioritize Lace if available, else first detected
      setInitialAPI(wallets[0].api);
    }
    return wallets;
  }, []);

  useEffect(() => {
    detect1AmWallet().then((api) => {
      const wallets = refreshWallets();
      if (api && wallets.length === 0) {
        setInitialAPI(api);
      }
      setIsDetecting(false);
    });

    // Check periodically for injected wallet extensions
    const interval = setInterval(refreshWallets, 1500);
    return () => clearInterval(interval);
  }, [refreshWallets]);

  const handleConnect = async (targetApi?: InitialAPI) => {
    const apiToUse = targetApi || initialAPI;
    if (!apiToUse) return;
    setIsConnecting(true);
    try {
      const connectedAPI = await apiToUse.connect(networkEnv);
      
      const addresses = await connectedAPI.getUnshieldedAddress();
      const address = addresses.unshieldedAddress;
      
      let tDustBalance = "0";
      try {
        const dust = await connectedAPI.getDustBalance();
        tDustBalance = dust.balance.toString();
      } catch (e) {
        console.warn("Could not fetch initial dust balance:", e);
      }

      const isLace = String(apiToUse.name || "").toLowerCase().includes("lace") ||
        availableWallets.find(w => w.api === apiToUse)?.isLace;

      setWalletState({
        connectedAPI,
        address,
        tDustBalance,
        providerName: isLace ? "Midnight Lace" : (apiToUse.name || "Midnight Wallet"),
      });
      setLaunched(true);
    } catch (err) {
      console.error("Connection failed:", err);
      alert("Failed to connect wallet: " + String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchWallet = async (walletId?: string) => {
    const wallets = getAvailableMidnightWallets();
    let target: InitialAPI | undefined;
    if (walletId) {
      target = wallets.find(w => w.id === walletId)?.api;
    } else {
      // Prioritize Midnight Lace
      target = wallets.find(w => w.isLace)?.api || wallets[0]?.api;
    }
    if (target) {
      await handleConnect(target);
    } else {
      alert("No alternate Midnight wallet extension detected. Please ensure Midnight Lace is active.");
    }
  };

  const handleDisconnect = () => {
    setWalletState({ connectedAPI: null });
    setLaunched(false);
  };

  if (!launched) {
    return (
      <LandingPage 
        onLaunch={() => setLaunched(true)} 
        initialAPI={initialAPI} 
        isDetecting={isDetecting}
        isConnecting={isConnecting}
        handleConnect={() => handleConnect()}
        isConnected={!!walletState.connectedAPI}
      />
    );
  }

  return (
    <div style={{ backgroundColor: "#020617", minHeight: "100vh" }}>
      <Navbar 
        walletAddress={walletState.address}
        tDustBalance={walletState.tDustBalance}
        networkEnv={networkEnv}
        providerName={walletState.providerName}
        onSwitchNetwork={(env) => setNetworkEnv(env)}
        onDisconnect={handleDisconnect}
        onSwitchWallet={handleSwitchWallet}
      />
      
      {!walletState.connectedAPI && (
        <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "1rem", textAlign: "center" }}>
          <p style={{ color: "#ef4444", margin: 0 }}>
            <strong>Wallet Disconnected!</strong> Please return to the landing page to reconnect.
          </p>
        </div>
      )}

      <TradingInterface 
        walletState={walletState}
        networkEnv={networkEnv}
        onReconnect={() => handleConnect()}
        onSwitchWallet={handleSwitchWallet}
      />
    </div>
  );
}