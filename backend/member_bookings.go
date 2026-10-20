package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type userBooking struct {
	ID                 int64      `json:"id"`
	TicketCode         string     `json:"ticket_code"`
	Status             string     `json:"status"`
	CustomerName       string     `json:"customer_name"`
	CustomerPhone      string     `json:"customer_phone"`
	ServiceID          int64      `json:"service_id"`
	ServiceName        string     `json:"service_name"`
	Price              float64    `json:"price"`
	DurationMinutes    int        `json:"duration_minutes"`
	BarberID           int64      `json:"barber_id"`
	BarberName         string     `json:"barber_name"`
	BookingDate        string     `json:"booking_date"`
	BookingTime        string     `json:"booking_time"`
	ChairNumber        int        `json:"chair_number"`
	Notes              string     `json:"notes"`
	TotalAmount        float64    `json:"total_amount"`
	PaymentMethod      *string    `json:"payment_method"`
	PaymentStatus      *string    `json:"payment_status"`
	PaymentRedirectURL *string    `json:"payment_redirect_url"`
	PaymentExpiresAt   *time.Time `json:"payment_expires_at"`
}

type rescheduleBookingRequest struct {
	BookingDate string `json:"booking_date"`
	BookingTime string `json:"booking_time"`
}

// listUserBookingsHandler godoc
// @Summary      Daftar booking user yang sedang login
// @Tags         bookings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  map[string][]userBooking
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /bookings [get]
func listUserBookingsHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk melihat booking."})
			return
		}

		rows, err := db.Query(r.Context(), `
			SELECT b.id, b.ticket_code, b.status, b.customer_name, b.customer_phone,
			       b.service_id, s.name, s.price, s.duration_minutes,
			       b.barber_id, br.name, b.booking_date, b.booking_time, COALESCE(b.notes, ''),
			       COALESCE(t.total_amount, s.price), t.payment_method, t.payment_status, t.gateway_redirect_url, t.expires_at
			FROM bookings b
		JOIN services s ON s.id = b.service_id
		JOIN barber br ON br.id = b.barber_id
		LEFT JOIN LATERAL (
			SELECT total_amount, payment_method, payment_status, gateway_redirect_url, expires_at
			FROM transactions WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
		) t ON TRUE
		WHERE b.user_id = $1
		ORDER BY b.booking_date DESC, b.booking_time DESC, b.id DESC`, userID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil daftar booking."})
			return
		}
		defer rows.Close()
		bookings := make([]userBooking, 0)
		for rows.Next() {
			var item userBooking
			var bookingDate time.Time
			if err := rows.Scan(&item.ID, &item.TicketCode, &item.Status, &item.CustomerName, &item.CustomerPhone,
				&item.ServiceID, &item.ServiceName, &item.Price, &item.DurationMinutes,
				&item.BarberID, &item.BarberName, &bookingDate, &item.BookingTime, &item.Notes,
				&item.TotalAmount, &item.PaymentMethod, &item.PaymentStatus, &item.PaymentRedirectURL, &item.PaymentExpiresAt); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar booking."})
				return
			}
			item.BookingDate = bookingDate.Format("2006-01-02")
			bookings = append(bookings, item)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar booking."})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]userBooking{"bookings": bookings})
	}
}

