import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Hash,
  CalendarDays,
  Scissors,
  MapPin,
  Clock,
  Wallet,
  Star,
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
import "./TicketsPage.css";

/* ── Static Data (selaras dengan HomeBookingPage) ── */
const PROFILE = {
  name: "Raditya Bramantyo",
  visits: 14,
  favoriteBarber: "Master Bayo",
  branch: "Senopati",
};

const ACTIVE_TICKET = {
  code: "KB-2025-0841",
  branch: "Senopati Atelier",
  services: [
    { name: "Haircut & Wash", duration: 60, price: 55000 },
    { name: "Shave & Trim", duration: 40, price: 35000 },
  ],
  note: "Potong rambut presisi sesuai bentuk wajah, dilanjutkan cukuran rapi dengan teknik barbershop klasik, lengkap dengan hot towel & scalp refresh.",
  barber: { name: "Master Bayo", role: "Senior Barber", initials: "MB", color: "#c8a86b" },
  chair: "Kursi #01 (Atelier Senopati)",
  dateLabel: "Hari Ini, Sabtu 24 Mei 2025 • 15:30 WIB",
  estimate: "Estimasi selesai pukul 17:10 WIB",
  status: "On-Time (Tepat Waktu)",
  statusNote: "Disarankan tiba 5–10 menit sebelum slot",
  payment: "QRIS",
  rating: 4.9,
  reviews: "1.200+",
};

const HISTORY = [
  {
    id: 1,
    month: "APR",
    day: "12",
    year: 2025,
    service: "Haircut & Wash",
    barber: "Master Bayo",
    chair: "Kursi #01",
    total: 55000,
    rating: null,
  },
  {
    id: 2,
    month: "MAR",
    day: "10",
    year: 2025,
    service: "Hair Caviar",
    barber: "Ilham Arya",
    chair: "Kursi #02",
    total: 150000,
    rating: 5,
  },
  {
    id: 3,
    month: "FEB",
    day: "02",
    year: 2025,
    service: "Haircut & Wash + Shave & Trim",
    barber: "Dino Saleh",
    chair: "Kursi #03",
    total: 90000,
    rating: 5,
  },
  {
    id: 4,
    month: "NOV",
    day: "18",
    year: 2024,
    service: "Perm",
    barber: "Master Bayo",
    chair: "Kursi #01",
    total: 445000,
    rating: 4,
  },
];

const YEAR_FILTERS = ["SEMUA", "2025", "2024"];

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

