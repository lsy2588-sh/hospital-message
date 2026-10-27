<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { doctorApi, commonApi } from '@/api'
import { notifyError } from '@/api/http'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import StatCard from '@/components/StatCard.vue'
import StepFlow from '@/components/StepFlow.vue'
import StatusTag from '@/components/StatusTag.vue'
import { auth, setDoctorId } from '@/stores/auth'
import { useRegisterStore } from '@/stores/register'
import { usePrescriptionStore } from '@/stores/prescription'
import { emitBusinessEvent } from '@/utils/businessBus'
import { REGISTRATION_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime, formatMoney } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const registerStore = useRegisterStore()
const prescriptionStore = usePrescriptionStore()

const tab = ref('registrations')
const statusFilter = ref('WAITING')
const currentRow = ref(null)
const highlightRecordId = ref('')

const allRegistrations = computed(() => {
  if (!auth.doctorId) return []
  return registerStore.registerList.filter((r) => r.doctor_id === auth.doctorId)
})

const registrations = computed(() =>
  statusFilter.value
    ? allRegistrations.value.filter((r) => r.status === statusFilter.value)
    : allRegistrations.value,
)

const prescriptions = computed(() => {
  if (!auth.doctorId) return []
  return prescriptionStore.prescriptionList.filter((p) => p.doctor_id === auth.doctorId)
})

const drugs = ref([])

const loadingRegistrations = ref(false)
const loadingPrescriptions = ref(false)

const stats = computed(() => ({
  waiting: allRegistrations.value.filter((r) => r.status === 'WAITING').length,
  consulting: allRegistrations.value.filter((r) => r.status === 'CONSULTING').length,
  completed: allRegistrations.value.filter((r) => r.status === 'COMPLETED').length,
  prescriptions: prescriptions.value.length,
}))

function captureDoctorId(list) {
  const doctorId = list.find((item) => item.doctor_id)?.doctor_id
  if (doctorId && doctorId !== auth.doctorId) setDoctorId(doctorId)
}

async function loadRegistrations(silent = false) {
  if (!silent) loadingRegistrations.value = true
  try {
    const list = await doctorApi.registrations()
    captureDoctorId(list)
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
    prescriptionStore.mergePrescriptionList(await doctorApi.prescriptions())
  } catch (error) {
    if (!silent) notifyError(error)
  } finally {
    if (!silent) loadingPrescriptions.value = false
  }
}

async function loadDrugs() {
  if (drugs.value.length > 0) return
  try {
    drugs.value = await commonApi.drugs()
  } catch (error) {
    notifyError(error)
  }
}

function refreshWorkbench() {
  return loadRegistrations()
}

function handleTabChange(name) {
  if (name === 'registrations') refreshWorkbench()
  else if (name === 'prescriptions') loadPrescriptions()
}

const acceptVisible = ref(false)
const acceptSaving = ref(false)
const acceptForm = reactive({
  id: '',
  registration_no: '',
  patient_name: '',
  chief_complaint: '',
  diagnosis: '',
})

function openAccept(row) {
  currentRow.value = row
  acceptForm.id = row.recordId || row.id
  acceptForm.registration_no = row.registration_no
  acceptForm.patient_name = row.patient_name || ''
  acceptForm.chief_complaint = ''
  acceptForm.diagnosis = ''
  syncRecordId(acceptForm.id)
  acceptVisible.value = true
}

async function submitAccept() {
  if (!acceptForm.chief_complaint.trim()) {
    ElMessage.warning('请填写患者主诉')
    return
  }
  acceptSaving.value = true
  try {
    await doctorApi.accept(acceptForm.id, {
      chief_complaint: acceptForm.chief_complaint.trim(),
      diagnosis: acceptForm.diagnosis.trim(),
    })
    registerStore.updateRegisterStatus(acceptForm.id, 'CONSULTING')
    emitBusinessEvent('registration:accepted', { id: acceptForm.id })
    ElMessage.success('接诊成功，挂号单已进入接诊中')
    acceptVisible.value = false
    await refreshWorkbench()
  } catch (error) {
    notifyError(error)
  } finally {
    acceptSaving.value = false
  }
}

