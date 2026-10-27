<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import { emitBusinessEvent } from '@/utils/businessBus'
import { formatDateTime } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref(null)
const formRef = ref()

const form = reactive({ name: '', location: '', description: '' })
const keyword = ref('')

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value
  return list.value.filter(
    (row) => row.name.includes(kw) || (row.location || '').includes(kw) || (row.description || '').includes(kw),
  )
})

const rules = {
  name: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    list.value = await adminApi.departments()
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', location: '', description: '' })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    location: row.location || '',
    description: row.description || '',
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
    name: form.name.trim(),
    location: form.location.trim(),
    description: form.description,
  }
  try {
    if (editing.value) {
      await adminApi.updateDepartment(editing.value.id, payload)
      ElMessage.success('科室更新成功')
    } else {
      await adminApi.createDepartment(payload)
      ElMessage.success('科室创建成功')
    }
    emitBusinessEvent('admin:changed', { entity: 'departments' })
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
    await ElMessageBox.confirm(`确认删除科室「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await adminApi.deleteDepartment(row.id)
    emitBusinessEvent('admin:changed', { entity: 'departments' })
    ElMessage.success('删除成功')
    await load()
  } catch (error) {
    notifyError(error)
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="keyword" placeholder="搜索科室 / 位置" clearable style="width: 220px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="muted">共 {{ filteredList.length }} 个科室</span>
      </div>
      <div class="toolbar-left">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate">新增科室</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="filteredList" stripe>
      <template #empty>
        <el-empty description="暂无科室" :image-size="80" />
      </template>
      <el-table-column prop="name" label="科室名称" min-width="130" />
      <el-table-column prop="location" label="位置" min-width="120">
        <template #default="{ row }">{{ row.location || '-' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="简介" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '-' }}</template>
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑科室' : '新增科室'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="科室名称" prop="name">
          <el-input v-model="form.name" placeholder="如：心血管内科" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="form.location" placeholder="如：门诊楼 3 层" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="科室简介" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
