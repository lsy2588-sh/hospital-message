import { onBeforeUnmount, onMounted } from 'vue'
import { onBusinessEvent } from '@/utils/businessBus'

export function useAutoRefresh(task, { interval = 5000 } = {}) {
  let timer = null
  let running = false
  let disposed = false
  let offBusiness = null

  async function run() {
    if (disposed || running) return
    if (typeof document !== 'undefined' && document.hidden) return
    running = true
    try {
      await task()
    } catch {
      // task handles its own error reporting
    } finally {
      running = false
    }
  }

  function onVisible() {
    if (!document.hidden) run()
  }

  function onFocus() {
    run()
  }

  onMounted(() => {
    timer = setInterval(run, interval)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    offBusiness = onBusinessEvent(() => run())
  })

  onBeforeUnmount(() => {
    disposed = true
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onFocus)
    if (offBusiness) offBusiness()
  })

  return { refreshNow: run }
}
