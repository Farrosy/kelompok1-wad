package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type bookingReview struct {
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
	CreatedAt string `json:"created_at"`
}

func bookingReviewHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk mengakses review."})
			return
		}
		bookingID, err := parseBookingID(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}

		switch r.Method {
		case http.MethodGet:
			var review bookingReview
			err := db.QueryRow(r.Context(), `
				SELECT r.rating, COALESCE(r.comment, ''), r.created_at::text
				FROM reviews r JOIN bookings b ON b.id = r.booking_id
				WHERE r.booking_id = $1 AND b.user_id = $2`, bookingID, userID,
			).Scan(&review.Rating, &review.Comment, &review.CreatedAt)
			if errors.Is(err, pgx.ErrNoRows) {
				var owned bool
				err = db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM bookings WHERE id = $1 AND user_id = $2)`, bookingID, userID).Scan(&owned)
				if err != nil {
					writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa booking."})
					return
				}
				if !owned {
					writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
					return
				}
				writeJSON(w, http.StatusOK, map[string]any{"review": nil})
				return
			}
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil review."})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"review": review})
		case http.MethodPost:
			var input struct {
				Rating  int    `json:"rating"`
				Comment string `json:"comment"`
			}
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format review tidak valid."})
				return
			}
			input.Comment = strings.TrimSpace(input.Comment)
			if input.Rating < 1 || input.Rating > 5 || len(input.Comment) > 1000 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Rating harus 1–5 dan komentar maksimal 1000 karakter."})
				return
			}
			var status string
			err := db.QueryRow(r.Context(), `SELECT status FROM bookings WHERE id = $1 AND user_id = $2`, bookingID, userID).Scan(&status)
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
				return
			}
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa booking."})
				return
			}
			if status != "Selesai" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Review hanya dapat diberikan setelah layanan selesai."})
				return
			}
			var review bookingReview
			err = db.QueryRow(r.Context(), `
				INSERT INTO reviews (booking_id, rating, comment)
				VALUES ($1, $2, NULLIF($3, ''))
				RETURNING rating, COALESCE(comment, ''), created_at::text`, bookingID, input.Rating, input.Comment,
			).Scan(&review.Rating, &review.Comment, &review.CreatedAt)
			if err != nil {
				var pgErr *pgconn.PgError
				if errors.As(err, &pgErr) && pgErr.Code == "23505" {
					writeJSON(w, http.StatusConflict, map[string]string{"error": "Review untuk booking ini sudah pernah dikirim."})
					return
				}
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan review. Pastikan migrasi database sudah dijalankan."})
				return
			}
			writeJSON(w, http.StatusCreated, map[string]any{"review": review})
		default:
			w.Header().Set("Allow", "GET, POST")
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
		}
	}
}
