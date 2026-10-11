package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var bookingStartTimes = []string{
	"10:00", "10:45", "11:30", "12:15", "13:00", "13:45", "14:30",
	"15:15", "16:00", "16:45", "17:30", "18:15", "19:00", "19:45",
}

type availabilityResponse struct {
	BarberID       int64    `json:"barber_id"`
	ServiceID      int64    `json:"service_id"`
	Date           string   `json:"date"`
	AvailableSlots []string `json:"available_slots"`
}

// getAvailabilityHandler godoc
// @Summary      Cek slot booking yang tersedia
// @Tags         bookings
// @Produce      json
// @Param        barber_id  query     int     true  "ID barber"
// @Param        date       query     string  true  "Tanggal booking (YYYY-MM-DD)"
// @Param        service_id query     int     true  "ID layanan"
// @Success      200        {object}  availabilityResponse
// @Failure      400        {object}  map[string]string
// @Failure      500        {object}  map[string]string
// @Router       /availability [get]
func getAvailabilityHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}

		query := r.URL.Query()
		barberID, barberErr := strconv.ParseInt(query.Get("barber_id"), 10, 64)
		serviceID, serviceErr := strconv.ParseInt(query.Get("service_id"), 10, 64)
		dateValue := query.Get("date")
		bookingDate, dateErr := time.Parse("2006-01-02", dateValue)
		if barberErr != nil || barberID < 1 || serviceErr != nil || serviceID < 1 || dateErr != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "barber_id, service_id, dan date (YYYY-MM-DD) wajib diisi dengan format yang valid."})
			return
		}

		var durationMinutes int
		if err := db.QueryRow(r.Context(), `SELECT duration_minutes FROM services WHERE id = $1`, serviceID).Scan(&durationMinutes); err != nil {
			if err == pgx.ErrNoRows {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Layanan tidak ditemukan."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa layanan."})
			return
		}

		var barberAvailable bool
		if err := db.QueryRow(r.Context(), `SELECT available FROM barber WHERE id = $1`, barberID).Scan(&barberAvailable); err != nil {
			if err == pgx.ErrNoRows {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Barber tidak ditemukan."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa barber."})
			return
		}

		availableSlots := make([]string, 0, len(bookingStartTimes))
		if barberAvailable {
			rows, err := db.Query(r.Context(),
				`SELECT b.booking_time, s.duration_minutes
				 FROM bookings b JOIN services s ON s.id = b.service_id
				 WHERE b.barber_id = $1 AND b.booking_date = $2 AND b.status <> 'Batal'`,
				barberID, bookingDate)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memeriksa slot booking."})
				return
			}
			type interval struct{ start, end int }
			booked := make([]interval, 0)
			for rows.Next() {
				var bookingTime string
				var bookedDuration int
				if err := rows.Scan(&bookingTime, &bookedDuration); err != nil {
					rows.Close()
					writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca slot booking."})
					return
				}
				start, err := time.Parse("15:04", bookingTime)
				if err == nil {
					minute := start.Hour()*60 + start.Minute()
					booked = append(booked, interval{minute, minute + bookedDuration})
				}
			}
			if err := rows.Err(); err != nil {
				rows.Close()
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membaca slot booking."})
				return
			}
			rows.Close()

			for _, slot := range bookingStartTimes {
				start, _ := time.Parse("15:04", slot)
				startMinute := start.Hour()*60 + start.Minute()
				endMinute := startMinute + durationMinutes
				if endMinute > 21*60 {
					continue
				}
				conflicts := false
				for _, current := range booked {
					if startMinute < current.end && current.start < endMinute {
						conflicts = true
						break
					}
				}
				if !conflicts {
					availableSlots = append(availableSlots, slot)
				}
			}
		}

		writeJSON(w, http.StatusOK, availabilityResponse{
			BarberID: barberID, ServiceID: serviceID, Date: dateValue, AvailableSlots: availableSlots,
		})
	}
}
