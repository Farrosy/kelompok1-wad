package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type review struct {
	ID        int64     `json:"id"`
	BookingID int64     `json:"booking_id"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
}

type createReviewRequest struct {
	BookingID int64  `json:"booking_id"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
}

type reviewListItem struct {
	ID           int64     `json:"id"`
	BookingID    int64     `json:"booking_id"`
	Rating       int       `json:"rating"`
	Comment      string    `json:"comment"`
	CreatedAt    time.Time `json:"created_at"`
	CustomerName string    `json:"customer_name"`
	ServiceName  string    `json:"service_name"`
	BarberName   string    `json:"barber_name"`
}

// createReviewHandler godoc
// @Summary      Buat review untuk booking yang selesai
// @Description  User yang login dapat menilai booking miliknya yang sudah berstatus Selesai dengan rating 1-5 dan komentar opsional. Satu booking hanya dapat direview satu kali.
// @Tags         reviews
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      createReviewRequest  true  "Data review"
// @Success      201   {object}  map[string]any
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      404   {object}  map[string]string
// @Failure      409   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /reviews [post]
func createReviewHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk membuat review."})
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format review tidak valid."})
			return
		}
		var input createReviewRequest
		if err := json.Unmarshal(body, &input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format review tidak valid."})
			return
		}
		if input.BookingID < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "booking_id tidak valid."})
			return
		}
		if input.Rating < 1 || input.Rating > 5 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "rating harus berupa angka 1 sampai 5."})
			return
		}
		comment := strings.TrimSpace(input.Comment)
		var storedComment any
		if comment != "" {
			storedComment = comment
		}

		var bookingStatus string
		err = db.QueryRow(r.Context(), `SELECT status FROM bookings WHERE id = $1 AND user_id = $2`, input.BookingID, userID).Scan(&bookingStatus)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil booking."})
			return
		}
		if bookingStatus != "Selesai" {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking belum berstatus Selesai sehingga belum dapat direview."})
			return
		}

		var item review
		err = db.QueryRow(r.Context(), `
			INSERT INTO reviews (booking_id, rating, comment)
			VALUES ($1, $2, $3)
			RETURNING id, created_at`,
			input.BookingID, input.Rating, storedComment,
		).Scan(&item.ID, &item.CreatedAt)
		if err != nil {
			var dbErr *pgconn.PgError
			if errors.As(err, &dbErr) {
				switch dbErr.Code {
				case "23505": // reviews_booking_id_key: booking sudah direview
					writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking ini sudah pernah direview."})
					return
				case "23514": // reviews_rating_check: rating di luar 1-5
					writeJSON(w, http.StatusBadRequest, map[string]string{"error": "rating harus berupa angka 1 sampai 5."})
					return
				case "23503": // reviews_booking_id_fkey: booking tidak ada
					writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
					return
				}
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Review gagal disimpan."})
			return
		}

		item.BookingID = input.BookingID
		item.Rating = input.Rating
		item.Comment = comment
		writeJSON(w, http.StatusCreated, map[string]any{"message": "Review berhasil disimpan.", "review": item})
	}
}

// listReviewsHandler godoc
// @Summary      Daftar review
// @Description  Menampilkan daftar review bersama nama layanan dan barber yang direview. Bisa dibatasi per barber dengan query parameter barber_id.
// @Tags         reviews
// @Produce      json
// @Param        barber_id  query     int  false  "Filter berdasarkan ID barber"
// @Param        booking_id query     int  false  "Filter berdasarkan ID booking"
// @Success      200        {object}  map[string][]reviewListItem
// @Failure      400        {object}  map[string]string
// @Failure      500        {object}  map[string]string
// @Router       /reviews [get]
func listReviewsHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		query := `
			SELECT rv.id, rv.booking_id, rv.rating, COALESCE(rv.comment, ''), rv.created_at,
			       b.customer_name, s.name, br.name
			FROM reviews rv
			JOIN bookings b ON b.id = rv.booking_id
			JOIN services s ON s.id = b.service_id
			JOIN barber br ON br.id = b.barber_id`
		args := make([]any, 0)
		if bookingFilter := strings.TrimSpace(r.URL.Query().Get("booking_id")); bookingFilter != "" {
			bookingID, err := strconv.ParseInt(bookingFilter, 10, 64)
			if err != nil || bookingID < 1 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "booking_id tidak valid."})
				return
			}
			args = append(args, bookingID)
			query += ` WHERE rv.booking_id = $1`
		}
		if barbersFilter := strings.TrimSpace(r.URL.Query().Get("barber_id")); barbersFilter != "" {
			barberID, err := strconv.ParseInt(barbersFilter, 10, 64)
			if err != nil || barberID < 1 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "barber_id tidak valid."})
				return
			}
			args = append(args, barberID)
			if len(args) == 1 {
				query += ` WHERE br.id = $1`
			} else {
				query += ` AND br.id = $2`
			}
		}
		query += ` ORDER BY rv.created_at DESC, rv.id DESC`

		rows, err := db.Query(r.Context(), query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil daftar review."})
			return
		}
		defer rows.Close()
		reviews := make([]reviewListItem, 0)
		for rows.Next() {
			var item reviewListItem
			var bookingID int64
			if err := rows.Scan(&item.ID, &bookingID, &item.Rating, &item.Comment, &item.CreatedAt,
				&item.CustomerName, &item.ServiceName, &item.BarberName); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar review."})
				return
			}
			item.BookingID = bookingID
			reviews = append(reviews, item)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar review."})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]reviewListItem{"reviews": reviews})
	}
}
