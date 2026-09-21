import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="barber-layout">
      {/* Top Navigation Bar */}
      <header className="barber-navbar">
        <div className="nav-brand">
          <div className="brand-badge">
            <span>KRAFT</span>
          </div>
          <span className="brand-name">BARBER ONE</span>
        </div>

        <nav className="nav-menu">
          <a href="#services" className="nav-link">SERVICES &amp; ATELIER</a>
          <a href="#concierge" className="nav-link">CONCIERGE</a>
          <span className="nav-badge-signin">SIGN IN</span>
          <button type="button" className="nav-avatar-btn" aria-label="Profil">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
            </svg>
          </button>
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
            Kelola reservasi cukur dan pantau tiket antrean BARBER ONE secara langsung.
          </p>

          <LoginForm onSuccess={() => navigate("/dashboard")} />

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
            <span className="status-indicator"></span>
            <span>TERMINAL TERHUBUNG &amp; AMAN</span>
          </div>
          <div className="status-item atelier-ver">
            BARBER ONE ATELIER V2.4
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
