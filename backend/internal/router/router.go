package router

import (
	"HKBP/internal/config"
	"HKBP/internal/handler"
	"HKBP/internal/middleware"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// corsMiddleware hanya mengizinkan origin frontend yang terdaftar (FRONTEND_URL, boleh dipisah koma).
// Pada APP_ENV=dev, localhost juga diizinkan.
func corsMiddleware(cfg config.Config) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, origin := range strings.Split(cfg.FrontendURL, ",") {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin != "" {
			allowed[origin] = true
		}
	}
	isDev := strings.EqualFold(cfg.AppEnv, "dev")

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" && (allowed[origin] ||
			(isDev && (strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1")))) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func New(
	cfg config.Config,
	wilayah *handler.WilayahHandler,
	auth *handler.AuthHandler,
	distrik *handler.DistrikHandler,
	resort *handler.ResortHandler,
	huria *handler.HuriaHandler,
	analytics *handler.AnalyticsHandler,
) *gin.Engine {
	r := gin.Default()
	_ = r.SetTrustedProxies(nil)
	r.Use(corsMiddleware(cfg))

	superAdmin := middleware.RequireRole(cfg, "SUPER_ADMIN", "SuperAdmin")
	operator := middleware.RequireRole(cfg, "Admin", "SuperAdmin", "SUPER_ADMIN")

	api := r.Group("/api")
	{
		// ---- Rute publik (satu-satunya yang tanpa token)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "version": "v2"})
		})
		api.POST("/auth/login", auth.Login)

		// ---- Semua rute lain WAJIB membawa JWT yang valid
		secured := api.Group("")
		secured.Use(middleware.Authenticate(cfg))
		{
			secured.GET("/auth/me", auth.Me)

			// Analitik Python: statistik, data warehouse, dan model ML
			analyticsGroup := secured.Group("/analytics")
			{
				analyticsGroup.POST("/forecast", analytics.Forecast)
				analyticsGroup.POST("/anomaly", analytics.Anomaly)
				analyticsGroup.POST("/correlation", analytics.Correlation)
				analyticsGroup.POST("/drop", analytics.Drop)

				analyticsGroup.GET("/dw/ringkasan", analytics.DwRingkasan)
				analyticsGroup.GET("/dw/cube", analytics.DwCube)
				analyticsGroup.GET("/dw/aliran", analytics.DwAliran)
				analyticsGroup.GET("/dw/sesi", analytics.DwSesi)
				analyticsGroup.GET("/dw/kategori", analytics.DwKategori)
				analyticsGroup.POST("/dw/refresh", superAdmin, analytics.DwRefresh)

				analyticsGroup.GET("/ml/metrics", analytics.MlMetrics)
				analyticsGroup.GET("/ml/opsi", analytics.MlOpsi)
				analyticsGroup.POST("/ml/predict", analytics.MlPredict)
			}

			// Distrik CRUD (tulis: SuperAdmin)
			distrikGroup := secured.Group("/distrik")
			{
				distrikGroup.GET("", distrik.GetAll)
				distrikGroup.GET("/:id", distrik.GetByID)
				distrikGroup.POST("", superAdmin, distrik.Create)
				distrikGroup.PUT("/:id", superAdmin, distrik.Update)
				distrikGroup.DELETE("/:id", superAdmin, distrik.Delete)
			}

			// Resort CRUD (tulis: SuperAdmin)
			resortGroup := secured.Group("/resort")
			{
				resortGroup.GET("", resort.GetAll)
				resortGroup.GET("/:id", resort.GetByID)
				resortGroup.POST("", superAdmin, resort.Create)
				resortGroup.PUT("/:id", superAdmin, resort.Update)
				resortGroup.DELETE("/:id", superAdmin, resort.Delete)
			}

			// Wilayah & Seeder (operasi destruktif: SuperAdmin saja)
			secured.GET("/wilayah", wilayah.GetAll)
			secured.POST("/wilayah/sync", superAdmin, wilayah.SyncTree)
			secured.POST("/seeder/reset", superAdmin, wilayah.ResetSeeder)

			// Huria CRUD & operasional keuangan
			huriaGroup := secured.Group("/huria")
			{
				huriaGroup.GET("", huria.GetAll)
				huriaGroup.POST("", superAdmin, huria.Create)

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

					huriaItem.PUT("", operator, func(c *gin.Context) {
						if middleware.IsSuperAdmin(c) {
							huria.Update(c)
							return
						}
						wilayah.UpdateHuria(c)
					})

					huriaItem.DELETE("", superAdmin, huria.Delete)

					// Operasional: Admin Huria (dibatasi ke Huria miliknya oleh service) atau SuperAdmin
					huriaItem.POST("/pemasukan", operator, wilayah.AddPemasukan)
					huriaItem.PUT("/pemasukan/:idTransaksi", operator, wilayah.UpdatePemasukan)
					huriaItem.DELETE("/pemasukan/:idTransaksi", operator, wilayah.DeletePemasukan)

					huriaItem.POST("/sesi", operator, wilayah.AddSesiIbadah)
					huriaItem.PUT("/sesi/:idSesi", operator, wilayah.UpdateSesiIbadah)
					huriaItem.DELETE("/sesi/:idSesi", operator, wilayah.DeleteSesiIbadah)

					huriaItem.POST("/alokasi", operator, wilayah.AddAlokasi)
					huriaItem.PUT("/alokasi/:idAlokasi", operator, wilayah.UpdateAlokasi)
					huriaItem.DELETE("/alokasi/:idAlokasi", operator, wilayah.DeleteAlokasi)

					huriaItem.POST("/setoran", operator, wilayah.AddSetoranPusat)
					huriaItem.PUT("/setoran/:idSetoran", operator, wilayah.UpdateSetoranPusat)
					huriaItem.DELETE("/setoran/:idSetoran", operator, wilayah.DeleteSetoranPusat)

					huriaItem.POST("/kategori", operator, wilayah.AddKategori)
					huriaItem.PUT("/kategori/:idKategori", operator, wilayah.UpdateKategori)
					huriaItem.DELETE("/kategori/:idKategori", operator, wilayah.DeleteKategori)

					huriaItem.POST("/lunggu", operator, wilayah.AddLunggu)
					huriaItem.PUT("/lunggu/:idLunggu", operator, wilayah.UpdateLunggu)
					huriaItem.DELETE("/lunggu/:idLunggu", operator, wilayah.DeleteLunggu)

					huriaItem.PUT("/warta", operator, wilayah.UpdateWarta)
				}
			}
		}
	}
	return r
}
