package handler

import (
	"HKBP/internal/domain"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type WilayahHandler struct {
	svc  domain.WilayahService
	repo domain.WilayahRepository
}

func NewWilayahHandler(svc domain.WilayahService, repo domain.WilayahRepository) *WilayahHandler {
	return &WilayahHandler{svc: svc, repo: repo}
}

// getCurrentUser mengambil metadata pengguna dari header request atau token otentikasi
func (h *WilayahHandler) getCurrentUser(c *gin.Context) *domain.User {
	role := c.GetHeader("X-User-Role")
	email := c.GetHeader("X-User-Email")
	idHuria := c.GetHeader("X-User-Huria")

	if role == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.Contains(authHeader, "superadmin") || strings.Contains(authHeader, "pusat") {
			role = "SuperAdmin"
			email = "pusat@hkbp.or.id"
		} else if strings.Contains(authHeader, "pearaja") || strings.Contains(authHeader, "2111") {
			role = "Admin"
			email = "admin.pearaja@hkbp.or.id"
			idHuria = "H-2.1.1"
		} else if strings.Contains(authHeader, "1111") || strings.Contains(authHeader, "sudirman") || strings.Contains(authHeader, "admin") {
			role = "Admin"
			email = "admin.sudirman@hkbp.or.id"
			idHuria = "H-1.1.1"
		}
	}

	if email != "" {
		u, err := h.repo.FindUserByEmail(c.Request.Context(), email)
		if err == nil && u != nil {
			return u
		}
	}

	if role != "" {
		return &domain.User{
			Role:    role,
			Email:   email,
			IdHuria: idHuria,
		}
	}

	return nil
}

func (h *WilayahHandler) getHuriaID(c *gin.Context) string {
	id := c.Param("id")
	if id != "" {
		return id
	}
	return c.Param("idHuria")
}

