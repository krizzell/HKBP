package handler

import (
	"HKBP/internal/domain"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc  domain.WilayahService
	repo domain.WilayahRepository
}

func NewAuthHandler(svc domain.WilayahService, repo domain.WilayahRepository) *AuthHandler {
	return &AuthHandler{svc: svc, repo: repo}
}

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

	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) Me(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak ditemukan"})
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	// Check user from token or header role
	role := c.GetHeader("X-User-Role")
	email := c.GetHeader("X-User-Email")

	if email == "" {
		if strings.Contains(token, "superadmin") || strings.Contains(token, "pusat") {
			email = "pusat@hkbp.or.id"
		} else if strings.Contains(token, "pearaja") || strings.Contains(token, "2111") {
			email = "admin.pearaja@hkbp.or.id"
		} else if strings.Contains(token, "sudirman") || strings.Contains(token, "admin") || strings.Contains(token, "1111") {
			email = "admin.sudirman@hkbp.or.id"
		} else {
			email = "pusat@hkbp.or.id"
		}
	}

	user, err := h.repo.FindUserByEmail(c.Request.Context(), email)
	if err != nil {
		// Fallback minimal user
		user = &domain.User{
			Email: email,
			Role:  role,
			Nama:  "Pengguna HKBP",
		}
	}

	userCopy := *user
	userCopy.Password = ""
	c.JSON(http.StatusOK, gin.H{"user": userCopy})
}