// patchUserBookingHandler godoc
// @Summary      Membatalkan atau mengubah jadwal booking milik user
// @Tags         bookings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                       true  "ID booking"
// @Param        body  body      rescheduleBookingRequest  false "Jadwal baru (untuk reschedule)"
// @Success      200   {object}  map[string]any
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      403   {object}  map[string]string
// @Failure      404   {object}  map[string]string
// @Failure      409   {object}  map[string]string
// @Router       /bookings/{id}/cancel [patch]
// @Router       /bookings/{id}/reschedule [patch]
func patchUserBookingHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			w.Header().Set("Allow", http.MethodPatch)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk mengubah booking."})
			return
		}
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) != 4 || parts[0] != "api" || parts[1] != "bookings" || (parts[3] != "cancel" && parts[3] != "reschedule") {
			http.NotFound(w, r)
			return
		}
		bookingID, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil || bookingID < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}

		tx, err := db.Begin(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memproses booking."})
			return
		}
		defer tx.Rollback(r.Context())
		var booking userBooking
		var bookingDate time.Time
		var createdAt time.Time
		err = tx.QueryRow(r.Context(), `
			SELECT b.id, b.ticket_code, b.status, b.service_id, s.duration_minutes,
		       b.barber_id, b.booking_date, b.booking_time, b.created_at
			FROM bookings b JOIN services s ON s.id = b.service_id
			WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE OF b`, bookingID, userID,
		).Scan(&booking.ID, &booking.TicketCode, &booking.Status, &booking.ServiceID, &booking.DurationMinutes,
			&booking.BarberID, &bookingDate, &booking.BookingTime, &createdAt)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil booking."})
			return
		}
		if booking.Status == "Batal" || booking.Status == "Selesai" || booking.Status == "Sedang Dilayani" {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Status booking tidak dapat diubah."})
			return
		}
		if !canChangeBooking(createdAt, time.Now()) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Pembatalan atau perubahan jadwal hanya dapat dilakukan dalam 10 menit setelah booking dibuat."})
			return
		}

		if parts[3] == "cancel" {
			if _, err := tx.Exec(r.Context(), `UPDATE bookings SET status = 'Batal', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, bookingID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Booking gagal dibatalkan."})
				return
			}
			if err := tx.Commit(r.Context()); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Booking gagal dibatalkan."})
				return
			}
			booking.Status = "Batal"
			writeJSON(w, http.StatusOK, map[string]any{"message": "Booking berhasil dibatalkan.", "booking": booking})
			return
		}

		var input rescheduleBookingRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format jadwal baru tidak valid."})
			return
		}
		input.BookingDate = strings.TrimSpace(input.BookingDate)
		input.BookingTime = strings.TrimSpace(input.BookingTime)
		newDate, dateErr := time.Parse("2006-01-02", input.BookingDate)
		newTime, timeErr := time.Parse("15:04", input.BookingTime)
		if dateErr != nil || timeErr != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "booking_date harus YYYY-MM-DD dan booking_time harus HH:MM."})
			return
		}
		if !isBookingStartTime(input.BookingTime) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Jam booking tidak tersedia."})
			return
		}
		startMinute := newTime.Hour()*60 + newTime.Minute()
		if startMinute+booking.DurationMinutes > 21*60 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Durasi layanan melewati jam operasional."})
			return
		}
		if !isFutureBooking(newDate, input.BookingTime, time.Now()) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Jadwal baru harus berada di masa depan."})
			return
		}

		if _, err := tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock($1, hashtext($2))`, int32(booking.BarberID), input.BookingDate); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengunci slot booking."})
			return
		}
		var hasConflict bool
		err = tx.QueryRow(r.Context(), `SELECT EXISTS (
			SELECT 1 FROM bookings b JOIN services s ON s.id = b.service_id
			WHERE b.barber_id = $1 AND b.booking_date = $2 AND b.status <> 'Batal' AND b.id <> $3
			AND ($4::time < b.booking_time::time + s.duration_minutes * interval '1 minute'
			 AND b.booking_time::time < $4::time + $5 * interval '1 minute')
		)`, booking.BarberID, newDate, bookingID, input.BookingTime, booking.DurationMinutes).Scan(&hasConflict)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa slot booking."})
			return
		}
		if hasConflict {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Slot ini sudah dipesan. Silakan pilih jam lain."})
			return
		}
		_, err = tx.Exec(r.Context(), `UPDATE bookings SET booking_date = $1, booking_time = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, newDate, input.BookingTime, bookingID)
		if err != nil {
			var dbErr *pgconn.PgError
			if errors.As(err, &dbErr) && dbErr.Code == "23505" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Slot ini sudah dipesan. Silakan pilih jam lain."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Jadwal booking gagal diubah."})
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Jadwal booking gagal diubah."})
			return
		}
		booking.BookingDate = input.BookingDate
		booking.BookingTime = input.BookingTime
		writeJSON(w, http.StatusOK, map[string]any{"message": "Jadwal booking berhasil diubah.", "booking": booking})
	}
}

func canChangeBooking(createdAt, now time.Time) bool {
	return !now.After(createdAt.Add(10 * time.Minute))
}

func isFutureBooking(date time.Time, bookingTime string, now time.Time) bool {
	startsAt, ok := localBookingStart(date, bookingTime)
	return ok && now.In(startsAt.Location()).Before(startsAt)
}

func localBookingStart(date time.Time, bookingTime string) (time.Time, bool) {
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}
	parsedTime, err := time.Parse("15:04", bookingTime)
	if err != nil {
		return time.Time{}, false
	}
	return time.Date(date.Year(), date.Month(), date.Day(), parsedTime.Hour(), parsedTime.Minute(), 0, 0, location), true
}

func isBookingStartTime(value string) bool {
	for _, candidate := range bookingStartTimes {
		if candidate == value {
			return true
		}
	}
	return false
}
