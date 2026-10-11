package main

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type barber struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Rating    float64 `json:"rating"`
	Available bool    `json:"available"`
}

// listBarbersHandler godoc
// @Summary      Daftar barber
// @Tags         barbers
// @Produce      json
// @Success      200  {object}  map[string][]barber
// @Failure      500  {object}  map[string]string
// @Router       /barbers [get]
func listBarbersHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		rows, err := db.Query(r.Context(),
			`SELECT id, name, rating, available
			 FROM barber
			 ORDER BY id`,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal mengambil daftar barber."})
			return
		}
		defer rows.Close()

		barbers := make([]barber, 0)
		for rows.Next() {
			var item barber
			if err := rows.Scan(&item.ID, &item.Name, &item.Rating, &item.Available); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar barber."})
				return
			}
			barbers = append(barbers, item)
		}
		if err := rows.Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca daftar barber."})
			return
		}

		writeJSON(w, http.StatusOK, map[string][]barber{"barbers": barbers})
	}
}
