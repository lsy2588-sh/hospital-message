import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'
import { clearSession } from '@/stores/auth'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.handled = false
  }
}

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/register')

function handleUnauthorized() {
  clearSession()
  ElMessage.error('登录已失效，请重新登录')
  const current = router.currentRoute.value
  if (current.name === 'login') return
  const redirect = current.fullPath && current.fullPath !== '/' ? { redirect: current.fullPath } : {}
  router.replace({ name: 'login', query: redirect })
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('his_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body.code === 'number') {
      if (body.code >= 200 && body.code < 300) return body
      const error = new ApiError(body.message || '请求失败', response.status, body.code)
      return Promise.reject(error)
    }
    return response
  },
  (error) => {
    const response = error.response
    if (!response) {
      return Promise.reject(new ApiError('网络异常，请确认后端服务已启动（http://localhost:3000）', 0))
    }
    const body = response.data || {}
    const message = body.message || `请求失败（${response.status}）`
    const apiError = new ApiError(message, response.status, body.code)

    if (response.status === 401 && !isAuthEndpoint(error.config?.url)) {
      handleUnauthorized()
      apiError.handled = true
    } else if (response.status === 400 || response.status === 403) {
      // 400（业务校验失败，如重复挂号）/ 403（无权限）统一弹窗提示
      const forbidden = response.status === 403
      ElMessageBox.alert(message || (forbidden ? '无权限访问' : '操作失败'), forbidden ? '无权限访问' : '操作失败', {
        type: forbidden ? 'error' : 'warning',
        confirmButtonText: '我知道了',
      })
      apiError.handled = true
    }
    return Promise.reject(apiError)
  },
)

export function notifyError(error, options = {}) {
  if (!error || error.handled) return
  const message = error.message || '操作失败'
  if (options.popup) {
    ElMessageBox.alert(message, options.title || '提示', {
      type: 'warning',
      confirmButtonText: '我知道了',
    })
  } else {
    ElMessage.error(message)
  }
}

export default http
