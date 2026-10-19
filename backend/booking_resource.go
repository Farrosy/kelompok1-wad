package main

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func bookingResourceHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	patchHandler := patchUserBookingHandler(db, sessions)
	return func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) == 3 && parts[0] == "api" && parts[1] == "bookings" && r.Method == http.MethodGet {
			getUserBookingHandler(db, sessions)(w, r)
			return
		}
		if len(parts) == 4 && parts[0] == "api" && parts[1] == "bookings" && parts[3] == "payment" && r.Method == http.MethodPost {
			createBookingPaymentHandler(db, sessions)(w, r)
			return
		}
		if r.Method == http.MethodPatch {
			patchHandler(w, r)
			return
		}
		w.Header().Set("Allow", "GET, POST, PATCH")
		http.Error(w, "Metode tidak diizinkan.", http.StatusMethodNotAllowed)
	}
}

func parseBookingID(r *http.Request) (int64, error) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 || parts[0] != "api" || parts[1] != "bookings" {
		return 0, fmt.Errorf("invalid booking path")
	}
	id, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil || id < 1 {
		return 0, fmt.Errorf("invalid booking id")
	}
	return id, nil
}

func getUserBookingHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk melihat booking."})
			return
		}
		bookingID, err := parseBookingID(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}
		item, err := queryUserBooking(r, db, bookingID, userID)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil detail booking."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]userBooking{"booking": item})
	}
}

func queryUserBooking(r *http.Request, db *pgxpool.Pool, bookingID, userID int64) (userBooking, error) {
	var item userBooking
	var bookingDate time.Time
	err := db.QueryRow(r.Context(), `
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
		WHERE b.id = $1 AND b.user_id = $2`, bookingID, userID).Scan(
		&item.ID, &item.TicketCode, &item.Status, &item.CustomerName, &item.CustomerPhone,
		&item.ServiceID, &item.ServiceName, &item.Price, &item.DurationMinutes,
		&item.BarberID, &item.BarberName, &bookingDate, &item.BookingTime, &item.Notes,
		&item.TotalAmount, &item.PaymentMethod, &item.PaymentStatus, &item.PaymentRedirectURL, &item.PaymentExpiresAt,
	)
	if err == nil {
		item.BookingDate = bookingDate.Format("2006-01-02")
	}
	return item, err
}

func createBookingPaymentHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := sessions.userIDFromRequest(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login untuk melanjutkan pembayaran."})
			return
		}
		bookingID, err := parseBookingID(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}

		tx, err := db.Begin(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyiapkan pembayaran."})
			return
		}
		defer tx.Rollback(r.Context())

		var ticketCode, status, customerName, customerPhone, serviceName, bookingTime string
		var barberID int64
		var amount float64
		var duration int
		var bookingDate time.Time
		err = tx.QueryRow(r.Context(), `
			SELECT b.ticket_code, b.status, b.customer_name, b.customer_phone, s.name, s.price,
			       s.duration_minutes, b.barber_id, b.booking_date, b.booking_time
			FROM bookings b JOIN services s ON s.id = b.service_id
			WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE OF b`, bookingID, userID,
		).Scan(&ticketCode, &status, &customerName, &customerPhone, &serviceName, &amount,
			&duration, &barberID, &bookingDate, &bookingTime)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil booking."})
			return
		}

		var transactionID int64
		var paymentStatus, redirectURL string
		var expiresAt *time.Time
		err = tx.QueryRow(r.Context(), `
			SELECT id, payment_status, COALESCE(gateway_redirect_url, ''), expires_at
			FROM transactions WHERE booking_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`, bookingID,
		).Scan(&transactionID, &paymentStatus, &redirectURL, &expiresAt)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Transaksi pembayaran tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa status pembayaran."})
			return
		}
		if strings.EqualFold(paymentStatus, "Lunas") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking ini sudah dibayar."})
			return
		}
		if strings.EqualFold(paymentStatus, "Menunggu") {
			if expiresAt != nil && time.Now().Before(*expiresAt) && redirectURL != "" {
				writeJSON(w, http.StatusOK, map[string]string{"payment_redirect_url": redirectURL})
				return
			}
			if expiresAt == nil || time.Now().Before(expiresAt.Add(time.Minute)) {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Status pembayaran sedang diperbarui. Muat ulang beberapa saat lagi sebelum mencoba kembali."})
				return
			}
			if _, err := tx.Exec(r.Context(), `UPDATE transactions SET payment_status = 'Gagal' WHERE id = $1 AND payment_status = 'Menunggu'`, transactionID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui status sesi pembayaran."})
				return
			}
			status = "Batal"
			paymentStatus = "Gagal"
		}
		if !strings.EqualFold(paymentStatus, "Gagal") || status != "Batal" {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking ini belum dapat dibayar kembali."})
			return
		}
		if !isFutureBooking(bookingDate, bookingTime, time.Now()) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Jadwal booking sudah lewat dan tidak dapat dibayar kembali."})
			return
		}

		if _, err := tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock($1, hashtext($2))`, int32(barberID), bookingDate.Format("2006-01-02")); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengunci slot booking."})
			return
		}
		var conflict bool
		err = tx.QueryRow(r.Context(), `SELECT EXISTS (
			SELECT 1 FROM bookings b JOIN services s ON s.id = b.service_id
			WHERE b.barber_id = $1 AND b.booking_date = $2 AND b.status <> 'Batal' AND b.id <> $3
			AND ($4::time < b.booking_time::time + s.duration_minutes * interval '1 minute'
			 AND b.booking_time::time < $4::time + $5 * interval '1 minute')
		)`, barberID, bookingDate, bookingID, bookingTime, duration).Scan(&conflict)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa slot booking."})
			return
		}
		if conflict {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Slot jadwal sudah diambil booking lain. Silakan hubungi kami untuk memilih jadwal baru."})
			return
		}

		midtrans, err := newMidtransClient()
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Pembayaran online belum tersedia."})
			return
		}
		startedAt := time.Now()
		orderID := ticketCode + "-" + strconv.FormatInt(startedAt.UnixNano(), 10)
		finishURL := strings.TrimRight(getEnv("FRONTEND_ORIGIN", "http://localhost:5173"), "/") + "/dashboard/tickets/detail/" + strconv.FormatInt(bookingID, 10) + "?payment=return"
		snap, err := midtrans.createSnap(r.Context(), orderID, customerName, customerPhone, amount, serviceName, finishURL, startedAt)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Gagal membuat sesi pembayaran baru. Silakan coba lagi."})
			return
		}
		expires := startedAt.Add(15 * time.Minute)
		if _, err := tx.Exec(r.Context(), `UPDATE bookings SET status = 'Menunggu', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, bookingID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengaktifkan kembali booking."})
			return
		}
		if _, err := tx.Exec(r.Context(), `INSERT INTO transactions (booking_id, total_amount, payment_method, payment_status, gateway_order_id, gateway_token, gateway_redirect_url, expires_at, paid_at) VALUES ($1, $2, 'Midtrans', 'Menunggu', $3, $4, $5, $6, NULL)`, bookingID, amount, orderID, snap.Token, snap.RedirectURL, expires); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan transaksi pembayaran baru."})
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan sesi pembayaran baru."})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]string{"payment_redirect_url": snap.RedirectURL})
	}
}
