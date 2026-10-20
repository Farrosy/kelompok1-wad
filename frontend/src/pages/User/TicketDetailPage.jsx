import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CircleAlert, CircleCheck, Clock3, CreditCard, MapPin, Scissors, Ticket, UserRound } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import ReviewForm from "./components/ReviewForm";
import "./TicketsPage.css";

function getToken() {
  return localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function bookingStatusLabel(status, paid, pending, chairNumber) {
  const chair = chairNumber > 0 ? ` · Kursi ${chairNumber}` : "";
  if (status === "Sedang Dilayani") return `Sedang Dilayani${chair}`;
  if (status === "Dikonfirmasi" || (status === "Menunggu" && paid)) return `Menunggu Kedatangan${chair}`;
  if (status === "Menunggu" && pending) return "Menunggu Pembayaran";
  if (status === "Batal") return "Dibatalkan";
  return status;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentReturned = searchParams.get("payment") === "return";
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }
    const controller = new AbortController();
    let timer;
    let attempts = 0;
    const loadBooking = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const body = await response.json();
        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!response.ok) throw new Error(body.error || "Gagal memuat detail booking.");
        setBooking(body.booking);
        if (paymentReturned && String(body.booking?.payment_status || "").toLowerCase() !== "lunas" && attempts < 10) {
          attempts += 1;
          timer = window.setTimeout(loadBooking, 3000);
        }
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Tidak dapat terhubung ke server.");
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [id, navigate, paymentReturned]);

  async function continuePayment() {
    setPaying(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${id}/payment`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Tidak dapat memulai pembayaran.");
      window.location.assign(body.payment_redirect_url);
    } catch (err) {
      setError(err.message || "Tidak dapat terhubung ke server.");
      setPaying(false);
    }
  }

  if (loading) return <main className="tp-page"><div className="tp-inner"><p className="tp-muted">Memuat detail reservasi...</p></div></main>;
  if (!booking) return <main className="tp-page"><div className="tp-inner"><p className="tp-error">{error || "Booking tidak ditemukan."}</p><Link to="/dashboard/tickets" className="tp-detail-back"><ArrowLeft size={15} /> Kembali ke reservasi</Link></div></main>;

  const paid = String(booking.payment_status || "").toLowerCase() === "lunas";
  const pending = String(booking.payment_status || "").toLowerCase() === "menunggu";
  const paymentExpiry = booking.payment_expires_at ? new Date(booking.payment_expires_at) : null;
  const canContinuePending = pending && booking.payment_redirect_url && (!paymentExpiry || paymentExpiry > new Date());
  const canRetry = String(booking.payment_status || "").toLowerCase() === "gagal";
  const returnedMessage = paid
    ? "Pembayaran berhasil dikonfirmasi Midtrans."
    : pending
      ? "Status pembayaran sedang diperiksa. Halaman ini memperbarui status secara otomatis."
      : "Pembayaran belum berhasil. Anda dapat mencoba kembali jika jadwal masih tersedia.";

  return (
    <main className="tp-page">
      <div className="tp-inner tp-detail-page">
        <Link to="/dashboard/tickets" className="tp-detail-back"><ArrowLeft size={15} /> Kembali ke Tiket &amp; Profil Saya</Link>
        <header className="tp-detail-page-header">
          <div><p className="tp-crumb"><Link to="/dashboard/tickets">TIKET &amp; PROFIL SAYA</Link> / <span>DETAIL RESERVASI</span></p><h1 className="tp-title">Detail Reservasi</h1></div>
          <div className="tp-detail-badges"><span className={`tp-detail-badge${paid && booking.status !== "Batal" ? " is-success" : ""}`}>{bookingStatusLabel(booking.status, paid, pending, booking.chair_number)}</span></div>
        </header>

        {paymentReturned && <div className={`tp-detail-notice${paid ? " is-success" : ""}`} role="status">{paid ? <CircleCheck size={18} /> : <CircleAlert size={18} />}{returnedMessage}</div>}
        {error && <p className="tp-error" role="alert">{error}</p>}

        <div className="tp-detail-layout">
          <section className="tp-detail-panel">
            <h2>Informasi Reservasi</h2>
            <div className="tp-detail-row"><Scissors size={17} /><div><small>Layanan</small><strong>{booking.service_name}</strong><span>{booking.duration_minutes} menit</span></div></div>
            <div className="tp-detail-row"><CalendarDays size={17} /><div><small>Jadwal</small><strong>{new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong><span>{booking.booking_time} WIB</span></div></div>
            <div className="tp-detail-row"><UserRound size={17} /><div><small>Barber</small><strong>{booking.barber_name}</strong><span><MapPin size={13} /> Senopati</span></div></div>
            <div className="tp-detail-row"><UserRound size={17} /><div><small>Pemesan</small><strong>{booking.customer_name}</strong><span>{booking.customer_phone}</span></div></div>
            {booking.notes && <div className="tp-detail-notes"><small>Catatan</small><p>{booking.notes}</p></div>}
            <div className="tp-detail-ticket-code"><Ticket size={16} /><div><small>Kode tiket reservasi</small><strong>{booking.ticket_code}</strong></div></div>
          </section>

          <aside className={`tp-detail-panel${paid ? " is-paid" : ""}`}>
            <h2>Status Pembayaran</h2>
            <div className="tp-detail-amount"><span>Total</span><strong>{formatRupiah(booking.total_amount || booking.price)}</strong></div>
            <p className="tp-detail-payment-method"><CreditCard size={16} /> {paid ? `Dibayar via ${booking.payment_method || "Midtrans"}` : "Pembayaran melalui Midtrans"}</p>
            {pending && booking.payment_expires_at && <p className="tp-detail-expiry"><Clock3 size={14} /> Sesi berlaku hingga {new Date(booking.payment_expires_at).toLocaleString("id-ID")}</p>}
            {(canContinuePending || canRetry) && <button className="tp-btn tp-btn-primary tp-detail-pay" type="button" onClick={continuePayment} disabled={paying}>{paying ? "Menyiapkan pembayaran..." : canRetry ? "Buat Sesi Pembayaran Baru" : "Lanjutkan Pembayaran"}</button>}
            {paid && <p className="tp-detail-paid"><CircleCheck size={16} /> Pembayaran telah dikonfirmasi.</p>}
            {pending && !canContinuePending && <p className="tp-detail-expiry">Sesi pembayaran sedang diperbarui oleh Midtrans. Muat ulang beberapa saat lagi untuk mencoba kembali.</p>}
          </aside>
        </div>
        <ReviewForm bookingId={booking.id} completed={booking.status === "Selesai"} />
      </div>
    </main>
  );
}
