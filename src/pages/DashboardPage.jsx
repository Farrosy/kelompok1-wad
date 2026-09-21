import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <main className="dashboard-page">
      <section className="welcome-card">
        <div className="brand-mark" aria-hidden="true">B Logo</div>
        <p className="eyebrow">BARBER ONE</p>
        <h1>Selamat datang</h1>
        <p>Anda berhasil masuk ke dashboard.</p>
        <button type="button" onClick={() => navigate("/")}>Logout</button>
      </section>
    </main>
  );
}
