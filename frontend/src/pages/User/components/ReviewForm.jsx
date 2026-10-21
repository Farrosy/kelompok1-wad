import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { API_BASE_URL } from "../../../config/api";

function getToken() {
  return localStorage.getItem("barber-one-token") || sessionStorage.getItem("barber-one-token");
}

export default function ReviewForm({ bookingId, completed }) {
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!completed) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/bookings/${bookingId}/review`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat review.");
      setReview(body.review);
    }).catch((err) => {
      if (err.name !== "AbortError") setError(err.message || "Tidak dapat memuat review.");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [bookingId, completed]);

  async function submitReview(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal menyimpan review.");
      setReview(body.review);
    } catch (err) {
      setError(err.message || "Tidak dapat menyimpan review.");
    } finally {
      setSaving(false);
    }
  }

  if (!completed) return null;
  if (loading) return <section className="tp-detail-panel tp-review"><h2>Review Layanan</h2><p className="tp-muted">Memuat review...</p></section>;

  return (
    <section className="tp-detail-panel tp-review">
      <h2>Review Layanan</h2>
      {error && <p className="tp-error" role="alert">{error}</p>}
      {review ? (
        <div className="tp-review-saved" aria-label={`Rating ${review.rating} dari 5`}>
          <div className="tp-review-stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={20} fill={index < review.rating ? "currentColor" : "none"} />)}</div>
          {review.comment ? <p>{review.comment}</p> : <p className="tp-muted">Tidak ada komentar.</p>}
          <small>Terima kasih atas review Anda.</small>
        </div>
      ) : (
        <form className="tp-review-form" onSubmit={submitReview}>
          <label htmlFor="review-rating">Beri rating untuk layanan ini</label>
          <select id="review-rating" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} bintang</option>)}
          </select>
          <label htmlFor="review-comment">Komentar (opsional)</label>
          <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Bagikan pengalaman Anda..." />
          <button className="tp-btn tp-btn-primary" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Kirim Review"}</button>
        </form>
      )}
    </section>
  );
}
