import { NavLink, useLocation, useNavigate } from "react-router-dom";

import barberOneLogo from "../../assets/images/logo-barber-one.png";
import "./Navigation.css";

const navigationItems = [
  { to: "/dashboard", label: "Beranda & Booking", end: true },
  { to: "/dashboard/tickets", label: "Tiket & Profil Saya" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const isCashier = useLocation().pathname.startsWith("/kasir");
  const items = isCashier
    ? [{ to: "/kasir", label: "Ringkasan Kasir", end: true }]
    : navigationItems;

  return (
    <header className="dashboard-navbar">
      <NavLink className="dashboard-brand" to="/dashboard">
        <img src={barberOneLogo} alt="Barber One Logo" className="dashboard-brand-logo" />
        BARBER ONE
      </NavLink>
      <nav aria-label="Navigasi dashboard" className="dashboard-nav-links">
        {items.map(({ to, label, end }) => (
          <NavLink className={({ isActive }) => `dashboard-nav-link${isActive ? " is-active" : ""}`} end={end} key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      {isCashier && <span className="cashier-role-badge">KASIR</span>}
      <button className="dashboard-logout" type="button" onClick={() => {
        localStorage.removeItem("barber-one-role");
        navigate("/");
      }}>Logout</button>
    </header>
  );
}
