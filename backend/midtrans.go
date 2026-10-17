package main

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type midtransClient struct {
	serverKey string
	baseURL   string
	client    *http.Client
}

func newMidtransClient() (*midtransClient, error) {
	key := strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY"))
	if key == "" {
		return nil, fmt.Errorf("MIDTRANS_SERVER_KEY belum dikonfigurasi")
	}
	baseURL := "https://app.sandbox.midtrans.com/snap/v1/transactions"
	if strings.EqualFold(strings.TrimSpace(os.Getenv("MIDTRANS_ENVIRONMENT")), "production") {
		baseURL = "https://app.midtrans.com/snap/v1/transactions"
	}
	return &midtransClient{serverKey: key, baseURL: baseURL, client: &http.Client{Timeout: 15 * time.Second}}, nil
}

type midtransSnapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

func (m *midtransClient) createSnap(ctx context.Context, orderID, name, phone string, amount float64, service string) (midtransSnapResponse, error) {
	payload := map[string]any{
		"transaction_details": map[string]any{"order_id": orderID, "gross_amount": int64(amount)},
		"customer_details":    map[string]string{"first_name": name, "phone": phone},
		"item_details":        []map[string]any{{"id": "booking", "price": int64(amount), "quantity": 1, "name": service}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return midtransSnapResponse{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.baseURL, bytes.NewReader(body))
	if err != nil {
		return midtransSnapResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(m.serverKey, "")
	resp, err := m.client.Do(req)
	if err != nil {
		return midtransSnapResponse{}, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return midtransSnapResponse{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return midtransSnapResponse{}, fmt.Errorf("Midtrans returned HTTP %d", resp.StatusCode)
	}
	var result midtransSnapResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return result, err
	}
	if result.Token == "" || result.RedirectURL == "" {
		return result, fmt.Errorf("Midtrans response missing token or redirect URL")
	}
	return result, nil
}

type midtransNotification struct {
	MerchantID        string `json:"merchant_id"`
	OrderID           string `json:"order_id"`
	TransactionID     string `json:"transaction_id"`
	TransactionTime   string `json:"transaction_time"`
	SettlementTime    string `json:"settlement_time"`
	PaymentType       string `json:"payment_type"`
	StatusCode        string `json:"status_code"`
	StatusMessage     string `json:"status_message"`
	GrossAmount       string `json:"gross_amount"`
	Currency          string `json:"currency"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
}

type midtransNotificationResponse struct {
	Message string `json:"message"`
}

type midtransNotificationError struct {
	Error string `json:"error"`
}

// midtransNotificationHandler godoc
// @Summary      Terima notifikasi pembayaran Midtrans
// @Description  Endpoint webhook publik untuk notifikasi transaksi Midtrans (Snap). Signature diverifikasi dengan SHA-512 dari order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY. Status settlement dan capture dengan fraud_status accept menandai transaksi Lunas; pending tetap Menunggu; deny, cancel, dan expire menandai Gagal serta membatalkan booking yang masih Menunggu. Status transaksi lain diabaikan dan tetap dibalas 200.
// @Tags         payments
// @Accept       json
// @Produce      json
// @Param        body body midtransNotification true "Payload notifikasi Midtrans"
// @Success      200 {object} midtransNotificationResponse "Notifikasi diproses atau status transaksi diabaikan"
// @Failure      400 {object} midtransNotificationError "Payload JSON tidak valid"
// @Failure      401 {object} midtransNotificationError "Signature tidak valid"
// @Failure      405 {object} midtransNotificationError "Metode selain POST tidak diizinkan"
// @Failure      500 {object} midtransNotificationError "Gagal memperbarui transaksi atau melepas slot booking"
// @Failure      503 {object} midtransNotificationError "Payment gateway belum dikonfigurasi"
// @Router       /payments/midtrans/notification [post]
func midtransNotificationHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Metode tidak diizinkan."})
			return
		}
		client, err := newMidtransClient()
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Payment gateway belum dikonfigurasi."})
			return
		}
		var n midtransNotification
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&n); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Notifikasi tidak valid."})
			return
		}
		sum := sha512.Sum512([]byte(n.OrderID + n.StatusCode + n.GrossAmount + client.serverKey))
		if !strings.EqualFold(n.SignatureKey, hex.EncodeToString(sum[:])) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Signature notifikasi tidak valid."})
			return
		}
		status := "Menunggu"
		paymentMethod := "Midtrans"
		switch n.TransactionStatus {
		case "capture":
			if n.FraudStatus == "accept" {
				status = "Lunas"
			}
		case "settlement":
			status = "Lunas"
		case "deny", "cancel", "expire":
			status = "Gagal"
		case "pending":
			status = "Menunggu"
		default:
			writeJSON(w, http.StatusOK, map[string]string{"message": "Status diabaikan."})
			return
		}
		_, err = db.Exec(r.Context(), `UPDATE transactions SET payment_method=$1, payment_status=$2, paid_at=CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE paid_at END WHERE gateway_order_id=$3`, paymentMethod, status, n.OrderID, status == "Lunas")
		if err != nil {
			log.Printf("Midtrans notification: failed updating transaction for order %q: %v", n.OrderID, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal memperbarui status pembayaran."})
			return
		}
		if status == "Gagal" {
			_, err = db.Exec(r.Context(), `UPDATE bookings SET status='Batal', updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT booking_id FROM transactions WHERE gateway_order_id=$1) AND status='Menunggu'`, n.OrderID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal melepas slot booking."})
				return
			}
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Notifikasi pembayaran diproses."})
	}
}
