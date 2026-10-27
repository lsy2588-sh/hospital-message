import { defineStore } from 'pinia'

function normalize(pres) {
  if (!pres) return pres
  return {
    ...pres,
    presId: pres.presId || pres.id,
    recordId: pres.recordId || pres.registration_id || pres.registrationId,
  }
}

export const usePrescriptionStore = defineStore('prescription', {
  state: () => ({
    prescriptionList: [],
  }),

  getters: {
    unpayList: (state) => state.prescriptionList.filter((p) => p.status === 'PENDING'),
    paidList: (state) => state.prescriptionList.filter((p) => p.status === 'PAID'),
    dispensedList: (state) => state.prescriptionList.filter((p) => p.status === 'DISPENSED'),
    presById: (state) => (presId) =>
      state.prescriptionList.find((p) => p.presId === presId || p.id === presId),
    byRecordId: (state) => (recordId) =>
      state.prescriptionList.filter((p) => p.recordId === recordId),
  },

  actions: {
    addPrescription(pres) {
      if (!pres) return
      const record = normalize(pres)
      const key = record.presId || record.id
      const idx = this.prescriptionList.findIndex((p) => (p.presId || p.id) === key)
      if (idx >= 0) this.prescriptionList.splice(idx, 1, record)
      else this.prescriptionList.unshift(record)
    },

    mergePrescriptionList(list) {
      ;(list || []).forEach((pres) => this.addPrescription(pres))
    },

    payPrescription(presId) {
      const pres = this.prescriptionList.find((p) => p.presId === presId || p.id === presId)
      if (pres) pres.status = 'PAID'
    },

    giveMedicine(presId) {
      const pres = this.prescriptionList.find((p) => p.presId === presId || p.id === presId)
      if (pres) pres.status = 'DISPENSED'
    },
  },

  persist: true,
})
