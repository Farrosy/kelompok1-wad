import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../../config/api";
import ChairRotation from "./components/ChairRotation";
import MetricCards from "./components/MetricCards";
import QueueTicketCard from "./components/QueueTicketCard";
import WalkInForm from "./components/WalkInForm";

const PAGE_SIZE = 5;
const TOTAL_CHAIRS = 3;
const REFRESH_INTERVAL_MS = 30 * 1000;
// Jam di card diperbarui tiap 15 detik supaya hitungan "x mnt lagi" ikut berjalan.
const CLOCK_INTERVAL_MS = 15 * 1000;

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "ongoing", label: "Sedang Berjalan" },
  { key: "waiting", label: "Menunggu" },
  { key: "done", label: "Selesai" },
];

function getToken() {
  return localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
}

// Mengelompokkan status booking dari backend ke tipe kartu antrean.
function queueType(item) {
  if (item.status === "Sedang Dilayani") return "ongoing";
  if (item.status === "Selesai") return "done";
  return "waiting";
}

export default function CashierDashboard() {
  const navigate = useNavigate();
  const walkInRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  // Selisih jam server dan jam browser, supaya countdown tombol sama dengan aturan di backend.
  const [clockOffset, setClockOffset] = useState(0);

  // Helper fetch ke backend dengan token kasir. Kalau sesi habis, kembali ke login.
  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken() || ""}`,
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      navigate("/login", { replace: true });
      throw new Error(data.error || "Sesi login habis.");
    }
    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    return data;
  }, [navigate]);

  const loadDashboard = useCallback(async () => {
    try {
      const [summaryData, queueData] = await Promise.all([
        apiRequest("/api/cashier/summary"),
        apiRequest("/api/cashier/queue"),
      ]);
      setSummary(summaryData);
      setQueue(queueData.queue || []);
      if (queueData.server_time) setClockOffset(new Date(queueData.server_time).getTime() - Date.now());
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(err.message || "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login", { replace: true });
      return undefined;
    }

    // Layanan dan barber hanya perlu diambil sekali untuk form walk-in.
    Promise.all([apiRequest("/api/services"), apiRequest("/api/barbers")])
      .then(([serviceData, barberData]) => {
        setServices(serviceData.services || []);
        setBarbers(barberData.barbers || []);
      })
      .catch((err) => setError(err.message || "Gagal memuat layanan dan barber."));

    const firstLoad = window.setTimeout(loadDashboard, 0);
    // Antrean diperbarui otomatis supaya booking online yang baru lunas ikut muncul.
    const timer = window.setInterval(loadDashboard, REFRESH_INTERVAL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), CLOCK_INTERVAL_MS);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
  }, [apiRequest, loadDashboard, navigate]);

  // Kursi yang sedang dipakai: { nomorKursi: booking }
  const usedChairs = useMemo(() => {
    const result = {};
    queue.forEach((item) => {
      if (item.status === "Sedang Dilayani") result[item.chair_number] = item;
    });
    return result;
  }, [queue]);

  const freeChair = useMemo(() => {
    for (let chair = 1; chair <= TOTAL_CHAIRS; chair += 1) {
      if (!usedChairs[chair]) return chair;
    }
    return null;
  }, [usedChairs]);

  const counts = useMemo(() => {
    const result = { all: queue.length, ongoing: 0, waiting: 0, done: 0 };
    queue.forEach((item) => { result[queueType(item)] += 1; });
    return result;
  }, [queue]);

  const filteredQueue = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return queue.filter((item) => {
      if (filter !== "all" && queueType(item) !== filter) return false;
      if (!keyword) return true;
      return item.customer_name.toLowerCase().includes(keyword) || item.ticket_code.toLowerCase().includes(keyword);
    });
  }, [queue, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredQueue.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleAction(item, action) {
    setBusyId(item.id);
    setActionError("");
    try {
      await apiRequest(`/api/cashier/bookings/${item.id}/${action}`, { method: "PATCH" });
      await loadDashboard();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleWalkIn(payload) {
    const created = await apiRequest("/api/cashier/walk-in", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadDashboard();
    return created;
  }

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const firstItem = filteredQueue.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, filteredQueue.length);

  return (
    <section className="cashier-dashboard-page">
      <div className="cashier-subbar">
        <div className="subbar-left">
          <div className="active-station-badge">
            <span className="dot-active" />
            <strong>Kasir Aktif</strong>
            <span className="subbar-subtext">• Senopati Lounge</span>
          </div>

          <div className="current-date-tag">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{todayLabel}</span>
          </div>
        </div>

        <div className="subbar-right">
          <button type="button" className="btn-subbar-refresh" onClick={loadDashboard}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button type="button" className="btn-subbar-add" onClick={() => walkInRef.current?.focus()}>
            <span>+</span> Tambah Walk-in
          </button>
        </div>
      </div>

      {error && <p className="cashier-alert" role="alert">{error}</p>}

      <MetricCards summary={summary} usedChairs={usedChairs} totalChairs={TOTAL_CHAIRS} />

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
              <input
                type="text"
                className="queue-search-input"
                placeholder="Cari nama atau no tiket..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="queue-filters">
            <div className="filter-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`filter-tab${filter === f.key ? " active" : ""}`}
                  onClick={() => { setFilter(f.key); setPage(1); }}
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>
            <div className="live-queue-indicator">
              <span className="live-dot"></span> Live Queue
            </div>
          </div>

          {actionError && <p className="cashier-alert" role="alert">{actionError}</p>}

          <div className="queue-list">
            {loading && <p className="queue-empty">Memuat antrean...</p>}
            {!loading && pageItems.length === 0 && <p className="queue-empty">Belum ada antrean untuk hari ini.</p>}
            {pageItems.map((item) => (
              <QueueTicketCard
                key={item.id}
                item={item}
                type={queueType(item)}
                now={now + clockOffset}
                busy={busyId === item.id}
                onStart={() => handleAction(item, "start")}
                onFinish={() => handleAction(item, "finish")}
                onCancel={() => handleAction(item, "cancel")}
              />
            ))}
          </div>

          <div className="queue-pagination">
            <div className="pagination-info">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>Menampilkan <strong>{firstItem} - {lastItem}</strong> dari <strong>{filteredQueue.length}</strong> antrean hari ini</span>
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className={`page-btn${currentPage === 1 ? " disabled" : ""}`}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ‹ Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`page-btn${n === currentPage ? " active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={`page-btn${currentPage === totalPages ? " disabled" : ""}`}
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Berikutnya ›
              </button>
            </div>
          </div>

          <ChairRotation usedChairs={usedChairs} totalChairs={TOTAL_CHAIRS} />
        </div>

        <div className="dashboard-right-col">
          <WalkInForm
            nameInputRef={walkInRef}
            services={services}
            barbers={barbers}
            usedChairs={usedChairs}
            freeChair={freeChair}
            onSubmit={handleWalkIn}
          />
        </div>
      </section>
    </section>
  );
}
