package main

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type notificationItem struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	BookingID *int64    `json:"booking_id"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type notificationListResponse struct {
	Notifications []notificationItem `json:"notifications"`
	UnreadCount   int                `json:"unread_count"`
}

// notifyBookingUser membuat notifikasi untuk pemilik booking.
// Booking walk-in (user_id kosong) otomatis dilewati.
func notifyBookingUser(db *pgxpool.Pool, bookingID int64, notifType, title, message string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.Exec(ctx, `
		INSERT INTO notifications (audience, user_id, type, title, message, booking_id)
		SELECT 'user', user_id, $2, $3, $4, id FROM bookings
		WHERE id = $1 AND user_id IS NOT NULL`,
		bookingID, notifType, title, message)
	if err != nil {
		log.Printf("notifikasi user booking %d gagal: %v", bookingID, err)
	}
}

// notifyCashiers membuat notifikasi bersama untuk semua kasir.
func notifyCashiers(db *pgxpool.Pool, bookingID int64, notifType, title, message string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.Exec(ctx, `
		INSERT INTO notifications (audience, type, title, message, booking_id)
		VALUES ('kasir', $1, $2, $3, $4)`,
		notifType, title, message, bookingID)
	if err != nil {
		log.Printf("notifikasi kasir booking %d gagal: %v", bookingID, err)
	}
}

// notificationAudience menentukan pemanggil: "kasir" (kasir/admin) atau "user".
func notificationAudience(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, sessions *sessionStore) (int64, string, bool) {
	userID, ok := sessions.userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login terlebih dahulu."})
		return 0, "", false
	}
	var role string
	if err := db.QueryRow(r.Context(), `SELECT role FROM users WHERE id = $1`, userID).Scan(&role); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "User tidak ditemukan."})
		return 0, "", false
	}
	if role == "kasir" || role == "admin" {
		return userID, "kasir", true
	}
	return userID, "user", true
}

// notificationScope membatasi query: kasir melihat notifikasi kasir,
// user hanya melihat notifikasi miliknya sendiri.
func notificationScope(userID int64, audience string) (string, []any) {
	if audience == "kasir" {
		return "audience = $1", []any{"kasir"}
	}
	return "audience = $1 AND user_id = $2", []any{"user", userID}
}

// listNotificationsHandler godoc
// @Summary      Daftar notifikasi
// @Description  Notifikasi milik user yang login (atau notifikasi bersama untuk kasir). Filter: status (all/unread/read), type (booking/payment), limit.
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        status  query     string  false  "all | unread | read (default all)"
// @Param        type    query     string  false  "booking | payment"
// @Param        limit   query     int     false  "Jumlah maksimal (default 20, maks 100)"
// @Success      200     {object}  notificationListResponse
// @Failure      400     {object}  map[string]string
// @Failure      401     {object}  map[string]string
// @Router       /notifications [get]
func listNotificationsHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		userID, audience, ok := notificationAudience(w, r, db, sessions)
		if !ok {
			return
		}

		where, args := notificationScope(userID, audience)

		// Jumlah belum dibaca (untuk badge lonceng), tidak terpengaruh filter.
		var unread int
		if err := db.QueryRow(r.Context(),
			`SELECT COUNT(*) FROM notifications WHERE `+where+` AND is_read = FALSE`, args...,
		).Scan(&unread); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menghitung notifikasi."})
			return
		}

		// FILTER 1: status baca
		q := r.URL.Query()
		switch strings.TrimSpace(q.Get("status")) {
		case "", "all":
		case "unread":
			where += " AND is_read = FALSE"
		case "read":
			where += " AND is_read = TRUE"
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Status harus all, unread, atau read."})
			return
		}

		// FILTER 2: tipe notifikasi
		switch t := strings.TrimSpace(q.Get("type")); t {
		case "":
		case "booking", "payment":
			args = append(args, t)
			where += " AND type = $" + strconv.Itoa(len(args))
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Type harus booking atau payment."})
			return
		}

		// Batas jumlah data
		limit := 20
		if raw := strings.TrimSpace(q.Get("limit")); raw != "" {
			n, err := strconv.Atoi(raw)
			if err != nil || n < 1 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Limit tidak valid."})
				return
			}
			if n > 100 {
				n = 100
			}
			limit = n
		}
		args = append(args, limit)

		rows, err := db.Query(r.Context(),
			`SELECT id, type, title, message, booking_id, is_read, created_at
			 FROM notifications WHERE `+where+`
			 ORDER BY created_at DESC, id DESC LIMIT $`+strconv.Itoa(len(args)), args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil notifikasi."})
			return
		}
		defer rows.Close()

		items := []notificationItem{}
		for rows.Next() {
			var n notificationItem
			if err := rows.Scan(&n.ID, &n.Type, &n.Title, &n.Message, &n.BookingID, &n.IsRead, &n.CreatedAt); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca notifikasi."})
				return
			}
			items = append(items, n)
		}
		writeJSON(w, http.StatusOK, notificationListResponse{Notifications: items, UnreadCount: unread})
	}
}

// notificationResourceHandler mengarahkan:
//
//	PATCH /api/notifications/read-all   -> tandai semua dibaca
//	PATCH /api/notifications/{id}/read  -> tandai satu dibaca
//
// @Summary      Tandai notifikasi dibaca
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "ID notifikasi"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /notifications/{id}/read [patch]
func notificationResourceHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			w.Header().Set("Allow", http.MethodPatch)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		isReadAll := len(parts) == 3 && parts[2] == "read-all"
		isReadOne := len(parts) == 4 && parts[3] == "read"
		if parts[0] != "api" || parts[1] != "notifications" || (!isReadAll && !isReadOne) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Endpoint tidak ditemukan."})
			return
		}

		userID, audience, ok := notificationAudience(w, r, db, sessions)
		if !ok {
			return
		}
		where, args := notificationScope(userID, audience)

		if isReadAll {
			if _, err := db.Exec(r.Context(),
				`UPDATE notifications SET is_read = TRUE WHERE `+where+` AND is_read = FALSE`, args...); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui notifikasi."})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "Semua notifikasi ditandai dibaca."})
			return
		}

		id, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil || id < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID notifikasi tidak valid."})
			return
		}
		args = append(args, id)
		tag, err := db.Exec(r.Context(),
			`UPDATE notifications SET is_read = TRUE WHERE `+where+` AND id = $`+strconv.Itoa(len(args)), args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui notifikasi."})
			return
		}
		if tag.RowsAffected() == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Notifikasi tidak ditemukan."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Notifikasi ditandai dibaca."})

	}
}

// syncPaymentNotifications membuat notifikasi pembayaran dari tabel transactions.
// Aman dipanggil berulang: tiap notifikasi hanya dibuat sekali per booking.
// Hanya transaksi satu jam terakhir yang diperiksa, supaya data lama tidak ikut.
func syncPaymentNotifications(db *pgxpool.Pool) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// 1. User: pembayaran berhasil
	if _, err := db.Exec(ctx, `
		INSERT INTO notifications (audience, user_id, type, title, message, booking_id)
		SELECT 'user', b.user_id, 'payment', 'Pembayaran berhasil',
		       'Booking ' || s.name || ' tanggal ' || to_char(b.booking_date, 'DD-MM-YYYY') ||
		       ' pukul ' || b.booking_time || ' sudah lunas.', b.id
		FROM transactions t
		JOIN bookings b ON b.id = t.booking_id
		JOIN services s ON s.id = b.service_id
		WHERE t.payment_status = 'Lunas'
		  AND t.gateway_order_id IS NOT NULL
		  AND t.paid_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
		  AND b.user_id IS NOT NULL
		  AND b.status <> 'Batal'
		  AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.booking_id = b.id AND n.audience = 'user' AND n.title = 'Pembayaran berhasil')`); err != nil {
		log.Printf("notifikasi pembayaran berhasil (user) gagal: %v", err)
	}

	// 2. Kasir: pembayaran online masuk
	if _, err := db.Exec(ctx, `
		INSERT INTO notifications (audience, type, title, message, booking_id)
		SELECT 'kasir', 'payment', 'Pembayaran online masuk',
		       'Rp' || t.total_amount::bigint || ' - ' || s.name || ' (tiket ' || b.ticket_code || ')', b.id
		FROM transactions t
		JOIN bookings b ON b.id = t.booking_id
		JOIN services s ON s.id = b.service_id
		WHERE t.payment_status = 'Lunas'
		  AND t.gateway_order_id IS NOT NULL
		  AND t.paid_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
		  AND b.status <> 'Batal'
		  AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.booking_id = b.id AND n.audience = 'kasir' AND n.title = 'Pembayaran online masuk')`); err != nil {
		log.Printf("notifikasi pembayaran masuk (kasir) gagal: %v", err)
	}

	// 3. User: pembayaran gagal atau kedaluwarsa
	if _, err := db.Exec(ctx, `
		INSERT INTO notifications (audience, user_id, type, title, message, booking_id)
		SELECT 'user', b.user_id, 'payment', 'Pembayaran gagal',
		       'Pembayaran booking ' || s.name || ' tidak selesai, jadi booking dibatalkan. Silakan pesan lagi.', b.id
		FROM transactions t
		JOIN bookings b ON b.id = t.booking_id
		JOIN services s ON s.id = b.service_id
		WHERE t.payment_status = 'Gagal'
		  AND t.gateway_order_id IS NOT NULL
		  AND t.expires_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
		  AND b.user_id IS NOT NULL
		  AND b.status = 'Batal'
		  AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.booking_id = b.id AND n.audience = 'user' AND n.title = 'Pembayaran gagal')`); err != nil {
		log.Printf("notifikasi pembayaran gagal (user) gagal: %v", err)
	}
}