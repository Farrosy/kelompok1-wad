import { useState } from "react";
import { Link } from "react-router-dom";

import barberOneLogo from "../assets/images/logo-barber-one.png";
import AuthFooter from "../components/layout/AuthFooter";
import { API_BASE_URL } from "../config/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          password: form.password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Pendaftaran gagal. Silakan coba lagi.");
        return;
      }

      setRegistered(true);
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend berjalan di port 3000.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="barber-layout">
      <header className="barber-navbar">
        <Link className="nav-brand" to="/" aria-label="Barber One, halaman masuk">
          <img src={barberOneLogo} alt="" className="nav-brand-logo" />
          <span className="brand-name">BARBER ONE</span>
        </Link>
        <nav className="nav-menu" aria-label="Navigasi utama">
          <Link to="/" className="nav-link nav-link-button">Masuk</Link>
        </nav>
      </header>

      <main className="barber-main">
        <section className="login-card-luxury" aria-labelledby="register-heading">
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
          <h1 id="register-heading" className="card-title">
            {registered ? "Pendaftaran Berhasil" : "Buat Akun Anda"}
          </h1>
          <p className="card-desc">
            {registered
              ? "Akun Anda sudah tersimpan. Silakan masuk untuk melanjutkan."
              : "Daftar untuk mengelola reservasi dan antrean BARBER ONE."}
          </p>

          {registered ? (
            <Link to="/" className="btn-primary-dark register-submit-link">LANJUT KE HALAMAN MASUK <span className="btn-arrow">→</span></Link>
          ) : (
            <form className="luxury-form register-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <div className="form-label-row"><label htmlFor="register-name">Nama lengkap</label></div>
                <div className="input-wrapper"><input id="register-name" name="name" type="text" autoComplete="name" maxLength="100" placeholder="Nama Anda" value={form.name} onChange={handleChange} required /></div>
              </div>

              <div className="form-group">
                <div className="form-label-row"><label htmlFor="register-phone">Nomor telepon</label></div>
                <div className="input-wrapper"><input id="register-phone" name="phone" type="tel" autoComplete="tel" maxLength="20" placeholder="0812-3456-7890" value={form.phone} onChange={handleChange} required /></div>
              </div>

              <div className="form-group">
                <div className="form-label-row"><label htmlFor="register-email">Email <span className="label-badge-verified">(opsional)</span></label></div>
                <div className="input-wrapper"><input id="register-email" name="email" type="email" autoComplete="email" maxLength="100" placeholder="nama@email.com" value={form.email} onChange={handleChange} /></div>
              </div>

              <div className="form-group">
                <div className="form-label-row"><label htmlFor="register-password">Kata sandi</label></div>
                <div className="input-wrapper"><input id="register-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="72" placeholder="Minimal 8 karakter" value={form.password} onChange={handleChange} required /></div>
              </div>

              <div className="form-group">
                <div className="form-label-row"><label htmlFor="register-confirm-password">Konfirmasi kata sandi</label></div>
                <div className="input-wrapper"><input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength="8" maxLength="72" placeholder="Ulangi kata sandi" value={form.confirmPassword} onChange={handleChange} required /></div>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <button type="submit" className="btn-primary-dark" disabled={isSubmitting}>
                <span>{isSubmitting ? "SEDANG MENDAFTAR..." : "DAFTAR SEKARANG"}</span>
                {!isSubmitting && <span className="btn-arrow">→</span>}
              </button>
            </form>
          )}

          <div className="card-footer-info">
            <p className="register-prompt">
              Sudah memiliki akun? <Link to="/" className="register-link">MASUK</Link>
            </p>
            <div className="location-schedule">
              <span>Atelier Senopati &amp; SCBD</span><span className="dot-divider">•</span><span>Buka Setiap Hari 09.00 - 21.00</span>
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
}
