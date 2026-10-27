<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { commonApi, patientApi } from '@/api'
import { notifyError } from '@/api/http'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import StatCard from '@/components/StatCard.vue'
import StepFlow from '@/components/StepFlow.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRegisterStore } from '@/stores/register'
import { usePrescriptionStore } from '@/stores/prescription'
import { emitBusinessEvent } from '@/utils/businessBus'
import { REGISTRATION_STATUS_OPTIONS, TIME_SLOT_LABELS } from '@/utils/constants'
import { formatDateTime, formatMoney } from '@/utils/format'
import { setIfChanged } from '@/utils/list'

const tab = ref('register')

const registerStore = useRegisterStore()
const prescriptionStore = usePrescriptionStore()
const myPatientId = ref('')

const departments = ref([])
const doctors = ref([])
const schedules = ref([])
const payments = ref([])

const registrations = computed(() =>
  myPatientId.value
    ? registerStore.registerList.filter((r) => r.patient_id === myPatientId.value)
    : [],
)

const prescriptions = computed(() =>
  myPatientId.value
    ? prescriptionStore.prescriptionList.filter((p) => p.patient_id === myPatientId.value)
    : [],
)

const loadingSchedules = ref(false)
const loadingRegistrations = ref(false)
const loadingPrescriptions = ref(false)
const loadingPayments = ref(false)
const registeringId = ref('')
const cancellingId = ref('')

const filter = reactive({ departmentId: '', doctorId: '', date: '' })
const regStatusFilter = ref('')
const rxStatusFilter = ref('')

const stats = computed(() => {
  const active = registrations.value.filter((r) => ['WAITING', 'CONSULTING'].includes(r.status)).length
  const done = registrations.value.filter((r) => r.status === 'COMPLETED').length
  const pendingRx = prescriptions.value.filter((p) => p.status === 'PENDING').length
  return { active, done, pendingRx }
})

const filteredDoctors = computed(() => {
  if (!filter.departmentId) return doctors.value
  return doctors.value.filter((d) => d.department_id === filter.departmentId)
})

const filteredSchedules = computed(() =>
  schedules.value.filter(
    (s) =>
      (!filter.departmentId || s.department_id === filter.departmentId) &&
      (!filter.doctorId || s.doctor_id === filter.doctorId) &&
      (!filter.date || s.work_date === filter.date),
  ),
)

const filteredRegistrations = computed(() =>
  regStatusFilter.value
    ? registrations.value.filter((r) => r.status === regStatusFilter.value)
    : registrations.value,
)

const filteredPrescriptions = computed(() =>
  rxStatusFilter.value
    ? prescriptions.value.filter((p) => p.status === rxStatusFilter.value)
    : prescriptions.value,
)

function canRegister(schedule) {
  return schedule.status === 'AVAILABLE' && schedule.remaining_num > 0
}

function stockPercent(row) {
  if (!row.total_num) return 0
  return Math.round((row.remaining_num / row.total_num) * 100)
}

function stockColor(row) {
  if (row.remaining_num <= 0) return '#dc2626'
  if (stockPercent(row) <= 30) return '#d97706'
  return '#1e6fd9'
}

async function loadDepartments() {
  try {
    departments.value = await commonApi.departments()
  } catch (error) {
    notifyError(error)
  }
}

async function loadDoctors() {
  try {
    const params = filter.departmentId ? { departmentId: filter.departmentId } : undefined
    doctors.value = await commonApi.doctors(params)
  } catch (error) {
    notifyError(error)
  }
}

async function loadSchedules(silent = false) {
  if (!silent) loadingSchedules.value = true
  try {
    setIfChanged(schedules, await commonApi.schedules())
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loadingSchedules.value = false
  }
}

async function loadRegistrations(silent = false) {
  if (!silent) loadingRegistrations.value = true
  try {
    const list = await patientApi.registrations()
    if (list.length) myPatientId.value = list[0].patient_id
    registerStore.mergeRegisterList(list)
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loadingRegistrations.value = false
  }
}