const rxVisible = ref(false)
const rxSaving = ref(false)
const rxForm = reactive({
  registration_id: '',
  patient_name: '',
  items: [],
})

const drugMap = computed(() => Object.fromEntries(drugs.value.map((drug) => [drug.id, drug])))

const rxTotal = computed(() =>
  rxForm.items.reduce((sum, item) => {
    const drug = drugMap.value[item.drug_id]
    return sum + (drug ? Number(drug.price) * Number(item.quantity || 0) : 0)
  }, 0),
)

function openPrescription(row) {
  currentRow.value = row
  rxForm.registration_id = row.recordId || row.id
  rxForm.patient_name = row.patient_name || ''
  rxForm.items = [{ drug_id: '', quantity: 1, dosage: '' }]
  syncRecordId(rxForm.registration_id)
  loadDrugs()
  rxVisible.value = true
}

function addRxItem() {
  rxForm.items.push({ drug_id: '', quantity: 1, dosage: '' })
}

function removeRxItem(index) {
  rxForm.items.splice(index, 1)
}

function itemStock(item) {
  return drugMap.value[item.drug_id]?.stock
}

async function submitPrescription() {
  const items = rxForm.items
    .filter((item) => item.drug_id)
    .map((item) => ({
      drug_id: item.drug_id,
      quantity: Number(item.quantity),
      dosage: item.dosage?.trim() || '',
    }))

  if (items.length === 0) {
    ElMessage.warning('请至少选择一种药品')
    return
  }
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    ElMessage.warning('药品数量必须为正整数')
    return
  }

  rxSaving.value = true
  try {
    const prescription = await doctorApi.createPrescription({ registration_id: rxForm.registration_id, items })
    prescriptionStore.addPrescription(prescription)
    registerStore.updateRegisterStatus(rxForm.registration_id, 'COMPLETED')
    emitBusinessEvent('prescription:created', {
      id: prescription.id,
      registrationId: rxForm.registration_id,
    })
    ElMessage.success('开方成功，处方已进入待缴费')
    rxVisible.value = false
    await Promise.all([refreshWorkbench(), loadPrescriptions()])
  } catch (error) {
    notifyError(error)
  } finally {
    rxSaving.value = false
  }
}

const recordsVisible = ref(false)
const recordsLoading = ref(false)
const records = ref([])
const recordsPatient = ref('')

async function openRecords(row) {
  recordsVisible.value = true
  recordsLoading.value = true
  records.value = []
  recordsPatient.value = row.patient_name || '患者'
  try {
    records.value = await doctorApi.patientRecords(row.patient_id)
  } catch (error) {
    notifyError(error)
  } finally {
    recordsLoading.value = false
  }
}

function syncRecordId(recordId) {
  if (!recordId) return
  const query = { ...route.query }
  if (query.recordId === String(recordId)) return
  query.recordId = String(recordId)
  router.replace({ query }).catch(() => {})
}

function applyRouteRecordId() {
  const recordId = route.query.recordId
  if (!recordId) return
  highlightRecordId.value = String(recordId)
  const record = registerStore.recordById(String(recordId))
  if (record) currentRow.value = record
}

function rowClassName({ row }) {
  const id = row.recordId || row.id
  return id === highlightRecordId.value ? 'highlight-row' : ''
}

onMounted(() => {
  applyRouteRecordId()
  refreshWorkbench()
  loadPrescriptions()
})

watch(
  () => route.query.recordId,
  () => applyRouteRecordId(),
)

