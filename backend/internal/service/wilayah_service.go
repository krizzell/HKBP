package service

import (
	"HKBP/internal/domain"
	"HKBP/internal/seeder"
	"context"
	"errors"
	"fmt"
	"math"
	"os"
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
	if os.Getenv("HKBP_ALLOW_DEMO_RESET") != "YES_I_HAVE_A_BACKUP" {
		return errors.New("reset seeder dinonaktifkan demi keselamatan data; gunakan backup dan HKBP_ALLOW_DEMO_RESET secara eksplisit")
	}
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

	if item.Nominal <= 0 {
		return errors.New("nominal pemasukan harus lebih dari nol")
	}
	if item.IdKategori == "" || !hasKategori(h, item.IdKategori) {
		return errors.New("kategori pemasukan tidak terdaftar di Huria")
	}
	if item.IdTransaksi == "" {
		item.IdTransaksi = fmt.Sprintf("TRX-%s-%d", idHuria, time.Now().UnixNano())
	}
	for _, old := range h.PemasukanJemaat {
		if old.IdTransaksi == item.IdTransaksi {
			return errors.New("ID transaksi sudah digunakan")
		}
	}
	if item.Tanggal == "" {
		item.Tanggal = time.Now().Format("2006-01-02")
	}

	if !validTanggal(item.Tanggal) {
		return errors.New("tanggal pemasukan wajib YYYY-MM-DD dan valid")
	}
	h.PemasukanJemaat = append(h.PemasukanJemaat, item)

	// Hitung alokasi otomatis jika nominal > 0
	if item.Nominal > 0 {
		if alokasiPusatPercent <= 0 || alokasiPusatPercent > 1.0 {
			alokasiPusatPercent = 0.55
		}
		nominalPusat := int64(math.Round(float64(item.Nominal) * alokasiPusatPercent))
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
	if item.Nominal <= 0 || !validTanggal(item.Tanggal) || !hasKategori(h, item.IdKategori) {
		return errors.New("nominal, tanggal atau kategori pemasukan tidak valid")
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
		return errors.New("transaksi pemasukan tidak ditemukan")
	}
	// Pertahankan rasio alokasi historis, tetapi hitung ulang nominalnya.
	var pusatIdx, kasIdx = -1, -1
	var oldTotal, oldPusat int64
	for i, a := range h.AlokasiTransaksi {
		if a.IdTransaksi != idTransaksi {
			continue
		}
		oldTotal += a.Nominal
		if a.Peruntukan == "Setoran Pusat" {
			pusatIdx = i
			oldPusat += a.Nominal
		} else if a.Peruntukan == "Kas Huria" {
			kasIdx = i
		}
	}
	if pusatIdx < 0 || kasIdx < 0 {
		return errors.New("alokasi transaksi tidak lengkap; perbaiki alokasi dahulu sebelum mengedit pemasukan")
	}
	if oldTotal <= 0 {
		return errors.New("total alokasi lama tidak valid")
	}
	percent := float64(oldPusat) / float64(oldTotal)
	newPusat := int64(math.Round(float64(item.Nominal) * percent))
	newKas := item.Nominal - newPusat
	if paidForAllocation(h, h.AlokasiTransaksi[pusatIdx].IdAlokasi) > newPusat {
		return errors.New("nominal pusat tidak boleh lebih kecil dari yang sudah dilunasi")
	}
	h.AlokasiTransaksi[pusatIdx].Nominal = newPusat
	h.AlokasiTransaksi[kasIdx].Nominal = newKas
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
	exists := false
	alokIDs := map[string]bool{}
	for _, p := range h.PemasukanJemaat {
		if p.IdTransaksi == idTransaksi {
			exists = true
		}
	}
	if !exists {
		return errors.New("transaksi pemasukan tidak ditemukan")
	}
	for _, a := range h.AlokasiTransaksi {
		if a.IdTransaksi == idTransaksi {
			alokIDs[a.IdAlokasi] = true
		}
	}
	for _, r := range h.RincianSetoranPusat {
		if alokIDs[r.IdAlokasi] {
			return errors.New("transaksi sudah memiliki pelunasan; batalkan setoran terkait sebelum menghapus")
		}
	}
	newPem := make([]domain.PemasukanJemaat, 0, len(h.PemasukanJemaat))
	for _, p := range h.PemasukanJemaat {
		if p.IdTransaksi != idTransaksi {
			newPem = append(newPem, p)
		}
	}
	newAlok := make([]domain.AlokasiTransaksi, 0, len(h.AlokasiTransaksi))
	for _, a := range h.AlokasiTransaksi {
		if a.IdTransaksi != idTransaksi {
			newAlok = append(newAlok, a)
		}
	}
	h.PemasukanJemaat = newPem
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

	if !validTanggal(item.Tanggal) || item.JumlahHadir < 0 {
		return errors.New("tanggal sesi atau jumlah hadir tidak valid")
	}
	for _, p := range item.Pelean {
		if p.Nominal < 0 {
			return errors.New("nominal pelean tidak boleh negatif")
		}
	}
	if item.IdSesi == "" {
		item.IdSesi = fmt.Sprintf("SESI-%s-%d", idHuria, time.Now().UnixNano())
	}
	for _, old := range h.SesiIbadah {
		if old.IdSesi == item.IdSesi {
			return errors.New("ID sesi sudah digunakan")
		}
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
	if !validTanggal(item.Tanggal) || item.JumlahHadir < 0 {
		return errors.New("tanggal sesi atau jumlah hadir tidak valid")
	}
	for _, p := range item.Pelean {
		if p.Nominal < 0 {
			return errors.New("nominal pelean tidak boleh negatif")
		}
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
	for _, a := range h.AlokasiTransaksi {
		if a.IdAlokasi == item.IdAlokasi {
			return errors.New("ID alokasi sudah digunakan")
		}
	}
	if item.Nominal <= 0 {
		return errors.New("nominal alokasi harus positif")
	}
	if item.Peruntukan != "Setoran Pusat" && item.Peruntukan != "Kas Huria" {
		return errors.New("peruntukan alokasi tidak dikenal")
	}
	nominal, exists := nominalTransaksi(h, item.IdTransaksi)
	if !exists {
		return errors.New("transaksi sumber alokasi tidak ditemukan")
	}
	if allocatedForTransaction(h, item.IdTransaksi)+item.Nominal > nominal {
		return errors.New("total alokasi melampaui nominal transaksi")
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
	if item.Nominal <= 0 {
		return errors.New("nominal alokasi harus positif")
	}
	if item.Peruntukan != "Setoran Pusat" && item.Peruntukan != "Kas Huria" {
		return errors.New("peruntukan alokasi tidak dikenal")
	}
	for i, a := range h.AlokasiTransaksi {
		if a.IdAlokasi != idAlokasi {
			continue
		}
		if item.IdTransaksi != a.IdTransaksi || item.Peruntukan != a.Peruntukan {
			return errors.New("transaksi dan peruntukan alokasi yang sudah ada tidak boleh dipindahkan")
		}
		if paidForAllocation(h, idAlokasi) > item.Nominal {
			return errors.New("alokasi tidak boleh lebih kecil dari pembayaran yang sudah masuk")
		}
		nominal, found := nominalTransaksi(h, a.IdTransaksi)
		if !found {
			return errors.New("transaksi sumber tidak ditemukan")
		}
		other := allocatedForTransaction(h, a.IdTransaksi) - a.Nominal
		if other+item.Nominal > nominal {
			return errors.New("total alokasi baru melebihi nominal pemasukan")
		}
		item.IdAlokasi = idAlokasi
		h.AlokasiTransaksi[i] = item
		return s.repo.UpdateHuria(ctx, idHuria, *h)
	}
	return errors.New("alokasi transaksi tidak ditemukan")
}

func (s *wilayahService) DeleteAlokasi(ctx context.Context, idHuria string, idAlokasi string, currentUser *domain.User) error {
	if err := s.validateAdminAccess(currentUser, idHuria); err != nil {
		return err
	}
	h, err := s.repo.FindHuria(ctx, idHuria)
	if err != nil {
		return err
	}
	if paidForAllocation(h, idAlokasi) > 0 {
		return errors.New("alokasi sudah mempunyai pelunasan dan tidak boleh dihapus")
	}
	found := false
	target := domain.AlokasiTransaksi{}
	rest := make([]domain.AlokasiTransaksi, 0, len(h.AlokasiTransaksi))
	for _, a := range h.AlokasiTransaksi {
		if a.IdAlokasi == idAlokasi {
			target = a
			found = true
		} else {
			rest = append(rest, a)
		}
	}
	if !found {
		return errors.New("alokasi tidak ditemukan")
	}
	if nominal, ok := nominalTransaksi(h, target.IdTransaksi); ok {
		remaining := allocatedForTransaction(h, target.IdTransaksi) - target.Nominal
		if remaining != 0 && remaining != nominal {
			return errors.New("hapus alokasi akan membuat pembagian transaksi tidak seimbang; ubah transaksi sumber terlebih dahulu")
		}
	}
	h.AlokasiTransaksi = rest
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
	for _, p := range h.SetoranPusat {
		if p.IdSetoran == item.IdSetoran {
			return errors.New("ID setoran sudah ada")
		}
	}
	if item.TanggalSetor == "" {
		item.TanggalSetor = time.Now().Format("2006-01-02")
	}
	if !validTanggal(item.TanggalSetor) {
		return errors.New("tanggal setoran tidak valid")
	}
	if item.Periode == "" {
		item.Periode = item.TanggalSetor[:7]
	}
	if len(item.Periode) != 7 || item.Periode[4] != '-' {
		return errors.New("periode setoran wajib YYYY-MM")
	}
	if len(rincian) == 0 {
		return errors.New("setoran harus mempunyai minimal satu rincian pelunasan")
	}
	allocationMap := map[string]domain.AlokasiTransaksi{}
	for _, a := range h.AlokasiTransaksi {
		allocationMap[a.IdAlokasi] = a
	}
	total := int64(0)
	newPaid := map[string]int64{}
	for i := range rincian {
		r := &rincian[i]
		a, ok := allocationMap[r.IdAlokasi]
		if !ok || a.Peruntukan != "Setoran Pusat" {
			return fmt.Errorf("IdAlokasi %s bukan kewajiban Setoran Pusat yang valid", r.IdAlokasi)
		}
		if r.NominalDilunasi <= 0 {
			return errors.New("nominal rincian pelunasan harus positif")
		}
		newPaid[r.IdAlokasi] += r.NominalDilunasi
		r.IdSetoran = item.IdSetoran
		if r.IdRincian == "" {
			r.IdRincian = fmt.Sprintf("RINC-%d-%d", time.Now().UnixNano(), i)
		}
		total += r.NominalDilunasi
	}
	for id, amount := range newPaid {
		if paidForAllocation(h, id)+amount > allocationMap[id].Nominal {
			return fmt.Errorf("pelunasan alokasi %s melebihi kewajiban", id)
		}
	}
	if item.TotalSetoran != 0 && item.TotalSetoran != total {
		return errors.New("total setoran tidak sama dengan jumlah rincian")
	}
	item.TotalSetoran = total
	h.RincianSetoranPusat = append(h.RincianSetoranPusat, rincian...)
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
	if !validTanggal(item.TanggalSetor) {
		return errors.New("tanggal setoran tidak valid")
	}
	var total int64
	for _, r := range h.RincianSetoranPusat {
		if r.IdSetoran == idSetoran {
			total += r.NominalDilunasi
		}
	}
	if item.TotalSetoran != total {
		return errors.New("total setoran tidak sama dengan total rincian; edit rincian terlebih dahulu")
	}
	for i, sp := range h.SetoranPusat {
		if sp.IdSetoran == idSetoran {
			item.IdSetoran = idSetoran
			h.SetoranPusat[i] = item
			return s.repo.UpdateHuria(ctx, idHuria, *h)
		}
	}
	return errors.New("data setoran pusat tidak ditemukan")
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
		item.IdKategori = fmt.Sprintf("KAT-%s-%d", idHuria, time.Now().UnixNano())
	}
	for _, k := range h.KategoriPemasukan {
		if k.IdKategori == item.IdKategori {
			return errors.New("ID kategori sudah digunakan")
		}
	}
	if item.IdKategoriInduk != "" && !hasKategori(h, item.IdKategoriInduk) {
		return errors.New("kategori induk tidak ditemukan")
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

	for _, t := range h.PemasukanJemaat {
		if t.IdKategori == idKategori {
			return errors.New("kategori masih digunakan transaksi pemasukan")
		}
	}
	for _, k := range h.KategoriPemasukan {
		if k.IdKategoriInduk == idKategori {
			return errors.New("kategori masih memiliki kategori anak")
		}
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
		item.IdLunggu = fmt.Sprintf("L-%s-%d", idHuria, time.Now().UnixNano())
	}
	for _, l := range h.Lunggu {
		if l.IdLunggu == item.IdLunggu {
			return errors.New("ID Lunggu sudah digunakan")
		}
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

func validTanggal(value string) bool {
	if len(value) != 10 {
		return false
	}
	parsed, err := time.Parse("2006-01-02", value)
	return err == nil && parsed.Format("2006-01-02") == value
}

func hasKategori(h *domain.Huria, id string) bool {
	for _, k := range h.KategoriPemasukan {
		if k.IdKategori == id {
			return true
		}
	}
	return false
}

func paidForAllocation(h *domain.Huria, id string) int64 {
	var total int64
	for _, r := range h.RincianSetoranPusat {
		if r.IdAlokasi == id {
			total += r.NominalDilunasi
		}
	}
	return total
}

func nominalTransaksi(h *domain.Huria, id string) (int64, bool) {
	for _, p := range h.PemasukanJemaat {
		if p.IdTransaksi == id {
			return p.Nominal, true
		}
	}
	return 0, false
}
func allocatedForTransaction(h *domain.Huria, id string) int64 {
	var sum int64
	for _, a := range h.AlokasiTransaksi {
		if a.IdTransaksi == id {
			sum += a.Nominal
		}
	}
	return sum
}
