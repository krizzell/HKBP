// Package auth berisi penandatanganan & verifikasi JWT HS256 memakai pustaka standar Go
// (tanpa dependensi tambahan).
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// Claims adalah isi token yang dipercaya server (identitas TIDAK lagi diambil dari header bebas).
type Claims struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	IdHuria   string `json:"idHuria,omitempty"`
	NamaHuria string `json:"namaHuria,omitempty"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}

var enc = base64.RawURLEncoding

func sign(secret, signingInput string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	return enc.EncodeToString(mac.Sum(nil))
}

// Sign membuat token JWT HS256.
func Sign(secret string, claims Claims) (string, error) {
	if secret == "" {
		return "", errors.New("JWT secret kosong")
	}
	header := enc.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	signingInput := header + "." + enc.EncodeToString(payload)
	return signingInput + "." + sign(secret, signingInput), nil
}

// Verify memeriksa tanda tangan, algoritma, dan masa berlaku token.
func Verify(secret, token string) (*Claims, error) {
	if secret == "" {
		return nil, errors.New("JWT secret kosong")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("format token tidak valid")
	}
	expected := sign(secret, parts[0]+"."+parts[1])
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return nil, errors.New("tanda tangan token tidak valid")
	}

	headerBytes, err := enc.DecodeString(parts[0])
	if err != nil {
		return nil, errors.New("header token tidak valid")
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil || header.Alg != "HS256" {
		return nil, errors.New("algoritma token tidak didukung")
	}

	payloadBytes, err := enc.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("isi token tidak valid")
	}
	var claims Claims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("isi token tidak valid")
	}
	if claims.ExpiresAt <= time.Now().Unix() {
		return nil, errors.New("token kedaluwarsa, silakan login ulang")
	}
	return &claims, nil
}
