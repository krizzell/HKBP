const hasNumericValue = (row, key) => row?.[key] !== null && row?.[key] !== '' && Number.isFinite(Number(row?.[key]))

export const getAvailableChartTypeIds = ({
  chartData = [],
  series = [],
  hasGeographicData = false,
}) => {
  const hasCategoricalData = chartData.some((row) => typeof row?.label === 'string' && row.label.length > 0)
  const hasTimeSeries = chartData.length > 1
  const hasMultipleSeries = series.length > 1
  const hasNumericData = chartData.some((row) => {
    if (series.length === 0) return hasNumericValue(row, 'value')
    return series.some((item) => hasNumericValue(row, item.key))
  })

  if (!hasCategoricalData || !hasNumericData) return []

  const ids = ['bar', 'horizontal-bar', 'pie', 'histogram', 'box-plot']

  if (hasTimeSeries) {
    ids.unshift('line', 'area')
  }
  if (hasMultipleSeries) {
    ids.push('stacked-bar', 'heatmap', 'treemap')
  } else {
    ids.push('treemap')
  }
  if (hasGeographicData) ids.push('map')

  return ids
}
