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

func (h *AnalyticsHandler) proxy(path string) gin.HandlerFunc {
	return func(c *gin.Context) {
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payload analitik tidak dapat dibaca"})
			return
		}

		req, err := http.NewRequestWithContext(
			c.Request.Context(),
			http.MethodPost,
			h.baseURL+path,
			bytes.NewReader(body),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyiapkan permintaan analitik"})
			return
		}
		req.Header.Set("Content-Type", "application/json")
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

func (h *AnalyticsHandler) Forecast(c *gin.Context)    { h.proxy("/forecast")(c) }
func (h *AnalyticsHandler) Anomaly(c *gin.Context)     { h.proxy("/anomaly")(c) }
func (h *AnalyticsHandler) Correlation(c *gin.Context) { h.proxy("/correlation")(c) }
func (h *AnalyticsHandler) Drop(c *gin.Context)        { h.proxy("/drop")(c) }
