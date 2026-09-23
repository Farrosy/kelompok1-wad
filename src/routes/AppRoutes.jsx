import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import HomeBookingPage from "../pages/HomeBookingPage";
import TicketsPage from "../pages/TicketsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<HomeBookingPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="profile" element={<Navigate to="/dashboard/tickets" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
