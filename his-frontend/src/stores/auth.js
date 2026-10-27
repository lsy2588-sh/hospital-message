import { reactive } from 'vue'
import { ROLE_HOME, ACCOUNT_REAL_NAME } from '@/utils/constants'

const TOKEN_KEY = 'his_token'
const USER_KEY = 'his_user'
const DOCTOR_KEY = 'his_doctor_id'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

function resolveRealName(user) {
  if (!user) return ''
  return ACCOUNT_REAL_NAME[user.username] || user.name || user.realName || ''
}

const initialUser = readUser()

export const auth = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: initialUser,
  doctorId: localStorage.getItem(DOCTOR_KEY) || '',
  realName: resolveRealName(initialUser),
})

export function setDoctorId(doctorId) {
  auth.doctorId = doctorId || ''
  if (doctorId) localStorage.setItem(DOCTOR_KEY, doctorId)
  else localStorage.removeItem(DOCTOR_KEY)
}

export function setSession(token, user) {
  auth.token = token
  auth.user = user
  auth.realName = resolveRealName(user)
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  setDoctorId('')
}

export function clearSession() {
  auth.token = ''
  auth.user = null
  auth.realName = ''
  setDoctorId('')
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn() {
  return Boolean(auth.token && auth.user)
}

export function currentRole() {
  return auth.user?.role || ''
}

export function homePath() {
  return ROLE_HOME[currentRole()] || '/403'
}
