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

type createBookingRequest struct {
	ServiceID     int64  `json:"service_id"`
	BarberID      int64  `json:"barber_id"`
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	BookingDate   string `json:"booking_date"`
	BookingTime   string `json:"booking_time"`
	Notes         string `json:"notes"`
}

type createdBooking struct {
	ID         int64  `json:"id"`
	TicketCode string `json:"ticket_code"`
	Status     string `json:"status"`
}

type createBookingResponse struct {
	Message string         `json:"message"`
	Booking createdBooking `json:"booking"`
}

// createBookingHandler godoc
// @Summary      Membuat booking
// @Tags         bookings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      createBookingRequest  true  "Data booking"
// @Success      201   {object}  createBookingResponse
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      409   {object}  map[string]string
// @Router       /bookings [post]
func createBookingHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk membuat booking."})
			return
		}

		var input createBookingRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format data booking tidak valid."})
			return
		}

		input.CustomerName = strings.TrimSpace(input.CustomerName)
		input.CustomerPhone = strings.TrimSpace(input.CustomerPhone)
		input.BookingDate = strings.TrimSpace(input.BookingDate)
		input.BookingTime = strings.TrimSpace(input.BookingTime)
		input.Notes = strings.TrimSpace(input.Notes)

		if input.ServiceID < 1 || input.BarberID < 1 || input.CustomerName == "" || input.CustomerPhone == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Layanan, barber, nama, dan nomor telepon wajib diisi."})
			return
		}
		if len(input.CustomerName) > 100 || len(input.CustomerPhone) > 20 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nama maksimal 100 karakter dan nomor telepon maksimal 20 karakter."})
			return
		}

		bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format tanggal harus YYYY-MM-DD."})
			return
		}
		if _, err := time.Parse("15:04", input.BookingTime); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format jam harus HH:MM."})
			return
		}
		allowedTimes := []string{
			"10:00", "10:45", "11:30", "12:15", "13:00", "13:45", "14:30",
			"15:15", "16:00", "16:45", "17:30", "18:15", "19:00", "19:45",
		}
		timeIsAvailable := false
		for _, availableTime := range allowedTimes {
			if input.BookingTime == availableTime {
				timeIsAvailable = true
				break
			}
		}
		if !timeIsAvailable {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Jam booking tidak tersedia."})
			return
		}

		var barberAvailable bool
		err = db.QueryRow(r.Context(), `SELECT available FROM barber WHERE id = $1`, input.BarberID).Scan(&barberAvailable)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Barber tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa barber."})
			return
		}
		if !barberAvailable {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Barber sedang tidak tersedia."})
			return
		}

		ticketCode := "BK-" + strconv.FormatInt(time.Now().UnixNano(), 36)
		var booking createdBooking
		err = db.QueryRow(r.Context(),
			`INSERT INTO bookings
			 (ticket_code, user_id, customer_name, customer_phone, service_id, barber_id, booking_date, booking_time, notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id, ticket_code, status`,
			ticketCode, userID, input.CustomerName, input.CustomerPhone,
			input.ServiceID, input.BarberID, bookingDate, input.BookingTime, input.Notes,
		).Scan(&booking.ID, &booking.TicketCode, &booking.Status)
		if err != nil {
			var dbError *pgconn.PgError
			if errors.As(err, &dbError) && dbError.Code == "23505" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Slot ini sudah dipesan. Silakan pilih jam lain."})
				return
			}
			if errors.As(err, &dbError) && dbError.Code == "23503" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Layanan atau barber tidak ditemukan."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Booking gagal disimpan."})
			return
		}

		writeJSON(w, http.StatusCreated, createBookingResponse{
			Message: "Booking berhasil dibuat.",
			Booking: booking,
		})
	}
}
