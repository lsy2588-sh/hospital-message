<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import { emitBusinessEvent } from '@/utils/businessBus'
import StatusTag from '@/components/StatusTag.vue'
import { TIME_SLOT_LABELS } from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

const list = ref([])
const doctors = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref(null)
const formRef = ref()

const filters = reactive({ doctorId: '', date: '' })

const emptyForm = {
  doctor_id: '',
  work_date: '',
  time_slot: 'AM',
  total_num: 30,
  status: 'AVAILABLE',
}

const form = reactive({ ...emptyForm })

const rules = {
  doctor_id: [{ required: true, message: '请选择医生', trigger: 'change' }],
  work_date: [{ required: true, message: '请选择排班日期', trigger: 'change' }],
  time_slot: [{ required: true, message: '请选择班次', trigger: 'change' }],
  total_num: [{ required: true, message: '请输入总号源', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    const params = {}
    if (filters.doctorId) params.doctorId = filters.doctorId
    if (filters.date) params.date = filters.date
    list.value = await adminApi.schedules(params)
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}

async function loadDoctors() {
  try {
    doctors.value = await adminApi.doctors()
  } catch (error) {
    notifyError(error)
  }
}

function resetFilters() {
  filters.doctorId = ''
  filters.date = ''
  load()
}

function openCreate() {
  editing.value = null
  Object.assign(form, emptyForm)
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, {
    doctor_id: row.doctor_id,
    work_date: row.work_date,
    time_slot: row.time_slot,
    total_num: row.total_num,
    status: row.status,
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function submit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  const payload = {
    doctor_id: form.doctor_id,
    work_date: form.work_date,
    time_slot: form.time_slot,
    total_num: Number(form.total_num),
    status: form.status,
  }
  try {
    if (editing.value) {
      await adminApi.updateSchedule(editing.value.id, payload)
      ElMessage.success('排班更新成功')
    } else {
      await adminApi.createSchedule(payload)
      ElMessage.success('排班创建成功')
    }
    emitBusinessEvent('admin:changed', { entity: 'schedules' })
    dialogVisible.value = false
    await load()
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${row.doctor_name} 在 ${row.work_date} ${TIME_SLOT_LABELS[row.time_slot]} 的排班吗？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await adminApi.deleteSchedule(row.id)
    emitBusinessEvent('admin:changed', { entity: 'schedules' })
    ElMessage.success('删除成功')
    await load()
  } catch (error) {
    notifyError(error)
  }
}

onMounted(() => {
  load()
  loadDoctors()
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filters.doctorId" placeholder="全部医生" clearable filterable style="width: 180px" @change="load">
          <el-option v-for="doctor in doctors" :key="doctor.id" :label="doctor.name" :value="doctor.id" />
        </el-select>
        <el-date-picker v-model="filters.date" type="date" value-format="YYYY-MM-DD" placeholder="排班日期" clearable style="width: 160px" @change="load" />
        <el-button @click="resetFilters">重置</el-button>
        <span class="muted">共 {{ list.length }} 条排班</span>
      </div>
      <div class="toolbar-left">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate">新增排班</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <template #empty>
        <el-empty description="暂无排班" :image-size="80" />
      </template>
      <el-table-column prop="doctor_name" label="医生" min-width="100" />
      <el-table-column prop="department_name" label="科室" min-width="110" />
      <el-table-column prop="work_date" label="日期" min-width="120" />
      <el-table-column label="班次" width="90">
        <template #default="{ row }">
          <el-tag effect="plain" type="info">{{ TIME_SLOT_LABELS[row.time_slot] || row.time_slot }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="号源（剩余/总数）" min-width="150">
        <template #default="{ row }">{{ row.remaining_num }} / {{ row.total_num }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <StatusTag type="schedule" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑排班' : '新增排班'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="医生" prop="doctor_id">
          <el-select v-model="form.doctor_id" placeholder="请选择医生" filterable style="width: 100%">
            <el-option
              v-for="doctor in doctors"
              :key="doctor.id"
              :label="`${doctor.name}（${doctor.department_name}）`"
              :value="doctor.id"
            />
          </el-select>
        </el-form-item>
        <div class="grid-2">
          <el-form-item label="排班日期" prop="work_date">
            <el-date-picker v-model="form.work_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="班次" prop="time_slot">
            <el-select v-model="form.time_slot" style="width: 100%">
              <el-option label="上午 AM" value="AM" />
              <el-option label="下午 PM" value="PM" />
            </el-select>
          </el-form-item>
          <el-form-item label="总号源" prop="total_num">
            <el-input-number v-model="form.total_num" :min="0" :max="999" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="可挂号" value="AVAILABLE" />
              <el-option label="已停诊" value="CLOSED" />
            </el-select>
          </el-form-item>
        </div>
        <p class="muted">修改总号源时，后端会按已挂号数量自动重算剩余号源。</p>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

@media (max-width: 520px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
