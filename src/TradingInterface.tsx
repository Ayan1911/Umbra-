import { useState } from 'react';
import { useDarkPoolContract } from './hooks/useDarkPoolContract';

export default function TradingInterface({ walletState }: { walletState: any }) {
  const [activeCommitments, setActiveCommitments] = useState(0);
  const [reserveA, setReserveA] = useState(1000);
  const [reserveB, setReserveB] = useState(1000);
  const [myOrders, setMyOrders] = useState<{ amount: string, side: string, status: string }[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [selectedSide, setSelectedSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isProcessing, setIsProcessing] = useState(false);

  const { deploy, commitOrder, revealAndMatch, settle, contractAddress, isDeploying } = useDarkPoolContract();

  const handleCommitOrder = async () => {
    if (!amountInput || isNaN(Number(amountInput)) || !walletState.connectedAPI) return;
    setIsProcessing(true);
    
    // 1. Real commitOrder transaction
    console.log("Submitting real commitOrder tx...");
    const txHash = await commitOrder(walletState.connectedAPI, Number(amountInput), selectedSide === 'BUY');
    
    if (txHash) {
      setActiveCommitments(prev => prev + 1);
      setMyOrders(prev => [...prev, { amount: amountInput, side: selectedSide, status: 'Committed', txHash }]);
      
      // Real revealAndMatch transaction
      console.log("Submitting real revealAndMatch tx...");
      const matchTxHash = await revealAndMatch(walletState.connectedAPI, Number(amountInput), selectedSide === 'BUY');
      
      if (matchTxHash) {
        setMyOrders(prev => prev.map(o => 
          o.txHash === txHash ? { ...o, status: 'Matched', txHash: matchTxHash } : o
        ));
        
        // Real settle transaction
        console.log("Submitting real settle tx...");
        const settleTxHash = await settle(walletState.connectedAPI, Number(amountInput), selectedSide === 'BUY');
        
        if (settleTxHash) {
          setActiveCommitments(prev => Math.max(0, prev - 1));
          if (selectedSide === 'BUY') {
            setReserveB(prev => prev + Number(amountInput));
          } else {
            setReserveA(prev => prev + Number(amountInput));
          }
          
          setMyOrders(prev => prev.map(o => 
            o.txHash === matchTxHash ? { ...o, status: 'Settled', txHash: settleTxHash } : o
          ));
        }
      }
    }
    
    setAmountInput('');
    setIsProcessing(false);
  };

  return (
    <div style={{ background: '#020617', minHeight: '100vh', color: 'white', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h2 style={{ margin: 0, background: 'linear-gradient(to right, #38bdf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>UMBRA</h2>
        <div style={{ background: '#1e293b', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #334155' }}>
          {walletState.address ? (
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              Connected: {walletState.address.slice(0, 8)}...{walletState.address.slice(-6)}
            </span>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#ef4444' }}>Not Connected</span>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Order Ticket</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Submit a zero-knowledge commitment to the dark pool.</p>
          
          <button 
            onClick={() => { if (walletState.connectedAPI) deploy(walletState.connectedAPI); }} 
            disabled={isDeploying || !!contractAddress || !walletState.connectedAPI}
            style={{ width: '100%', padding: '0.75rem', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', cursor: (isDeploying || !!contractAddress || !walletState.connectedAPI) ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}
          >
            {contractAddress ? `Contract Deployed` : isDeploying ? 'Deploying...' : 'Deploy Contract'}
          </button>
          {contractAddress && <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginBottom: '1rem', wordBreak: 'break-all' }}>Address: {contractAddress}</div>}
          
          <div style={{ marginTop: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Amount (tDUST)</label>
            <input 
              type="number" 
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              placeholder="0.0" 
              style={{ width: '100%', background: '#020617', border: '1px solid #334155', padding: '1rem', borderRadius: '8px', color: 'white', outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={() => setSelectedSide('BUY')}
              style={{ background: selectedSide === 'BUY' ? 'rgba(56, 189, 248, 0.2)' : 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              BUY
            </button>
            <button 
              onClick={() => setSelectedSide('SELL')}
              style={{ background: selectedSide === 'SELL' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              SELL
            </button>
          </div>

          <button 
            disabled={isProcessing || !amountInput || !walletState.connectedAPI}
            onClick={handleCommitOrder}
            style={{ width: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)', opacity: (isProcessing || !amountInput || !walletState.connectedAPI) ? 0.5 : 1, border: 'none', padding: '1rem', borderRadius: '8px', color: 'white', fontWeight: 'bold', marginTop: '2rem', cursor: (isProcessing || !amountInput || !walletState.connectedAPI) ? 'not-allowed' : 'pointer' }}>
            {isProcessing ? 'Generating ZK Proof...' : 'Commit Order'}
          </button>
        </div>

        <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Pool Status (Standalone Node)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #1e293b' }}>
            <span style={{ color: '#94a3b8' }}>Active Commitments</span>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{activeCommitments}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #1e293b' }}>
            <span style={{ color: '#94a3b8' }}>Reserve A</span>
            <span style={{ fontWeight: 'bold' }}>{reserveA}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0' }}>
            <span style={{ color: '#94a3b8' }}>Reserve B</span>
            <span style={{ fontWeight: 'bold' }}>{reserveB}</span>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ color: '#f8fafc' }}>My Orders</h4>
            <div style={{ padding: '1rem', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.9rem', minHeight: '100px' }}>
              {myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>No active commitments found.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {myOrders.map((o, i) => (
                    <li key={i} style={{ marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: o.side === 'BUY' ? '#38bdf8' : '#ef4444' }}>{o.side} {o.amount}</span>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                          {o.status}
                        </span>
                      </div>
                      {o.txHash && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Tx: {o.txHash}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