async function loadPrescriptions(silent = false) {
  if (!silent) loadingPrescriptions.value = true
  try {
    const list = await patientApi.prescriptions()
    if (list.length) myPatientId.value = list[0].patient_id
    prescriptionStore.mergePrescriptionList(list)
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loadingPrescriptions.value = false
  }
}

async function loadPayments(silent = false) {
  if (!silent) loadingPayments.value = true
  try {
    setIfChanged(payments, await patientApi.payments())
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loadingPayments.value = false
  }
}

function onDepartmentChange() {
  filter.doctorId = ''
  loadDoctors()
}

function handleTabChange(name) {
  if (name === 'register') loadSchedules()
  else if (name === 'registrations') loadRegistrations()
  else if (name === 'prescriptions') loadPrescriptions()
  else if (name === 'payments') loadPayments()
}

function resetFilters() {
  filter.departmentId = ''
  filter.doctorId = ''
  filter.date = ''
  loadDoctors()
}

async function register(schedule) {
  try {
    await ElMessageBox.confirm(
      `确认挂【${schedule.department_name} · ${schedule.doctor_name} · ${schedule.work_date} ${TIME_SLOT_LABELS[schedule.time_slot] || schedule.time_slot}】的号吗？`,
      '确认挂号',
      { confirmButtonText: '确认挂号', cancelButtonText: '再想想', type: 'info' },
    )
  } catch {
    return
  }

  registeringId.value = schedule.id
  try {
    const registration = await patientApi.createRegistration({
      schedule_id: schedule.id,
      doctorId: schedule.doctor_id,
      departmentId: schedule.department_id,
    })
    if (registration.patient_id) myPatientId.value = registration.patient_id
    registerStore.addRegister(registration)
    emitBusinessEvent('registration:created', { id: registration.id })
    ElMessage.success('挂号成功，已进入医生候诊队列')
    await Promise.all([loadSchedules(), loadRegistrations()])
    tab.value = 'registrations'
  } catch (error) {
    // 400（如重复挂号）由 axios 拦截器统一弹窗提示
    notifyError(error)
  } finally {
    registeringId.value = ''
  }
}

async function cancelRegistration(row) {
  try {
    await ElMessageBox.confirm(`确认取消挂号单 ${row.registration_no} 吗？取消后号源将回补。`, '取消挂号', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      type: 'warning',
    })
  } catch {
    return
  }

  cancellingId.value = row.id
  try {
    await patientApi.cancelRegistration(row.id)
    registerStore.updateRegisterStatus(row.id, 'CANCELLED')
    emitBusinessEvent('registration:cancelled', { id: row.id })
    ElMessage.success('挂号已取消，号源已回补')
    await Promise.all([loadSchedules(), loadRegistrations()])
  } catch (error) {
    notifyError(error)
  } finally {
    cancellingId.value = ''
  }
}

const registrationDetailVisible = ref(false)
const registrationDetailLoading = ref(false)
const registrationDetail = ref(null)

async function openRegistrationDetail(row) {
  registrationDetailVisible.value = true
  registrationDetailLoading.value = true
  registrationDetail.value = null
  try {
    registrationDetail.value = await patientApi.registration(row.id)
  } catch (error) {
    notifyError(error)
    registrationDetailVisible.value = false
  } finally {
    registrationDetailLoading.value = false
  }
}

const rxDetailVisible = ref(false)
const rxDetailLoading = ref(false)
const rxDetail = ref(null)

const registrationFlowActive = computed(() => {
  const status = registrationDetail.value?.status
  if (status === 'WAITING' || status === 'CONSULTING') return 1
  if (status === 'COMPLETED') return 3
  return 0
})

const rxFlowActive = computed(() => {
  const status = rxDetail.value?.status
  if (status === 'PENDING') return 3
  if (status === 'PAID') return 4
  if (status === 'DISPENSED') return 5
  return 0
})

async function openPrescriptionDetail(row) {
  rxDetailVisible.value = true
  rxDetailLoading.value = true
  rxDetail.value = null
  try {
    rxDetail.value = await patientApi.prescription(row.id)
  } catch (error) {
    notifyError(error)
    rxDetailVisible.value = false
  } finally {
    rxDetailLoading.value = false
  }
}

