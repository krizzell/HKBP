import client from './client'

export const runForecastApi = (payload) => client.post('/analytics/forecast', payload)

export const runAnomalyApi = (payload) => client.post('/analytics/anomaly', payload)

export const runCorrelationApi = (payload) => client.post('/analytics/correlation', payload)

export const runDropReportApi = (payload = {}) => client.post('/analytics/drop', payload)
