import ChairRotation from "./components/ChairRotation";
import MetricCards from "./components/MetricCards";
import QueueTicketCard from "./components/QueueTicketCard";
import WalkInForm from "./components/WalkInForm";

const queueData = [
  {
    id: "#KB-104",
    type: "ongoing",
    ticket: "KURSI 01 • SEDANG BERJALAN",
    timeLabel: "Mulai: 13:45 WIB",
    timeEstimate: "(Sisa ~15 mnt)",
    customer: "Hendra Wijaya",
    service: "The Gentleman's Ritual",
    serviceSub: "",
    barberInitials: "MB",
    barberName: "Master Bayu",
    footerText: "Add-on: Matte Clay Pomade (Tersimpan di Tray)"
  },
  {
    id: "#KB-105",
    type: "ongoing",
    ticket: "KURSI 02 • SEDANG BERJALAN",
    timeLabel: "Mulai: 14:00 WIB",
    timeEstimate: "(Sisa ~25 mnt)",
    customer: "Rizky Pratama",
    service: "Signature Haircut",
    serviceSub: "",
    barberInitials: "DA",
    barberName: "Dimas Arya",
    footerText: "Estimasi selesai pukul 14:45 WIB"
  },
  {
    id: "#KB-106",
    type: "waiting",
    ticket: "MENUNGGU DI LOUNGE",
    bookingType: "Booking Web",
    timeLabel: "Jadwal Slot: 14:30 WIB",
    customer: "Adrian Susanto",
    service: "Beard Trim & Hot Oil",
    serviceSub: "45 Menit Durasi",
    barberInitials: "BS",
    barberName: "Bima Sakti (Siap)",
    footerText: "Menunggu kursi kosong berikutnya.",
    actionButton: "Panggil Masuk Kursi 3"
  },
  {
    id: "#KB-107",
    type: "waiting",
    ticket: "MENUNGGU",
    bookingType: "Walk-In Langsung",
    timeLabel: "Slot Antrean: 14:45 WIB",
    customer: "Danu",
    service: "Signature Haircut",
    serviceSub: "Standard Cukur",
    barberName: "Bebas / Barber Pertama Siap",
    footerText: "Menunggu kursi kosong berikutnya.",
    actionButton: "Panggil Masuk Kursi 4",
    hasEditBtn: true
  },
  {
    id: "#KB-103",
    type: "done",
    ticket: "SELESAI & LUNAS",
    timeLabel: "Selesai: 13:50 WIB • Kasir 01",
    customer: "Farhan K.",
    service: "Beard Sculpt",
    serviceSub: "Rp 120.000",
    barberName: "QRIS Statis Bank Mandiri",
    footerText: "Transaksi #TRX-9941 tersimpan di pembukuan kas.",
    actionButton: "Cetak Ulang Struk",
    btnStyle: "outline"
  }
];

export default function CashierDashboard() {
  return (
    <section className="cashier-dashboard-page">
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
            <span>+</span> Tambah Walk-in
          </button>
        </div>
      </div>

      <MetricCards />

      <section className="dashboard-main-split">
        <div className="dashboard-left-col">
          <div className="queue-header-top">
            <div className="queue-title-area">
              <h2>Antrean & Status Kursi Barber</h2>
              <p>Pusat alokasi rotasi kursi dan status transisi kasir.</p>
            </div>
            <div className="queue-search-container">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" className="queue-search-input" placeholder="Cari nama atau no tiket..." />
            </div>
          </div>

          <div className="queue-filters">
            <div className="filter-tabs">
              <button className="filter-tab active">Semua (5)</button>
              <button className="filter-tab">Sedang Berjalan (2)</button>
              <button className="filter-tab">Menunggu (2)</button>
              <button className="filter-tab">Selesai (1)</button>
            </div>
            <div className="live-queue-indicator">
              <span className="live-dot"></span> Live Queue
            </div>
          </div>

          <div className="queue-list">
            {queueData.map((item) => (
              <QueueTicketCard key={item.id} item={item} />
            ))}
          </div>

          <div className="queue-pagination">
            <div className="pagination-info">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>Menampilkan <strong>1 - 5</strong> dari <strong>14</strong> antrean hari ini</span>
            </div>
            <div className="pagination-controls">
              <button className="page-btn disabled" disabled>‹ Sebelumnya</button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <button className="page-btn">Berikutnya ›</button>
            </div>
          </div>

          <ChairRotation />
        </div>

        <div className="dashboard-right-col">
          <WalkInForm />
        </div>
      </section>
    </section>
  );
}