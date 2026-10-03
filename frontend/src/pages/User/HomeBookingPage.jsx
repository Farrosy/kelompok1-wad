import { useState } from "react";
import {
  MapPin,
  Clock,
  Star,
  CheckCircle,
  ChevronDown,
  Calendar,
  User,
  Wifi,
  Wind,
  Truck,
  Zap,
  Scissors,
  CreditCard,
} from "lucide-react";
import barbershopHero from "../../assets/images/barbershop-hero.jpg";
import "./HomeBookingPage.css";

/* ── Static Data ── */
const BARBERS = [
  {
    id: 1,
    name: "Master Bayo",
    rating: 4.9,
    specialty: "Classic Taper, Fade, Traditional Shave",
    available: true,
    initials: "MB",
    color: "#c8a86b",
  },
  {
    id: 2,
    name: "Ilham Arya",
    rating: 4.8,
    specialty: "Skin Fade, Free Hand, Gentleman",
    available: true,
    initials: "IA",
    color: "#7b9e87",
  },
  {
    id: 3,
    name: "Dino Saleh",
    rating: 4.7,
    specialty: "Modern Cut, Skin Fade, Pompadour",
    available: true,
    initials: "DS",
    color: "#8a7db5",
  },
];


const SERVICES = [
  {
    id: "cut",
    tag: "ID: CUT",
    name: "Haircut & Wash",
    price: "IDR 55.000",
    rawPrice: 55000,
    description:
      "Layanan potong rambut lengkap dengan teknik precision cutting disesuaikan bentuk wajah dan preferensi gaya Anda.",
    duration: "60 MENIT",
  },
  {
    id: "shave",
    tag: "ID: SHV",
    name: "Shave & Trim",
    price: "IDR 35.000",
    rawPrice: 35000,
    description:
      "Cukuran rapi dan presisi, menggunakan alat terbaik dan teknik barbershop klasik untuk hasil yang sempurna.",
    duration: "40 MENIT",
  },
  {
    id: "darkening",
    tag: "ID: DRK",
    name: "Hair Darkening",
    price: "IDR 250.000",
    rawPrice: 250000,
    description:
      "Perawatan warna rambut yang mengembalikan pigmen alami rambut agar tampak lebih gelap, sehat, dan berkilau.",
    duration: "60 MENIT",
  },
  {
    id: "caviar",
    tag: "ID: CAV",
    name: "Hair Caviar",
    price: "IDR 150.000",
    rawPrice: 150000,
    description:
      "Perawatan intensif dengan formula eksklusif berbasis protein dan keratin untuk rambut yang lembut dan berkilau maksimal.",
    duration: "60 MENIT",
  },
  {
    id: "perm",
    tag: "ID: PRM",
    name: "Perm",
    price: "IDR 445.000",
    rawPrice: 445000,
    description:
      "Teknik pengeritingan permanen untuk menciptakan volume dan tekstur gelombang natural yang tahan lama.",
    duration: "120 MENIT",
  },
  {
    id: "downperm",
    tag: "ID: DPM",
    name: "Down Perm",
    price: "IDR 225.000",
    rawPrice: 225000,
    description:
      "Teknik pelurusan rambut semi-permanen yang melembutkan dan menekan keriting untuk hasil lebih rapi dan terkontrol.",
    duration: "80 MENIT",
  },
];

const TIME_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "13:00",
  "13:30", "14:00", "14:45", "15:30", "16:00",
  "17:00", "17:30", "18:30", "19:00", "19:45"
];

const DAYS = [
  { day: "SAB", date: 24, month: "Mei", label: "24" },
  { day: "MIN", date: 25, month: "Mei", label: "25" },
  { day: "SEN", date: 26, month: "Mei", label: "26" },
  { day: "SEL", date: 27, month: "Mei", label: "27" },
];

const FACILITIES = [
  {
    icon: <Zap size={20} />,
    title: "Hot Towel & Scalp Refresh",
    desc: "Setiap layanan dilengkapi hot towel treatment dan scalp refresher.",
  },
  {
    icon: <Wifi size={20} />,
    title: "High Speed Wifi",
    desc: "Nikmati koneksi internet stabil selama menunggu.",
  },
  {
    icon: <Wind size={20} />,
    title: "AC Cooling & Air Purifier",
    desc: "Ruangan ber-AC dengan air purifier untuk kenyamanan optimal.",
  },
  {
    icon: <Truck size={20} />,
    title: "Dedicated Parking & Valet",
    desc: "Parkir aman tersedia. Layanan valet tersedia saat peak hour.",
  },
];

/* ── Helpers ── */
function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

