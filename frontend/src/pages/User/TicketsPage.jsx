import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Ticket,
  CalendarDays,
  Scissors,
  MapPin,
  Clock,
  CalendarPlus,
  XCircle,
  Info,
  Car,
  Phone,
  ArrowUpRight,
  Download,
  RotateCcw,
  CalendarClock,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import "./TicketsPage.css";

const BRANCH = "Senopati";
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

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

export default function TicketsPage() {
  const navigate = useNavigate();
  const paymentParams = new URLSearchParams(window.location.search);
  const paymentReturned = paymentParams.get("payment") === "return";
  const returnTicketCode = paymentParams.get("ticket_code");
  const [year, setYear] = useState("SEMUA");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }

    const controller = new AbortController();
    let pollTimer;
    let attempts = 0;
    const loadTickets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/my-tickets`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
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
        const returnedTicketPaid = [body.active, ...(body.history || [])].some(
          (ticket) => ticket?.ticket_code === returnTicketCode && ticket.payment_status === "Lunas",
        );
        if (paymentReturned && returnTicketCode && !returnedTicketPaid && attempts < 10) {
          attempts += 1;
          pollTimer = window.setTimeout(loadTickets, 3000);
        }
      } catch (err) {
        if (err.name !== "AbortError") setError("Tidak dapat terhubung ke server.");
      } finally {
        setLoading(false);
      }
    };
    loadTickets();

    return () => {
      controller.abort();
      window.clearTimeout(pollTimer);
    };
  }, [navigate, paymentReturned]);

  const activeTicket = data?.active ?? null;
  const t = activeTicket?.payment_status === "Gagal" ? null : activeTicket;
  const stats = data?.stats ?? { visits: 0, favorite_barber: "" };
  const allHistory = data?.history ?? [];
  const yearFilters = ["SEMUA", ...Array.from(new Set(allHistory.map((h) => h.booking_date.slice(0, 4))))];
  const history = allHistory.filter((h) => year === "SEMUA" || h.booking_date.startsWith(year));
  const isPaid = t?.payment_status === "Lunas";

  useEffect(() => {
    if (paymentReturned && t?.ticket_code === returnTicketCode) {
      navigate(`/dashboard/tickets/detail/${t.id}?payment=return`, { replace: true });
    }
  }, [navigate, paymentReturned, returnTicketCode, t]);
  useEffect(() => {
    if (paymentReturned && t?.ticket_code === returnTicketCode) {
      navigate(`/dashboard/tickets/detail/${t.id}?payment=return`, { replace: true });
    }
  }, [navigate, paymentReturned, returnTicketCode, t]);

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
            <h2>Belum Ada Tiket Aktif</h2>
            <p>
              Anda belum memiliki reservasi mendatang. Buat reservasi baru kapan saja.
            </p>
            <Link to="/dashboard" className="tp-btn tp-btn-primary">
              <CalendarPlus size={14} /> Buat Reservasi Baru
            </Link>
          </section>
        ) : (
          <section className="tp-ticket-wrap">
            <div className="tp-ticket-tabs">
              <span className="tp-tab-left">
                <Ticket size={14} /> {isPaid ? "TIKET RESERVASI TERKONFIRMASI" : "RESERVASI ANDA"}
              </span>
              <span className="tp-tab-right">VERIFIKASI &amp; CHECK-IN BARBERSHOP</span>
            </div>

            <div className="tp-summary-card">
              <div className="tp-summary-main">
                <h2>{t.service_name}</h2>
                <div className="tp-schedule-highlight">
                  <CalendarClock size={22} />
                  <div className="tp-schedule-copy">
                    <span className="tp-schedule-label">JADWAL RESERVASI</span>
                    <strong>{new Date(`${t.booking_date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
                  </div>
                  <span className="tp-schedule-time">{t.booking_time}<small> WIB</small></span>
                </div>
                <p><Scissors size={15} /> {t.barber_name} · {BRANCH}</p>
              </div>
              <div className="tp-summary-status">
                <span className={`tp-summary-badge${isPaid ? " is-paid" : ""}`}>{isPaid ? "LUNAS" : t.payment_status === "Gagal" ? "PEMBAYARAN GAGAL" : "MENUNGGU PEMBAYARAN"}</span>
                <span className="tp-summary-total">{formatRupiah(t.total_amount)}</span>
                <Link to={`/dashboard/tickets/detail/${t.id}`} className="tp-btn tp-btn-primary">Lihat Detail <ArrowUpRight size={14} /></Link>
              </div>
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
                    {h.payment_status === "Gagal" ? (
                      <span className="tp-pill tp-pill-red tp-pill-sm">PEMBAYARAN GAGAL</span>
                    ) : (
                      <span className="tp-pill tp-pill-green tp-pill-sm">
                        SELESAI{h.payment_status === "Lunas" ? " • LUNAS" : ""}
                      </span>
                    )}
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
