package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"HKBP/internal/domain"

	"github.com/gin-gonic/gin"
)

type ResortHandler struct {
	svc domain.ResortService
}

// NewResortHandler mengembalikan instance handler HTTP untuk resource Resort
func NewResortHandler(svc domain.ResortService) *ResortHandler {
	return &ResortHandler{
		svc: svc,
	}
}

// GetAll menangani GET /api/resort?idDistrik=&page=&limit=&q=&aktif=
func (h *ResortHandler) GetAll(c *gin.Context) {
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
	idDistrik := strings.TrimSpace(c.Query("idDistrik"))

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

	res, err := h.svc.GetAll(c.Request.Context(), domain.ResortFilter{
		IdDistrik: idDistrik,
		Page:      page,
		Limit:     limit,
		Q:         q,
		Aktif:     aktifPtr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar resort"})
		return
	}

	c.JSON(http.StatusOK, res)
}

// GetByID menangani GET /api/resort/:id
func (h *ResortHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	doc, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doc})
}

// Create menangani POST /api/resort
func (h *ResortHandler) Create(c *gin.Context) {
	var req domain.CreateResortRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid, pastikan Kode, Nama, dan IdDistrik diisi"})
		return
	}

	doc, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    doc,
		"message": "Resort berhasil ditambahkan",
	})
}

// Update menangani PUT /api/resort/:id
func (h *ResortHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateResortRequest
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
		"message": "Resort berhasil diperbarui",
	})
}

// Delete menangani DELETE /api/resort/:id
func (h *ResortHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.svc.Delete(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resort berhasil dihapus"})
}

// Helper pemetaan error domain ke HTTP status code
func (h *ResortHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrResortNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrResortInvalidID),
		errors.Is(err, domain.ErrResortParentReq),
		errors.Is(err, domain.ErrResortParentInv),
		errors.Is(err, domain.ErrResortParentNotFnd),
		errors.Is(err, domain.ErrResortParentInact),
		errors.Is(err, domain.ErrResortNamaEmpty),
		errors.Is(err, domain.ErrResortKodeEmpty),
		errors.Is(err, domain.ErrResortPendetaEmpty):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrResortKodeDup),
		errors.Is(err, domain.ErrResortNamaDup),
		errors.Is(err, domain.ErrResortHasActive),
		errors.Is(err, domain.ErrResortHasHuria):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