/* ── Component ── */
export default function HomeBookingPage() {
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("Tunai");
  const [bookingDone, setBookingDone] = useState(false);

  const selectedServiceObjs = SERVICES.filter((s) => selectedServices.includes(s.id));
  const total = selectedServiceObjs.reduce((sum, s) => sum + s.rawPrice, 0);
  const barberObj = BARBERS.find((b) => b.id === selectedBarber);

  function toggleService(id) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleBook(e) {
    e.preventDefault();
    if (!selectedBarber || selectedServices.length === 0 || !selectedDay || !selectedTime)
      return;
    setBookingDone(true);
  }

  return (
    <div className="hb-page">
      {/* ── HERO ── */}
      <section className="hb-hero">
        <div className="hb-hero-inner">
          <p className="hb-hero-eyebrow">ATELIER PREMIUM BARBERSHOP</p>
          <h1 className="hb-hero-title">
            Crafted Precision &amp;{" "}
            <em className="hb-hero-italic">Timeless</em>
            <br />
            <em className="hb-hero-italic hb-hero-gold">Grooming</em>
          </h1>

          <div className="hb-hero-media">
            <div className="hb-hero-img-wrap">
              <img
                src={barbershopHero}
                alt="Barber One Senopati interior"
                className="hb-hero-img"
              />
              <div className="hb-hero-img-caption">
                <strong>BARBER ONE · Atelier &amp; Kursi Utama</strong>
                <p>Eksklusivitas, tiap untai rambut ditangani dengan keahlian dan kepedulian yang mendalam.</p>
              </div>
            </div>

            <div className="hb-hero-info-panel">
              <div className="hb-info-badge">Tempat</div>
              <div className="hb-info-row">
                <span className="hb-info-num">14</span>
                <div className="hb-info-label-wrap">
                  <span className="hb-info-label">SLOT HARI INI</span>
                  <span className="hb-info-sub">Tersisa</span>
                </div>
              </div>
              <p className="hb-info-desc">
                Pilih barber &amp; waktu favoritmu, lanjutkan booking dalam 3
                langkah mudah di bawah ini.
              </p>
              <div className="hb-info-slots">
                <div className="hb-slot-pill">
                  <MapPin size={11} /> Senopati, Jakarta
                </div>
                <div className="hb-slot-pill">
                  <Clock size={11} /> 09:00–21:00
                </div>
                <div className="hb-slot-pill">
                  <Star size={11} fill="currentColor" /> 4.9 (1.200+ ulasan)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="hb-services">
        <div className="hb-section-inner">
          <p className="hb-services-eyebrow">PILIHAN GROOMING</p>
          <h2 className="hb-services-title">Layanan Barber One Atelier</h2>
          <div className="hb-services-grid">
            {SERVICES.map((svc) => {
              const isChosen = selectedServices.includes(svc.id);
              return (
                <div
                  key={svc.id}
                  className={`hb-service-card${isChosen ? " is-selected" : ""}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <div className="hb-service-top">
                    <span className="hb-service-tag">{svc.tag}</span>
                    <span className="hb-service-duration">{svc.duration}</span>
                  </div>
                  <h3 className="hb-service-name">{svc.name}</h3>
                  <p className="hb-service-price">{svc.price}</p>
                  <p className="hb-service-desc">{svc.description}</p>
                  <button
                    className={`hb-service-btn${isChosen ? " is-chosen" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleService(svc.id);
                    }}
                  >
                    {isChosen ? (
                      <>
                        <CheckCircle size={13} /> DIPILIH
                      </>
                    ) : (
                      "PILIH LAYANAN"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOOKING SECTION ── */}
      <section className="hb-booking">
        <div className="hb-section-inner">
          <div className="hb-booking-header">
            <p className="hb-booking-eyebrow">PEMESANAN MANDIRI</p>
            <h2 className="hb-booking-title">Atur Jadwal Reservasi</h2>
            <p className="hb-booking-subtitle">
              Lengkapi 3 langkah berikut untuk memilih barber, hari, dan waktu
              yang Anda inginkan.
            </p>
          </div>

          {bookingDone ? (
            <div className="hb-booking-success">
              <CheckCircle size={52} className="hb-success-icon" />
              <h3>Reservasi Berhasil!</h3>
              <p>
                Terima kasih <strong>{customerName}</strong>. Booking Anda
                untuk layanan <strong>{selectedServiceObjs.map((s) => s.name).join(", ")}</strong> pada{" "}
                <strong>
                  {DAYS.find((d) => d.label === selectedDay)?.day}{" "}
                  {selectedDay} Mei
                </strong>{" "}
                pukul <strong>{selectedTime}</strong> telah terkonfirmasi.
              </p>
              <button
                className="hb-book-again-btn"
                onClick={() => {
                  setBookingDone(false);
                  setSelectedBarber(null);
                  setSelectedServices([]);
                  setSelectedDay(null);
                  setSelectedTime(null);
                  setCustomerName("");
                  setCustomerPhone("");
                  setCustomerNotes("");
                  setSelectedPayment("Tunai");
                }}
              >
                Buat Reservasi Baru
              </button>
            </div>
          ) : (
            <div className="hb-booking-layout">
              {/* Left – Steps */}
              <form className="hb-booking-form" onSubmit={handleBook}>
                {/* STEP 1 – Barber */}
                <div className="hb-step">
                  <div className="hb-step-header">
                    <span className="hb-step-num">1</span>
                    <h3 className="hb-step-title">Pilih Barber / Kapster</h3>
                    <span className="hb-step-avail">
                      {BARBERS.filter((b) => b.available).length} tersedia hari ini
                    </span>
                  </div>
                  <div className="hb-barber-grid">
                    {BARBERS.map((b) => (
                      <label
                        key={b.id}
                        className={`hb-barber-card${selectedBarber === b.id ? " is-active" : ""}${!b.available ? " is-unavail" : ""}`}
                      >
                        <input
                          type="radio"
                          name="barber"
                          value={b.id}
                          disabled={!b.available}
                          checked={selectedBarber === b.id}
                          onChange={() => setSelectedBarber(b.id)}
                          className="hb-sr-only"
                        />
                        <div
                          className="hb-barber-avatar"
                          style={{ background: b.color }}
                        >
                          {b.initials}
                        </div>
                        <div className="hb-barber-info">
                          <p className="hb-barber-name">
                            {b.name}
                            {b.rating && (
                              <span className="hb-barber-rating">
                                <Star size={10} fill="currentColor" />{" "}
                                {b.rating}
                              </span>
                            )}
                          </p>
                          <p className="hb-barber-spec">{b.specialty}</p>
                          {!b.available && (
                            <span className="hb-barber-unavail-tag">
                              Tidak tersedia
                            </span>
                          )}
                        </div>
                        {selectedBarber === b.id && (
                          <CheckCircle
                            size={16}
                            className="hb-barber-check"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* STEP 2 – Date & Time */}
                <div className="hb-step">
                  <div className="hb-step-header">
                    <span className="hb-step-num">2</span>
                    <h3 className="hb-step-title">Pilih Tanggal &amp; Jam</h3>
                    <span className="hb-step-avail">Batas 31 Mei 2025</span>
                  </div>

                  <div className="hb-day-row">
                    {DAYS.map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        className={`hb-day-btn${selectedDay === d.label ? " is-active" : ""}`}
                        onClick={() => setSelectedDay(d.label)}
                      >
                        <span className="hb-day-name">{d.day}</span>
                        <span className="hb-day-date">{d.date}</span>
                        <span className="hb-day-month">{d.month}</span>
                      </button>
                    ))}
                  </div>

                  <p className="hb-slots-label">SLOT WAKTU TERSEDIA</p>
                  <div className="hb-time-grid">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`hb-time-btn${selectedTime === t ? " is-active" : ""}`}
                        onClick={() => setSelectedTime(t)}
                      >
                        {t}
                        <br />
                        <small>TERSEDIA</small>
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 3 – Customer */}
                <div className="hb-step">
                  <div className="hb-step-header">
                    <span className="hb-step-num">3</span>
                    <h3 className="hb-step-title">
                      Data Pelanggan &amp; Preferensi
                    </h3>
                    <span className="hb-step-avail">Konfirmasi: 4x Ps.</span>
                  </div>

                  <div className="hb-customer-form">
                    <div className="hb-form-row">
                      <div className="hb-form-group">
                        <label className="hb-form-label">NAMA LENGKAP</label>
                        <div className="hb-input-wrap">
                          <User size={14} className="hb-input-icon" />
                          <input
                            type="text"
                            className="hb-input"
                            placeholder="Nama Anda"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="hb-form-group">
                        <label className="hb-form-label">NOMOR WA/TELEPON</label>
                        <div className="hb-input-wrap">
                          <span className="hb-phone-prefix">+62</span>
                          <input
                            type="tel"
                            className="hb-input hb-input-phone"
                            placeholder="8xxx-xxxx-xxxx"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="hb-form-group">
                      <label className="hb-form-label">
                        CATATAN / PREFERENSI (Opsional)
                      </label>
                      <textarea
                        className="hb-textarea"
                        rows={3}
                        placeholder="Contoh: Saya ingin fade rendah, poni ke samping. Saya punya rambut tebal dan sedikit keriting..."
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="hb-submit-btn"
                  type="submit"
                  disabled={
                    !selectedBarber ||
                    selectedServices.length === 0 ||
                    !selectedDay ||
                    !selectedTime ||
                    !customerName ||
                    !customerPhone
                  }
                >
                  <Calendar size={16} />
                  DAFTAR BOOKING &amp; KONFIRMASI SLOT
                  <ChevronDown size={16} />
                </button>
              </form>

              {/* Right – Summary */}
              <aside className="hb-summary">
                <div className="hb-summary-header">
                  <span className="hb-summary-eyebrow">RINGKASAN TIKET</span>
                  <span className="hb-summary-badge">DRAFT</span>
                </div>

                <div className="hb-summary-body">
                  <div className="hb-summary-row">
                    <span>Barber</span>
                    <span>{barberObj?.name ?? "–"}</span>
                  </div>
                  <div className="hb-summary-row">
                    <span>Waktu</span>
                    <span>
                      {selectedDay && selectedTime
                        ? `${DAYS.find((d) => d.label === selectedDay)?.day ?? ""} ${selectedDay} Mei · ${selectedTime}`
                        : "–"}
                    </span>
                  </div>
                </div>

                <div className="hb-summary-divider" />

                <div className="hb-summary-svc-row">
                  <span className="hb-summary-svc-label">Layanan Terpilih</span>
                  {selectedServiceObjs.length === 0 ? (
                    <span className="hb-summary-svc-name hb-summary-svc-empty">Belum dipilih</span>
                  ) : (
                    <ul className="hb-summary-svc-list">
                      {selectedServiceObjs.map((s) => (
                        <li key={s.id} className="hb-summary-svc-item">
                          <span>{s.name}</span>
                          <span className="hb-summary-svc-price">{s.price}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hb-summary-price-block">
                  <div className="hb-summary-total-row">
                    <span className="hb-summary-total-label">TOTAL PEMBAYARAN</span>
                    <span className="hb-summary-total-amount">
                      {total ? formatRupiah(total) : "IDR 0"}
                    </span>
                  </div>
                  <div className="hb-summary-metode">
                    <div>
                      <p className="hb-meta-label">METODE PEMBAYARAN</p>
                      <div className="hb-pay-options">
                        {["Tunai", "QRIS", "Transfer"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`hb-pay-opt${selectedPayment === opt ? " is-active" : ""}`}
                            onClick={() => setSelectedPayment(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <CreditCard size={22} className="hb-pay-icon" />
                  </div>
                  <p className="hb-summary-note">
                    Pembayaran dilakukan langsung di Atelier saat kedatangan.
                    Booking ini bersifat konfirmasi slot, bukan pembayaran dimuka.
                  </p>
                </div>

                <div className="hb-summary-check-row">
                  <CheckCircle size={13} className="hb-check-green" />
                  <span>Gratis pembatalan hingga 2 jam sebelum jadwal</span>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {/* ── LOCATION & FACILITIES ── */}
      <section className="hb-location">
        <div className="hb-section-inner hb-location-inner">
          <div className="hb-location-left">
            <p className="hb-loc-eyebrow">LOKASI KAMI</p>
            <h2 className="hb-loc-title">Atelier Senopati</h2>
            <p className="hb-loc-address">
              Jl. Senopati No. 5a, Kebayoran Baru, Jakarta Selatan · Telepon:{" "}
              <a href="tel:+622112345678" className="hb-loc-phone">
                +62 21 1234 5678
              </a>
            </p>
            <div className="hb-map-wrap">
              <iframe
                title="Barber One Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1!2d106.8173!3d-6.2297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x5371bf0fdad4bf1!2sSenopati%2C%20Kebayoran%20Baru%2C%20Kota%20Jakarta%20Selatan!5e0!3m2!1sid!2sid!4v1"
                className="hb-map"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div className="hb-location-right">
            <p className="hb-fac-eyebrow">KEISTIMEWAAN KAMI</p>
            <h2 className="hb-fac-title">Fasilitas Standar Atelier</h2>
            <p className="hb-fac-desc">
              Setiap kunjungan adalah pengalaman premium. Kami memastikan
              kenyamanan terbaik dari awal hingga akhir layanan Anda.
            </p>
            <div className="hb-facilities-grid">
              {FACILITIES.map((f, i) => (
                <div key={i} className="hb-facility-card">
                  <div className="hb-facility-icon">{f.icon}</div>
                  <div>
                    <p className="hb-facility-name">{f.title}</p>
                    <p className="hb-facility-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
