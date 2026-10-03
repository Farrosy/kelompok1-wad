export default function WalkInForm() {
  return (
    <div className="walkin-form-card">
      <div className="walkin-header">
        <div className="walkin-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#78350f" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <h3>Input Walk-In Cepat</h3>
        </div>
        <span className="walkin-ticket-id">#KB-108</span>
      </div>

      <div className="walkin-station-badge">
        <span className="dot-ready"></span> Stasiun Tersedia: Kursi 03 <span>(Barber Bima Sakti Siap)</span>
      </div>

      <div className="w-form-group">
        <label>NAMA TAMU *</label>
        <input type="text" placeholder="Nama pelanggan walk-in..." />
      </div>

      <div className="w-form-group">
        <label>NOMOR WHATSAPP / HP</label>
        <input type="text" placeholder="0812-xxxx-xxxx (opsional untuk e-struk)" />
      </div>

      <div className="w-section-title">PILIHAN LAYANAN CEPAT</div>
      <div className="w-service-options">
        <label className="w-radio-card active">
          <input type="radio" name="service" defaultChecked />
          <div className="w-radio-content">
            <div className="w-radio-text">
              <strong>Signature Haircut & Styling</strong>
              <span>Wash, Precision Cut, Tonic, Styling Gel</span>
            </div>
            <div className="w-radio-price">Rp 180.000</div>
          </div>
        </label>

        <label className="w-radio-card">
          <input type="radio" name="service" />
          <div className="w-radio-content">
            <div className="w-radio-text">
              <strong>The Gentleman Complete</strong>
              <span>Haircut + Beard Sculpt + Hot Towel & Massage</span>
            </div>
            <div className="w-radio-price">Rp 260.000</div>
          </div>
        </label>

        <label className="w-radio-card">
          <input type="radio" name="service" />
          <div className="w-radio-content">
            <div className="w-radio-text">
              <strong>Beard Sculpt & Trim</strong>
              <span>Shave, Edge Lining & Soothing Balm</span>
            </div>
            <div className="w-radio-price">Rp 110.000</div>
          </div>
        </label>
      </div>

      <div className="w-section-title split-title">
        <span>ALOKASI KURSI / BARBER PILIHAN</span>
        <span className="w-link-text">Pilih staf atau otomatis</span>
      </div>

      <div className="w-chair-grid">
        <label className="w-chair-card busy">
          <div className="w-chair-header">
            <span><input type="radio" name="chair" disabled /> Kursi 01</span>
            <span className="badge-busy">Sibuk</span>
          </div>
          <div className="w-chair-body">
            <strong>Master Bayu</strong>
            <span>~15 mnt lagi</span>
          </div>
        </label>

        <label className="w-chair-card busy">
          <div className="w-chair-header">
            <span><input type="radio" name="chair" disabled /> Kursi 02</span>
            <span className="badge-busy">Sibuk</span>
          </div>
          <div className="w-chair-body">
            <strong>Dimas Arya</strong>
            <span>~25 mnt lagi</span>
          </div>
        </label>

        <label className="w-chair-card ready active">
          <div className="w-chair-header">
            <span><input type="radio" name="chair" defaultChecked /> Kursi 03</span>
            <span className="badge-ready">SIAP</span>
          </div>
          <div className="w-chair-body">
            <strong>Bima Sakti</strong>
            <span className="text-green">Tersedia langsung</span>
          </div>
        </label>

        <label className="w-chair-card busy">
          <div className="w-chair-header">
            <span><input type="radio" name="chair" disabled /> Kursi 04</span>
            <span className="badge-busy">Sibuk</span>
          </div>
          <div className="w-chair-body">
            <strong>Ardi Gunawan</strong>
            <span>~30 mnt lagi</span>
          </div>
        </label>
      </div>

      <label className="w-addon-checkbox">
        <div className="w-addon-left">
          <input type="checkbox" />
          <span>Pomade Matte Clay (BARBER ONE Formula 80g)</span>
        </div>
        <strong className="w-addon-price">+Rp 110.000</strong>
      </label>

      <div className="w-summary-box">
        <div className="w-summary-row">
          <span>Subtotal</span>
          <span>Rp 180.000</span>
        </div>
        <div className="w-summary-row">
          <span>PPN (10%)</span>
          <span>Rp 18.000</span>
        </div>
        <div className="w-summary-row total">
          <span>TOTAL TAGIHAN</span>
          <span>Rp 198.000</span>
        </div>

        <div className="w-payment-header">
          <span>ALUR PEMBAYARAN KASIR</span>
          <span className="badge-pay-front">Bayar Di Muka</span>
        </div>

        <div className="w-payment-options">
          <label className="w-pay-opt active">
            <input type="radio" name="payment" defaultChecked />
            <span>QRIS / Statis</span>
          </label>
          <label className="w-pay-opt">
            <input type="radio" name="payment" />
            <span>Transfer Bank</span>
          </label>
        </div>

        <div className="w-payment-alert">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Wajib lunas sebelum tiket antrean fisik diterbitkan & masuk rotasi kursi.</span>
        </div>

        <button className="btn-confirm-pay">
          🖨️ Konfirmasi Bayar & Cetak Tiket
        </button>

        <div className="w-print-status">
          <span>🖨️ Cetak Tiket (Setelah Lunas)</span>
          <span className="text-green">Otomatis Cetak Thermal</span>
        </div>
      </div>
    </div>
  );
}