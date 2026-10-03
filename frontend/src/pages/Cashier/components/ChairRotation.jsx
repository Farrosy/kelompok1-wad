export default function ChairRotation() {
  return (
    <div className="chair-rotation-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'var(--font-serif)' }}>Rotasi Kursi Hari Ini</h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>Kapasitas Maks: 4 Kursi Paralel</span>
      </div>
      <div className="chair-grid">
        <div className="chair-card chair-active">
          <div className="chair-header"><span>KURSI 01</span> <span className="chair-status-badge">Aktif</span></div>
          <div className="chair-body"><strong>M. Bayu</strong><span>Sedang Berjalan</span></div>
        </div>
        <div className="chair-card chair-active">
          <div className="chair-header"><span>KURSI 02</span> <span className="chair-status-badge">Aktif</span></div>
          <div className="chair-body"><strong>Dimas Arya</strong><span>Sedang Berjalan</span></div>
        </div>
        <div className="chair-card chair-ready">
          <div className="chair-header"><span>KURSI 03</span> <span className="chair-status-badge">Ready</span></div>
          <div className="chair-body"><strong>Bima Sakti</strong><span style={{ color: '#059669', fontSize: '13px', display: 'block' }}>Tersedia / Siap</span></div>
        </div>
        <div className="chair-card chair-active">
          <div className="chair-header"><span>KURSI 04</span> <span className="chair-status-badge">Aktif</span></div>
          <div className="chair-body"><strong>Ardi Gunawan</strong><span>Sedang Berjalan</span></div>
        </div>
      </div>
    </div>
  );
}