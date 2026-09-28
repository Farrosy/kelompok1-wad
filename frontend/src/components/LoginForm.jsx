import { useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useToast } from "./ToastProvider";

export default function LoginForm({ onSuccess }) {
  const showToast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanInput = identifier.trim();
    if (!cleanInput || !password) {
      showToast("error", "Nomor telepon/email dan kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanInput, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast("error", data.error || "Login gagal. Periksa kembali data Anda.");
        return;
      }

      showToast("success", `Login berhasil. Selamat datang, ${data.user.name}.`);
      onSuccess(data.user, rememberMe);
    } catch {
      showToast("error", "Tidak dapat terhubung ke server. Pastikan backend berjalan di port 3000.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="luxury-form" onSubmit={handleSubmit} noValidate>
      {/* Field: Phone / Email */}
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="identifier">Nomor Telepon atau Email</label>
        </div>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
          </span>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="0812–3456–7890"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Field: Password */}
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="password">Kata Sandi</label>
          <a href="#forgot" className="forgot-password-link">Lupa Sandi?</a>
        </div>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Remember & Protocol TLS Info */}
      <div className="form-meta-row">
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="checkbox-label">Ingat saya di perangkat ini</span>
        </label>
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn-primary-dark" disabled={isSubmitting}>
        <span>{isSubmitting ? "SEDANG MASUK..." : "MASUK SEKARANG"}</span>
        {!isSubmitting && <span className="btn-arrow">→</span>}
      </button>
    </form>
  );
}
