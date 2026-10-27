<script setup>
import { onMounted, reactive, ref } from 'vue'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import StatCard from '@/components/StatCard.vue'
import DepartmentsTab from '@/components/admin/DepartmentsTab.vue'
import DoctorsTab from '@/components/admin/DoctorsTab.vue'
import SchedulesTab from '@/components/admin/SchedulesTab.vue'
import DrugsTab from '@/components/admin/DrugsTab.vue'
import UsersTab from '@/components/admin/UsersTab.vue'

const tab = ref('departments')

const stats = reactive({
  departments: 0,
  doctors: 0,
  schedules: 0,
  drugs: 0,
  users: 0,
})

async function loadStats() {
  try {
    const [departments, doctors, schedules, drugs, users] = await Promise.all([
      adminApi.departments(),
      adminApi.doctors(),
      adminApi.schedules(),
      adminApi.drugs(),
      adminApi.users(),
    ])
    stats.departments = departments.length
    stats.doctors = doctors.length
    stats.schedules = schedules.length
    stats.drugs = drugs.length
    stats.users = users.length
  } catch (error) {
    notifyError(error)
  }
}

onMounted(loadStats)

useAutoRefresh(loadStats, { interval: 10000 })
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h2>管理后台</h2>
      <p>维护科室、医生、排班号源与药品目录；仅管理员账号可访问本页与 /api/admin/* 接口。</p>
    </div>

    <div class="stat-row">
      <StatCard label="科室" :value="stats.departments" hint="基础科室目录" icon="OfficeBuilding" tone="primary" />
      <StatCard label="医生" :value="stats.doctors" hint="含登录账号" icon="User" tone="info" />
      <StatCard label="排班" :value="stats.schedules" hint="号源班次总数" icon="Calendar" tone="success" />
      <StatCard label="药品" :value="stats.drugs" hint="药品目录与库存" icon="Box" tone="warning" />
      <StatCard label="用户" :value="stats.users" hint="全部角色账号" icon="UserFilled" tone="danger" />
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="muted">基础数据变更后将同步至患者挂号、医生排班等页面</span>
        </div>
        <LiveBadge :interval="10" />
      </div>
      <el-tabs v-model="tab">
        <el-tab-pane name="departments">
          <template #label>
            <span class="tab-label"><el-icon><OfficeBuilding /></el-icon>科室管理</span>
          </template>
          <DepartmentsTab />
        </el-tab-pane>
        <el-tab-pane name="doctors" lazy>
          <template #label>
            <span class="tab-label"><el-icon><User /></el-icon>医生管理</span>
          </template>
          <DoctorsTab />
        </el-tab-pane>
        <el-tab-pane name="schedules" lazy>
          <template #label>
            <span class="tab-label"><el-icon><Calendar /></el-icon>排班号源</span>
          </template>
          <SchedulesTab />
        </el-tab-pane>
        <el-tab-pane name="drugs" lazy>
          <template #label>
            <span class="tab-label"><el-icon><Box /></el-icon>药品管理</span>
          </template>
          <DrugsTab />
        </el-tab-pane>
        <el-tab-pane name="users" lazy>
          <template #label>
            <span class="tab-label"><el-icon><UserFilled /></el-icon>用户角色</span>
          </template>
          <UsersTab />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.stat-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 1280px) {
  .stat-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
