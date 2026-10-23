package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Jumlah kursi barber yang ada di toko.
const totalChairs = 3

// Aturan waktu tombol kasir, dihitung dari started_at (booking masuk kursi).
const (
	finishAfter = 30 * time.Minute
	cancelAfter = 10 * time.Minute
)

type cashierQueueItem struct {
	ID              int64      `json:"id"`
	TicketCode      string     `json:"ticket_code"`
	Status          string     `json:"status"`
	IsWalkIn        bool       `json:"is_walk_in"`
	CustomerName    string     `json:"customer_name"`
	CustomerPhone   string     `json:"customer_phone"`
	ServiceName     string     `json:"service_name"`
	DurationMinutes int        `json:"duration_minutes"`
	BarberID        int64      `json:"barber_id"`
	BarberName      string     `json:"barber_name"`
	ChairNumber     int        `json:"chair_number"`
	BookingDate     string     `json:"booking_date"`
	BookingTime     string     `json:"booking_time"`
	TotalAmount     float64    `json:"total_amount"`
	PaymentMethod   *string    `json:"payment_method"`
	PaymentStatus   *string    `json:"payment_status"`
	StartedAt       *time.Time `json:"started_at"`
}

type cashierQueueResponse struct {
	Date string `json:"date"`
	// Jam server, dipakai frontend untuk menghitung sisa waktu tombol Selesai/Batal.
	ServerTime time.Time          `json:"server_time"`
	Queue      []cashierQueueItem `json:"queue"`
}

type cashierSummaryResponse struct {
	Date         string  `json:"date"`
	Waiting      int     `json:"waiting"`
	InService    int     `json:"in_service"`
	Done         int     `json:"done"`
	TotalChairs  int     `json:"total_chairs"`
	Revenue      float64 `json:"revenue"`
	CashCount    int     `json:"cash_count"`
	NonCashCount int     `json:"non_cash_count"`
}

type walkInRequest struct {
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	ServiceID     int64  `json:"service_id"`
	BarberID      int64  `json:"barber_id"`
	PaymentMethod string `json:"payment_method"`
}

// cashierFromRequest memastikan yang memanggil endpoint sudah login sebagai kasir/admin.
// Kalau tidak, fungsi ini langsung mengirim response error dan mengembalikan false.
func cashierFromRequest(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, sessions *sessionStore) (int64, bool) {
	userID, ok := sessions.userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Silakan login sebagai kasir."})
		return 0, false
	}
	var role string
	err := db.QueryRow(r.Context(), `SELECT role FROM users WHERE id = $1`, userID).Scan(&role)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "User tidak ditemukan."})
		return 0, false
	}
	if role != "kasir" && role != "admin" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Hanya kasir yang dapat mengakses fitur ini."})
		return 0, false
	}
	return userID, true
}

// cashierDate membaca query ?date=YYYY-MM-DD, kalau kosong pakai tanggal hari ini (WIB).
func cashierDate(r *http.Request) (string, bool) {
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" {
		return time.Now().In(time.FixedZone("WIB", 7*3600)).Format("2006-01-02"), true
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return "", false
	}
	return date, true
}

