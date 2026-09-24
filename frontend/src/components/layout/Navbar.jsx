import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import barberOneLogo from "../../assets/images/logo-barber-one.png";
import "./Navigation.css";

const customerNavItems = [
  { to: "/dashboard", label: "Beranda & Booking", end: true },
  { to: "/dashboard/tickets", label: "Tiket & Profil Saya" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCashier = location.pathname.startsWith("/kasir");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Tutup dropdown saat klik di luar area profil
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem("barber-one-role");
    setIsProfileOpen(false);
    navigate("/");
  }

  if (isCashier) {
    return (
      <header className="dashboard-navbar cashier-mode">
        <div className="navbar-left">
          <NavLink className="dashboard-brand" to="/kasir">
            <img
              src={barberOneLogo}
              alt="Logo"
              className="dashboard-brand-logo"
              style={{ width: "36px", height: "36px", objectFit: "contain", flexShrink: 0 }}
            />
            <div className="brand-text-block">
              <span className="brand-title">BARBER ONE</span>
              <span className="brand-sub">ATELIER &amp; GROOMING</span>
            </div>
          </NavLink>

          <div className="brand-vertical-divider" />

          {/* Segmented Tab */}
          <div className="cashier-tab-pill">
            <button type="button" className="tab-pill-btn">Antrean &amp; POS</button>
            <button type="button" className="tab-pill-btn active">Kasir &amp; Pembayaran</button>
          </div>
        </div>

        <div className="navbar-right">
          {/* Branch Dropdown */}
          <div className="branch-selector">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Cabang Senopati, Jakarta</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <span className="nav-separator-dot">•</span>

          {/* Bell Notification */}
          <button type="button" className="nav-icon-badge-btn" aria-label="Notifikasi">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="bell-badge-dot" />
          </button>

          {/* Profile Dropdown Container */}
          <div className="cashier-profile-container" ref={profileMenuRef}>
            <button
              type="button"
              className="cashier-profile-wrap"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
            >
              <div className="profile-text">
                <span className="profile-name">Arga Pratama</span>
                <span className="profile-role">Kasir &amp; Barista</span>
              </div>
              <div className="profile-avatar">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt="Avatar"
                  style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover" }}
                />
              </div>
            </button>

            {/* Dropdown Card */}
            {isProfileOpen && (
              <div className="profile-dropdown-menu" role="menu">
                <div className="dropdown-user-header">
                  <p className="dropdown-user-name">Arga Pratama</p>
                  <p className="dropdown-user-role">ID: KASIR-01 · Senopati</p>
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item-btn btn-login-switch"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Ganti Akun / Login</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-btn btn-logout-action"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="dashboard-navbar">
      <NavLink className="dashboard-brand" to="/dashboard">
        <img
          src={barberOneLogo}
          alt="Barber One Logo"
          className="dashboard-brand-logo"
          style={{ width: "36px", height: "36px", objectFit: "contain" }}
        />
        BARBER ONE
      </NavLink>
      <nav aria-label="Navigasi dashboard" className="dashboard-nav-links">
        {customerNavItems.map(({ to, label, end }) => (
          <NavLink
            className={({ isActive }) => `dashboard-nav-link${isActive ? " is-active" : ""}`}
            end={end}
            key={to}
            to={to}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        className="dashboard-logout"
        type="button"
        onClick={() => {
          localStorage.removeItem("barber-one-role");
          navigate("/");
        }}
      >
        Logout
      </button>
    </header>
  );
}