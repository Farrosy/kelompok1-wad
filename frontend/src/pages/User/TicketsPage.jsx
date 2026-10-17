import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Ticket,
  Hash,
  CalendarDays,
  Scissors,
  MapPin,
  Clock,
  Wallet,
  Copy,
  Check,
  CalendarPlus,
  CalendarClock,
  XCircle,
  ShieldCheck,
  CheckCircle2,
  Armchair,
  Info,
  Car,
  Phone,
  ArrowUpRight,
  Download,
  RotateCcw,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import "./TicketsPage.css";

const BRANCH = "Senopati";
const BARBER_COLORS = { "Master Bayo": "#c8a86b", "Ilham Arya": "#7b9e87", "Dino Saleh": "#8a7db5" };
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_UI = {
  Menunggu: { pill: "MENUNGGU KONFIRMASI", tone: "amber", queue: "Menunggu Konfirmasi" },
  Dikonfirmasi: { pill: "TERKONFIRMASI & SIAP DATANG", tone: "green", queue: "On-Time (Tepat Waktu)" },
  "Sedang Dilayani": { pill: "SEDANG DILAYANI", tone: "green", queue: "Sedang Dilayani" },
};

function getToken() {
  return localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
}

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

// "YYYY-MM-DD" -> Date lokal (tanpa pergeseran zona waktu)
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function initialsOf(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function arrivalLabel(booking) {
  const date = parseDate(booking.booking_date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const base = `${DAYS_LONG[date.getDay()]} ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
  return `${isToday ? "Hari Ini, " : ""}${base} • ${booking.booking_time} WIB`;
}

export default function TicketsPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [year, setYear] = useState("SEMUA");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelledCode, setCancelledCode] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/my-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        const body = await response.json();
        if (!response.ok) {
          setError(body.error || "Gagal memuat data tiket.");
          return;
        }
        setData(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Tidak dapat terhubung ke server.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [navigate]);

  const t = data?.active ?? null;
  const stats = data?.stats ?? { visits: 0, favorite_barber: "" };
  const allHistory = data?.history ?? [];
  const yearFilters = ["SEMUA", ...Array.from(new Set(allHistory.map((h) => h.booking_date.slice(0, 4))))];
  const history = allHistory.filter((h) => year === "SEMUA" || h.booking_date.startsWith(year));
  const isPaid = t?.payment_status === "Lunas";
  const ui = t ? STATUS_UI[t.status] ?? STATUS_UI.Menunggu : null;

  function copyCode() {
    navigator.clipboard?.writeText(t.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function cancelBooking() {
    if (!t || !window.confirm("Batalkan janji ini?")) return;
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${t.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Gagal membatalkan booking.");
        return;
      }
      setCancelledCode(t.ticket_code);
      setData((prev) => ({ ...prev, active: null }));
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="tp-page">
        <div className="tp-inner">
          <p className="tp-muted">Memuat tiket Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-page">
      <div className="tp-inner">
        {/* ── Header ── */}
        <header className="tp-header">
          <div>
            <p className="tp-crumb">
              <Link to="/dashboard">BERANDA</Link> / <span>TIKET &amp; PROFIL SAYA</span>
            </p>
            <h1 className="tp-title">Halo, {data?.user?.name ?? "Pelanggan"}</h1>
          </div>
          <div className="tp-stats">
            <div className="tp-stat">
              <CalendarDays size={14} />
              <span className="tp-stat-label">KUNJUNGAN:</span>
              <strong>{stats.visits} Kali</strong>
            </div>
            <div className="tp-stat">
              <Scissors size={14} />
              <span className="tp-stat-label">BARBER FAVORIT:</span>
              <strong>{stats.favorite_barber || "-"}</strong>
            </div>
            <div className="tp-stat">
              <MapPin size={14} />
              <span className="tp-stat-label">CABANG:</span>
              <strong>{BRANCH}</strong>
            </div>
          </div>
        </header>

        {error && <p className="tp-error">{error}</p>}

        {/* ── Active ticket ── */}
        {!t ? (
          <section className="tp-empty">
            <XCircle size={36} />
            <h2>{cancelledCode ? "Janji Dibatalkan" : "Belum Ada Tiket Aktif"}</h2>
            <p>
              {cancelledCode
                ? `Reservasi ${cancelledCode} telah dibatalkan. Anda dapat membuat reservasi baru kapan saja.`
                : "Anda belum memiliki reservasi mendatang. Buat reservasi baru kapan saja."}
            </p>
            <Link to="/dashboard" className="tp-btn tp-btn-primary">
              <CalendarPlus size={14} /> Buat Reservasi Baru
            </Link>
          </section>
        ) : (
          <section className="tp-ticket-wrap">
            <div className="tp-ticket-tabs">
              <span className="tp-tab-left">
                <Ticket size={14} /> TIKET RESERVASI TERKONFIRMASI
              </span>
              <span className="tp-tab-right">VERIFIKASI &amp; CHECK-IN BARBERSHOP</span>
            </div>

            <div className="tp-ticket">
              <div className="tp-ticket-main">
                <div className="tp-ticket-top">
                  <div className="tp-brand">
                    <span className="tp-brand-name">
                      BARBER
                      <br />
                      ONE
                    </span>
                    <span className="tp-brand-branch">{BRANCH} Atelier</span>
                    <span className="tp-brand-code">#{t.ticket_code}</span>
                  </div>
                  <span className={`tp-pill tp-pill-${ui.tone}`}>
                    <span className={`tp-dot${ui.tone === "amber" ? " tp-dot-amber" : ""}`} /> {ui.pill}
                  </span>
                </div>

                <div className="tp-ticket-body">
                  <div className="tp-service">
                    <p className="tp-label">LAYANAN TERPILIH</p>
                    <h2 className="tp-service-name">{t.service_name}</h2>
                    <p className="tp-service-desc">{t.notes || t.service_description}</p>
                    <div className="tp-meta">
                      <span>
                        <Clock size={14} /> {t.duration_minutes} Menit
                      </span>
                      <span>
                        <Wallet size={14} /> {formatRupiah(t.total_amount)}
                      </span>
                      <span className="tp-meta-gold">
                        {isPaid ? `LUNAS VIA ${(t.payment_method || "").toUpperCase()}` : "BAYAR DI KASIR"}
                      </span>
                    </div>
                  </div>

                  <div className="tp-barber-card">
                    <p className="tp-label">BARBER &amp; KURSI</p>
                    <div className="tp-barber-row">
                      <div className="tp-avatar" style={{ background: BARBER_COLORS[t.barber_name] || "#c8a86b" }}>
                        {initialsOf(t.barber_name)}
                      </div>
                      <div>
                        <strong>{t.barber_name}</strong>
                        <p className="tp-gold-text">★ {Number(t.barber_rating).toFixed(1)}</p>
                      </div>
                    </div>
                    <p className="tp-chair">
                      <Armchair size={14} /> Kursi #{String(t.chair_number).padStart(2, "0")} (Atelier {BRANCH})
                    </p>
                  </div>
                </div>

                <div className="tp-schedule">
                  <div>
                    <p className="tp-label">JADWAL KEDATANGAN</p>
                    <strong className="tp-schedule-main">{arrivalLabel(t)}</strong>
                    <p className="tp-muted">
                      Estimasi selesai pukul {addMinutes(t.booking_time, t.duration_minutes)} WIB
                    </p>
                  </div>
                  <div>
                    <p className="tp-label">STATUS ANTREAN KURSI</p>
                    <strong className="tp-schedule-status">
                      <span className="tp-dot tp-dot-grey" /> {ui.queue}
                    </strong>
                    <p className="tp-muted">Disarankan tiba 5–10 menit sebelum slot</p>
                  </div>
                </div>

                <div className="tp-actions">
                  <Link to="/dashboard" className="tp-btn tp-btn-outline">
                    <CalendarClock size={14} /> Jadwalkan Ulang (Reschedule)
                  </Link>
                  <button
                    type="button"
                    className="tp-btn tp-btn-ghost"
                    onClick={cancelBooking}
                    disabled={cancelling || t.status === "Sedang Dilayani"}
                  >
                    <XCircle size={14} /> {cancelling ? "Membatalkan..." : "Batal Janji"}
                  </button>
                  <button type="button" className="tp-btn tp-btn-primary tp-actions-end">
                    <CalendarPlus size={14} /> Simpan ke Kalender
                  </button>
                </div>
              </div>

              <aside className="tp-ticket-side">
                <div className="tp-code-card">
                  <p className="tp-code-label">
                    <Hash size={13} /> KODE TIKET RESERVASI
                  </p>
                  <div className="tp-code">{t.ticket_code}</div>
                  <button type="button" className="tp-copy" onClick={copyCode}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "TERSALIN" : "SALIN KODE"}
                  </button>
                  <p className="tp-muted tp-center">
                    Tunjukkan kode tiket ini ke staf kasir / resepsionis saat tiba di barbershop
                  </p>
                </div>

                <div className="tp-pay-status">
                  <span>
                    <ShieldCheck size={15} /> STATUS PEMBAYARAN
                    <small>
                      {isPaid ? `Sudah Lunas via ${t.payment_method}` : "Menunggu pembayaran gateway"}
                    </small>
                  </span>
                  <CheckCircle2 size={18} className={isPaid ? "tp-green" : "tp-muted-icon"} />
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* ── Guide + Location ── */}
        <section className="tp-info-grid">
          <article className="tp-card">
            <div className="tp-card-head">
              <span>
                <Info size={14} /> PANDUAN KEDATANGAN &amp; FASILITAS
              </span>
              <span className="tp-tag">ATELIER GUEST</span>
            </div>
            <div className="tp-tip">
              <Clock size={16} />
              <div>
                <strong>Waktu Kedatangan Tepat</strong>
                <p>
                  Hadir 5–10 menit sebelum jadwal agar ritual konsultasi dan cuci rambut berjalan optimal tanpa
                  terburu-buru.
                </p>
              </div>
            </div>
            <div className="tp-tip">
              <Car size={16} />
              <div>
                <strong>Fasilitas Tamu &amp; Layanan Tambahan</strong>
                <p>
                  Parkir aman &amp; valet saat peak hour, hot towel &amp; scalp refresh, high speed WiFi, serta
                  ruangan AC dengan air purifier.
                </p>
              </div>
            </div>
            <div className="tp-card-foot">
              <span>
                <Phone size={13} /> Concierge WhatsApp: <strong>+62 21 1234 5678</strong>
              </span>
              <a href="tel:+622112345678" className="tp-link">
                HUBUNGI <ArrowUpRight size={12} />
              </a>
            </div>
          </article>

          <article className="tp-card">
            <div className="tp-card-head">
              <span>
                <MapPin size={14} /> LOKASI CABANG AKTIF
              </span>
              <span className="tp-tag tp-tag-gold">SENOPATI FLAGSHIP</span>
            </div>
            <h3 className="tp-loc-title">BARBER ONE Senopati Flagship</h3>
            <p className="tp-muted">
              Jl. Senopati No. 5a, Kebayoran Baru, Jakarta Selatan (Tersedia area valet drop-off di lobi depan).
            </p>
            <div className="tp-map">
              <iframe
                title="Lokasi Barber One Senopati"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1!2d106.8173!3d-6.2297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x5371bf0fdad4bf1!2sSenopati%2C%20Kebayoran%20Baru%2C%20Kota%20Jakarta%20Selatan!5e0!3m2!1sid!2sid!4v1"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="tp-card-foot">
              <span>Buka Setiap Hari • 09:00 - 21:00 WIB</span>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Barber+One+Senopati+Jakarta"
                target="_blank"
                rel="noreferrer"
                className="tp-link"
              >
                BUKA DI GOOGLE MAPS <ArrowUpRight size={12} />
              </a>
            </div>
          </article>
        </section>

        {/* ── History ── */}
        <section className="tp-history">
          <div className="tp-history-head">
            <div>
              <h2>Riwayat Kunjungan Sebelumnya</h2>
              <p className="tp-muted">
                Catatan potongan gaya rambut, rekomendasi styling, dan arsip transaksi atelier Anda.
              </p>
            </div>
            <div className="tp-history-tools">
              <div className="tp-seg">
                {yearFilters.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={year === y ? "is-active" : ""}
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <button type="button" className="tp-btn tp-btn-outline">
                <Download size={14} /> UNDUH REKAP / FAKTUR
              </button>
            </div>
          </div>

          {history.length === 0 && <p className="tp-muted">Belum ada riwayat pada tahun ini.</p>}

          {history.map((h) => {
            const d = parseDate(h.booking_date);
            return (
              <article key={h.id} className="tp-history-item">
                <div className="tp-date-box">
                  <small>{MONTHS_SHORT[d.getMonth()]}</small>
                  <strong>{String(d.getDate()).padStart(2, "0")}</strong>
                </div>
                <div className="tp-history-info">
                  <div className="tp-history-title">
                    <h3>{h.service_name}</h3>
                    <span className="tp-pill tp-pill-green tp-pill-sm">
                      SELESAI{h.payment_status === "Lunas" ? " • LUNAS" : ""}
                    </span>
                  </div>
                  <p className="tp-muted">
                    {h.barber_name} • Kursi #{String(h.chair_number).padStart(2, "0")} (Atelier {BRANCH})
                  </p>
                </div>
                <div className="tp-history-total">
                  <small>TOTAL</small>
                  <strong>{formatRupiah(h.total_amount)}</strong>
                </div>
                <div className="tp-history-actions">
                  <Link to="/dashboard" className="tp-btn tp-btn-primary tp-btn-sm">
                    <RotateCcw size={13} /> Pesan Lagi
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
