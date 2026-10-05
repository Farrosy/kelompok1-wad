package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Name     string  `json:"name"`
	Phone    string  `json:"phone"`
	Email    *string `json:"email"`
	Password string  `json:"password"`
}

type registeredUser struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Phone string  `json:"phone"`
	Email *string `json:"email,omitempty"`
	Role  string  `json:"role"`
}

// registerHandler godoc
// @Summary      Registrasi user baru
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      registerRequest  true  "Data registrasi"
// @Success      201   {object}  registeredUser
// @Failure      400   {object}  map[string]string
// @Failure      409   {object}  map[string]string
// @Router       /register [post]
func registerHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		var input registerRequest
		if err := decoder.Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format data tidak valid."})
			return
		}
		if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Permintaan harus berisi satu objek JSON."})
			return
		}

		input.Name = strings.TrimSpace(input.Name)
		input.Phone = strings.TrimSpace(input.Phone)
		if input.Email != nil {
			cleanEmail := strings.TrimSpace(*input.Email)
			input.Email = &cleanEmail
			if cleanEmail == "" {
				input.Email = nil
			}
		}

		if input.Name == "" || len([]rune(input.Name)) > 100 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nama wajib diisi dan maksimal 100 karakter."})
			return
		}
		if input.Phone == "" || len(input.Phone) > 20 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nomor telepon wajib diisi dan maksimal 20 karakter."})
			return
		}
		if input.Email != nil {
			if len(*input.Email) > 100 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Email maksimal 100 karakter."})
				return
			}
			parsedEmail, err := mail.ParseAddress(*input.Email)
			if err != nil || parsedEmail.Address != *input.Email {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format email tidak valid."})
				return
			}
		}
		if len(input.Password) < 8 || len(input.Password) > 72 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kata sandi harus terdiri dari 8 sampai 72 byte."})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memproses pendaftaran."})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		user := registeredUser{Email: input.Email, Role: "user"}
		err = db.QueryRow(ctx,
			`INSERT INTO users (name, phone, email, password_hash, role)
			 VALUES ($1, $2, $3, $4, 'user')
			 RETURNING id, name, phone, email, role`,
			input.Name, input.Phone, input.Email, string(hashedPassword),
		).Scan(&user.ID, &user.Name, &user.Phone, &user.Email, &user.Role)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Nomor telepon atau email sudah terdaftar."})
				return
			}
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Pendaftaran gagal."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Pendaftaran gagal. Pastikan tabel users sudah dibuat."})
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"message": "Pendaftaran berhasil.",
			"user":    user,
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := strings.TrimSpace(getEnv("FRONTEND_ORIGIN", "http://localhost:5173"))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
