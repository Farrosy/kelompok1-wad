const queue = [
  { ticket: "BO-024", name: "Rizky Pratama", service: "Classic Cut", time: "10.30", status: "Menunggu" },
  { ticket: "BO-025", name: "Andi Saputra", service: "Haircut + Wash", time: "10.45", status: "Menunggu" },
  { ticket: "BO-026", name: "Dimas Putra", service: "Beard Trim", time: "11.00", status: "Dikonfirmasi" },
];

export default function CashierDashboard() {
  return (
    <section className="cashier-dashboard-page">
      {/* Top Action Bar */}
      <div className="cashier-subbar">
        <div className="subbar-left">
          <div className="active-station-badge">
            <span className="dot-active" />
            <strong>Kasir 01 Aktif</strong>
            <span className="subbar-subtext">• Senopati Lounge</span>
          </div>

          <div className="current-date-tag">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Sabtu, 24 Mei 2025</span>
          </div>
        </div>

        <div className="subbar-right">
          <button type="button" className="btn-subbar-refresh" onClick={() => window.location.reload()}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>

          <button type="button" className="btn-subbar-add">
            <span>+</span> + Tambah Walk-in
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="cashier-metrics-grid">
        {/* Card 1: Antrean Menunggu */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">ANTREAN MENUNGGU</span>
            <div className="metric-icon-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
              </svg>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">4</span>
            <span className="metric-label">Pelanggan</span>
          </div>
          <div className="metric-footer-note">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Estimasi tunggu ~20 mnt</span>
          </div>
        </div>

        {/* Card 2: Kapasitas Kursi */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">KAPASITAS KURSI</span>
            <div className="metric-icon-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
                <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
                <path d="M5 18v2M19 18v2" />
              </svg>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">3</span>
            <span className="metric-slash">/ 4</span>
            <span className="metric-label">Kursi Terisi</span>
          </div>
          <div className="chair-indicator-row">
            <span className="chair-dot filled" />
            <span className="chair-dot filled" />
            <span className="chair-dot empty" />
            <span className="chair-dot filled" />
            <span className="chair-note">Kursi 3 Tersedia</span>
          </div>
        </div>

        {/* Card 3: Selesai Hari Ini */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">SELESAI HARI INI</span>
            <div className="metric-icon-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">18</span>
            <span className="metric-label">Sesi Selesai</span>
          </div>
          <div className="metric-trend-row">
            <span className="trend-arrow">↑</span>
            <strong>+12%</strong>
            <span>vs hari kemarin</span>
          </div>
        </div>

        {/* Card 4: Omzet Sementara */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">OMZET SEMENTARA</span>
            <div className="metric-icon-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-currency-text">Rp 2.450.000</span>
          </div>
          <div className="metric-omzet-footer">
            <span>14 Tunai • 4 QRIS/Debit</span>
            <a href="#kas" className="open-cash-link">Buka Kas →</a>
          </div>
        </div>
      </div>

      {/* Tabel Antrean */}
      <section className="cashier-queue-card" aria-labelledby="queue-title">
        <div className="cashier-queue-heading">
          <div>
            <h2 id="queue-title">Antrean Booking</h2>
            <p>Daftar pelanggan dan jadwal layanan terdekat.</p>
          </div>
          <button type="button" className="cashier-refresh" onClick={() => window.location.reload()}>Muat ulang</button>
        </div>
        <div className="cashier-table-wrap">
          <table className="cashier-table">
            <thead>
              <tr>
                <th>No. Tiket</th>
                <th>Pelanggan</th>
                <th>Layanan</th>
                <th>Jadwal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.ticket}>
                  <td className="cashier-ticket">{item.ticket}</td>
                  <td>{item.name}</td>
                  <td>{item.service}</td>
                  <td>{item.time}</td>
                  <td>
                    <span className={`cashier-status ${item.status === "Menunggu" ? "is-waiting" : "is-confirmed"}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}