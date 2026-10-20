function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function chairLabel(chair) {
  return `KURSI ${String(chair).padStart(2, "0")}`;
}

const FINISH_AFTER_MINUTES = 30;
const CANCEL_AFTER_MINUTES = 10;

// Sisa menit (dibulatkan ke atas) sampai started_at + afterMinutes. 0 berarti tombol sudah boleh diklik.
function minutesLeft(startedAt, afterMinutes, now) {
  if (!startedAt) return 0;
  const left = new Date(startedAt).getTime() + afterMinutes * 60 * 1000 - now;
  return left > 0 ? Math.ceil(left / 60000) : 0;
}

// Ubah 08xx / +62xx / 62xx menjadi format wa.me (62xx). Nomor kosong atau "-" menghasilkan null.
function whatsappNumber(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function whatsappLink(item, type) {
  const number = whatsappNumber(item.customer_phone);
  if (!number) return null;
  const moment = type === "ongoing" ? "sudah dimulai" : "sebentar lagi dimulai";
  const text = `Halo ${item.customer_name}, ini Barber One. Jadwal ${item.service_name} kamu jam ${item.booking_time} WIB bersama ${item.barber_name} ${moment}. Kami tunggu ya!`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default function QueueTicketCard({ item, type, now, busy, onFinish, onCancel }) {
  let badgeText = "MENUNGGU JADWAL";
  let timeLabel = `Jadwal Slot: ${item.booking_time} WIB`;
  let footerText = `Otomatis masuk kursi jam ${item.booking_time} WIB saat barber & kursi kosong.`;
  if (type === "ongoing") {
    badgeText = `${chairLabel(item.chair_number)} • SEDANG BERJALAN`;
    timeLabel = `Jadwal: ${item.booking_time} WIB`;
    footerText = `Durasi layanan ${item.duration_minutes} menit`;
  } else if (type === "done") {
    badgeText = "SELESAI & LUNAS";
    timeLabel = `Jadwal: ${item.booking_time} WIB • ${chairLabel(item.chair_number)}`;
    footerText = `Dibayar via ${item.payment_method || "-"}.`;
  }

  const started = type === "ongoing";
  const finishLeft = started ? minutesLeft(item.started_at, FINISH_AFTER_MINUTES, now) : null;
  const cancelLeft = started ? minutesLeft(item.started_at, CANCEL_AFTER_MINUTES, now) : null;
  const canFinish = started && finishLeft === 0;
  const canCancel = started && cancelLeft === 0;
  const waLink = whatsappLink(item, type);

  function handleCancel() {
    if (window.confirm(`Batalkan ${item.customer_name} (#${item.ticket_code})? Pembayaran tidak dikembalikan.`)) onCancel();
  }

  return (
    <div className={`q-card q-card-${type}`}>
      <div className="q-card-header">
        <div className="q-header-left">
          <span className="q-ticket">#{item.ticket_code}</span>
          <span className={`q-badge q-badge-${type}`}>
            {type === 'ongoing' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginRight: 4 }} />}
            {type === 'waiting' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginRight: 4 }} />}
            {type === 'done' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', marginRight: 4 }} />}
            {badgeText}
          </span>
          <span className="q-badge q-badge-neutral">{item.is_walk_in ? "Walk-In Langsung" : "Booking Web"}</span>
        </div>
        <div className="q-header-right">
          <div className="q-time-box">
            {type === 'ongoing' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            {type === 'waiting' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            {type === 'done' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            <span>{timeLabel}</span>
          </div>
        </div>
      </div>

      <div className="q-card-body">
        <div>
          <div className="q-field-label">Pelanggan</div>
          <div className="q-field-value">{item.customer_name}</div>
          {item.customer_phone && item.customer_phone !== "-" && <div className="q-field-sub">{item.customer_phone}</div>}
        </div>
        <div>
          <div className="q-field-label">{type === 'done' ? 'Layanan' : (type === 'waiting' ? 'Rencana Layanan' : 'Paket Layanan')}</div>
          <div className="q-field-value">{item.service_name}</div>
          <div className="q-field-sub">{type === 'done' ? formatRupiah(item.total_amount) : `${item.duration_minutes} Menit Durasi`}</div>
        </div>
        <div>
          <div className="q-field-label">{type === 'waiting' ? 'Barber Pilihan' : 'Barber Bertugas'}</div>
          <div className="barber-profile">
            <div className="barber-avatar">{initials(item.barber_name)}</div>
            <div className="q-field-sub" style={{ fontWeight: 600, color: '#111827', fontSize: '15px' }}>{item.barber_name}</div>
          </div>
        </div>
      </div>

      <div className="q-card-footer">
        <div>{footerText}</div>
        {type !== "done" && (
          <div className="q-footer-actions">
            <button
              type="button"
              className="btn-dark"
              disabled={busy || !canFinish}
              title={started ? `Bisa diklik ${FINISH_AFTER_MINUTES} menit setelah masuk kursi` : "Belum masuk kursi"}
              onClick={onFinish}
            >
              {finishLeft > 0 ? `Selesai (${finishLeft} mnt lagi)` : "Selesai"}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy || !canCancel}
              title={started ? `Bisa diklik ${CANCEL_AFTER_MINUTES} menit setelah masuk kursi` : "Belum masuk kursi"}
              onClick={handleCancel}
            >
              {cancelLeft > 0 ? `Batal (${cancelLeft} mnt lagi)` : "Batal"}
            </button>
            {waLink ? (
              <a className="btn-whatsapp" href={waLink} target="_blank" rel="noopener noreferrer">Reminder WA</a>
            ) : (
              <button type="button" className="btn-whatsapp" disabled title="Nomor HP pelanggan tidak tersedia">Reminder WA</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
