package middleware

import (
	"net/http"
	"strings"

	"HKBP/internal/auth"
	"HKBP/internal/config"

	"github.com/gin-gonic/gin"
)

const claimsKey = "auth_claims"

func abort(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": msg})
}

func parseBearer(cfg config.Config, c *gin.Context) (*auth.Claims, string) {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return nil, "Token autentikasi tidak ditemukan"
	}
	claims, err := auth.Verify(cfg.JWTSecret, strings.TrimSpace(strings.TrimPrefix(header, prefix)))
	if err != nil {
		return nil, err.Error()
	}
	return claims, ""
}

// Authenticate memverifikasi JWT pada header Authorization dan menyimpan claims ke context.
// Identitas pengguna HANYA berasal dari token yang ditandatangani server.
func Authenticate(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, msg := parseBearer(cfg, c)
		if claims == nil {
			abort(c, http.StatusUnauthorized, msg)
			return
		}
		c.Set(claimsKey, claims)
		c.Next()
	}
}

// ClaimsFrom mengambil claims hasil Authenticate.
func ClaimsFrom(c *gin.Context) (*auth.Claims, bool) {
	value, ok := c.Get(claimsKey)
	if !ok {
		return nil, false
	}
	claims, ok := value.(*auth.Claims)
	return claims, ok && claims != nil
}

// RequireRole membatasi akses berdasarkan peran di dalam JWT (RBAC).
// Dapat dipakai mandiri maupun setelah Authenticate.
func RequireRole(cfg config.Config, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := ClaimsFrom(c)
		if !ok {
			var msg string
			claims, msg = parseBearer(cfg, c)
			if claims == nil {
				abort(c, http.StatusUnauthorized, msg)
				return
			}
			c.Set(claimsKey, claims)
		}
		for _, role := range allowedRoles {
			if strings.EqualFold(claims.Role, role) {
				c.Next()
				return
			}
		}
		abort(c, http.StatusForbidden, "Akses ditolak: peran Anda tidak memiliki izin untuk operasi ini")
	}
}

// IsSuperAdmin membantu handler memeriksa peran dari claims.
func IsSuperAdmin(c *gin.Context) bool {
	claims, ok := ClaimsFrom(c)
	return ok && (strings.EqualFold(claims.Role, "SuperAdmin") || strings.EqualFold(claims.Role, "SUPER_ADMIN"))
}
