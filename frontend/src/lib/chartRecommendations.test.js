import { describe, expect, it } from 'vitest'
import { getAvailableChartTypeIds } from './chartRecommendations'

const rows = [
  { label: 'Jan', distrikA: 10, distrikB: 20 },
  { label: 'Feb', distrikA: 15, distrikB: 25 },
]

describe('getAvailableChartTypeIds', () => {
  it('recommends chart types supported by categorical time-series data', () => {
    const ids = getAvailableChartTypeIds({
      chartData: rows,
      isTimeSeries: true,
      series: [
        { key: 'distrikA', label: 'Distrik A' },
        { key: 'distrikB', label: 'Distrik B' },
      ],
    })

    expect(ids).toEqual([
      'line',
      'area',
      'bar',
      'horizontal-bar',
      'pie',
      'histogram',
      'box-plot',
      'stacked-bar',
      'heatmap',
      'treemap',
    ])
  })

  it('does not recommend geographic charts without geographic data', () => {
    const ids = getAvailableChartTypeIds({ chartData: rows, series: [{ key: 'value' }] })

    expect(ids).not.toContain('map')
  })

  it('returns no chart types when the dataset has no usable values', () => {
    expect(getAvailableChartTypeIds({ chartData: [{ label: 'Jan', value: null }] })).toEqual([])
  })
})