function Stars({ value }) {
  return (
    <span className="tp-stars" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default function TicketsPage() {
  const [copied, setCopied] = useState(false);
  const [year, setYear] = useState("SEMUA");
  const [cancelled, setCancelled] = useState(false);

  const t = ACTIVE_TICKET;
  const totalDuration = t.services.reduce((s, x) => s + x.duration, 0);
  const totalPrice = t.services.reduce((s, x) => s + x.price, 0);

  const history = HISTORY.filter((h) => year === "SEMUA" || String(h.year) === year);

  function copyCode() {
    navigator.clipboard?.writeText(t.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="tp-title">Halo, {PROFILE.name}</h1>
          </div>
          <div className="tp-stats">
            <div className="tp-stat">
              <CalendarDays size={14} />
              <span className="tp-stat-label">KUNJUNGAN:</span>
              <strong>{PROFILE.visits} Kali</strong>
            </div>
            <div className="tp-stat">
              <Scissors size={14} />
              <span className="tp-stat-label">BARBER FAVORIT:</span>
              <strong>{PROFILE.favoriteBarber}</strong>
            </div>
            <div className="tp-stat">
              <MapPin size={14} />
              <span className="tp-stat-label">CABANG:</span>
              <strong>{PROFILE.branch}</strong>
            </div>
          </div>
        </header>

        {/* ── Active ticket ── */}
        {cancelled ? (
          <section className="tp-empty">
            <XCircle size={36} />
            <h2>Janji Dibatalkan</h2>
            <p>Reservasi {t.code} telah dibatalkan. Anda dapat membuat reservasi baru kapan saja.</p>
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
                    <span className="tp-brand-branch">{t.branch}</span>
                    <span className="tp-brand-code">#{t.code}</span>
                  </div>
                  <span className="tp-pill tp-pill-green">
                    <span className="tp-dot" /> TERKONFIRMASI &amp; SIAP DATANG
                  </span>
                </div>

                <div className="tp-ticket-body">
                  <div className="tp-service">
                    <p className="tp-label">LAYANAN TERPILIH</p>
                    <h2 className="tp-service-name">{t.services.map((s) => s.name).join(" + ")}</h2>
                    <p className="tp-service-desc">{t.note}</p>
                    <div className="tp-meta">
                      <span>
                        <Clock size={14} /> {totalDuration} Menit
                      </span>
                      <span>
                        <Wallet size={14} /> {formatRupiah(totalPrice)}
                      </span>
                      <span className="tp-meta-gold">LUNAS VIA {t.payment}</span>
                    </div>
                  </div>

                  <div className="tp-barber-card">
                    <p className="tp-label">BARBER &amp; KURSI</p>
                    <div className="tp-barber-row">
                      <div className="tp-avatar" style={{ background: t.barber.color }}>
                        {t.barber.initials}
                      </div>
                      <div>
                        <strong>{t.barber.name}</strong>
                        <p className="tp-gold-text">{t.barber.role}</p>
                      </div>
                    </div>
                    <p className="tp-chair">
                      <Armchair size={14} /> {t.chair}
                    </p>
                  </div>
                </div>

                <div className="tp-schedule">
                  <div>
                    <p className="tp-label">JADWAL KEDATANGAN</p>
                    <strong className="tp-schedule-main">{t.dateLabel}</strong>
                    <p className="tp-muted">{t.estimate}</p>
                  </div>
                  <div>
                    <p className="tp-label">STATUS ANTREAN KURSI</p>
                    <strong className="tp-schedule-status">
                      <span className="tp-dot tp-dot-grey" /> {t.status}
                    </strong>
                    <p className="tp-muted">{t.statusNote}</p>
                  </div>
                </div>

                <div className="tp-actions">
                  <Link to="/dashboard" className="tp-btn tp-btn-outline">
                    <CalendarClock size={14} /> Jadwalkan Ulang (Reschedule)
                  </Link>
                  <button type="button" className="tp-btn tp-btn-ghost" onClick={() => setCancelled(true)}>
                    <XCircle size={14} /> Batal Janji
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
                  <div className="tp-code">{t.code}</div>
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
                    <small>Sudah Lunas via {t.payment} Instant</small>
                  </span>
                  <CheckCircle2 size={18} className="tp-green" />
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
                {YEAR_FILTERS.map((y) => (
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

          {history.map((h) => (
            <article key={h.id} className="tp-history-item">
              <div className="tp-date-box">
                <small>{h.month}</small>
                <strong>{h.day}</strong>
              </div>
              <div className="tp-history-info">
                <div className="tp-history-title">
                  <h3>{h.service}</h3>
                  <span className="tp-pill tp-pill-green tp-pill-sm">SELESAI • LUNAS</span>
                </div>
                <p className="tp-muted">
                  {h.barber} • {h.chair} (Atelier Senopati)
                </p>
              </div>
              <div className="tp-history-total">
                <small>TOTAL</small>
                <strong>{formatRupiah(h.total)}</strong>
              </div>
              <div className="tp-history-actions">
                {h.rating ? (
                  <Stars value={h.rating} />
                ) : (
                  <button type="button" className="tp-btn tp-btn-outline tp-btn-sm">
                    <Star size={13} className="tp-star-gold" fill="currentColor" /> Beri Ulasan
                  </button>
                )}
                <Link to="/dashboard" className="tp-btn tp-btn-primary tp-btn-sm">
                  <RotateCcw size={13} /> Pesan Lagi 
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
