export default function TicketsPage() {
  return (
    <section className="account-page">
      <h1 className="dashboard-page-heading">Tiket &amp; Profil Saya</h1>
      <p className="dashboard-page-copy">Kelola tiket booking dan informasi profil Anda dalam satu halaman.</p>

      <div className="account-page-sections">
        <section className="account-section" aria-labelledby="tickets-heading">
          <h2 id="tickets-heading">Tiket Saya</h2>
          <p>Daftar tiket booking Anda akan ditampilkan di sini.</p>
        </section>

        <section className="account-section" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Profil Saya</h2>
          <p>Informasi profil Anda akan ditampilkan di sini.</p>
        </section>
      </div>
    </section>
  );
}