// cashierQueueHandler godoc
// @Summary      Daftar antrean kasir
// @Description  Menampilkan booking lunas (online dan walk-in) pada tanggal tertentu, diurutkan berdasarkan jam. Booking yang Batal atau belum dibayar tidak ditampilkan. Status: Dikonfirmasi (menunggu jadwal), Sedang Dilayani (otomatis saat jadwal tiba), Selesai.
// @Tags         cashier
// @Produce      json
// @Security     BearerAuth
// @Param        date  query     string  false  "Tanggal (YYYY-MM-DD), default hari ini"
// @Success      200   {object}  cashierQueueResponse
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      403   {object}  map[string]string
// @Router       /cashier/queue [get]
func cashierQueueHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		if _, ok := cashierFromRequest(w, r, db, sessions); !ok {
			return
		}
		date, ok := cashierDate(r)
		if !ok {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format tanggal harus YYYY-MM-DD."})
			return
		}

		rows, err := db.Query(r.Context(), `
			SELECT b.id, b.ticket_code, b.status, b.user_id IS NULL, b.customer_name, b.customer_phone,
			       s.name, s.duration_minutes, b.barber_id, br.name, b.chair_number, b.booking_date, b.booking_time,
			       COALESCE(t.total_amount, s.price), t.payment_method, t.payment_status, b.started_at
			FROM bookings b
			JOIN services s ON s.id = b.service_id
			JOIN barber br ON br.id = b.barber_id
			LEFT JOIN LATERAL (
				SELECT total_amount, payment_method, payment_status
				FROM transactions WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
			) t ON TRUE
			WHERE b.booking_date = $1 AND b.status <> 'Batal'
			  AND (b.status <> 'Menunggu' OR t.payment_status = 'Lunas')
			ORDER BY b.booking_time`, date)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil antrean."})
			return
		}
		defer rows.Close()

		queue := []cashierQueueItem{}
		for rows.Next() {
			var item cashierQueueItem
			var bookingDate time.Time
			err := rows.Scan(&item.ID, &item.TicketCode, &item.Status, &item.IsWalkIn, &item.CustomerName, &item.CustomerPhone,
				&item.ServiceName, &item.DurationMinutes, &item.BarberID, &item.BarberName, &item.ChairNumber, &bookingDate, &item.BookingTime,
				&item.TotalAmount, &item.PaymentMethod, &item.PaymentStatus, &item.StartedAt)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca antrean."})
				return
			}
			item.BookingDate = bookingDate.Format("2006-01-02")
			queue = append(queue, item)
		}

		writeJSON(w, http.StatusOK, cashierQueueResponse{Date: date, ServerTime: time.Now(), Queue: queue})
	}
}

