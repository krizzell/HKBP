package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"HKBP/internal/domain"

	"github.com/gin-gonic/gin"
)

type DistrikHandler struct {
	svc domain.DistrikService
}

// NewDistrikHandler mengembalikan instance handler HTTP untuk resource Distrik
func NewDistrikHandler(svc domain.DistrikService) *DistrikHandler {
	return &DistrikHandler{
		svc: svc,
	}
}

// GetAll menangani GET /api/distrik?page=&limit=&q=&aktif=
func (h *DistrikHandler) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 {
		limit = 10
	} else if limit > 100 {
		limit = 100
	}

	q := strings.TrimSpace(c.Query("q"))

	var aktifPtr *bool
	aktifStr := c.Query("aktif")
	if aktifStr != "" {
		if strings.EqualFold(aktifStr, "true") || aktifStr == "1" {
			val := true
			aktifPtr = &val
		} else if strings.EqualFold(aktifStr, "false") || aktifStr == "0" {
			val := false
			aktifPtr = &val
		}
	}

	res, err := h.svc.GetAll(c.Request.Context(), domain.DistrikFilter{
		Page:  page,
		Limit: limit,
		Q:     q,
		Aktif: aktifPtr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar distrik"})
		return
	}

	c.JSON(http.StatusOK, res)
}

// GetByID menangani GET /api/distrik/:id
func (h *DistrikHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	doc, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doc})
}

// Create menangani POST /api/distrik
func (h *DistrikHandler) Create(c *gin.Context) {
	var req domain.CreateDistrikRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid, pastikan Kode dan Nama diisi"})
		return
	}

	doc, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    doc,
		"message": "Distrik berhasil ditambahkan",
	})
}

// Update menangani PUT /api/distrik/:id
func (h *DistrikHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateDistrikRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data perbaruan tidak valid"})
		return
	}

	doc, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    doc,
		"message": "Distrik berhasil diperbarui",
	})
}

// Delete menangani DELETE /api/distrik/:id
func (h *DistrikHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.svc.Delete(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Distrik berhasil dihapus"})
}

// Helper pemetaan error domain ke HTTP status code
func (h *DistrikHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrDistrikNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrDistrikInvalidID),
		errors.Is(err, domain.ErrDistrikNamaEmpty),
		errors.Is(err, domain.ErrDistrikKodeEmpty),
		errors.Is(err, domain.ErrDistrikPraesesEmpty):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrDistrikKodeDup),
		errors.Is(err, domain.ErrDistrikNamaDup),
		errors.Is(err, domain.ErrDistrikHasActive),
		errors.Is(err, domain.ErrDistrikHasResort):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
