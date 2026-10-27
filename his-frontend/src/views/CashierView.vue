<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cashierApi } from '@/api'
import { notifyError } from '@/api/http'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import StatCard from '@/components/StatCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePrescriptionStore } from '@/stores/prescription'
import { emitBusinessEvent } from '@/utils/businessBus'
import { PRESCRIPTION_STATUS } from '@/utils/constants'
import { formatDateTime, formatMoney } from '@/utils/format'

const prescriptionStore = usePrescriptionStore()

const status = ref('PENDING')
const loading = ref(false)
const payingId = ref('')

const list = computed(() =>
  prescriptionStore.prescriptionList.filter((p) => p.status === status.value),
)

const stats = computed(() => {
  const pending = prescriptionStore.unpayList
  const paid = prescriptionStore.paidList
  return {
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    paidCount: paid.length,
  }
})

const statusOptions = Object.entries(PRESCRIPTION_STATUS).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const data = await cashierApi.prescriptions(status.value)
    prescriptionStore.mergePrescriptionList(data)
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadStats(silent = false) {
  try {
    const [pending, paid] = await Promise.all([
      cashierApi.prescriptions('PENDING'),
      cashierApi.prescriptions('PAID'),
    ])
    prescriptionStore.mergePrescriptionList(pending)
    prescriptionStore.mergePrescriptionList(paid)
  } catch (error) {
    if (!silent) notifyError(error)
  }
}

async function refresh() {
  await Promise.all([load(), loadStats()])
}

async function pay(row) {
  try {
    await ElMessageBox.confirm(
      `患者：${row.patient_name}\n处方号：${row.id}\n应收金额：${formatMoney(row.total_amount)}\n\n收费金额以后端处方金额为准，确认收费吗？`,
      '确认收费',
      { confirmButtonText: '确认收费', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  payingId.value = row.id
  try {
    const payment = await cashierApi.createPayment({ prescription_id: row.id })
    prescriptionStore.payPrescription(row.id)
    emitBusinessEvent('payment:created', { id: payment.id, prescriptionId: row.id })
    ElMessage.success(`收费成功，收费单号 ${payment.payment_no}，处方已流转至药房`)
    await refresh()
  } catch (error) {
    // 400（处方已缴费/无需缴费）、403（越权）由拦截器弹窗提示
    notifyError(error)
  } finally {
    payingId.value = ''
  }
}

onMounted(refresh)

useAutoRefresh(() => Promise.all([load(true), loadStats(true)]), { interval: 5000 })
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h2>收费工作站</h2>
      <p>按处方收取费用，收费成功后处方状态由「待缴费」流转为「已缴费」，等待药房发药。金额由后端按处方核定，前端不可修改。</p>
    </div>

    <div class="stat-row">
      <StatCard label="待缴费处方" :value="stats.pendingCount" hint="等待收费" icon="Wallet" tone="warning" />
      <StatCard label="待收金额" :value="formatMoney(stats.pendingAmount)" hint="按处方金额汇总" icon="Coin" tone="primary" />
      <StatCard label="已缴费处方" :value="stats.paidCount" hint="等待药房发药" icon="CircleCheck" tone="success" />
    </div>

    <div class="panel">
      <div class="section-title">
        <el-icon><Tickets /></el-icon>
        处方收费
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="status" style="width: 150px" @change="load">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <span class="muted">共 {{ list.length }} 张处方</span>
          <LiveBadge />
        </div>
        <el-button :icon="'Refresh'" :loading="loading" @click="refresh">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="list" row-key="id" stripe>
        <template #empty>
          <el-empty description="当前状态下暂无处方" :image-size="80" />
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
            <el-button
              v-if="row.status === 'PENDING'"
              type="primary"
              size="small"
              :loading="payingId === row.id"
              @click="pay(row)"
            >
              收费
            </el-button>
            <span v-else class="muted">-</span>
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
