import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import barbershopHero from "../../assets/images/barbershop-hero.jpg";
import { API_BASE_URL } from "../../config/api";
import "./HomeBookingPage.css";

const TIME_SLOTS = [
  "10:00", "10:45", "11:30", "12:15", "13:00", "13:45", "14:30",
  "15:15", "16:00", "16:45", "17:30", "18:15", "19:00", "19:45",
];

const DAYS = Array.from({ length: 4 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index + 1);
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const dayNumber = String(date.getDate()).padStart(2, "0");

  return {
    value: `${date.getFullYear()}-${monthNumber}-${dayNumber}`,
    day: date.toLocaleDateString("id-ID", { weekday: "short" }).toUpperCase(),
    date: date.getDate(),
    month: date.toLocaleDateString("id-ID", { month: "short" }),
  };
});

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

const BOOKING_DRAFT_KEY = "barber-one-booking-draft";
const BOOKING_DRAFT_TTL_MS = 60 * 60 * 1000;

function readBookingDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(BOOKING_DRAFT_KEY) || "null");
    if (!draft) return {};
    if (!draft.savedAt || Date.now() - draft.savedAt >= BOOKING_DRAFT_TTL_MS) {
      localStorage.removeItem(BOOKING_DRAFT_KEY);
      return {};
    }
    return draft;
  } catch {
    localStorage.removeItem(BOOKING_DRAFT_KEY);
    return {};
  }
}

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
  const [initialDraft] = useState(readBookingDraft);
  const [barbers, setBarbers] = useState([]);
  const [barbersLoading, setBarbersLoading] = useState(true);
  const [barbersError, setBarbersError] = useState("");
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [selectedBarber, setSelectedBarber] = useState(initialDraft.selectedBarber ?? null);
  const [selectedServices, setSelectedServices] = useState(initialDraft.selectedServices ?? []);
  const [selectedDay, setSelectedDay] = useState(initialDraft.selectedDay ?? null);
  const [selectedTime, setSelectedTime] = useState(initialDraft.selectedTime ?? null);
  const [customerName, setCustomerName] = useState(initialDraft.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialDraft.customerPhone ?? "");
  const [customerNotes, setCustomerNotes] = useState(initialDraft.customerNotes ?? "");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingTicket, setBookingTicket] = useState("");
  const [availableSlots, setAvailableSlots] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    const savedAt = Date.now();
    localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({
      selectedBarber, selectedServices, selectedDay, selectedTime,
      customerName, customerPhone, customerNotes,
      savedAt,
    }));
    const expiryTimer = window.setTimeout(() => {
      localStorage.removeItem(BOOKING_DRAFT_KEY);
    }, BOOKING_DRAFT_TTL_MS);
    return () => window.clearTimeout(expiryTimer);
  }, [selectedBarber, selectedServices, selectedDay, selectedTime, customerName, customerPhone, customerNotes]);

  useEffect(() => {
    async function getServices() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/services`);
        const data = await response.json();

        if (!response.ok) {
          setServicesError(data.error || "Gagal memuat layanan.");
          return;
        }

        setServices(data.services);
      } catch {
        setServicesError("Tidak dapat terhubung ke server.");
      } finally {
        setServicesLoading(false);
      }
    }

    getServices();
  }, []);

  useEffect(() => {
    if (!selectedBarber || !selectedDay || selectedServices.length === 0) {
      setAvailableSlots(null);
      setAvailabilityError("");
      setAvailabilityLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setAvailableSlots(null);

    async function loadAvailability() {
      try {
        const params = new URLSearchParams({
          barber_id: String(selectedBarber),
          service_id: String(selectedServices[0]),
          date: selectedDay,
        });
        const response = await fetch(`${API_BASE_URL}/api/availability?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memeriksa ketersediaan jadwal.");
        setAvailableSlots(data.available_slots || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setAvailabilityError(error.message || "Tidak dapat memeriksa ketersediaan jadwal.");
        }
      } finally {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      }
    }

    loadAvailability();
    return () => controller.abort();
  }, [selectedBarber, selectedDay, selectedServices]);

  useEffect(() => {
    if (selectedTime && availableSlots && !availableSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [availableSlots, selectedTime]);

  useEffect(() => {
    async function getBarbers() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/barbers`);
        const data = await response.json();

        if (!response.ok) {
          setBarbersError(data.error || "Gagal memuat daftar barber.");
          return;
        }

        setBarbers(data.barbers);
      } catch {
        setBarbersError("Tidak dapat terhubung ke server.");
      } finally {
        setBarbersLoading(false);
      }
    }

    getBarbers();
  }, []);

  const selectedServiceObjs = services.filter((s) => selectedServices.includes(s.id));
  const total = selectedServiceObjs.reduce((sum, s) => sum + Number(s.price), 0);
  const barberObj = barbers.find((b) => b.id === selectedBarber);

  function toggleService(id) {
    setSelectedServices((previous) => (previous[0] === id ? [] : [id]));
    setSelectedTime(null);
  }

  async function handleBook(e) {
    e.preventDefault();
    if (!selectedBarber || selectedServices.length === 0 || !selectedDay || !selectedTime) return;

    const token = localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    setBookingSubmitting(true);
    setBookingError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          service_id: selectedServices[0],
          barber_id: selectedBarber,
          customer_name: customerName,
          customer_phone: customerPhone,
          booking_date: selectedDay,
          booking_time: selectedTime,
          notes: customerNotes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingError(data.error || "Booking gagal dibuat.");
        return;
      }

      if (!data.booking.payment_redirect_url) {
        setBookingError("Tautan pembayaran tidak tersedia. Booking belum dapat dikonfirmasi.");
        return;
      }
      window.location.assign(data.booking.payment_redirect_url);
    } catch {
      setBookingError("Tidak dapat terhubung ke server.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  return (
    <div className="hb-page">
      {showLoginModal && (
        <div className="hb-auth-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLoginModal(false);
        }}>
          <section className="hb-auth-modal" role="dialog" aria-modal="true" aria-labelledby="hb-auth-modal-title">
            <button className="hb-auth-modal-close" type="button" aria-label="Tutup" onClick={() => setShowLoginModal(false)}>×</button>
            <span className="hb-auth-modal-icon"><User size={22} /></span>
            <h2 id="hb-auth-modal-title">Masuk untuk melanjutkan</h2>
            <p>Reservasi Anda sudah tersimpan sementara. Masuk atau buat akun untuk mengonfirmasi booking.</p>
            <div className="hb-auth-modal-actions">
              <Link className="hb-auth-login-btn" to="/login">Masuk</Link>
              <Link className="hb-auth-register-btn" to="/register">Buat Akun</Link>
            </div>
          </section>
        </div>
      )}
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
          <p>Pilih satu layanan untuk setiap booking.</p>
          {servicesLoading && <p role="status">Memuat layanan...</p>}
          {servicesError && <p role="alert">{servicesError}</p>}
          {!servicesLoading && !servicesError && services.length === 0 && (
            <p>Belum ada layanan yang tersedia.</p>
          )}
          <div className="hb-services-grid">
            {services.map((svc) => {
              const isChosen = selectedServices.includes(svc.id);
              return (
                <div
                  key={svc.id}
                  className={`hb-service-card${isChosen ? " is-selected" : ""}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <div className="hb-service-top">
                  <span className="hb-service-tag">ID: {String(svc.id).padStart(3, "0")}</span>
                  <span className="hb-service-duration">{svc.duration_minutes} MENIT</span>
                  </div>
                  <h3 className="hb-service-name">{svc.name}</h3>
                  <p className="hb-service-price">{formatRupiah(Number(svc.price))}</p>
                  <p className="hb-service-desc">{svc.description || ""}</p>
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
              <h3>Booking berhasil dibuat!</h3>
              <p>
                Terima kasih <strong>{customerName}</strong>. Booking Anda
                untuk layanan <strong>{selectedServiceObjs.map((s) => s.name).join(", ")}</strong> pada{" "}
                <strong>
                  {DAYS.find((d) => d.value === selectedDay)?.day}{" "}
                  {DAYS.find((d) => d.value === selectedDay)?.date}{" "}
                  {DAYS.find((d) => d.value === selectedDay)?.month}
                </strong>{" "}
                pukul <strong>{selectedTime}</strong> telah dicatat.
                <br />Kode tiket: <strong>{bookingTicket}</strong>
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
                      {barbers.filter((b) => b.available).length} tersedia hari ini
                    </span>
                  </div>
                  {barbersLoading && <p role="status">Memuat daftar barber...</p>}
                  {barbersError && <p role="alert">{barbersError}</p>}
                  {!barbersLoading && !barbersError && barbers.length === 0 && (
                    <p>Belum ada barber yang tersedia.</p>
                  )}
                  <div className="hb-barber-grid">
                    {barbers.map((b) => (
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
                          onChange={() => {
                            setSelectedBarber(b.id);
                            setSelectedTime(null);
                          }}
                          className="hb-sr-only"
                        />
                        <div className="hb-barber-avatar" style={{ background: "#c8a86b" }}>
                          {b.name.slice(0, 2).toUpperCase()}
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
                          <p className="hb-barber-spec">
                            {b.available ? "Tersedia untuk booking" : "Sedang tidak tersedia"}
                          </p>
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
                    <span className="hb-step-avail">Jadwal 4 hari ke depan</span>
                  </div>

                  <div className="hb-day-row">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={`hb-day-btn${selectedDay === d.value ? " is-active" : ""}`}
                        onClick={() => {
                          setSelectedDay(d.value);
                          setSelectedTime(null);
                        }}
                      >
                        <span className="hb-day-name">{d.day}</span>
                        <span className="hb-day-date">{d.date}</span>
                        <span className="hb-day-month">{d.month}</span>
                      </button>
                    ))}
                  </div>

                  <p className="hb-slots-label">SLOT WAKTU TERSEDIA</p>
                  {!selectedBarber || !selectedDay || selectedServices.length === 0 ? (
                    <p className="hb-availability-hint">Pilih layanan, barber, dan tanggal untuk melihat slot yang tersedia.</p>
                  ) : availabilityLoading ? (
                    <p className="hb-availability-hint" role="status">Memeriksa ketersediaan slot...</p>
                  ) : availabilityError ? (
                    <p className="hb-availability-error" role="alert">{availabilityError} Slot belum dapat diverifikasi.</p>
                  ) : availableSlots?.length === 0 ? (
                    <p className="hb-availability-hint">Tidak ada slot tersedia untuk pilihan ini.</p>
                  ) : null}
                  <div className="hb-time-grid">
                    {TIME_SLOTS.map((t) => {
                      const needsAvailability = selectedBarber && selectedDay && selectedServices.length > 0;
                      const slotUnavailable = needsAvailability && (availabilityLoading || Boolean(availabilityError) || !availableSlots?.includes(t));
                      return (
                      <button
                        key={t}
                        type="button"
                        className={`hb-time-btn${selectedTime === t ? " is-active" : ""}${slotUnavailable ? " is-unavailable" : ""}`}
                        disabled={slotUnavailable}
                        onClick={() => setSelectedTime(t)}
                      >
                        {t}
                        <br />
                        <small>{slotUnavailable ? "PENUH" : "TERSEDIA"}</small>
                      </button>
                      );
                    })}
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
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={13}
                            value={customerPhone}
                            onChange={(e) =>
                              setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 13))
                            }
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
                    !customerPhone ||
                    bookingSubmitting
                  }
                >
                  <Calendar size={16} />
                  {bookingSubmitting ? "MENYIMPAN BOOKING..." : "DAFTAR BOOKING & KONFIRMASI SLOT"}
                  <ChevronDown size={16} />
                </button>
                {bookingError && <p role="alert">{bookingError}</p>}
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
                        ? `${DAYS.find((d) => d.value === selectedDay)?.day ?? ""} ${DAYS.find((d) => d.value === selectedDay)?.date} ${DAYS.find((d) => d.value === selectedDay)?.month} · ${selectedTime}`
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
                          <span className="hb-summary-svc-price">{formatRupiah(Number(s.price))}</span>
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
