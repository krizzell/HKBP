package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"HKBP/internal/domain"

	"github.com/gin-gonic/gin"
)

type HuriaHandler struct {
	svc domain.HuriaService
}

// NewHuriaHandler mengembalikan instance handler HTTP untuk resource Huria
func NewHuriaHandler(svc domain.HuriaService) *HuriaHandler {
	return &HuriaHandler{
		svc: svc,
	}
}

func (h *HuriaHandler) GetService() domain.HuriaService {
	return h.svc
}

// GetAll menangani GET /api/huria?idResort=&idDistrik=&page=&limit=&q=&aktif=
func (h *HuriaHandler) GetAll(c *gin.Context) {
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
	idResort := strings.TrimSpace(c.Query("idResort"))
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

	res, err := h.svc.GetAll(c.Request.Context(), domain.HuriaFilter{
		IdResort:  idResort,
		IdDistrik: idDistrik,
		Page:      page,
		Limit:     limit,
		Q:         q,
		Aktif:     aktifPtr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar huria"})
		return
	}

	c.JSON(http.StatusOK, res)
}

// GetByID menangani GET /api/huria/:id
func (h *HuriaHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	doc, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doc})
}

// Create menangani POST /api/huria
func (h *HuriaHandler) Create(c *gin.Context) {
	var req domain.CreateHuriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid, pastikan Kode, Nama, dan IdResort diisi"})
		return
	}

	doc, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    doc,
		"message": "Huria berhasil ditambahkan",
	})
}

// Update menangani PUT /api/huria/:id
func (h *HuriaHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateHuriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data pembaruan tidak valid"})
		return
	}

	doc, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    doc,
		"message": "Huria berhasil diperbarui",
	})
}

// Delete menangani DELETE /api/huria/:id
func (h *HuriaHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.svc.Delete(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Huria berhasil diproses"})
}

// Helper pemetaan error domain ke HTTP status code
func (h *HuriaHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrHuriaNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrHuriaInvalidID),
		errors.Is(err, domain.ErrHuriaParentReq),
		errors.Is(err, domain.ErrHuriaParentInv),
		errors.Is(err, domain.ErrHuriaParentNotFnd),
		errors.Is(err, domain.ErrHuriaParentInact),
		errors.Is(err, domain.ErrHuriaNamaEmpty),
		errors.Is(err, domain.ErrHuriaKodeEmpty),
		errors.Is(err, domain.ErrHuriaJumlahJemaatNeg),
		errors.Is(err, domain.ErrHuriaTahunInv):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrHuriaKodeDup),
		errors.Is(err, domain.ErrHuriaNamaDup),
		errors.Is(err, domain.ErrHuriaHasData):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
