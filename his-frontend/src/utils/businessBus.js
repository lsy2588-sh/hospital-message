const CHANNEL_NAME = 'his-business-events'

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

export function emitBusinessEvent(type, payload = {}) {
  if (!channel) return
  try {
    channel.postMessage({ type, payload, at: Date.now() })
  } catch {
    // ignore postMessage failures (e.g. channel closed)
  }
}

export function onBusinessEvent(handler) {
  if (!channel) return () => {}
  const listener = (event) => handler(event.data)
  channel.addEventListener('message', listener)
  return () => channel.removeEventListener('message', listener)
}
