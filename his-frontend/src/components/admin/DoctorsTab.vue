<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import { emitBusinessEvent } from '@/utils/businessBus'
import StatusTag from '@/components/StatusTag.vue'
import { USER_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

const list = ref([])
const departments = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref(null)
const formRef = ref()

const emptyForm = {
  username: '',
  password: '',
  name: '',
  title: '',
  department_id: '',
  specialty: '',
  phone: '',
  status: 'ACTIVE',
}

const form = reactive({ ...emptyForm })
const keyword = ref('')

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value
  return list.value.filter((row) =>
    [row.name, row.username, row.title, row.department_name, row.specialty, row.phone]
      .filter(Boolean)
      .some((value) => String(value).includes(kw)),
  )
})

const rules = {
  username: [{ required: true, message: '请输入登录用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入医生姓名', trigger: 'blur' }],
  department_id: [{ required: true, message: '请选择所属科室', trigger: 'change' }],
}

async function load() {
  loading.value = true
  try {
    list.value = await adminApi.doctors()
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  try {
    departments.value = await adminApi.departments()
  } catch (error) {
    notifyError(error)
  }
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
    username: row.username || '',
    password: '',
    name: row.name,
    title: row.title || '',
    department_id: row.department_id,
    specialty: row.specialty || '',
    phone: row.phone || '',
    status: row.status || 'ACTIVE',
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
  try {
    if (editing.value) {
      await adminApi.updateDoctor(editing.value.id, {
        name: form.name.trim(),
        title: form.title.trim(),
        department_id: form.department_id,
        specialty: form.specialty.trim(),
        phone: form.phone.trim(),
        status: form.status,
      })
      ElMessage.success('医生信息更新成功')
    } else {
      await adminApi.createDoctor({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        title: form.title.trim(),
        department_id: form.department_id,
        specialty: form.specialty.trim(),
        phone: form.phone.trim(),
      })
      ElMessage.success('医生创建成功')
    }
    emitBusinessEvent('admin:changed', { entity: 'doctors' })
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
    await ElMessageBox.confirm(`确认删除医生「${row.name}」及其登录账号吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await adminApi.deleteDoctor(row.id)
    emitBusinessEvent('admin:changed', { entity: 'doctors' })
    ElMessage.success('删除成功')
    await load()
  } catch (error) {
    notifyError(error)
  }
}

onMounted(() => {
  load()
  loadDepartments()
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="keyword" placeholder="搜索姓名 / 账号 / 科室" clearable style="width: 240px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="muted">共 {{ filteredList.length }} 位医生</span>
      </div>
      <div class="toolbar-left">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate">新增医生</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="filteredList" stripe>
      <template #empty>
        <el-empty description="暂无医生" :image-size="80" />
      </template>
      <el-table-column prop="name" label="姓名" min-width="100" />
      <el-table-column prop="username" label="登录账号" min-width="120" />
      <el-table-column prop="title" label="职称" min-width="110">
        <template #default="{ row }">{{ row.title || '-' }}</template>
      </el-table-column>
      <el-table-column prop="department_name" label="科室" min-width="110" />
      <el-table-column prop="specialty" label="擅长" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.specialty || '-' }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="电话" min-width="120">
        <template #default="{ row }">{{ row.phone || '-' }}</template>
      </el-table-column>
      <el-table-column label="账号状态" width="100">
        <template #default="{ row }">
          <StatusTag type="user" :value="row.status" />
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑医生' : '新增医生'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="grid-2">
          <el-form-item v-if="!editing" label="登录用户名" prop="username">
            <el-input v-model="form.username" placeholder="用于医生登录" />
          </el-form-item>
          <el-form-item v-if="!editing" label="初始密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password />
          </el-form-item>
          <el-form-item label="医生姓名" prop="name">
            <el-input v-model="form.name" placeholder="真实姓名" />
          </el-form-item>
          <el-form-item label="职称">
            <el-input v-model="form.title" placeholder="如：主治医师" />
          </el-form-item>
          <el-form-item label="所属科室" prop="department_id">
            <el-select v-model="form.department_id" placeholder="请选择科室" style="width: 100%">
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.phone" placeholder="联系电话" />
          </el-form-item>
          <el-form-item v-if="editing" label="账号状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option v-for="option in USER_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="擅长领域">
          <el-input v-model="form.specialty" type="textarea" :rows="2" placeholder="如：高血压、冠心病诊治" />
        </el-form-item>
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

@media (max-width: 560px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
