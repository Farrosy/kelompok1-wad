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
// @host            			localhost:8080
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

	mux := http.NewServeMux()
	sessions := newSessionStore()
	mux.Handle("/swagger/", httpSwagger.WrapHandler)
	mux.HandleFunc("/api/register", registerHandler(db))
	mux.HandleFunc("/api/login", loginHandler(db, sessions))
	mux.HandleFunc("/api/profile", profileHandler(db, sessions))
	mux.HandleFunc("/api/logout", logoutHandler(sessions))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Barber One API aktif"})
	})

	fmt.Println("Backend berjalan di http://localhost:3000")
	if err := http.ListenAndServe(":3000", corsMiddleware(mux)); err != nil {
		fmt.Println("Server gagal:", err)
	}
}
