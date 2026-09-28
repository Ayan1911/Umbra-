import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import LandingPage from "./LandingPage";
import TradingInterface from "./TradingInterface";
import { detect1AmWallet } from "./midnight-provider";
import { InitialAPI, ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

type WalletState = {
  connectedAPI: ConnectedAPI | null;
  address?: string; 
  tDustBalance?: string;
  providerName?: string;
};

export default function App() {
  const [launched, setLaunched] = useState(false);
  
  const [initialAPI, setInitialAPI] = useState<InitialAPI | null>(null);
  const [walletState, setWalletState] = useState<WalletState>({ connectedAPI: null });
  const [isDetecting, setIsDetecting] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Poll for the 1AM wallet API on mount
    detect1AmWallet().then((api) => {
      if (api) {
        setInitialAPI(api);
      }
      setIsDetecting(false);
    });
  }, []);

  const handleConnect = async () => {
    if (!initialAPI) return;
    setIsConnecting(true);
    try {
      // Connect specifically to the Standalone Node
      const connectedAPI = await initialAPI.connect("preview");
      
      const addresses = await connectedAPI.getUnshieldedAddress();
      const address = addresses.unshieldedAddress;
      
      const dust = await connectedAPI.getDustBalance();
      const tDustBalance = dust.balance.toString();

      setWalletState({
        connectedAPI,
        address,
        tDustBalance,
        providerName: initialAPI.name,
      });
    } catch (err) {
      console.error("Connection failed:", err);
      alert("Failed to connect wallet: " + String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  if (!launched) {
    return (
      <LandingPage 
        onLaunch={() => setLaunched(true)} 
        initialAPI={initialAPI} 
        isDetecting={isDetecting}
        isConnecting={isConnecting}
        handleConnect={handleConnect}
        isConnected={!!walletState.connectedAPI}
      />
    );
  }

  return (
    <div>
      <Navbar />
      
      {/* Wallet Connection Banner (Fallback if disconnected) */}
      {!walletState.connectedAPI && (
        <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', margin: 0 }}><strong>Wallet Disconnected!</strong> Please refresh to reconnect.</p>
        </div>
      )}

      <TradingInterface walletState={walletState} />
    </div>
  );
}