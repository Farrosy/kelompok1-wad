package main

import (
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ticketBooking struct {
	ID              int64    `json:"id"`
	TicketCode      string   `json:"ticket_code"`
	Status          string   `json:"status"`
	BookingDate     string   `json:"booking_date"`
	BookingTime     string   `json:"booking_time"`
	ChairNumber     int      `json:"chair_number"`
	Notes           string   `json:"notes"`
	ServiceName     string   `json:"service_name"`
	ServiceDesc     *string  `json:"service_description"`
	DurationMinutes int      `json:"duration_minutes"`
	Price           float64  `json:"price"`
	TotalAmount     float64  `json:"total_amount"`
	BarberName      string   `json:"barber_name"`
	BarberRating    float64  `json:"barber_rating"`
	PaymentMethod   *string  `json:"payment_method"`
	PaymentStatus   *string  `json:"payment_status"`
}

type ticketStats struct {
	Visits         int    `json:"visits"`
	FavoriteBarber string `json:"favorite_barber"`
}

type myTicketsResponse struct {
	User    registeredUser  `json:"user"`
	Stats   ticketStats     `json:"stats"`
	Active  *ticketBooking  `json:"active"`
	History []ticketBooking `json:"history"`
}

// myTicketsHandler godoc
// @Summary      Tiket aktif, riwayat kunjungan, dan statistik user yang login
// @Tags         bookings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  myTicketsResponse
// @Failure      401  {object}  map[string]string
// @Router       /my-tickets [get]
func myTicketsHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali."})
			return
		}

		var user registeredUser
		err := db.QueryRow(r.Context(),
			`SELECT id, name, phone, email, role FROM users WHERE id = $1`, userID,
		).Scan(&user.ID, &user.Name, &user.Phone, &user.Email, &user.Role)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "User tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil profil user."})
			return
		}

		rows, err := db.Query(r.Context(),
			`SELECT b.id, b.ticket_code, b.status, b.booking_date, b.booking_time, b.chair_number,
			        COALESCE(b.notes, ''), s.name, s.description, s.duration_minutes, s.price,
			        COALESCE(t.total_amount, s.price), br.name, br.rating, t.payment_method, t.payment_status
			 FROM bookings b
			 JOIN services s ON s.id = b.service_id
			 JOIN barber br ON br.id = b.barber_id
			 LEFT JOIN LATERAL (
			     SELECT total_amount, payment_method, payment_status
			     FROM transactions WHERE booking_id = b.id ORDER BY paid_at DESC LIMIT 1
			 ) t ON TRUE
			 WHERE b.user_id = $1
			 ORDER BY b.booking_date ASC, b.booking_time ASC`, userID,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil data tiket."})
			return
		}
		defer rows.Close()

		wib := time.FixedZone("WIB", 7*3600)
		now := time.Now().In(wib)
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

		resp := myTicketsResponse{User: user, History: make([]ticketBooking, 0)}
		barberCount := map[string]int{}
		for rows.Next() {
			var item ticketBooking
			var date time.Time
			if err := rows.Scan(&item.ID, &item.TicketCode, &item.Status, &date, &item.BookingTime, &item.ChairNumber,
				&item.Notes, &item.ServiceName, &item.ServiceDesc, &item.DurationMinutes, &item.Price,
				&item.TotalAmount, &item.BarberName, &item.BarberRating, &item.PaymentMethod, &item.PaymentStatus); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca data tiket."})
				return
			}
			item.BookingDate = date.Format("2006-01-02")

			switch item.Status {
			case "Selesai":
				resp.History = append(resp.History, item)
				resp.Stats.Visits++
				barberCount[item.BarberName]++
			case "Menunggu", "Dikonfirmasi", "Sedang Dilayani":
				dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
				if resp.Active == nil && !dateOnly.Before(today) {
					copied := item
					resp.Active = &copied
				}
			}
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca data tiket."})
			return
		}

		// Riwayat terbaru di atas.
		sort.SliceStable(resp.History, func(i, j int) bool {
			a, b := resp.History[i], resp.History[j]
			if a.BookingDate != b.BookingDate {
				return a.BookingDate > b.BookingDate
			}
			return a.BookingTime > b.BookingTime
		})

		best := 0
		for name, count := range barberCount {
			if count > best || (count == best && name < resp.Stats.FavoriteBarber) {
				best = count
				resp.Stats.FavoriteBarber = name
			}
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// cancelBookingHandler godoc
// @Summary      Batalkan booking milik user yang login
// @Tags         bookings
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "ID booking"
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /bookings/{id}/cancel [patch]
func cancelBookingHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			w.Header().Set("Allow", http.MethodPatch)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login terlebih dahulu."})
			return
		}

		// Path: /api/bookings/{id}/cancel
		parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/bookings/"), "/"), "/")
		if len(parts) != 2 || parts[1] != "cancel" {
			http.NotFound(w, r)
			return
		}
		bookingID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil || bookingID < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}

		tag, err := db.Exec(r.Context(),
			`UPDATE bookings SET status = 'Batal', updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND user_id = $2 AND status IN ('Menunggu', 'Dikonfirmasi')`,
			bookingID, userID,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membatalkan booking."})
			return
		}
		if tag.RowsAffected() == 0 {
			var exists bool
			if err := db.QueryRow(r.Context(),
				`SELECT EXISTS (SELECT 1 FROM bookings WHERE id = $1 AND user_id = $2)`, bookingID, userID,
			).Scan(&exists); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membatalkan booking."})
				return
			}
			if !exists {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
				return
			}
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking ini tidak dapat dibatalkan lagi."})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Booking berhasil dibatalkan."})
	}
}
