export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function formatMoney(value) {
  const number = Number(value)
  return `¥${Number.isFinite(number) ? number.toFixed(2) : '0.00'}`
}
