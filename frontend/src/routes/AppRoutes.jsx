import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import CashierDashboard from "../pages/Cashier/CashierDashboard";
import HomeBookingPage from "../pages/User/HomeBookingPage";
<<<<<<< Updated upstream
import LoginPage from "../pages/LoginPage";
import TicketsPage from "../pages/TicketsPage";
=======
import LoginPage from "../pages/Auth/LoginPage";
import RegisterPage from "../pages/Auth/RegisterPage";
import TicketsPage from "../pages/User/TicketsPage";
>>>>>>> Stashed changes

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<HomeBookingPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="profile" element={<Navigate to="/dashboard/tickets" replace />} />
      </Route>
      <Route path="/kasir" element={<DashboardLayout />}>
        <Route index element={<CashierDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
