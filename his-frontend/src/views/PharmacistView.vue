<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pharmacistApi } from '@/api'
import { notifyError } from '@/api/http'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import StatCard from '@/components/StatCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePrescriptionStore } from '@/stores/prescription'
import { emitBusinessEvent } from '@/utils/businessBus'
import { formatDateTime, formatMoney } from '@/utils/format'

const prescriptionStore = usePrescriptionStore()

const list = computed(() => prescriptionStore.paidList)
const loading = ref(false)
const dispensingId = ref('')

const stats = computed(() => {
  const totalItems = list.value.reduce(
    (sum, rx) => sum + (rx.items || []).reduce((s, item) => s + Number(item.quantity || 0), 0),
    0,
  )
  const patients = new Set(list.value.map((rx) => rx.patient_id)).size
  return { prescriptions: list.value.length, totalItems, patients }
})

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const data = await pharmacistApi.prescriptions()
    prescriptionStore.mergePrescriptionList(data)
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loading.value = false
  }
}

async function dispense(row) {
  const itemSummary = (row.items || [])
    .map((item) => `${item.drug_name} × ${item.quantity}`)
    .join('，')

  try {
    await ElMessageBox.confirm(
      `患者：${row.patient_name}\n处方号：${row.id}\n药品：${itemSummary || '—'}\n\n发药后将扣减对应药品库存，确认发药吗？`,
      '确认发药',
      { confirmButtonText: '确认发药', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  dispensingId.value = row.id
  try {
    await pharmacistApi.dispense(row.id)
    prescriptionStore.giveMedicine(row.id)
    emitBusinessEvent('prescription:dispensed', { id: row.id })
    ElMessage.success('发药成功，处方已闭环完成')
    await load()
  } catch (error) {
    // 400（未缴费/库存不足）、403（越权）由拦截器弹窗提示
    notifyError(error)
  } finally {
    dispensingId.value = ''
  }
}

onMounted(load)

useAutoRefresh(() => load(true), { interval: 5000 })
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h2>药房发药</h2>
      <p>仅展示已缴费待发药处方；发药时后端会原子校验并扣减库存，完成五步闭环。</p>
    </div>

    <div class="stat-row">
      <StatCard label="待发药处方" :value="stats.prescriptions" hint="已缴费待处理" icon="Goods" tone="warning" />
      <StatCard label="待发药品件数" :value="stats.totalItems" hint="按明细数量汇总" icon="Box" tone="primary" />
      <StatCard label="涉及患者" :value="stats.patients" hint="去重患者数" icon="User" tone="success" />
    </div>

    <div class="panel">
      <div class="section-title">
        <el-icon><FirstAidKit /></el-icon>
        发药队列
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="muted">待发药处方 {{ list.length }} 张</span>
          <LiveBadge />
        </div>
        <el-button :icon="'Refresh'" :loading="loading" @click="load()">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="list" row-key="id" stripe>
        <template #empty>
          <el-empty description="暂无待发药处方" :image-size="80" />
        </template>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-box">
              <el-table :data="row.items" size="small" border>
                <el-table-column prop="drug_name" label="药品" min-width="160" />
                <el-table-column prop="quantity" label="数量" width="80" />
                <el-table-column label="单价" width="100">
                  <template #default="{ row: item }">{{ formatMoney(item.unit_price) }}</template>
                </el-table-column>
                <el-table-column label="小计" width="110">
                  <template #default="{ row: item }">{{ formatMoney(item.subtotal) }}</template>
                </el-table-column>
                <el-table-column prop="dosage" label="用法用量" min-width="160" />
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="处方号" min-width="150" />
        <el-table-column prop="patient_name" label="患者" min-width="90" />
        <el-table-column prop="doctor_name" label="开方医生" min-width="100" />
        <el-table-column label="金额" width="110">
          <template #default="{ row }"><span class="money">{{ formatMoney(row.total_amount) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag type="prescription" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="开方时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :loading="dispensingId === row.id" @click="dispense(row)">
              发药
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.expand-box {
  padding: 8px 16px 12px;
}

@media (max-width: 720px) {
  .stat-row {
    grid-template-columns: 1fr;
  }
}
</style>
