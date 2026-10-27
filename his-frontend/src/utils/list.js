export function setIfChanged(target, next) {
  const serialized = JSON.stringify(next)
  if (JSON.stringify(target.value) === serialized) return false
  target.value = next
  return true
}
