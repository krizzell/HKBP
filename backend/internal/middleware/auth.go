package middleware

import (
	"net/http"
	"strings"

	"HKBP/internal/config"

	"github.com/gin-gonic/gin"
)

// RequireRole adalah middleware otorisasi sementara berbasis peran (RBAC).
//
// PERINGATAN KEAMANAN:
// Middleware ini membaca peran pengguna dari header HTTP "X-Dev-Role" dan HANYA
// boleh aktif saat APP_ENV bernilai "dev".
// Ini adalah solusi sementara selama tahap pengembangan lokal sebelum autentikasi JWT
// diimplementasikan secara penuh.
// Mekanisme ini TIDAK BOLEH aktif di luar mode development (misalnya di staging atau production).
func RequireRole(cfg config.Config, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Proteksi ketat: Tolak mentah-mentah jika bukan environment development
		if strings.ToLower(cfg.AppEnv) != "dev" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Akses ditolak: autentikasi dev hanya diizinkan pada mode development",
			})
			return
		}

		devRole := strings.TrimSpace(c.GetHeader("X-Dev-Role"))
		if devRole == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Akses ditolak: header X-Dev-Role diperlukan untuk mengakses resource ini",
			})
			return
		}

		isAllowed := false
		for _, role := range allowedRoles {
			if strings.EqualFold(devRole, role) {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Akses ditolak: peran Anda tidak memiliki izin untuk operasi ini",
			})
			return
		}

		c.Set("user_role", devRole)
		c.Next()
	}
}
