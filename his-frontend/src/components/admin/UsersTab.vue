<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import StatusTag from '@/components/StatusTag.vue'
import { ROLE_LABELS, ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const filters = reactive({ role: '', status: '' })
const keyword = ref('')

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value
  return list.value.filter(
    (row) => row.username.includes(kw) || (ROLE_LABELS[row.role] || row.role).includes(kw),
  )
})

async function load() {
  loading.value = true
  try {
    const params = {}
    if (filters.role) params.role = filters.role
    if (filters.status) params.status = filters.status
    list.value = await adminApi.users(params)
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.role = ''
  filters.status = ''
  load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filters.role" placeholder="全部角色" clearable style="width: 140px" @change="load">
          <el-option v-for="option in ROLE_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px" @change="load">
          <el-option v-for="option in USER_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索用户名 / 角色" clearable style="width: 200px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button @click="resetFilters">重置</el-button>
        <span class="muted">共 {{ filteredList.length }} 个账号</span>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="filteredList" stripe>
      <template #empty>
        <el-empty description="暂无用户" :image-size="80" />
      </template>
      <el-table-column prop="username" label="用户名" min-width="140" />
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag effect="plain" round>{{ ROLE_LABELS[row.role] || row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <StatusTag type="user" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="id" label="用户 ID" min-width="180" />
      <el-table-column label="创建时间" min-width="180">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>
