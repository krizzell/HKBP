package auth

import (
	"strings"
	"testing"
	"time"
)

func sample(exp time.Duration) Claims {
	now := time.Now()
	return Claims{Email: "a@hkbp.or.id", Role: "Admin", IdHuria: "H-1", IssuedAt: now.Unix(), ExpiresAt: now.Add(exp).Unix()}
}

func TestSignVerifyRoundTrip(t *testing.T) {
	token, err := Sign("rahasia", sample(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	claims, err := Verify("rahasia", token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Role != "Admin" || claims.IdHuria != "H-1" {
		t.Fatalf("claims tidak sesuai: %+v", claims)
	}
}

func TestVerifyRejectsWrongSecretAndTamperedPayload(t *testing.T) {
	token, _ := Sign("rahasia", sample(time.Hour))
	if _, err := Verify("salah", token); err == nil {
		t.Fatal("secret salah harus ditolak")
	}
	parts := strings.Split(token, ".")
	forged := Claims{Email: "a@hkbp.or.id", Role: "SuperAdmin", ExpiresAt: time.Now().Add(time.Hour).Unix()}
	forgedToken, _ := Sign("lain", forged)
	forgedParts := strings.Split(forgedToken, ".")
	tampered := parts[0] + "." + forgedParts[1] + "." + parts[2]
	if _, err := Verify("rahasia", tampered); err == nil {
		t.Fatal("payload yang diubah harus ditolak")
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	token, _ := Sign("rahasia", sample(-time.Minute))
	if _, err := Verify("rahasia", token); err == nil {
		t.Fatal("token kedaluwarsa harus ditolak")
	}
}

func TestVerifyRejectsGarbageAndEmptySecret(t *testing.T) {
	if _, err := Verify("rahasia", "jwt-hkbp-SuperAdmin-123"); err == nil {
		t.Fatal("token palsu lama harus ditolak")
	}
	if _, err := Sign("", sample(time.Hour)); err == nil {
		t.Fatal("secret kosong harus ditolak")
	}
}
