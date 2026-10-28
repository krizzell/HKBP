package router

import (
	"HKBP/internal/config"
	"HKBP/internal/handler"
	"HKBP/internal/middleware"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func New(
	cfg config.Config,
	wilayah *handler.WilayahHandler,
	auth *handler.AuthHandler,
	distrik *handler.DistrikHandler,
	resort *handler.ResortHandler,
	huria *handler.HuriaHandler,
) *gin.Engine {
	r := gin.Default()
	_ = r.SetTrustedProxies(nil)

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-User-Role, X-User-Email, X-User-Huria, X-Dev-Role")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "version": "v2"})
		})

		// Auth
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/login", auth.Login)
			authGroup.GET("/me", auth.Me)
		}

		// Distrik CRUD
		distrikGroup := api.Group("/distrik")
		{
			distrikGroup.GET("", distrik.GetAll)
			distrikGroup.GET("/:id", distrik.GetByID)
			distrikGroup.POST("", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), distrik.Create)
			distrikGroup.PUT("/:id", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), distrik.Update)
			distrikGroup.DELETE("/:id", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), distrik.Delete)
		}

		// Resort CRUD
		resortGroup := api.Group("/resort")
		{
			resortGroup.GET("", resort.GetAll)
			resortGroup.GET("/:id", resort.GetByID)
			resortGroup.POST("", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), resort.Create)
			resortGroup.PUT("/:id", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), resort.Update)
			resortGroup.DELETE("/:id", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), resort.Delete)
		}

		// Wilayah & Seeder
		api.GET("/wilayah", wilayah.GetAll)
		api.POST("/wilayah/sync", wilayah.SyncTree)
		api.POST("/seeder/reset", wilayah.ResetSeeder)

		// Huria CRUD & Operasional Keuangan
		huriaGroup := api.Group("/huria")
		{
			huriaGroup.GET("", huria.GetAll)
			huriaGroup.POST("", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), huria.Create)

			huriaItem := huriaGroup.Group("/:id")
			{
				huriaItem.GET("", func(c *gin.Context) {
					idHuria := c.Param("id")
					if doc, err := huria.GetService().GetByID(c.Request.Context(), idHuria); err == nil && doc != nil {
						c.JSON(http.StatusOK, gin.H{"data": doc})
						return
					}
					wilayah.GetHuria(c)
				})

				huriaItem.PUT("", func(c *gin.Context) {
					role := c.GetHeader("X-Dev-Role")
					if role == "" {
						role = c.GetHeader("X-User-Role")
					}
					if strings.EqualFold(role, "SUPER_ADMIN") || strings.EqualFold(role, "SuperAdmin") {
						huria.Update(c)
						return
					}
					wilayah.UpdateHuria(c)
				})

				huriaItem.DELETE("", middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin"), huria.Delete)

				// Pemasukan Jemaat
				huriaItem.POST("/pemasukan", wilayah.AddPemasukan)
				huriaItem.PUT("/pemasukan/:idTransaksi", wilayah.UpdatePemasukan)
				huriaItem.DELETE("/pemasukan/:idTransaksi", wilayah.DeletePemasukan)

				// Sesi Ibadah & Pelean
				huriaItem.POST("/sesi", wilayah.AddSesiIbadah)
				huriaItem.PUT("/sesi/:idSesi", wilayah.UpdateSesiIbadah)
				huriaItem.DELETE("/sesi/:idSesi", wilayah.DeleteSesiIbadah)

				// Alokasi Transaksi
				huriaItem.POST("/alokasi", wilayah.AddAlokasi)
				huriaItem.PUT("/alokasi/:idAlokasi", wilayah.UpdateAlokasi)
				huriaItem.DELETE("/alokasi/:idAlokasi", wilayah.DeleteAlokasi)

				// Setoran Pusat
				huriaItem.POST("/setoran", wilayah.AddSetoranPusat)
				huriaItem.PUT("/setoran/:idSetoran", wilayah.UpdateSetoranPusat)
				huriaItem.DELETE("/setoran/:idSetoran", wilayah.DeleteSetoranPusat)

				// Kategori Pemasukan
				huriaItem.POST("/kategori", wilayah.AddKategori)
				huriaItem.PUT("/kategori/:idKategori", wilayah.UpdateKategori)
				huriaItem.DELETE("/kategori/:idKategori", wilayah.DeleteKategori)

				// Lunggu
				huriaItem.POST("/lunggu", wilayah.AddLunggu)
				huriaItem.PUT("/lunggu/:idLunggu", wilayah.UpdateLunggu)
				huriaItem.DELETE("/lunggu/:idLunggu", wilayah.DeleteLunggu)

				// Warta Jemaat
				huriaItem.PUT("/warta", wilayah.UpdateWarta)
			}
		}
	}
	return r
}
