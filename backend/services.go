package main

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type service struct {
	ID              int64   `json:"id"`
	Name            string  `json:"name"`
	Description     *string `json:"description"`
	Price           float64 `json:"price"`
	DurationMinutes int     `json:"duration_minutes"`
}

// listServicesHandler godoc
// @Summary      Daftar layanan aktif
// @Tags         services
// @Produce      json
// @Success      200  {object}  map[string][]service
// @Failure      500  {object}  map[string]string
// @Router       /services [get]
func listServicesHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		rows, err := db.Query(r.Context(),
			`SELECT id, name, description, price, duration_minutes
			 FROM services
			 ORDER BY id`,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil daftar layanan."})
			return
		}
		defer rows.Close()

		services := make([]service, 0)
		for rows.Next() {
			var item service
			if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.DurationMinutes); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar layanan."})
				return
			}
			services = append(services, item)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar layanan."})
			return
		}

		writeJSON(w, http.StatusOK, map[string][]service{"services": services})
	}
}
