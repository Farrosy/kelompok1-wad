package main

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"
)

const sessionLifetime = 24 * time.Hour

type sessionStore struct {
	mu       sync.Mutex
	sessions map[string]session
}

type session struct {
	userID    int64
	expiresAt time.Time
}

func newSessionStore() *sessionStore {
	return &sessionStore{sessions: make(map[string]session)}
}

func (s *sessionStore) create(userID int64) (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(randomBytes)
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for existingToken, existingSession := range s.sessions {
		if !now.Before(existingSession.expiresAt) {
			delete(s.sessions, existingToken)
		}
	}
	s.sessions[token] = session{userID: userID, expiresAt: now.Add(sessionLifetime)}
	return token, nil
}

func (s *sessionStore) userIDFromRequest(r *http.Request) (int64, bool) {
	token := bearerToken(r)
	if token == "" {
		return 0, false
	}
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	storedSession, ok := s.sessions[token]
	if !ok {
		return 0, false
	}
	if !now.Before(storedSession.expiresAt) {
		delete(s.sessions, token)
		return 0, false
	}
	return storedSession.userID, true
}

func (s *sessionStore) revokeFromRequest(r *http.Request) {
	if token := bearerToken(r); token != "" {
		s.mu.Lock()
		delete(s.sessions, token)
		s.mu.Unlock()
	}
}

func bearerToken(r *http.Request) string {
	const prefix = "Bearer "
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, prefix) {
		return ""
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	return token
}
