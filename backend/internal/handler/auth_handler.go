package handler

import (
	"HKBP/internal/auth"
	"HKBP/internal/config"
	"HKBP/internal/domain"
	"HKBP/internal/middleware"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc    domain.WilayahService
	repo   domain.WilayahRepository
	secret string
	ttl    time.Duration
}

func NewAuthHandler(svc domain.WilayahService, repo domain.WilayahRepository, cfg config.Config) *AuthHandler {
	return &AuthHandler{
		svc:    svc,
		repo:   repo,
		secret: cfg.JWTSecret,
		ttl:    time.Duration(cfg.JWTTTLHours) * time.Hour,
	}
}

// Login memvalidasi kredensial lalu menerbitkan JWT HS256 bertanda tangan server.
// Password tidak pernah dikembalikan ke klien.
func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data login tidak valid"})
		return
	}

	res, err := h.svc.Login(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	token, err := auth.Sign(h.secret, auth.Claims{
		Email:     res.User.Email,
		Role:      res.User.Role,
		IdHuria:   res.User.IdHuria,
		NamaHuria: res.User.NamaHuria,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(h.ttl).Unix(),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menerbitkan token"})
		return
	}

	user := res.User
	user.Password = ""
	c.JSON(http.StatusOK, domain.LoginResponse{Token: token, User: user})
}

// Me mengembalikan profil pengguna dari identitas di dalam JWT (rute ini berada di balik Authenticate).
func (h *AuthHandler) Me(c *gin.Context) {
	claims, ok := middleware.ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid"})
		return
	}

	user, err := h.repo.FindUserByEmail(c.Request.Context(), claims.Email)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	userCopy := *user
	userCopy.Password = ""
	c.JSON(http.StatusOK, gin.H{"user": userCopy})
}
