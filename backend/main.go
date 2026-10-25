package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	httpSwagger "github.com/swaggo/http-swagger/v2"

	"barber-one/backend/config"
	_ "barber-one/backend/docs"

	"github.com/joho/godotenv"
)

// @title           			Barber One API
// @version         			1.0
// @description     			API untuk aplikasi Barber One
// @host            			localhost:3000
// @BasePath  					/api
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Isi dengan: Bearer <token>
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("File .env tidak ditemukan; menggunakan environment variables sistem")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := config.InitDBPool(ctx)
	if err != nil {
		log.Fatalf("Koneksi PostgreSQL gagal: %v", err)
	}
	defer db.Close()
	log.Println("Koneksi PostgreSQL berhasil")
	startPaymentExpiryWorker(db)

	mux := http.NewServeMux()
	sessions := newSessionStore()
	mux.Handle("/swagger/", httpSwagger.WrapHandler)
	mux.HandleFunc("/api/register", registerHandler(db))
	mux.HandleFunc("/api/login", loginHandler(db, sessions))
	mux.HandleFunc("/api/profile", profileHandler(db, sessions))
	mux.HandleFunc("/api/logout", logoutHandler(sessions))
	mux.HandleFunc("/api/services", listServicesHandler(db))
	mux.HandleFunc("/api/barbers", listBarbersHandler(db))
	createBooking := createBookingHandler(db, sessions)
	listBookings := listUserBookingsHandler(db, sessions)
	mux.HandleFunc("/api/bookings", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			listBookings(w, r)
		case http.MethodPost:
			createBooking(w, r)
		default:
			w.Header().Set("Allow", http.MethodGet+", "+http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
		}
	})
	mux.HandleFunc("/api/bookings/", bookingResourceHandler(db, sessions))
	mux.HandleFunc("/api/reviews", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			listReviewsHandler(db)(w, r)
			return
		}
		createReviewHandler(db, sessions)(w, r)
	})
	mux.HandleFunc("/api/my-tickets", myTicketsHandler(db, sessions))
	mux.HandleFunc("/api/payments/midtrans/notification", midtransNotificationHandler(db))
	mux.HandleFunc("/api/availability", getAvailabilityHandler(db))
	mux.HandleFunc("/api/cashier/queue", cashierQueueHandler(db, sessions))
	mux.HandleFunc("/api/cashier/summary", cashierSummaryHandler(db, sessions))
	mux.HandleFunc("/api/cashier/walk-in", cashierWalkInHandler(db, sessions))
	mux.HandleFunc("/api/cashier/bookings/", cashierBookingHandler(db, sessions))
	mux.HandleFunc("/api/notifications", listNotificationsHandler(db, sessions))
	mux.HandleFunc("/api/notifications/", notificationResourceHandler(db, sessions))
	mux.HandleFunc("/api/status", apiStatusHandler)
	mux.HandleFunc("/", apiStatusHandler)

	fmt.Println("Backend berjalan di http://localhost:3000")
	if err := http.ListenAndServe(":3000", corsMiddleware(mux)); err != nil {
		fmt.Println("Server gagal:", err)
	}
}

// apiStatusHandler godoc
// @Summary      Status API
// @Description  Memeriksa bahwa API Barber One aktif.
// @Tags         system
// @Produce      json
// @Success      200 {object} map[string]string
// @Router       /status [get]
func apiStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" && r.URL.Path != "/api/status" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Barber One API aktif"})
}