// cashierSummaryHandler godoc
// @Summary      Ringkasan dashboard kasir
// @Description  Jumlah antrean menunggu, sedang dilayani, selesai, serta omzet dari transaksi Lunas pada tanggal tertentu.
// @Tags         cashier
// @Produce      json
// @Security     BearerAuth
// @Param        date  query     string  false  "Tanggal (YYYY-MM-DD), default hari ini"
// @Success      200   {object}  cashierSummaryResponse
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      403   {object}  map[string]string
// @Router       /cashier/summary [get]
func cashierSummaryHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		if _, ok := cashierFromRequest(w, r, db, sessions); !ok {
			return
		}
		date, ok := cashierDate(r)
		if !ok {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format tanggal harus YYYY-MM-DD."})
			return
		}

		resp := cashierSummaryResponse{Date: date, TotalChairs: totalChairs}
		// "Menunggu" dihitung sebagai antrean hanya kalau transaksi terakhirnya sudah Lunas.
		err := db.QueryRow(r.Context(), `
			SELECT
				COUNT(*) FILTER (WHERE b.status = 'Dikonfirmasi' OR (b.status = 'Menunggu' AND t.payment_status = 'Lunas')),
				COUNT(*) FILTER (WHERE b.status = 'Sedang Dilayani'),
				COUNT(*) FILTER (WHERE b.status = 'Selesai')
			FROM bookings b
			LEFT JOIN LATERAL (
				SELECT payment_status FROM transactions WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
			) t ON TRUE
			WHERE b.booking_date = $1`, date,
		).Scan(&resp.Waiting, &resp.InService, &resp.Done)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menghitung antrean."})
			return
		}

		err = db.QueryRow(r.Context(), `
			SELECT
				COALESCE(SUM(t.total_amount), 0),
				COUNT(*) FILTER (WHERE t.payment_method = 'Tunai'),
				COUNT(*) FILTER (WHERE t.payment_method <> 'Tunai')
			FROM transactions t JOIN bookings b ON b.id = t.booking_id
			WHERE b.booking_date = $1 AND t.payment_status = 'Lunas'`, date,
		).Scan(&resp.Revenue, &resp.CashCount, &resp.NonCashCount)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menghitung omzet."})
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// cashierWalkInHandler godoc
// @Summary      Tambah pelanggan walk-in
// @Description  Kasir mencatat pelanggan yang datang langsung. Pembayaran dilakukan di kasir (Tunai, QRIS, Debit, Transfer) sehingga transaksi langsung Lunas. Jam booking memakai jam sekarang (WIB), lalu booking langsung masuk kursi (Sedang Dilayani) kalau barber dan kursi kosong; kalau tidak, tetap Dikonfirmasi sampai ada kursi.
// @Tags         cashier
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      walkInRequest  true  "Data walk-in"
// @Success      201   {object}  cashierQueueItem
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string
// @Failure      403   {object}  map[string]string
// @Failure      409   {object}  map[string]string
// @Router       /cashier/walk-in [post]
func cashierWalkInHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		cashierID, ok := cashierFromRequest(w, r, db, sessions)
		if !ok {
			return
		}

		var input walkInRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format data walk-in tidak valid."})
			return
		}
		input.CustomerName = strings.TrimSpace(input.CustomerName)
		input.CustomerPhone = strings.TrimSpace(input.CustomerPhone)
		input.PaymentMethod = strings.TrimSpace(input.PaymentMethod)

		if input.CustomerName == "" || input.ServiceID < 1 || input.BarberID < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nama tamu, layanan, dan barber wajib diisi."})
			return
		}
		if input.CustomerPhone == "" {
			input.CustomerPhone = "-"
		}
		if input.PaymentMethod != "Tunai" && input.PaymentMethod != "QRIS" && input.PaymentMethod != "Debit" && input.PaymentMethod != "Transfer" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Metode bayar harus Tunai, QRIS, Debit, atau Transfer."})
			return
		}

		var barberAvailable bool
		err := db.QueryRow(r.Context(), `SELECT available FROM barber WHERE id = $1`, input.BarberID).Scan(&barberAvailable)
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

		var serviceDuration int
		var servicePrice float64
		err = db.QueryRow(r.Context(), `SELECT duration_minutes, price FROM services WHERE id = $1`, input.ServiceID).Scan(&serviceDuration, &servicePrice)
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Layanan tidak ditemukan."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa layanan."})
			return
		}

		now := time.Now().In(time.FixedZone("WIB", 7*3600))
		bookingDate := now.Format("2006-01-02")
		bookingTime := now.Format("15:04")

		tx, err := db.Begin(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Walk-in gagal disimpan."})
			return
		}
		defer tx.Rollback(r.Context())

		// Kunci jadwal barber di tanggal ini supaya tidak bentrok dengan booking online yang masuk bersamaan.
		if _, err := tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock($1, hashtext($2))`, int32(input.BarberID), bookingDate); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengunci jadwal barber."})
			return
		}
		var hasConflict bool
		err = tx.QueryRow(r.Context(), `SELECT EXISTS (
			SELECT 1 FROM bookings b JOIN services s ON s.id = b.service_id
			WHERE b.barber_id = $1 AND b.booking_date = $2 AND b.status NOT IN ('Batal', 'Selesai')
			AND ($3::time < b.booking_time::time + s.duration_minutes * interval '1 minute'
			 AND b.booking_time::time < $3::time + $4 * interval '1 minute')
		)`, input.BarberID, bookingDate, bookingTime, serviceDuration).Scan(&hasConflict)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa jadwal barber."})
			return
		}
		if hasConflict {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Barber ini sudah punya jadwal di jam sekarang. Pilih barber lain."})
			return
		}

		ticketCode := "WI-" + strconv.FormatInt(time.Now().UnixNano(), 36)
		var bookingID int64
		// user_id dibiarkan NULL karena tamu walk-in tidak punya akun.
		err = tx.QueryRow(r.Context(), `
			INSERT INTO bookings (ticket_code, customer_name, customer_phone, service_id, barber_id, booking_date, booking_time, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'Dikonfirmasi')
			RETURNING id`,
			ticketCode, input.CustomerName, input.CustomerPhone, input.ServiceID, input.BarberID, bookingDate, bookingTime,
		).Scan(&bookingID)
		if err != nil {
			var dbError *pgconn.PgError
			if errors.As(err, &dbError) && dbError.Code == "23505" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Barber ini sudah punya jadwal di jam sekarang. Pilih barber lain."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Walk-in gagal disimpan."})
			return
		}

		_, err = tx.Exec(r.Context(), `
			INSERT INTO transactions (booking_id, cashier_id, total_amount, payment_method, payment_status, paid_at)
			VALUES ($1, $2, $3, $4, 'Lunas', CURRENT_TIMESTAMP)`,
			bookingID, cashierID, servicePrice, input.PaymentMethod)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan transaksi walk-in."})
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Walk-in gagal disimpan."})
			return
		}
		// Tamu walk-in sudah di tempat, jadi langsung dicoba masuk kursi tanpa menunggu worker.
		if _, err := autoStartDueBookings(r.Context(), db); err != nil {
			log.Printf("auto start walk-in %d failed: %v", bookingID, err)
		}

		item, err := queryCashierBooking(r, db, bookingID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Walk-in tersimpan, tetapi gagal mengambil datanya."})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	}
}

// cashierBookingHandler mengarahkan PATCH /api/cashier/bookings/{id}/finish dan /cancel.
func cashierBookingHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) != 5 || parts[0] != "api" || parts[1] != "cashier" || parts[2] != "bookings" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Endpoint tidak ditemukan."})
			return
		}
		if r.Method != http.MethodPatch {
			w.Header().Set("Allow", http.MethodPatch)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		bookingID, err := strconv.ParseInt(parts[3], 10, 64)
		if err != nil || bookingID < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ID booking tidak valid."})
			return
		}
		if _, ok := cashierFromRequest(w, r, db, sessions); !ok {
			return
		}

		switch parts[4] {
		case "start":
			cashierStartService(w, r, db, bookingID)
		case "finish":
			cashierFinishService(w, r, db, bookingID)
		case "cancel":
			cashierCancelService(w, r, db, bookingID)
		default:
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Endpoint tidak ditemukan."})
		}
	}
}

// cashierStartService memulai layanan secara manual setelah jadwal tiba dan pembayaran lunas.
func cashierStartService(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, bookingID int64) {
	tx, err := db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memulai layanan."})
		return
	}
	defer tx.Rollback(r.Context())
	if _, err = tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock(hashtext('barber-one-chairs'))`); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengunci kursi."})
		return
	}
	var status string
	var barberID int64
	err = tx.QueryRow(r.Context(), `SELECT b.status, b.barber_id FROM bookings b
		LEFT JOIN LATERAL (SELECT payment_status FROM transactions WHERE booking_id=b.id ORDER BY id DESC LIMIT 1) t ON TRUE
		WHERE b.id=$1 AND (b.status='Dikonfirmasi' OR b.status='Menunggu') AND t.payment_status='Lunas'
		AND b.booking_date + b.booking_time::time <= CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta' FOR UPDATE OF b`, bookingID).Scan(&status, &barberID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking belum lunas, jadwal belum tiba, atau statusnya sudah berubah."})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa jadwal booking."})
		return
	}
	var busy bool
	if err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM bookings WHERE barber_id=$1 AND status='Sedang Dilayani')`, barberID).Scan(&busy); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa barber."})
		return
	}
	if busy {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Barber ini sedang melayani pelanggan lain."})
		return
	}
	var chair int
	if err = tx.QueryRow(r.Context(), `SELECT c FROM generate_series(1, $1) c WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE status='Sedang Dilayani' AND chair_number=c) ORDER BY c LIMIT 1`, totalChairs).Scan(&chair); errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Semua kursi sedang digunakan."})
		return
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa kursi."})
		return
	}
	_, err = tx.Exec(r.Context(), `UPDATE bookings SET status='Sedang Dilayani', chair_number=$1, started_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, chair, bookingID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memulai layanan."})
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan status layanan."})
		return
	}
	item, err := queryCashierBooking(r, db, bookingID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Layanan dimulai, tetapi gagal mengambil datanya."})
		return
	}
	writeJSON(w, http.StatusOK, item)
}

