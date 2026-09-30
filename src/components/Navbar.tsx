export default function Navbar({
  walletAddress,
  tDustBalance,
  networkEnv,
  providerName,
  onSwitchNetwork,
  onDisconnect,
  onSwitchWallet,
}: {
  walletAddress?: string;
  tDustBalance?: string;
  networkEnv: "preview" | "local";
  providerName?: string;
  onSwitchNetwork: (env: "preview" | "local") => void;
  onDisconnect: () => void;
  onSwitchWallet?: () => void;
}) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        width: "100%",
        height: "4.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.5rem",
        backgroundColor: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 50,
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        boxSizing: "border-box",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{
            fontWeight: 900,
            letterSpacing: "0.2em",
            fontSize: "1.4rem",
            background: "linear-gradient(135deg, #38bdf8 0%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            cursor: "pointer",
          }}
        >
          UMBRA
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            color: "#38bdf8",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Midnight ZK-AMM
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Network Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "0.25rem",
            gap: "0.25rem",
          }}
        >
          <button
            onClick={() => onSwitchNetwork("preview")}
            style={{
              background: networkEnv === "preview" ? "rgba(56, 189, 248, 0.2)" : "transparent",
              border: networkEnv === "preview" ? "1px solid #38bdf8" : "none",
              color: networkEnv === "preview" ? "#38bdf8" : "#94a3b8",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Preview Testnet
          </button>
          <button
            onClick={() => onSwitchNetwork("local")}
            style={{
              background: networkEnv === "local" ? "rgba(168, 85, 247, 0.2)" : "transparent",
              border: networkEnv === "local" ? "1px solid #a855f7" : "none",
              color: networkEnv === "local" ? "#a855f7" : "#94a3b8",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Local Node
          </button>
        </div>

        {/* Live Network Health Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: "#94a3b8",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 10px #22c55e",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Connected</span>
        </div>

        {/* Connected Wallet Provider Indicator */}
        {providerName && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "8px",
                background: providerName.toLowerCase().includes("lace")
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(234, 179, 8, 0.15)",
                border: providerName.toLowerCase().includes("lace")
                  ? "1px solid rgba(34, 197, 94, 0.3)"
                  : "1px solid rgba(234, 179, 8, 0.3)",
                color: providerName.toLowerCase().includes("lace") ? "#4ade80" : "#facc15",
                fontWeight: 600,
              }}
            >
              {providerName.toLowerCase().includes("lace") ? "🛡️ Midnight Lace" : `⚠️ ${providerName}`}
            </span>

            {!providerName.toLowerCase().includes("lace") && onSwitchWallet && (
              <button
                onClick={onSwitchWallet}
                title="Switch connection to Midnight Lace"
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #c084fc 100%)",
                  border: "none",
                  color: "#020617",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                ⚡ Switch to Lace
              </button>
            )}
          </div>
        )}

        {/* Balance & Address Pill */}
        {walletAddress && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "0.4rem 1rem",
              borderRadius: "12px",
            }}
          >
            {tDustBalance !== undefined && (
              <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600 }}>
                {(() => {
                  const val = parseFloat(tDustBalance);
                  if (isNaN(val)) return "0 tDUST";
                  if (val >= 1000000000) return (val / 1000000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " B tDUST";
                  if (val >= 1000000) return (val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " M tDUST";
                  if (val >= 1000) return (val / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " k tDUST";
                  return val.toFixed(2) + " tDUST";
                })()}
              </span>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                color: "#e2e8f0",
                fontFamily: "monospace",
                background: "rgba(0, 0, 0, 0.3)",
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
              }}
            >
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        )}

        {/* Exit / Disconnect */}
        <button
          onClick={onDisconnect}
          title="Disconnect wallet and return to landing page"
          style={{
            background: "transparent",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            padding: "0.4rem 0.8rem",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Disconnect
        </button>
      </div>
    </nav>
  );
}