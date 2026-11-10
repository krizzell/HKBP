import { describe, expect, it } from 'vitest'
import { dedupeOrganisasiOptions, extractOptionsFromWilayahData } from './organisasiApi'

describe('organisasi option deduplication', () => {
  it('deduplicates the same Huria when API IDs differ but parent and name match', () => {
    const options = dedupeOrganisasiOptions([
      { id: 'mongo-1', nama: 'HKBP Sudirman Jakarta', idInduk: 'R-1' },
      { id: 'legacy-1', nama: ' hkbp sudirman jakarta ', idInduk: 'R-1' },
    ], 'huria')

    expect(options).toHaveLength(1)
    expect(options[0].id).toBe('mongo-1')
  })

  it('does not merge same-named Huria from different Resorts', () => {
    const options = dedupeOrganisasiOptions([
      { id: 'h-1', nama: 'HKBP Pardomuan', idInduk: 'R-1' },
      { id: 'h-2', nama: 'HKBP Pardomuan', idInduk: 'R-2' },
    ], 'huria')

    expect(options).toHaveLength(2)
  })

  it('deduplicates repeated Huria in live hierarchy data', () => {
    const result = extractOptionsFromWilayahData([{
      Pusat: {
        Distrik: [{
          IdDistrik: 'D-1',
          NamaDistrik: 'Distrik',
          Resort: [{
            IdResort: 'R-1',
            NamaResort: 'Resort',
            Huria: [
              { IdHuria: 'h-1', NamaHuria: 'HKBP Contoh' },
              { IdHuria: 'h-2', NamaHuria: 'HKBP Contoh' },
            ],
          }],
        }],
      },
    }])

    expect(result.huria).toHaveLength(1)
  })
})
