export default function Navbar() {
  return (
    <nav style={{
      top: 0, left: 0, width: "100%", height: "4rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 2rem", backgroundColor: "#020617", zIndex: 50,
      borderBottom: "1px solid #1e293b", boxSizing: "border-box"
    }}>
      <div style={{ fontWeight: 800, letterSpacing: '0.2em', fontSize: '1.2rem', color: '#f8fafc' }}>
        UM<span style={{ color: '#38bdf8' }}>B</span>RA
      </div>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em' }}>TRADE</a>
        <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em' }}>POOL</a>
      </div>
    </nav>
  );
}