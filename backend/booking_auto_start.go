package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// startBookingAutoStartWorker memanggil booking yang sudah masuk jadwalnya ke kursi secara otomatis.
func startBookingAutoStartWorker(db *pgxpool.Pool) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			started, err := autoStartDueBookings(ctx, db)
			cancel()
			if err != nil {
				log.Printf("booking auto start worker failed: %v", err)
			} else if started > 0 {
				log.Printf("booking auto start worker started %d booking(s)", started)
			}

			<-ticker.C
		}
	}()
}

// autoStartDueBookings mengubah booking lunas hari ini yang jamnya sudah tiba menjadi Sedang Dilayani.
// Booking hanya masuk kalau barbernya sedang tidak melayani dan masih ada kursi kosong;
// kalau belum, booking tetap menunggu dan dicoba lagi di putaran berikutnya.
func autoStartDueBookings(ctx context.Context, db *pgxpool.Pool) (int, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	// Satu kunci untuk semua kursi supaya worker dan walk-in tidak mengisi kursi yang sama bersamaan.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('barber-one-chairs'))`); err != nil {
		return 0, err
	}

	usedChairs := map[int]bool{}
	rows, err := tx.Query(ctx, `SELECT chair_number FROM bookings WHERE status = 'Sedang Dilayani'`)
	if err != nil {
		return 0, err
	}
	for rows.Next() {
		var chair int
		if err := rows.Scan(&chair); err != nil {
			rows.Close()
			return 0, err
		}
		usedChairs[chair] = true
	}
	rows.Close()
	if rows.Err() != nil {
		return 0, rows.Err()
	}

	type dueBooking struct {
		id       int64
		barberID int64
	}
	var due []dueBooking
	rows, err = tx.Query(ctx, `
		SELECT b.id, b.barber_id
		FROM bookings b
		LEFT JOIN LATERAL (
			SELECT payment_status FROM transactions WHERE booking_id = b.id ORDER BY id DESC LIMIT 1
		) t ON TRUE
		WHERE b.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
		  AND b.booking_date + b.booking_time::time <= CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'
		  AND (b.status = 'Dikonfirmasi' OR b.status = 'Menunggu')
		  AND t.payment_status = 'Lunas'
		  AND NOT EXISTS (
			SELECT 1 FROM bookings busy WHERE busy.barber_id = b.barber_id AND busy.status = 'Sedang Dilayani'
		  )
		ORDER BY b.booking_time, b.id`)
	if err != nil {
		return 0, err
	}
	for rows.Next() {
		var item dueBooking
		if err := rows.Scan(&item.id, &item.barberID); err != nil {
			rows.Close()
			return 0, err
		}
		due = append(due, item)
	}
	rows.Close()
	if rows.Err() != nil {
		return 0, rows.Err()
	}

	started := 0
	busyBarbers := map[int64]bool{}
	for _, item := range due {
		if busyBarbers[item.barberID] {
			continue
		}
		chair := 0
		for c := 1; c <= totalChairs; c++ {
			if !usedChairs[c] {
				chair = c
				break
			}
		}
		if chair == 0 {
			break
		}

		tag, err := tx.Exec(ctx, `
			UPDATE bookings
			SET status = 'Sedang Dilayani', chair_number = $1, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND status IN ('Menunggu', 'Dikonfirmasi')`, chair, item.id)
		if err != nil {
			return 0, err
		}
		if tag.RowsAffected() == 0 {
			continue
		}
		usedChairs[chair] = true
		busyBarbers[item.barberID] = true
		started++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return started, nil
}
