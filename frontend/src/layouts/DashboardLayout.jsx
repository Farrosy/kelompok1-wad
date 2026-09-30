import { Outlet } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import "./DashboardLayout.css";

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Navbar />
      <main className="dashboard-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
