"""Kasus filter kategori yang harus konsisten antara API Drop, Correlation, Forecast."""
import pandas as pd
from app.services.category_match import filter_kategori
from app.services.correlation import analisis_korelasi
from app.services.forecast import prakiraan_pemasukan


def test_kategori_pendek_mencocokkan_nama_panjang():
    data = pd.DataFrame([
        {'namaKategori': 'Pelean Minggu (Ia, Ib, IIa, IIb)', 'nominal': 10},
        {'namaKategori': 'Guguan / Iuran Taon Jemaat', 'nominal': 20},
    ])
    assert filter_kategori(data, 'Pelean Minggu')['nominal'].tolist() == [10]
    assert filter_kategori(data, 'Iuran Taon')['nominal'].tolist() == [20]


def test_korelasi_kategori_tidak_lagi_kosong():
    dates = pd.date_range('2026-01-04', periods=12, freq='7D')
    income = pd.DataFrame({
        'tanggal': dates, 'nominal': [100+i*10 for i in range(12)],
        'namaKategori': ['Pelean Minggu (Ia, Ib, IIa, IIb)']*12,
    })
    attendance = pd.DataFrame({'tanggal': dates, 'jumlahHadir': list(range(80, 92))})
    result = analisis_korelasi(attendance, income, kategori='Pelean Minggu', minimum_periode=8)
    assert result['status'] == 'ok'
    assert result['jumlahPeriode'] == 12


def test_forecast_tidak_mengubah_gap_menjadi_nol():
    dates = [f'2026-{m:02d}-01' for m in range(1, 13) if m != 6]
    data = pd.DataFrame({'tanggal': dates, 'nominal': [100000]*len(dates)})
    result = prakiraan_pemasukan(data, granularitas='bulanan')
    assert result['status'] == 'data_tidak_cukup'
    assert 'tanpa laporan' in result['catatan'][0]


def test_drop_akhir_tidak_mundur_diam_diam_ke_periode_lama():
    from app.services.drop import deteksi_drop_pemasukan
    income = pd.DataFrame({
        'idHuria': ['H1','H1'], 'tanggal': ['2026-10-04','2026-10-11'], 'nominal': [100,80],
        'namaKategori': ['Pelean Minggu','Pelean Minggu'],
    })
    huria = pd.DataFrame({'idHuria':['H1'],'namaHuria':['Contoh']})
    result = deteksi_drop_pemasukan(income, huria, akhir_terpilih='2026-11-08')
    assert result['mingguan']['periodeTerbaru'] == '2026-W45'
    assert result['mingguan']['status'] == 'data_tidak_cukup'
