const queue = [
  { ticket: "BO-024", name: "Rizky Pratama", service: "Classic Cut", time: "10.30", status: "Menunggu" },
  { ticket: "BO-025", name: "Andi Saputra", service: "Haircut + Wash", time: "10.45", status: "Menunggu" },
  { ticket: "BO-026", name: "Dimas Putra", service: "Beard Trim", time: "11.00", status: "Dikonfirmasi" },
];

export default function CashierDashboard() {
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  return (
    <section className="cashier-dashboard">
      <div className="cashier-heading-row">
        <div>
          <p className="cashier-eyebrow">BARBER ONE · OPERASIONAL</p>
          <h1 className="dashboard-page-heading">Dashboard Kasir</h1>
          <p className="dashboard-page-copy">Pantau antrean booking dan status pelanggan hari ini.</p>
        </div>
        <span className="cashier-date">Hari ini · {today}</span>
      </div>

      <div className="cashier-stat-grid">
        <article className="cashier-stat-card"><span>Booking hari ini</span><strong>18</strong><small>4 booking baru</small></article>
        <article className="cashier-stat-card"><span>Menunggu</span><strong>6</strong><small>2 sedang dilayani</small></article>
        <article className="cashier-stat-card"><span>Estimasi pemasukan</span><strong>Rp 1.250.000</strong><small>Dari layanan hari ini</small></article>
      </div>

      <section className="cashier-queue-card" aria-labelledby="queue-title">
        <div className="cashier-queue-heading">
          <div><h2 id="queue-title">Antrean Booking</h2><p>Daftar pelanggan dan jadwal layanan terdekat.</p></div>
          <button type="button" className="cashier-refresh" onClick={() => window.location.reload()}>Muat ulang</button>
        </div>
        <div className="cashier-table-wrap">
          <table className="cashier-table">
            <thead><tr><th>No. Tiket</th><th>Pelanggan</th><th>Layanan</th><th>Jadwal</th><th>Status</th></tr></thead>
            <tbody>{queue.map((item) => <tr key={item.ticket}>
              <td className="cashier-ticket">{item.ticket}</td><td>{item.name}</td><td>{item.service}</td><td>{item.time}</td>
              <td><span className={`cashier-status ${item.status === "Menunggu" ? "is-waiting" : "is-confirmed"}`}>{item.status}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