useAutoRefresh(
  () => Promise.all([loadRegistrations(true), loadPrescriptions(true)]),
  { interval: 5000 },
)
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="hero-glow" />
      <div class="hero-content">
        <div class="hero-badge">
          <el-icon><FirstAidKit /></el-icon>
          医生工作站
        </div>
        <h2>今日候诊 {{ stats.waiting }} 人，接诊中 {{ stats.consulting }} 人</h2>
        <p>接诊时记录主诉与诊断；接诊中的挂号单可开具处方，一个挂号单仅可开一张处方。</p>
        <div class="hero-actions">
          <el-button type="primary" @click="tab = 'registrations'">查看候诊列表</el-button>
          <el-button class="hero-ghost" @click="tab = 'prescriptions'">我的处方</el-button>
        </div>
      </div>
      <div class="hero-panel">
        <div class="hero-panel-row">
          <span>待候诊</span>
          <strong>{{ stats.waiting }}</strong>
        </div>
        <div class="hero-panel-row">
          <span>接诊中</span>
          <strong>{{ stats.consulting }}</strong>
        </div>
        <div class="hero-panel-row">
          <span>已完成</span>
          <strong>{{ stats.completed }}</strong>
        </div>
      </div>
    </section>

    <StepFlow :active="2" />

    <div class="stat-row">
      <StatCard label="候诊患者" :value="stats.waiting" hint="等待接诊" icon="Clock" tone="warning" />
      <StatCard label="接诊中" :value="stats.consulting" hint="可开具处方" icon="FirstAidKit" tone="primary" />
      <StatCard label="已完成就诊" :value="stats.completed" hint="处方已进入收费" icon="CircleCheck" tone="success" />
      <StatCard label="我的处方" :value="stats.prescriptions" hint="含各状态处方" icon="Document" tone="info" />
    </div>

    <el-tabs v-model="tab" @tab-change="handleTabChange">
      <el-tab-pane label="候诊列表" name="registrations">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left">
              <el-select v-model="statusFilter" style="width: 160px">
                <el-option label="全部状态" value="" />
                <el-option v-for="option in REGISTRATION_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <span class="muted">共 {{ registrations.length }} 条</span>
              <LiveBadge />
            </div>
            <el-button :icon="'Refresh'" :loading="loadingRegistrations" @click="refreshWorkbench">刷新</el-button>
          </div>

          <el-table v-loading="loadingRegistrations" :data="registrations" row-key="id" stripe :row-class-name="rowClassName">
            <template #empty>
              <el-empty description="当前没有符合条件的挂号记录" :image-size="80" />
            </template>
            <el-table-column prop="registration_no" label="挂号单号" min-width="160" />
            <el-table-column label="患者" min-width="110">
              <template #default="{ row }">
                <div class="patient-cell">
                  <span class="patient-avatar">{{ (row.patient_name || '患').slice(0, 1) }}</span>
                  <span>{{ row.patient_name || '未知患者' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="department_name" label="科室" min-width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <StatusTag type="registration" :value="row.status" />
              </template>
            </el-table-column>
            <el-table-column prop="chief_complaint" label="主诉" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.chief_complaint || '-' }}</template>
            </el-table-column>
            <el-table-column prop="diagnosis" label="诊断" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.diagnosis || '-' }}</template>
            </el-table-column>
            <el-table-column label="挂号时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'WAITING'" type="primary" size="small" @click="openAccept(row)">接诊</el-button>
                <el-button v-if="row.status === 'CONSULTING'" type="primary" size="small" @click="openPrescription(row)">开处方</el-button>
                <el-button link type="primary" @click="openRecords(row)">历史记录</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的处方" name="prescriptions">
        <div class="panel">
          <div class="toolbar">
            <div class="toolbar-left">
              <span class="muted">共 {{ prescriptions.length }} 张处方</span>
              <LiveBadge />
            </div>
            <el-button :icon="'Refresh'" :loading="loadingPrescriptions" @click="loadPrescriptions()">刷新</el-button>
          </div>

          <el-table v-loading="loadingPrescriptions" :data="prescriptions" row-key="id" stripe>
            <template #empty>
              <el-empty description="暂无处方" :image-size="80" />
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
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="acceptVisible" title="接诊并记录病历" width="520px">
      <div class="accept-info">
        <div class="accept-row">
          <span>挂号单号</span>
          <strong>{{ acceptForm.registration_no }}</strong>
        </div>
        <div class="accept-row">
          <span>患者</span>
          <strong>{{ acceptForm.patient_name || '未知患者' }}</strong>
        </div>
      </div>
      <el-form label-position="top">
        <el-form-item label="主诉" required>
          <el-input v-model="acceptForm.chief_complaint" type="textarea" :rows="3" placeholder="如：发热两天，伴咳嗽" />
        </el-form-item>
        <el-form-item label="诊断">
          <el-input v-model="acceptForm.diagnosis" type="textarea" :rows="2" placeholder="如：上呼吸道感染" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="acceptVisible = false">取消</el-button>
        <el-button type="primary" :loading="acceptSaving" @click="submitAccept">确认接诊</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rxVisible" title="开具处方" width="780px">
      <div class="rx-head">
        <span>患者：<strong>{{ rxForm.patient_name || '未知患者' }}</strong></span>
        <span>预估总额：<span class="money">{{ formatMoney(rxTotal) }}</span></span>
      </div>

      <el-table :data="rxForm.items" border size="small">
        <el-table-column label="药品" min-width="240">
          <template #default="{ row }">
            <el-select v-model="row.drug_id" placeholder="选择药品" filterable style="width: 100%">
              <el-option
                v-for="drug in drugs"
                :key="drug.id"
                :label="`${drug.name}（${formatMoney(drug.price)} / ${drug.unit || '单位'}）`"
                :value="drug.id"
              >
                <div class="drug-option">
                  <span>{{ drug.name }}</span>
                  <span class="drug-option-meta">{{ formatMoney(drug.price) }} · 库存 {{ drug.stock }}</span>
                </div>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" :max="999" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="用法用量" min-width="170">
          <template #default="{ row }">
            <el-input v-model="row.dosage" placeholder="如：一次一粒，一日三次" />
          </template>
        </el-table-column>
        <el-table-column label="库存" width="80">
          <template #default="{ row }">
            <span :class="{ 'stock-warn': itemStock(row) !== undefined && row.quantity > itemStock(row) }">
              {{ itemStock(row) ?? '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="小计" width="100">
          <template #default="{ row }">
            {{ formatMoney((drugMap[row.drug_id]?.price || 0) * Number(row.quantity || 0)) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" :disabled="rxForm.items.length === 1" @click="removeRxItem($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="rx-actions">
        <el-button plain :icon="'Plus'" @click="addRxItem">添加药品</el-button>
        <span class="muted">单价由后端药品目录决定，医生不可改价</span>
      </div>

      <template #footer>
        <el-button @click="rxVisible = false">取消</el-button>
        <el-button type="primary" :loading="rxSaving" @click="submitPrescription">提交处方</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recordsVisible" :title="`患者历史记录 · ${recordsPatient}`" width="760px">
      <el-table v-loading="recordsLoading" :data="records" size="small" border>
        <template #empty>
          <el-empty description="暂无历史记录" :image-size="70" />
        </template>
        <el-table-column prop="registration_no" label="挂号单号" min-width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag type="registration" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="chief_complaint" label="主诉" min-width="150" show-overflow-tooltip />
        <el-table-column prop="diagnosis" label="诊断" min-width="130" show-overflow-tooltip />
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
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
  padding: 26px 30px;
  border-radius: 18px;
  color: #fff;
  background: radial-gradient(circle at 12% 20%, #2f7cf6 0%, #1a4f9c 48%, #0f2f5c 100%);
}

.hero-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 0.26);
  filter: blur(80px);
  right: -60px;
  top: -120px;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
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
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.hero p {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.68);
  max-width: 540px;
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
  min-width: 86px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.patient-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-avatar {
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

.expand-box {
  padding: 8px 16px 12px;
}

.accept-info {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.accept-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f5f9ff;
  border: 1px solid var(--his-border);
}

.accept-row span {
  font-size: 12px;
  color: var(--his-text-muted);
}

.accept-row strong {
  font-size: 14px;
  color: var(--his-text);
}

.rx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--his-text-muted);
}

.rx-head strong {
  color: var(--his-text);
}

.rx-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.drug-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.drug-option-meta {
  font-size: 11px;
  color: var(--his-text-muted);
}

.stock-warn {
  color: #dc2626;
  font-weight: 600;
}

:deep(.highlight-row) {
  background: #eef5ff !important;
}

@media (max-width: 1200px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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

@media (max-width: 640px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 22px 20px;
  }

  .hero h2 {
    font-size: 20px;
  }

  .accept-info {
    flex-direction: column;
  }
}
</style>
