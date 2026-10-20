export default function ChairRotation({ usedChairs, totalChairs }) {
  const chairs = Array.from({ length: totalChairs }, (_, i) => i + 1);

  return (
    <div className="chair-rotation-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'var(--font-serif)' }}>Rotasi Kursi Hari Ini</h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>Kapasitas Maks: {totalChairs} Kursi Paralel</span>
      </div>
      <div className="chair-grid">
        {chairs.map((chair) => {
          const booking = usedChairs[chair];
          const label = `KURSI ${String(chair).padStart(2, "0")}`;
          return booking ? (
            <div key={chair} className="chair-card chair-active">
              <div className="chair-header"><span>{label}</span> <span className="chair-status-badge">Aktif</span></div>
              <div className="chair-body"><strong>{booking.barber_name}</strong><span>{booking.customer_name} • Sedang Berjalan</span></div>
            </div>
          ) : (
            <div key={chair} className="chair-card chair-ready">
              <div className="chair-header"><span>{label}</span> <span className="chair-status-badge">Ready</span></div>
              <div className="chair-body"><strong>Kosong</strong><span style={{ color: '#059669', fontSize: '13px', display: 'block' }}>Tersedia / Siap</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
