import { useState, useEffect } from "react";
import { useDarkPoolContract, type UserOrder } from "./hooks/useDarkPoolContract";
import type { NetworkEnv } from "../api/src/darkPoolApi";

export default function TradingInterface({
  walletState,
  networkEnv,
  onReconnect,
  onSwitchWallet,
}: {
  walletState: any;
  networkEnv: NetworkEnv;
  onReconnect?: () => void;
  onSwitchWallet?: () => void;
}) {
  const [amountInput, setAmountInput] = useState("");
  const [selectedSide, setSelectedSide] = useState<"BUY" | "SELL">("BUY");
  const [isDeploying, setIsDeploying] = useState(false);
  const [customAddressInput, setCustomAddressInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const {
    contractAddress,
    setContractAddress,
    poolState,
    myOrders,
    txStage,
    txError,
    latestTxHash,
    commitOrder,
    settleOrder,
    cancelOrder,
    deployNewPool,
    refreshPoolState,
    resetTxStage,
  } = useDarkPoolContract();

  // Auto-dismiss stale 1AM mismatch errors as soon as Midnight Lace connects
  useEffect(() => {
    if (walletState?.providerName?.toLowerCase().includes("lace") && txError?.includes("1AM Wallet Protocol Mismatch")) {
      resetTxStage();
    }
  }, [walletState?.providerName, txError, resetTxStage]);

  const isBusy = txStage === "generating_proof" || txStage === "signing" || txStage === "submitting" || isDeploying;

  // Calculate AMM spot price and output estimation
  const reserveA = Number(poolState.reserveA);
  const reserveB = Number(poolState.reserveB);
  const amountNum = parseFloat(amountInput) || 0;
  
  // 1:1 or constant output for dark pool order
  const estimatedOutput = amountNum > 0 ? amountNum.toFixed(2) : "0.00";

  const handleCommit = async () => {
    if (!amountInput || isNaN(amountNum) || amountNum <= 0 || !walletState.connectedAPI) return;
    await commitOrder(walletState.connectedAPI, amountNum, selectedSide === "BUY", networkEnv);
    setAmountInput("");
  };

  const handleSettle = async (order: UserOrder) => {
    if (!walletState.connectedAPI || isBusy) return;
    await settleOrder(walletState.connectedAPI, order, networkEnv);
  };

  const handleCancel = async (order: UserOrder) => {
    if (!walletState.connectedAPI || isBusy) return;
    await cancelOrder(walletState.connectedAPI, order, networkEnv);
  };

  const handleDeployNew = async () => {
    if (!walletState.connectedAPI || isBusy) return;
    setIsDeploying(true);
    try {
      await deployNewPool(walletState.connectedAPI, networkEnv);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div style={{ background: "#020617", minHeight: "calc(100vh - 4.5rem)", color: "#f8fafc", padding: "2.5rem" }}>
      {/* Transaction Status Stepper / Modal */}
      {txStage !== "idle" && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.95)",
            border: txStage === "error" ? "1px solid #ef4444" : "1px solid #38bdf8",
            boxShadow: txStage === "error" ? "0 0 25px rgba(239, 68, 68, 0.3)" : "0 0 25px rgba(56, 189, 248, 0.3)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            padding: "1.5rem",
            maxWidth: "420px",
            width: "100%",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: txStage === "error" ? "#ef4444" : "#38bdf8" }}>
              {txStage === "generating_proof" && "⚡ Generating ZK Proof..."}
              {txStage === "signing" && "✍️ Awaiting Wallet Signature..."}
              {txStage === "submitting" && "📡 Submitting to Midnight Network..."}
              {txStage === "confirmed" && "✅ Transaction Confirmed!"}
              {txStage === "error" && "❌ Transaction Failed"}
            </span>
            {(txStage === "confirmed" || txStage === "error") && (
              <button
                onClick={resetTxStage}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
            {txStage === "generating_proof" && "Executing circuit in client WASM with private witness..."}
            {txStage === "signing" && "Please approve the transaction inside your Midnight Lace wallet extension."}
            {txStage === "submitting" && "Broadcasting proof-verified transaction to Midnight indexer."}
            {txStage === "confirmed" && "Your action was validated and ledger state is updated."}
            {txStage === "error" && (txError || "An unexpected error occurred.")}
          </p>

          {txStage === "error" && txError && (txError.toLowerCase().includes("expired") || txError.toLowerCase().includes("reconnect")) && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => {
                  resetTxStage();
                  if (onReconnect) onReconnect();
                }}
                style={{
                  background: "#38bdf8",
                  color: "#020617",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                🔄 Reconnect Wallet Now
              </button>
            </div>
          )}

          {txStage === "error" && txError && txError.includes("1AM Wallet Protocol Mismatch") && (
            <div style={{ marginTop: "1rem", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#fca5a5", marginBottom: "0.6rem", lineHeight: "1.4" }}>
                💡 <strong>Current Wallet is 1AM:</strong> The app was connected to 1AM Wallet. Since Midnight Preview Testnet requires v12 protocol transactions, please switch your connection to <strong>Midnight Lace</strong>.
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {onSwitchWallet && (
                  <button
                    onClick={() => {
                      resetTxStage();
                      onSwitchWallet();
                    }}
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #38bdf8 0%, #c084fc 100%)",
                      color: "#020617",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.5rem 0.8rem",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)",
                    }}
                  >
                    ⚡ Switch to Midnight Lace
                  </button>
                )}
                <button
                  onClick={resetTxStage}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 0.8rem",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {latestTxHash && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b", wordBreak: "break-all" }}>
              Tx ID: <span style={{ color: "#38bdf8" }}>{latestTxHash}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "2.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* Left Column: Order Ticket */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "2.5rem",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: 800 }}>Confidential Order Ticket</h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>
                Submit a zero-knowledge commitment. Trade amount and side remain fully private.
              </p>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Collapsible Contract Config */}
          {showConfig && (
            <div
              style={{
                background: "rgba(2, 6, 23, 0.6)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "12px",
                padding: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
                Active Contract Address
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder={contractAddress}
                  value={customAddressInput}
                  onChange={(e) => setCustomAddressInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    color: "#f8fafc",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    if (customAddressInput.trim()) {
                      setContractAddress(customAddressInput.trim());
                      setCustomAddressInput("");
                    }
                  }}
                  style={{
                    background: "#38bdf8",
                    border: "none",
                    borderRadius: "8px",
                    color: "#020617",
                    fontWeight: 700,
                    padding: "0 1rem",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Or deploy a brand new pool contract:</span>
                <button
                  disabled={isBusy}
                  onClick={handleDeployNew}
                  style={{
                    background: "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: isBusy ? "not-allowed" : "pointer",
                  }}
                >
                  {isDeploying ? "Deploying..." : "+ Deploy Pool"}
                </button>
              </div>
            </div>
          )}

          {/* Buy/Sell Selector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              background: "rgba(2, 6, 23, 0.5)",
              padding: "0.4rem",
              borderRadius: "12px",
              marginBottom: "2rem",
            }}
          >
            <button
              onClick={() => setSelectedSide("BUY")}
              style={{
                background: selectedSide === "BUY" ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: selectedSide === "BUY" ? "#38bdf8" : "#94a3b8",
                border: selectedSide === "BUY" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                padding: "0.9rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
            >
              BUY TOKEN B (Deposit Token A)
            </button>
            <button
              onClick={() => setSelectedSide("SELL")}
              style={{
                background: selectedSide === "SELL" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                color: selectedSide === "SELL" ? "#ef4444" : "#94a3b8",
                border: selectedSide === "SELL" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid transparent",
                padding: "0.9rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.95rem",
                transition: "all 0.2s",
              }}
            >
              SELL TOKEN B (Deposit Token B)
            </button>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 600 }}>Order Amount</label>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Protected by ZK-Proof</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(2, 6, 23, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "0.5rem 1.25rem",
              }}
            >
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "#f8fafc",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
              <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.9rem", paddingLeft: "1rem" }}>
                {selectedSide === "BUY" ? "TOKEN A" : "TOKEN B"}
              </span>
            </div>
          </div>

          {/* Estimated Output Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
              <span style={{ color: "#94a3b8" }}>Expected Output</span>
              <span style={{ fontWeight: 700, color: "#f8fafc" }}>
                ≈ {estimatedOutput} {selectedSide === "BUY" ? "TOKEN B" : "TOKEN A"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b" }}>
              <span>Pool Pricing Rate</span>
              <span>1.00 : 1.00 (Zero Slippage Dark Pool)</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            disabled={isBusy || !amountInput || amountNum <= 0 || !walletState.connectedAPI}
            onClick={handleCommit}
            style={{
              width: "100%",
              background: "linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)",
              opacity: isBusy || !amountInput || amountNum <= 0 || !walletState.connectedAPI ? 0.4 : 1,
              border: "none",
              padding: "1.2rem",
              borderRadius: "12px",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "1rem",
              letterSpacing: "0.05em",
              cursor: isBusy || !amountInput || amountNum <= 0 || !walletState.connectedAPI ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px rgba(56, 189, 248, 0.3)",
              transition: "all 0.3s ease",
            }}
          >
            {isBusy ? "Processing Zero-Knowledge Proof..." : "COMMIT CONFIDENTIAL ORDER"}
          </button>
        </div>

        {/* Right Column: Live Pool Status & Orders */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Live Pool State Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.2rem", fontWeight: 700 }}>Live On-Chain Pool</h4>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Synced via Midnight GraphQL Indexer</span>
              </div>
              <button
                onClick={() => refreshPoolState(walletState.connectedAPI)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#38bdf8",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ↻ Refresh
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>RESERVE A</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#38bdf8" }}>{reserveA.toLocaleString()}</span>
              </div>
              <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>RESERVE B</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c084fc" }}>{reserveB.toLocaleString()}</span>
              </div>
              <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>ACTIVE COMMITMENTS</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#22c55e" }}>{poolState.activeCommitments}</span>
              </div>
              <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>SETTLED TRADES</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#cbd5e1" }}>{poolState.settledCount}</span>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", padding: "0.75rem", background: "rgba(2, 6, 23, 0.4)", borderRadius: "8px", fontSize: "0.72rem", color: "#64748b", wordBreak: "break-all" }}>
              Contract: {contractAddress}
            </div>
          </div>

          {/* My Orders History Card */}
          <div
            style={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>My Orders & Commitments</h4>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{myOrders.length} records</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: "320px", paddingRight: "0.5rem" }}>
              {myOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b", fontSize: "0.88rem" }}>
                  No active commitments. Submit an order to trade in the dark pool.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        background: "rgba(2, 6, 23, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "12px",
                        padding: "1rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: order.side === "BUY" ? "#38bdf8" : "#ef4444" }}>
                          {order.side} {order.amount}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            fontWeight: 700,
                            background:
                              order.status === "Committed"
                                ? "rgba(56, 189, 248, 0.15)"
                                : order.status === "Settled"
                                ? "rgba(34, 197, 94, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            color:
                              order.status === "Committed"
                                ? "#38bdf8"
                                : order.status === "Settled"
                                ? "#22c55e"
                                : "#ef4444",
                          }}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#64748b" }}>
                        <span>Commitment: {order.id.slice(0, 10)}...{order.id.slice(-6)}</span>
                        {order.status === "Committed" && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              disabled={isBusy}
                              onClick={() => handleSettle(order)}
                              style={{
                                background: "rgba(34, 197, 94, 0.2)",
                                border: "1px solid #22c55e",
                                color: "#22c55e",
                                padding: "0.3rem 0.6rem",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: isBusy ? "not-allowed" : "pointer",
                              }}
                            >
                              Settle Swap
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => handleCancel(order)}
                              style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                color: "#ef4444",
                                padding: "0.3rem 0.6rem",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: isBusy ? "not-allowed" : "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
