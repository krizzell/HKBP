"""Filter kategori kanonik berbasis nama untuk endpoint analitik.

Kontrak lama dari React mengirim label singkat, sehingga semua engine harus
menerapkan pencocokan yang sama. Untuk jangka panjang gunakan ID kategori.
"""
import pandas as pd

_ALIASES = {
    'iuran taon': ('iuran taon', 'guguan'),
    'pelean lunggu': ('pelean lunggu', 'partangiangan lunggu', 'pelean lingkungan'),
}


def filter_kategori(frame: pd.DataFrame, kategori: str | None) -> pd.DataFrame:
    if not kategori or not kategori.strip():
        return frame
    if frame.empty:
        return frame
    columns = [col for col in ('namaKategori', 'keterangan') if col in frame]
    if not columns:
        return frame.iloc[0:0]
    keyword = kategori.strip().casefold()
    terms = _ALIASES.get(keyword, (keyword,))
    matches = pd.Series(False, index=frame.index)
    for column in columns:
        values = frame[column].fillna('').astype(str).str.casefold()
        for term in terms:
            matches |= values.str.contains(term, regex=False)
    return frame.loc[matches].copy()
