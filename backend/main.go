package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("File .env tidak ditemukan; menggunakan environment variables sistem")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL belum diatur")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Koneksi PostgreSQL gagal: %v", err)
	}
	defer db.Close(context.Background())

	var result int
	if err := db.QueryRow(ctx, "SELECT 1").Scan(&result); err != nil {
		log.Fatalf("Tes query database gagal: %v", err)
	}
	log.Printf("Koneksi PostgreSQL berhasil (SELECT %d)", result)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello World!")
	})

	fmt.Println("Backend berjalan di http://localhost:3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		fmt.Println("Server gagal:", err)
	}
}
