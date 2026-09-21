import { NavLink, useNavigate } from "react-router-dom";
import "./Navigation.css";

const navigationItems = [
  { to: "/dashboard", label: "Beranda & Booking", end: true },
  { to: "/dashboard/tickets", label: "Tiket" },
  { to: "/dashboard/profile", label: "Profil Saya" },
];

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="dashboard-navbar">
      <NavLink className="dashboard-brand" to="/dashboard">BARBER ONE</NavLink>
      <nav aria-label="Navigasi dashboard" className="dashboard-nav-links">
        {navigationItems.map(({ to, label, end }) => (
          <NavLink className={({ isActive }) => `dashboard-nav-link${isActive ? " is-active" : ""}`} end={end} key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <button className="dashboard-logout" type="button" onClick={() => navigate("/")}>Logout</button>
    </header>
  );
}
