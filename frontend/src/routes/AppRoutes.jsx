import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import CashierDashboard from "../pages/Cashier/CashierDashboard";
import HomeBookingPage from "../pages/User/HomeBookingPage";
import LoginPage from "..//pages/Auth/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import TicketsPage from "../pages/User/TicketsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<HomeBookingPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="profile" element={<Navigate to="/dashboard/tickets" replace />} />
      </Route>
      <Route path="/kasir" element={<DashboardLayout />}>
        <Route index element={<CashierDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
