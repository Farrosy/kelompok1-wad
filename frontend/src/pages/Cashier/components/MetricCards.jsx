export default function MetricCards() {
  return (
    <div className="cashier-metrics-grid">
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
  );
}