// cashierFinishService godoc
// @Summary      Selesaikan layanan
// @Description  Mengubah booking Sedang Dilayani menjadi Selesai sehingga kursi kosong kembali. Baru bisa setelah 30 menit sejak booking masuk kursi.
// @Tags         cashier
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "ID booking"
// @Success      200  {object}  cashierQueueItem
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /cashier/bookings/{id}/finish [patch]
func cashierFinishService(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, bookingID int64) {
	item, err := queryCashierBooking(r, db, bookingID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil booking."})
		return
	}
	if item.Status != "Sedang Dilayani" {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Hanya booking yang sedang dilayani yang bisa diselesaikan."})
		return
	}
	if wait := remainingWait(item.StartedAt, finishAfter); wait > 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Layanan baru bisa diselesaikan " + formatWait(wait) + " lagi."})
		return
	}

	tag, err := db.Exec(r.Context(), `
		UPDATE bookings SET status = 'Selesai', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'Sedang Dilayani'`, bookingID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui booking."})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Status booking sudah berubah. Muat ulang antrean."})
		return
	}

	item.Status = "Selesai"
	writeJSON(w, http.StatusOK, item)
}

// cashierCancelService godoc
// @Summary      Batalkan pelanggan yang tidak datang
// @Description  Mengubah booking Sedang Dilayani menjadi Batal sehingga kursi kosong kembali. Baru bisa setelah 10 menit sejak booking masuk kursi. Pembayaran tidak dikembalikan (hangus) dan tetap dihitung sebagai omzet.
// @Tags         cashier
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "ID booking"
// @Success      200  {object}  cashierQueueItem
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /cashier/bookings/{id}/cancel [patch]
func cashierCancelService(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool, bookingID int64) {
	item, err := queryCashierBooking(r, db, bookingID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Booking tidak ditemukan."})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil booking."})
		return
	}
	if item.Status != "Sedang Dilayani" {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Hanya booking yang sudah masuk jadwal yang bisa dibatalkan."})
		return
	}
	if wait := remainingWait(item.StartedAt, cancelAfter); wait > 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Booking baru bisa dibatalkan " + formatWait(wait) + " lagi."})
		return
	}

	tag, err := db.Exec(r.Context(), `
		UPDATE bookings SET status = 'Batal', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'Sedang Dilayani'`, bookingID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui booking."})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Status booking sudah berubah. Muat ulang antrean."})
		return
	}

	item.Status = "Batal"
	writeJSON(w, http.StatusOK, item)
}

