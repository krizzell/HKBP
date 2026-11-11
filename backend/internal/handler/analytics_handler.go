package handler

import (
	"HKBP/internal/config"
	"bytes"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// AnalyticsHandler meneruskan permintaan ke layanan Python (FastAPI) dengan kunci internal.
// Frontend tidak pernah berbicara langsung dengan Python.
type AnalyticsHandler struct {
	baseURL string
	key     string
	client  *http.Client
}

func NewAnalyticsHandler(cfg config.Config) *AnalyticsHandler {
	return &AnalyticsHandler{
		baseURL: strings.TrimRight(cfg.AnalyticsURL, "/"),
		key:     cfg.AnalyticsKey,
		client:  &http.Client{Timeout: 45 * time.Second},
	}
}

func (h *AnalyticsHandler) proxy(method, path string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body io.Reader
		if method == http.MethodPost {
			raw, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Payload analitik tidak dapat dibaca"})
				return
			}
			body = bytes.NewReader(raw)
		}

		target := h.baseURL + path
		if query := c.Request.URL.RawQuery; query != "" {
			target += "?" + query
		}

		req, err := http.NewRequestWithContext(c.Request.Context(), method, target, body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyiapkan permintaan analitik"})
			return
		}
		if method == http.MethodPost {
			req.Header.Set("Content-Type", "application/json")
		}
		if h.key != "" {
			req.Header.Set("X-Internal-Key", h.key)
		}

		response, err := h.client.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Layanan analitik Python tidak tersedia"})
			return
		}
		defer response.Body.Close()
		responseBody, err := io.ReadAll(response.Body)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Respons layanan analitik tidak dapat dibaca"})
			return
		}

		c.Data(response.StatusCode, response.Header.Get("Content-Type"), responseBody)
	}
}

// --- Analitik statistik (POST)
func (h *AnalyticsHandler) Forecast(c *gin.Context)    { h.proxy(http.MethodPost, "/forecast")(c) }
func (h *AnalyticsHandler) Anomaly(c *gin.Context)     { h.proxy(http.MethodPost, "/anomaly")(c) }
func (h *AnalyticsHandler) Correlation(c *gin.Context) { h.proxy(http.MethodPost, "/correlation")(c) }
func (h *AnalyticsHandler) Drop(c *gin.Context)        { h.proxy(http.MethodPost, "/drop")(c) }

// --- Data warehouse (GET): sumber data dashboard & storytelling
func (h *AnalyticsHandler) DwRingkasan(c *gin.Context) { h.proxy(http.MethodGet, "/dw/ringkasan")(c) }
func (h *AnalyticsHandler) DwCube(c *gin.Context)      { h.proxy(http.MethodGet, "/dw/cube")(c) }
func (h *AnalyticsHandler) DwAliran(c *gin.Context)    { h.proxy(http.MethodGet, "/dw/aliran")(c) }
func (h *AnalyticsHandler) DwSesi(c *gin.Context)      { h.proxy(http.MethodGet, "/dw/sesi")(c) }
func (h *AnalyticsHandler) DwKategori(c *gin.Context)  { h.proxy(http.MethodGet, "/dw/kategori")(c) }
func (h *AnalyticsHandler) DwRefresh(c *gin.Context)   { h.proxy(http.MethodPost, "/dw/refresh")(c) }

// --- Model Machine Learning
func (h *AnalyticsHandler) MlMetrics(c *gin.Context) { h.proxy(http.MethodGet, "/ml/metrics")(c) }
func (h *AnalyticsHandler) MlOpsi(c *gin.Context)    { h.proxy(http.MethodGet, "/ml/opsi")(c) }
func (h *AnalyticsHandler) MlPredict(c *gin.Context) { h.proxy(http.MethodPost, "/ml/predict")(c) }
