import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config/api";
import "./NotificationBell.css";

const POLL_MS = 30000; // cek notifikasi baru tiap 30 detik

function getToken() {
  return localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
}

// Mengubah waktu jadi tulisan "5 menit lalu", "2 jam lalu", dst.
function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState("all"); // filter: all | unread
  const [type, setType] = useState(""); // filter: "" | booking | payment
  const wrapRef = useRef(null);

  // Ambil daftar notifikasi dari backend, filter dikirim lewat query string
  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams({ limit: "30" });
    if (status !== "all") params.set("status", status);
    if (type) params.set("type", type);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {
      // Abaikan: lonceng tidak boleh mengganggu halaman kalau backend mati.
    }
  }, [status, type]);

  // Muat saat pertama kali, saat filter berubah, lalu ulangi tiap 30 detik
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function patch(path) {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}${path}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Abaikan
    }
    await load();
  }

  function handleToggle() {
    setIsOpen((previous) => !previous);
    if (!isOpen) load(); // segarkan data saat dibuka
  }

  // Belum login: lonceng tidak ditampilkan
  if (!getToken()) return null;

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="nav-icon-badge-btn"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown" role="dialog" aria-label="Daftar notifikasi">
          <div className="notif-header">
            <strong>Notifikasi</strong>
            <button type="button" className="notif-link-btn" onClick={() => patch("/api/notifications/read-all")}>
              Tandai semua dibaca
            </button>
          </div>

          <div className="notif-filters">
            <button
              type="button"
              className={`notif-tab${status === "all" ? " is-active" : ""}`}
              onClick={() => setStatus("all")}
            >
              Semua
            </button>
            <button
              type="button"
              className={`notif-tab${status === "unread" ? " is-active" : ""}`}
              onClick={() => setStatus("unread")}
            >
              Belum dibaca
            </button>
            <select className="notif-select" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Semua jenis</option>
              <option value="booking">Booking</option>
              <option value="payment">Pembayaran</option>
            </select>
          </div>

          <div className="notif-list">
            {items.length === 0 ? (
              <p className="notif-empty">Belum ada notifikasi.</p>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`notif-item${item.is_read ? "" : " is-unread"}`}
                  onClick={() => !item.is_read && patch(`/api/notifications/${item.id}/read`)}
                >
                  <span className="notif-dot" />
                  <span className="notif-body">
                    <span className="notif-title">{item.title}</span>
                    <span className="notif-message">{item.message}</span>
                    <span className="notif-time">{timeAgo(item.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}