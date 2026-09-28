import { Link, useNavigate } from "react-router-dom";

import barberOneLogo from "../assets/images/logo-barber-one.png";
import AuthFooter from "../components/layout/AuthFooter";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="barber-layout">
      {/* Top Navigation Bar */}
      <header className="barber-navbar">
        <Link className="nav-brand" to="/dashboard" aria-label="Barber One, Beranda & Booking">
          <img src={barberOneLogo} alt="Barber One Logo" className="nav-brand-logo" />
          <span className="brand-name">BARBER ONE</span>
        </Link>

        <nav className="nav-menu" aria-label="Navigasi utama">
          <Link to="/dashboard" className="nav-link nav-link-button">Beranda &amp; Booking</Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="barber-main">
        <section className="login-card-luxury" aria-labelledby="login-heading">
          {/* Scissors Icon Badge */}
          <div className="scissors-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>

          <p className="portal-subtitle">PORTAL PELANGGAN</p>
          <h1 id="login-heading" className="card-title">Masuk ke Akun Anda</h1>
          <p className="card-desc">
            Kelola reservasi cukur dan pantau tiket antrean <b>BARBER ONE</b> secara langsung.
          </p>

          <LoginForm onSuccess={(account) => {
            localStorage.setItem("barber-one-role", account.role);
            navigate(account.role === "kasir" ? "/kasir" : "/dashboard");
          }} />

          <div className="card-footer-info">
            <p className="register-prompt">
              Belum memiliki akun reservasi?{" "}
              <a href="#register" className="register-link">DAFTAR SEKARANG</a>
            </p>
            <div className="location-schedule">
              <span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>{" "}
                Atelier Senopati &amp; SCBD
              </span>
              <span className="dot-divider">•</span>
              <span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>{" "}
                Buka Setiap Hari 09.00 - 21.00
              </span>
            </div>
          </div>
        </section>

        {/* Status Bar Under Card */}
        <div className="terminal-status-bar">
          <div className="status-item">
          </div>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
