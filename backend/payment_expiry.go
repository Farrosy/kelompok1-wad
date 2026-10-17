package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func startPaymentExpiryWorker(db *pgxpool.Pool) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			tag, err := db.Exec(ctx, `
				WITH expired AS (
					SELECT id
					FROM transactions
					WHERE payment_status = 'Menunggu'
					  AND expires_at IS NOT NULL
					  AND expires_at <= CURRENT_TIMESTAMP - INTERVAL '1 minute'
					ORDER BY expires_at
					FOR UPDATE SKIP LOCKED
					LIMIT 100
				), failed AS (
					UPDATE transactions t
					SET payment_status = 'Gagal'
					FROM expired e
					WHERE t.id = e.id AND t.payment_status = 'Menunggu'
					RETURNING t.booking_id
				)
				UPDATE bookings b
				SET status = 'Batal', updated_at = CURRENT_TIMESTAMP
				FROM failed f
				WHERE b.id = f.booking_id AND b.status = 'Menunggu'
			`)
			cancel()
			if err != nil {
				log.Printf("payment expiry worker failed: %v", err)
			} else if tag.RowsAffected() > 0 {
				log.Printf("payment expiry worker canceled %d expired booking(s)", tag.RowsAffected())
			}

			<-ticker.C
		}
	}()
}
