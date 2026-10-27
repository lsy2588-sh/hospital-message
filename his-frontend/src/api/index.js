import http from './http'
import { auth } from '@/stores/auth'

const dataOf = (request) => request.then((body) => body.data)

export const authApi = {
  login: (payload) => dataOf(http.post('/auth/login', payload)),
  register: (payload) => dataOf(http.post('/auth/register', payload)),
}

export const commonApi = {
  departments: () => dataOf(http.get('/departments')),
  doctors: (params) => dataOf(http.get('/doctors', { params })),
  schedules: (params) => dataOf(http.get('/schedules', { params })),
  drugs: () => dataOf(http.get('/drugs')),
}

export const patientApi = {
  createRegistration: (payload) => dataOf(http.post('/registrations', payload)),
  registrations: () => dataOf(http.get('/registrations')),
  registration: (id) => dataOf(http.get(`/registrations/${id}`)),
  cancelRegistration: (id) => dataOf(http.post(`/registrations/${id}/cancel`)),
  prescriptions: () => dataOf(http.get('/prescriptions')),
  prescription: (id) => dataOf(http.get(`/prescriptions/${id}`)),
  payments: () => dataOf(http.get('/payments')),
}

export const doctorApi = {
  registrations: (params = {}) => {
    const query = { ...params }
    if (auth.doctorId) query.doctorId = auth.doctorId
    return dataOf(http.get('/doctor/registrations', { params: query }))
  },
  accept: (id, payload) => dataOf(http.post(`/doctor/registrations/${id}/accept`, payload)),
  createPrescription: (payload) => dataOf(http.post('/doctor/prescriptions', payload)),
  prescriptions: () => dataOf(http.get('/doctor/prescriptions')),
  patientRecords: (patientId) => dataOf(http.get(`/doctor/patients/${patientId}/records`)),
}

export const cashierApi = {
  prescriptions: (status) =>
    dataOf(http.get('/cashier/prescriptions', { params: status ? { status } : {} })),
  createPayment: (payload) => dataOf(http.post('/cashier/payments', payload)),
}

export const pharmacistApi = {
  prescriptions: () => dataOf(http.get('/pharmacist/prescriptions')),
  dispense: (id) => dataOf(http.post(`/pharmacist/prescriptions/${id}/dispense`)),
}

export const adminApi = {
  departments: () => dataOf(http.get('/admin/departments')),
  createDepartment: (payload) => dataOf(http.post('/admin/departments', payload)),
  updateDepartment: (id, payload) => dataOf(http.put(`/admin/departments/${id}`, payload)),
  deleteDepartment: (id) => dataOf(http.delete(`/admin/departments/${id}`)),

  doctors: (params) => dataOf(http.get('/admin/doctors', { params })),
  createDoctor: (payload) => dataOf(http.post('/admin/doctors', payload)),
  updateDoctor: (id, payload) => dataOf(http.put(`/admin/doctors/${id}`, payload)),
  deleteDoctor: (id) => dataOf(http.delete(`/admin/doctors/${id}`)),

  schedules: (params) => dataOf(http.get('/admin/schedules', { params })),
  createSchedule: (payload) => dataOf(http.post('/admin/schedules', payload)),
  updateSchedule: (id, payload) => dataOf(http.put(`/admin/schedules/${id}`, payload)),
  deleteSchedule: (id) => dataOf(http.delete(`/admin/schedules/${id}`)),

  drugs: () => dataOf(http.get('/admin/drugs')),
  createDrug: (payload) => dataOf(http.post('/admin/drugs', payload)),
  updateDrug: (id, payload) => dataOf(http.put(`/admin/drugs/${id}`, payload)),
  deleteDrug: (id) => dataOf(http.delete(`/admin/drugs/${id}`)),

  users: (params) => dataOf(http.get('/admin/users', { params })),
}
