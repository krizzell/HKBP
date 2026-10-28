package service

import (
	"HKBP/internal/domain"
	"HKBP/internal/seeder"
	"context"
	"errors"
	"fmt"
	"time"
)

type wilayahService struct {
	repo domain.WilayahRepository
}

func NewWilayahService(repo domain.WilayahRepository) domain.WilayahService {
	return &wilayahService{repo: repo}
}

func (s *wilayahService) GetAll(ctx context.Context, currentUser *domain.User) ([]domain.Wilayah, error) {
	// Mengembalikan seluruh struktur hierarki wilayah agar pengguna (termasuk Admin)
	// dapat melihat informasi semua wilayah dan huria di HKBP.
	// Hak kelola / mutasi data tetap dibatasi secara ketat oleh validateAdminAccess.
	return s.repo.FindAll(ctx)
}

func (s *wilayahService) ResetSeeder(ctx context.Context) error {
	fresh, err := seeder.GenerateSeedData("wilayah.json")
	if err != nil {
		return err
	}
	return s.repo.SaveAll(ctx, fresh)
}

func (s *wilayahService) GetHuria(ctx context.Context, idHuria string) (*domain.Huria, error) {
	return s.repo.FindHuria(ctx, idHuria)
}

func (s *wilayahService) UpdateHuria(ctx context.Context, idHuria string, updated domain.Huria, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}
	return s.repo.UpdateHuria(ctx, idHuria, updated)
}

func (s *wilayahService) validateAdminAccess(currentUser *domain.User, idHuria string) error {
	if currentUser == nil {
		return errors.New("Unauthorized")
	}
	if currentUser.Role == "SuperAdmin" {
		return nil
	}
	if currentUser.Role == "Admin" {
		if currentUser.IdHuria == idHuria || currentUser.NamaHuria == idHuria {
			return nil
		}
		return fmt.Errorf("Akses ditolak: Admin hanya memiliki otoritas pada Huria %s", currentUser.NamaHuria)
	}
	return errors.New("Forbidden")
}

// -------------------------------------------------------------
// OPERASIONAL & KEUANGAN HURIA (SUB-CRUD)
// -------------------------------------------------------------

