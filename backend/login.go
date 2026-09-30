package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func loginHandler(db *pgxpool.Pool, sessions *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		var input loginRequest
		if err := decoder.Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Format data tidak valid."})
			return
		}
		if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Permintaan harus berisi satu objek JSON."})
			return
		}

		input.Identifier = strings.TrimSpace(input.Identifier)
		if input.Identifier == "" || input.Password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nomor telepon/email dan kata sandi wajib diisi."})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var user registeredUser
		var passwordHash string
		err := db.QueryRow(ctx,
			`SELECT id, name, phone, email, role, password_hash
			 FROM users
			 WHERE phone = $1 OR lower(email) = lower($1)
			 LIMIT 1`,
			input.Identifier,
		).Scan(&user.ID, &user.Name, &user.Phone, &user.Email, &user.Role, &passwordHash)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password)) != nil) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Nomor telepon/email atau kata sandi tidak sesuai."})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Login gagal. Coba lagi beberapa saat."})
			return
		}
		token, err := sessions.create(user.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membuat sesi login."})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"message":      "Login berhasil.",
			"user":         user,
			"access_token": token,
		})
	}
}