onMounted(() => {
  loadDepartments()
  loadDoctors()
  loadSchedules()
  loadRegistrations()
  loadPrescriptions()
  loadPayments()
})

useAutoRefresh(
  () =>
    Promise.all([
      loadSchedules(true),
      loadRegistrations(true),
      loadPrescriptions(true),
      loadPayments(true),
    ]),
  { interval: 5000 },
)
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="hero-glow" />
      <div class="hero-content">
        <div class="hero-badge">
          <el-icon><Calendar /></el-icon>
          门诊挂号
        </div>
        <h2>选择科室与医生，在线完成挂号</h2>
        <p>挂号不收费，候诊单可随时取消并回补号源；就诊、开方、缴费、发药全流程留痕。</p>
        <div class="hero-actions">
          <el-button type="primary" @click="tab = 'register'">立即挂号</el-button>
          <el-button class="hero-ghost" @click="tab = 'registrations'">查看我的挂号</el-button>
        </div>
      </div>
      <div class="hero-panel">
        <div class="hero-panel-row">
          <span>进行中挂号</span>
          <strong>{{ stats.active }}</strong>
        </div>
        <div class="hero-panel-row">
          <span>待缴费处方</span>
          <strong>{{ stats.pendingRx }}</strong>
        </div>
        <div class="hero-panel-row">
          <span>已完成</span>
          <strong>{{ stats.done }}</strong>
        </div>
      </div>
    </section>

    <StepFlow :active="1" />

    <div class="stat-row">
      <StatCard label="进行中挂号" :value="stats.active" hint="待候诊 / 接诊中" icon="Clock" tone="warning" />
      <StatCard label="已完成就诊" :value="stats.done" hint="处方已进入收费环节" icon="CircleCheck" tone="success" />
      <StatCard label="待缴费处方" :value="stats.pendingRx" hint="缴费后等待发药" icon="Wallet" tone="primary" />
    </div>

    <el-tabs v-model="tab" @tab-change="handleTabChange">
      <el-tab-pane label="预约挂号" name="register">
        <div class="panel">
          <div class="section-title">
            <el-icon><Search /></el-icon>
            号源查询
          </div>
          <div class="filter-row">
            <el-select v-model="filter.departmentId" placeholder="全部科室" clearable style="width: 170px" @change="onDepartmentChange">
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
            <el-select v-model="filter.doctorId" placeholder="全部医生" clearable style="width: 190px">
              <el-option
                v-for="doctor in filteredDoctors"
                :key="doctor.id"
                :label="`${doctor.name}（${doctor.title || '医师'}）`"
                :value="doctor.id"
              />
            </el-select>
            <el-date-picker v-model="filter.date" type="date" value-format="YYYY-MM-DD" placeholder="就诊日期" clearable style="width: 170px" />
            <el-button :icon="'RefreshLeft'" @click="resetFilters">重置</el-button>
            <el-button :icon="'Refresh'" :loading="loadingSchedules" @click="loadSchedules()">刷新号源</el-button>
            <LiveBadge />
          </div>

          <el-table v-loading="loadingSchedules" :data="filteredSchedules" stripe>
            <template #empty>
              <el-empty description="暂无符合条件的号源" :image-size="80" />
            </template>
            <el-table-column prop="department_name" label="科室" min-width="110" />
            <el-table-column label="医生" min-width="110">
              <template #default="{ row }">
                <div class="doctor-cell">
                  <span class="doctor-avatar">{{ (row.doctor_name || '医').slice(0, 1) }}</span>
                  <span>{{ row.doctor_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="work_date" label="就诊日期" min-width="120" />
            <el-table-column label="班次" width="90">
              <template #default="{ row }">
                <el-tag effect="plain" type="info">{{ TIME_SLOT_LABELS[row.time_slot] || row.time_slot }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="剩余号源" min-width="170">
              <template #default="{ row }">
                <div class="stock-cell">
                  <div class="stock-meta">
                    <span :class="{ 'no-stock': row.remaining_num <= 0 }">{{ row.remaining_num }}</span>
                    <span class="muted">/ {{ row.total_num }}</span>
                  </div>
                  <el-progress :percentage="stockPercent(row)" :color="stockColor(row)" :stroke-width="6" :show-text="false" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <StatusTag type="schedule" :value="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!canRegister(row)"
                  :loading="registeringId === row.id"
                  @click="register(row)"
                >
                  挂号
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的挂号" name="registrations">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left">
              <el-select v-model="regStatusFilter" placeholder="全部状态" clearable style="width: 140px">
                <el-option v-for="option in REGISTRATION_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <span class="muted">共 {{ filteredRegistrations.length }} 条挂号记录</span>
              <LiveBadge />
            </div>
            <el-button :icon="'Refresh'" :loading="loadingRegistrations" @click="loadRegistrations()">刷新</el-button>
          </div>

          <el-table v-loading="loadingRegistrations" :data="filteredRegistrations" row-key="id" stripe>
            <template #empty>
              <el-empty description="还没有挂号记录，先去预约挂号吧" :image-size="80" />
            </template>
            <el-table-column prop="registration_no" label="挂号单号" min-width="160" />
            <el-table-column prop="department_name" label="科室" min-width="100" />
            <el-table-column prop="doctor_name" label="医生" min-width="90" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <StatusTag type="registration" :value="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="主诉 / 诊断" min-width="190" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.chief_complaint || '—' }}</span>
                <span v-if="row.diagnosis" class="diagnosis"> / {{ row.diagnosis }}</span>
              </template>
            </el-table-column>
            <el-table-column label="挂号时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRegistrationDetail(row)">详情</el-button>
                <el-button
                  v-if="row.status === 'WAITING'"
                  link
                  type="danger"
                  :loading="cancellingId === row.id"
                  @click="cancelRegistration(row)"
                >
                  取消
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的处方" name="prescriptions">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left">
              <el-select v-model="rxStatusFilter" placeholder="全部状态" clearable style="width: 140px">
                <el-option label="待缴费" value="PENDING" />
                <el-option label="已缴费" value="PAID" />
                <el-option label="已发药" value="DISPENSED" />
              </el-select>
              <span class="muted">共 {{ filteredPrescriptions.length }} 张处方</span>
              <LiveBadge />
            </div>
            <el-button :icon="'Refresh'" :loading="loadingPrescriptions" @click="loadPrescriptions()">刷新</el-button>
          </div>

          <el-table v-loading="loadingPrescriptions" :data="filteredPrescriptions" row-key="id" stripe>
            <template #empty>
              <el-empty description="暂无处方，医生开方后可在此查看" :image-size="80" />
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
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPrescriptionDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的收费" name="payments">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left">
              <span class="muted">共 {{ payments.length }} 条收费记录</span>
              <LiveBadge />
            </div>
            <el-button :icon="'Refresh'" :loading="loadingPayments" @click="loadPayments()">刷新</el-button>
          </div>

          <el-table v-loading="loadingPayments" :data="payments" row-key="id" stripe>
            <template #empty>
              <el-empty description="暂无收费记录" :image-size="80" />
            </template>
            <el-table-column prop="payment_no" label="收费单号" min-width="160" />
            <el-table-column prop="prescription_id" label="关联处方" min-width="150" />
            <el-table-column label="金额" width="120">
              <template #default="{ row }"><span class="money">{{ formatMoney(row.amount) }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <StatusTag type="payment" :value="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="缴费时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.paid_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="registrationDetailVisible" title="挂号单详情" width="560px">
      <div v-loading="registrationDetailLoading" class="dialog-body">
        <el-steps v-if="registrationDetail" :active="registrationFlowActive" finish-status="success" align-center class="flow-mini">
          <el-step title="挂号" />
          <el-step title="看诊" />
          <el-step title="开方" />
          <el-step title="缴费" />
          <el-step title="发药" />
        </el-steps>
        <el-descriptions v-if="registrationDetail" :column="2" border>
          <el-descriptions-item label="挂号单号" :span="2">{{ registrationDetail.registration_no }}</el-descriptions-item>
          <el-descriptions-item label="科室">{{ registrationDetail.department_name }}</el-descriptions-item>
          <el-descriptions-item label="医生">{{ registrationDetail.doctor_name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <StatusTag type="registration" :value="registrationDetail.status" />
          </el-descriptions-item>
          <el-descriptions-item label="挂号时间">{{ formatDateTime(registrationDetail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="主诉" :span="2">{{ registrationDetail.chief_complaint || '-' }}</el-descriptions-item>
          <el-descriptions-item label="诊断" :span="2">{{ registrationDetail.diagnosis || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <el-dialog v-model="rxDetailVisible" title="处方详情" width="680px">
      <div v-loading="rxDetailLoading" class="dialog-body">
        <template v-if="rxDetail">
          <el-steps :active="rxFlowActive" finish-status="success" align-center class="flow-mini">
            <el-step title="挂号" />
            <el-step title="看诊" />
            <el-step title="开方" />
            <el-step title="缴费" />
            <el-step title="发药" />
          </el-steps>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="处方号" :span="2">{{ rxDetail.id }}</el-descriptions-item>
            <el-descriptions-item label="开方医生">{{ rxDetail.doctor_name }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <StatusTag type="prescription" :value="rxDetail.status" />
            </el-descriptions-item>
            <el-descriptions-item label="总金额">
              <span class="money">{{ formatMoney(rxDetail.total_amount) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="开方时间">{{ formatDateTime(rxDetail.created_at) }}</el-descriptions-item>
          </el-descriptions>
          <el-table :data="rxDetail.items" size="small" border class="detail-table">
            <el-table-column prop="drug_name" label="药品" min-width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="单价" width="100">
              <template #default="{ row }">{{ formatMoney(row.unit_price) }}</template>
            </el-table-column>
            <el-table-column label="小计" width="110">
              <template #default="{ row }">{{ formatMoney(row.subtotal) }}</template>
            </el-table-column>
            <el-table-column prop="dosage" label="用法用量" min-width="150" />
          </el-table>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  border-radius: 18px;
  color: #fff;
  background: radial-gradient(circle at 12% 20%, #2f7cf6 0%, #1a4f9c 48%, #0f2f5c 100%);
}

.hero-glow {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 0.28);
  filter: blur(80px);
  right: -60px;
  top: -120px;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 620px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.hero h2 {
  margin: 14px 0 8px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.hero p {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.68);
  max-width: 520px;
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}

.hero-actions :deep(.el-button--primary) {
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #ffffff;
  --el-button-text-color: #1a4f9c;
  --el-button-hover-bg-color: #e8f1fd;
  --el-button-hover-border-color: #e8f1fd;
  --el-button-hover-text-color: #1a4f9c;
}

.hero-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.28);
}

.hero-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.45);
  color: #fff;
}

.hero-panel {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.hero-panel-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-width: 92px;
}

.hero-panel-row span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.hero-panel-row strong {
  font-size: 22px;
  font-weight: 600;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.doctor-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doctor-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--his-primary);
  background: var(--his-primary-soft);
  flex-shrink: 0;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 140px;
}

.stock-meta {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 12px;
}

.stock-meta span:first-child {
  font-weight: 600;
  color: var(--his-text);
}

.no-stock {
  color: #dc2626;
}

.diagnosis {
  color: var(--his-text-muted);
}

.expand-box {
  padding: 8px 16px 12px;
}

.detail-table {
  margin-top: 16px;
}

.flow-mini {
  margin-bottom: 20px;
}

.dialog-body {
  min-height: 60px;
}

@media (max-width: 1100px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-panel {
    width: 100%;
  }

  .hero-panel-row {
    flex: 1;
  }
}

@media (max-width: 720px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 22px 20px;
  }

  .hero h2 {
    font-size: 20px;
  }

  .hero-panel {
    flex-wrap: wrap;
  }
}
</style>
