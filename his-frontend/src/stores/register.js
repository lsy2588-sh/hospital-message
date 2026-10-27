import { defineStore } from 'pinia'

function normalize(item) {
  if (!item) return item
  return {
    ...item,
    recordId: item.recordId || item.id,
  }
}

export const useRegisterStore = defineStore('register', {
  state: () => ({
    registerList: [],
  }),

  getters: {
    waitingList: (state) => state.registerList.filter((r) => r.status === 'WAITING'),
    consultingList: (state) => state.registerList.filter((r) => r.status === 'CONSULTING'),
    recordById: (state) => (recordId) =>
      state.registerList.find((r) => r.recordId === recordId || r.id === recordId),
  },

  actions: {
    addRegister(item) {
      if (!item) return
      const record = normalize(item)
      const key = record.recordId || record.id
      const idx = this.registerList.findIndex((r) => (r.recordId || r.id) === key)
      if (idx >= 0) this.registerList.splice(idx, 1, record)
      else this.registerList.unshift(record)
    },

    mergeRegisterList(list) {
      ;(list || []).forEach((item) => this.addRegister(item))
    },

    updateRegisterStatus(recordId, newStatus) {
      const record = this.registerList.find((r) => r.recordId === recordId || r.id === recordId)
      if (record) record.status = newStatus
    },
  },

  persist: true,
})