func (s *wilayahService) AddPemasukan(ctx context.Context, idHuria string, item domain.PemasukanJemaat, alokasiPusatPercent float64, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdTransaksi == "" {
		item.IdTransaksi = fmt.Sprintf("TRX-%s-%d", idHuria, time.Now().UnixNano())
	}
	if item.Tanggal == "" {
		item.Tanggal = time.Now().Format("2006-01-02")
	}

	h.PemasukanJemaat = append(h.PemasukanJemaat, item)

	// Hitung alokasi otomatis jika nominal > 0
	if item.Nominal > 0 {
		if alokasiPusatPercent <= 0 || alokasiPusatPercent > 1.0 {
			alokasiPusatPercent = 0.55
		}
		nominalPusat := int64(float64(item.Nominal) * alokasiPusatPercent)
		nominalHuria := item.Nominal - nominalPusat

		alokasiPusat := domain.AlokasiTransaksi{
			IdAlokasi:   fmt.Sprintf("ALOK-%d-PUSAT", time.Now().UnixNano()),
			IdTransaksi: item.IdTransaksi,
			Peruntukan:  "Setoran Pusat",
			Nominal:     nominalPusat,
		}
		alokasiHuria := domain.AlokasiTransaksi{
			IdAlokasi:   fmt.Sprintf("ALOK-%d-HURIA", time.Now().UnixNano()),
			IdTransaksi: item.IdTransaksi,
			Peruntukan:  "Kas Huria",
			Nominal:     nominalHuria,
		}

		h.AlokasiTransaksi = append(h.AlokasiTransaksi, alokasiPusat, alokasiHuria)
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdatePemasukan(ctx context.Context, idHuria string, idTransaksi string, item domain.PemasukanJemaat, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, p := range h.PemasukanJemaat {
		if p.IdTransaksi == idTransaksi {
			item.IdTransaksi = idTransaksi
			h.PemasukanJemaat[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Transaksi pemasukan tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeletePemasukan(ctx context.Context, idHuria string, idTransaksi string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newPem := []domain.PemasukanJemaat{}
	for _, p := range h.PemasukanJemaat {
		if p.IdTransaksi != idTransaksi {
			newPem = append(newPem, p)
		}
	}
	h.PemasukanJemaat = newPem

	// Hapus alokasi transaksi terkait
	newAlok := []domain.AlokasiTransaksi{}
	for _, a := range h.AlokasiTransaksi {
		if a.IdTransaksi != idTransaksi {
			newAlok = append(newAlok, a)
		}
	}
	h.AlokasiTransaksi = newAlok

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) AddSesiIbadah(ctx context.Context, idHuria string, item domain.SesiIbadah, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdSesi == "" {
		item.IdSesi = fmt.Sprintf("SESI-%s-%d", idHuria, len(h.SesiIbadah)+1)
	}
	h.SesiIbadah = append(h.SesiIbadah, item)

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateSesiIbadah(ctx context.Context, idHuria string, idSesi string, item domain.SesiIbadah, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, sItem := range h.SesiIbadah {
		if sItem.IdSesi == idSesi {
			item.IdSesi = idSesi
			h.SesiIbadah[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Sesi ibadah tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeleteSesiIbadah(ctx context.Context, idHuria string, idSesi string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newSesi := []domain.SesiIbadah{}
	for _, sItem := range h.SesiIbadah {
		if sItem.IdSesi != idSesi {
			newSesi = append(newSesi, sItem)
		}
	}
	h.SesiIbadah = newSesi

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) AddAlokasi(ctx context.Context, idHuria string, item domain.AlokasiTransaksi, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdAlokasi == "" {
		item.IdAlokasi = fmt.Sprintf("ALOK-%d", time.Now().UnixNano())
	}
	if item.Peruntukan == "" || item.Peruntukan != "Setoran Pusat" {
		item.Peruntukan = "Kas Huria"
	}
	h.AlokasiTransaksi = append(h.AlokasiTransaksi, item)

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateAlokasi(ctx context.Context, idHuria string, idAlokasi string, item domain.AlokasiTransaksi, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, a := range h.AlokasiTransaksi {
		if a.IdAlokasi == idAlokasi {
			item.IdAlokasi = idAlokasi
			if item.Peruntukan != "Setoran Pusat" {
				item.Peruntukan = "Kas Huria"
			}
			h.AlokasiTransaksi[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Alokasi transaksi tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeleteAlokasi(ctx context.Context, idHuria string, idAlokasi string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newAlok := []domain.AlokasiTransaksi{}
	for _, a := range h.AlokasiTransaksi {
		if a.IdAlokasi != idAlokasi {
			newAlok = append(newAlok, a)
		}
	}
	h.AlokasiTransaksi = newAlok

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) AddSetoranPusat(ctx context.Context, idHuria string, item domain.SetoranPusat, rincian []domain.RincianSetoranPusat, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdSetoran == "" {
		item.IdSetoran = fmt.Sprintf("SETOR-%s-%d", idHuria, time.Now().UnixNano())
	}
	if item.TanggalSetor == "" {
		item.TanggalSetor = time.Now().Format("2006-01-02")
	}

	var totalSetoran int64
	for _, r := range rincian {
		r.IdSetoran = item.IdSetoran
		if r.IdRincian == "" {
			r.IdRincian = fmt.Sprintf("RINC-%d", time.Now().UnixNano())
		}
		totalSetoran += r.NominalDilunasi
		h.RincianSetoranPusat = append(h.RincianSetoranPusat, r)
	}

	if item.TotalSetoran == 0 {
		item.TotalSetoran = totalSetoran
	}

	h.SetoranPusat = append(h.SetoranPusat, item)

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateSetoranPusat(ctx context.Context, idHuria string, idSetoran string, item domain.SetoranPusat, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, sp := range h.SetoranPusat {
		if sp.IdSetoran == idSetoran {
			item.IdSetoran = idSetoran
			h.SetoranPusat[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Data setoran pusat tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeleteSetoranPusat(ctx context.Context, idHuria string, idSetoran string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newSetor := []domain.SetoranPusat{}
	for _, sp := range h.SetoranPusat {
		if sp.IdSetoran != idSetoran {
			newSetor = append(newSetor, sp)
		}
	}
	h.SetoranPusat = newSetor

	newRinc := []domain.RincianSetoranPusat{}
	for _, r := range h.RincianSetoranPusat {
		if r.IdSetoran != idSetoran {
			newRinc = append(newRinc, r)
		}
	}
	h.RincianSetoranPusat = newRinc

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) AddKategori(ctx context.Context, idHuria string, item domain.KategoriPemasukan, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdKategori == "" {
		item.IdKategori = fmt.Sprintf("KAT-%s-%d", idHuria, len(h.KategoriPemasukan)+1)
	}
	h.KategoriPemasukan = append(h.KategoriPemasukan, item)

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateKategori(ctx context.Context, idHuria string, idKategori string, item domain.KategoriPemasukan, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, k := range h.KategoriPemasukan {
		if k.IdKategori == idKategori {
			item.IdKategori = idKategori
			h.KategoriPemasukan[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Kategori pemasukan tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeleteKategori(ctx context.Context, idHuria string, idKategori string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newKat := []domain.KategoriPemasukan{}
	for _, k := range h.KategoriPemasukan {
		if k.IdKategori != idKategori {
			newKat = append(newKat, k)
		}
	}
	h.KategoriPemasukan = newKat

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) AddLunggu(ctx context.Context, idHuria string, item domain.Lunggu, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	if item.IdLunggu == "" {
		item.IdLunggu = fmt.Sprintf("L-%s-%d", idHuria, len(h.Lunggu)+1)
	}
	h.Lunggu = append(h.Lunggu, item)

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateLunggu(ctx context.Context, idHuria string, idLunggu string, item domain.Lunggu, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	found := false
	for i, l := range h.Lunggu {
		if l.IdLunggu == idLunggu {
			item.IdLunggu = idLunggu
			h.Lunggu[i] = item
			found = true
			break
		}
	}
	if !found {
		return errors.New("Data lunggu tidak ditemukan")
	}

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) DeleteLunggu(ctx context.Context, idHuria string, idLunggu string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	newLunggu := []domain.Lunggu{}
	for _, l := range h.Lunggu {
		if l.IdLunggu != idLunggu {
			newLunggu = append(newLunggu, l)
		}
	}
	h.Lunggu = newLunggu

	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) UpdateWarta(ctx context.Context, idHuria string, warta domain.WartaJemaat, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}

	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}

	h.WartaJemaat = warta
	return s.repo.UpdateHuria(ctx, idHuria, *h)
}

func (s *wilayahService) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	u, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err != nil || u == nil {
		return nil, errors.New("Email atau password salah")
	}

	if u.Password != req.Password {
		return nil, errors.New("Email atau password salah")
	}

	token := fmt.Sprintf("jwt-hkbp-%s-%d", u.Role, time.Now().Unix())
	return &domain.LoginResponse{
		Token: token,
		User:  *u,
	}, nil
}
