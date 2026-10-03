export default function QueueTicketCard({ item }) {
  return (
    <div className={`q-card q-card-${item.type}`}>
      <div className="q-card-header">
        <div className="q-header-left">
          <span className="q-ticket">{item.id}</span>
          <span className={`q-badge q-badge-${item.type}`}>
            {item.type === 'ongoing' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginRight: 4 }} />}
            {item.type === 'waiting' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginRight: 4 }} />}
            {item.type === 'done' && <span className="status-indicator-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', marginRight: 4 }} />}
            {item.ticket}
          </span>
          {item.bookingType && (
            <span className="q-badge q-badge-neutral">{item.bookingType}</span>
          )}
        </div>
        <div className="q-header-right">
          <div className="q-time-box">
            {item.type === 'ongoing' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            {item.type === 'waiting' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            {item.type === 'done' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            <span>{item.timeLabel}</span>
            {item.timeEstimate && <span className="q-time-highlight">{item.timeEstimate}</span>}
          </div>
        </div>
      </div>

      <div className="q-card-body">
        <div>
          <div className="q-field-label">Pelanggan</div>
          <div className="q-field-value">{item.customer}</div>
        </div>
        <div>
          <div className="q-field-label">{item.type === 'done' ? 'Layanan' : (item.type === 'waiting' ? 'Rencana Layanan' : 'Paket Layanan')}</div>
          <div className="q-field-value">{item.service}</div>
          {item.serviceSub && <div className="q-field-sub">{item.serviceSub}</div>}
        </div>
        <div>
          <div className="q-field-label">{item.type === 'done' ? 'Metode Bayar' : (item.type === 'waiting' ? 'Barber Pilihan' : 'Barber Bertugas')}</div>
          <div className="barber-profile">
            {item.barberInitials && <div className="barber-avatar">{item.barberInitials}</div>}
            <div className={item.type === 'done' ? 'q-field-value' : 'q-field-sub'} style={item.type === 'done' ? { color: '#065f46' } : { fontWeight: 600, color: '#111827', fontSize: '15px' }}>{item.barberName}</div>
          </div>
        </div>
      </div>

      <div className="q-card-footer">
        <div>
          {item.type === 'ongoing' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
              {item.footerText}
            </span>
          ) : item.footerText}
        </div>
        {item.actionButton && (
          <div className="q-footer-actions">
            {item.hasEditBtn && <button className="btn-outline">Edit Data</button>}
            <button className={item.btnStyle === 'outline' ? 'btn-outline' : 'btn-dark'}>
              {item.btnStyle !== 'outline' && <span style={{ marginRight: '6px', color: '#fde047' }}>📞</span>}
              {item.actionButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}