// remainingWait mengembalikan sisa waktu sampai startedAt + after. Booking lama tanpa started_at dianggap sudah lewat.
func remainingWait(startedAt *time.Time, after time.Duration) time.Duration {
	if startedAt == nil {
		return 0
	}
	return time.Until(startedAt.Add(after))
}

// formatWait menampilkan sisa waktu dalam menit (dibulatkan ke atas), contoh "3 menit".
func formatWait(wait time.Duration) string {
	minutes := int((wait + time.Minute - 1) / time.Minute)
	return strconv.Itoa(minutes) + " menit"
}

// queryCashierBooking mengambil satu booking lengkap dengan transaksi terakhirnya.
func queryCashierBooking(r *http.Request, db *pgxpool.Pool, bookingID int64) (cashierQueueItem, error) {
	var item cashierQueueItem
	var bookingDate time.Time
	err := db.QueryRow(r.Context(), `
		SELECT b.id, b.ticket_code, b.status, b.user_id IS NULL, b.customer_name, b.customer_phone,
		       s.name, s.duration_minutes, b.barber_id, br.name, b.chair_number, b.booking_date, b.booking_time,
		       COALESCE(t.total_amount, s.price), t.payment_method, t.payment_status, b.started_at
		FROM bookings b
		JOIN services s ON s.id = b.service_id
		JOIN barber br ON br.id = b.barber_id
		LEFT JOIN LATERAL (
			SELECT total_amount, payment_method, payment_status
			FROM transactions WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
		) t ON TRUE
		WHERE b.id = $1`, bookingID,
	).Scan(&item.ID, &item.TicketCode, &item.Status, &item.IsWalkIn, &item.CustomerName, &item.CustomerPhone,
		&item.ServiceName, &item.DurationMinutes, &item.BarberID, &item.BarberName, &item.ChairNumber, &bookingDate, &item.BookingTime,
		&item.TotalAmount, &item.PaymentMethod, &item.PaymentStatus, &item.StartedAt)
	if err == nil {
		item.BookingDate = bookingDate.Format("2006-01-02")
	}
	return item, err
}