func (h *WilayahHandler) GetAll(c *gin.Context) {
	currentUser := h.getCurrentUser(c)
	data, err := h.svc.GetAll(c.Request.Context(), currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}


func (h *WilayahHandler) SyncTree(c *gin.Context) {
	if err := h.repo.SyncTree(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal sinkronisasi pohon wilayah: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pohon wilayah berhasil disinkronisasi"})
}

func (h *WilayahHandler) ResetSeeder(c *gin.Context) {
	if err := h.svc.ResetSeeder(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mereset data: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data operasional HKBP berhasil direset ke nilai awal"})
}

func (h *WilayahHandler) GetHuria(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	huria, err := h.svc.GetHuria(c.Request.Context(), idHuria)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": huria})
}

func (h *WilayahHandler) UpdateHuria(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var req domain.Huria
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateHuria(c.Request.Context(), idHuria, req, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data Huria berhasil diperbarui"})
}

// -------------------------------------------------------------
// OPERASIONAL TRANSAKSI & PEMASUKAN
// -------------------------------------------------------------

func (h *WilayahHandler) AddPemasukan(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var body struct {
		Pemasukan           domain.PemasukanJemaat `json:"pemasukan"`
		AlokasiPusatPercent float64                `json:"alokasiPusatPercent"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddPemasukan(c.Request.Context(), idHuria, body.Pemasukan, body.AlokasiPusatPercent, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Pemasukan jemaat berhasil dicatat"})
}

func (h *WilayahHandler) UpdatePemasukan(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idTransaksi := c.Param("idTransaksi")
	currentUser := h.getCurrentUser(c)

	var item domain.PemasukanJemaat
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdatePemasukan(c.Request.Context(), idHuria, idTransaksi, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pemasukan berhasil diperbarui"})
}

func (h *WilayahHandler) DeletePemasukan(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idTransaksi := c.Param("idTransaksi")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeletePemasukan(c.Request.Context(), idHuria, idTransaksi, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pemasukan berhasil dihapus"})
}

// -------------------------------------------------------------
// SESI IBADAH
// -------------------------------------------------------------

func (h *WilayahHandler) AddSesiIbadah(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var item domain.SesiIbadah
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddSesiIbadah(c.Request.Context(), idHuria, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Sesi ibadah berhasil ditambahkan"})
}

func (h *WilayahHandler) UpdateSesiIbadah(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idSesi := c.Param("idSesi")
	currentUser := h.getCurrentUser(c)

	var item domain.SesiIbadah
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateSesiIbadah(c.Request.Context(), idHuria, idSesi, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sesi ibadah berhasil diperbarui"})
}

func (h *WilayahHandler) DeleteSesiIbadah(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idSesi := c.Param("idSesi")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeleteSesiIbadah(c.Request.Context(), idHuria, idSesi, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sesi ibadah berhasil dihapus"})
}

// -------------------------------------------------------------
// ALOKASI TRANSAKSI
// -------------------------------------------------------------

func (h *WilayahHandler) AddAlokasi(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var item domain.AlokasiTransaksi
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddAlokasi(c.Request.Context(), idHuria, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Alokasi anggaran berhasil ditambahkan"})
}

func (h *WilayahHandler) UpdateAlokasi(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idAlokasi := c.Param("idAlokasi")
	currentUser := h.getCurrentUser(c)

	var item domain.AlokasiTransaksi
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateAlokasi(c.Request.Context(), idHuria, idAlokasi, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alokasi anggaran berhasil diperbarui"})
}

func (h *WilayahHandler) DeleteAlokasi(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idAlokasi := c.Param("idAlokasi")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeleteAlokasi(c.Request.Context(), idHuria, idAlokasi, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alokasi anggaran berhasil dihapus"})
}

// -------------------------------------------------------------
// SETORAN PUSAT
// -------------------------------------------------------------

func (h *WilayahHandler) AddSetoranPusat(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var body struct {
		Setoran domain.SetoranPusat          `json:"setoran"`
		Rincian []domain.RincianSetoranPusat `json:"rincian"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddSetoranPusat(c.Request.Context(), idHuria, body.Setoran, body.Rincian, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Setoran pusat berhasil dicatat"})
}

func (h *WilayahHandler) UpdateSetoranPusat(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idSetoran := c.Param("idSetoran")
	currentUser := h.getCurrentUser(c)

	var item domain.SetoranPusat
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateSetoranPusat(c.Request.Context(), idHuria, idSetoran, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Setoran pusat berhasil diperbarui"})
}

func (h *WilayahHandler) DeleteSetoranPusat(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idSetoran := c.Param("idSetoran")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeleteSetoranPusat(c.Request.Context(), idHuria, idSetoran, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Setoran pusat berhasil dihapus"})
}

// -------------------------------------------------------------
// KATEGORI PEMASUKAN
// -------------------------------------------------------------

func (h *WilayahHandler) AddKategori(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var item domain.KategoriPemasukan
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddKategori(c.Request.Context(), idHuria, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Kategori pemasukan berhasil ditambahkan"})
}

func (h *WilayahHandler) UpdateKategori(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idKategori := c.Param("idKategori")
	currentUser := h.getCurrentUser(c)

	var item domain.KategoriPemasukan
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateKategori(c.Request.Context(), idHuria, idKategori, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kategori pemasukan berhasil diperbarui"})
}

func (h *WilayahHandler) DeleteKategori(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idKategori := c.Param("idKategori")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeleteKategori(c.Request.Context(), idHuria, idKategori, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kategori pemasukan berhasil dihapus"})
}

// -------------------------------------------------------------
// LUNGGU
// -------------------------------------------------------------

func (h *WilayahHandler) AddLunggu(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var item domain.Lunggu
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.AddLunggu(c.Request.Context(), idHuria, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Lunggu berhasil ditambahkan"})
}

func (h *WilayahHandler) UpdateLunggu(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idLunggu := c.Param("idLunggu")
	currentUser := h.getCurrentUser(c)

	var item domain.Lunggu
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateLunggu(c.Request.Context(), idHuria, idLunggu, item, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lunggu berhasil diperbarui"})
}

func (h *WilayahHandler) DeleteLunggu(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	idLunggu := c.Param("idLunggu")
	currentUser := h.getCurrentUser(c)

	if err := h.svc.DeleteLunggu(c.Request.Context(), idHuria, idLunggu, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lunggu berhasil dihapus"})
}

// -------------------------------------------------------------
// WARTA JEMAAT
// -------------------------------------------------------------

func (h *WilayahHandler) UpdateWarta(c *gin.Context) {
	idHuria := h.getHuriaID(c)
	currentUser := h.getCurrentUser(c)

	var warta domain.WartaJemaat
	if err := c.ShouldBindJSON(&warta); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid: " + err.Error()})
		return
	}

	if err := h.svc.UpdateWarta(c.Request.Context(), idHuria, warta, currentUser); err != nil {
		if strings.Contains(err.Error(), "Akses ditolak") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Warta jemaat berhasil diperbarui"})
}
