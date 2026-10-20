import { useState } from "react";

const PAYMENT_METHODS = [
  { value: "Tunai", label: "Tunai" },
  { value: "QRIS", label: "QRIS / Statis" },
  { value: "Debit", label: "Kartu Debit" },
  { value: "Transfer", label: "Transfer Bank" },
];

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

export default function WalkInForm({ nameInputRef, services, barbers, usedChairs, freeChair, onSubmit }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState(null);
  const [barberId, setBarberId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Barber yang sedang melayani di salah satu kursi dianggap sibuk.
  const busyBarbers = {};
  Object.entries(usedChairs).forEach(([chair, booking]) => {
    busyBarbers[booking.barber_id] = chair;
  });

  const selectedService = services.find((s) => s.id === serviceId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerName.trim() || !serviceId || !barberId) {
      setError("Nama tamu, layanan, dan barber wajib dipilih.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await onSubmit({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        service_id: serviceId,
        barber_id: barberId,
        payment_method: paymentMethod,
      });
      setSuccess(`Walk-in ${created.ticket_code} tersimpan dan sudah lunas.`);
      setCustomerName("");
      setCustomerPhone("");
      setServiceId(null);
      setBarberId(null);
      setPaymentMethod("Tunai");
    } catch (err) {
      setError(err.message || "Walk-in gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="walkin-form-card" onSubmit={handleSubmit}>
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
      </div>

      <div className="walkin-station-badge">
        <span className="dot-ready"></span>
        {freeChair ? <>Stasiun Tersedia: Kursi {String(freeChair).padStart(2, "0")}</> : <>Semua kursi sedang terisi</>}
      </div>

      <div className="w-form-group">
        <label htmlFor="walkin-name">NAMA TAMU *</label>
        <input
          id="walkin-name"
          ref={nameInputRef}
          type="text"
          placeholder="Nama pelanggan walk-in..."
          value={customerName}
          maxLength={100}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div className="w-form-group">
        <label htmlFor="walkin-phone">NOMOR WHATSAPP / HP</label>
        <input
          id="walkin-phone"
          type="text"
          placeholder="0812-xxxx-xxxx (opsional untuk e-struk)"
          value={customerPhone}
          maxLength={20}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <div className="w-section-title">PILIHAN LAYANAN</div>
      <div className="w-service-options">
        {services.length === 0 && <p className="queue-empty">Memuat layanan...</p>}
        {services.map((service) => (
          <label key={service.id} className={`w-radio-card${serviceId === service.id ? " active" : ""}`}>
            <input type="radio" name="service" checked={serviceId === service.id} onChange={() => setServiceId(service.id)} />
            <div className="w-radio-content">
              <div className="w-radio-text">
                <strong>{service.name}</strong>
                <span>{service.description || `${service.duration_minutes} menit`}</span>
              </div>
              <div className="w-radio-price">{formatRupiah(service.price)}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="w-section-title split-title">
        <span>BARBER PILIHAN</span>
        <span className="w-link-text">Pilih barber yang sedang siap</span>
      </div>

      <div className="w-chair-grid">
        {barbers.map((barber) => {
          const busyChair = busyBarbers[barber.id];
          const disabled = !barber.available || Boolean(busyChair);
          const active = barberId === barber.id;
          return (
            <label key={barber.id} className={`w-chair-card ${disabled ? "busy" : "ready"}${active ? " active" : ""}`}>
              <div className="w-chair-header">
                <span>
                  <input type="radio" name="barber" disabled={disabled} checked={active} onChange={() => setBarberId(barber.id)} />{" "}
                  {barber.name}
                </span>
                <span className={disabled ? "badge-busy" : "badge-ready"}>{disabled ? "Sibuk" : "SIAP"}</span>
              </div>
              <div className="w-chair-body">
                <span className={disabled ? "" : "text-green"}>
                  {!barber.available ? "Tidak bertugas" : busyChair ? `Sedang di Kursi ${busyChair}` : "Tersedia langsung"}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="w-summary-box">
        <div className="w-summary-row total">
          <span>TOTAL TAGIHAN</span>
          <span>{formatRupiah(selectedService?.price)}</span>
        </div>

        <div className="w-payment-header">
          <span>ALUR PEMBAYARAN KASIR</span>
          <span className="badge-pay-front">Bayar Di Muka</span>
        </div>

        <div className="w-payment-options">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.value} className={`w-pay-opt${paymentMethod === method.value ? " active" : ""}`}>
              <input type="radio" name="payment" checked={paymentMethod === method.value} onChange={() => setPaymentMethod(method.value)} />
              <span>{method.label}</span>
            </label>
          ))}
        </div>

        <div className="w-payment-alert">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Wajib lunas sebelum tiket antrean fisik diterbitkan & masuk rotasi kursi.</span>
        </div>

        {error && <p className="cashier-alert" role="alert">{error}</p>}
        {success && <p className="cashier-success" role="status">{success}</p>}

        <button type="submit" className="btn-confirm-pay" disabled={submitting}>
          {submitting ? "Menyimpan..." : "Konfirmasi Bayar & Simpan Walk-in"}
        </button>
      </div>
    </form>
  );
}
