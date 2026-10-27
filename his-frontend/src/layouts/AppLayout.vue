<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { auth, clearSession } from '@/stores/auth'
import { MENU_BY_ROLE, ROLE_LABELS } from '@/utils/constants'

const route = useRoute()
const router = useRouter()

const role = computed(() => auth.user?.role || '')
const roleLabel = computed(() => ROLE_LABELS[role.value] || role.value)
const menu = computed(() => MENU_BY_ROLE[role.value] || [])
const initial = computed(() => ((auth.realName || auth.user?.username) || 'H').slice(0, 1).toUpperCase())

function logout() {
  clearSession()
  ElMessage.success('已退出登录')
  router.replace({ name: 'login' })
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="228px" class="sidebar">
      <div class="brand">
        <div class="brand-mark">HIS</div>
        <div class="brand-text">
          <strong>门诊挂号系统</strong>
          <span>Hospital Registration</span>
        </div>
      </div>

      <div class="menu-label">工作台</div>
      <el-menu
        :default-active="route.path"
        router
        class="menu"
        background-color="transparent"
        text-color="rgba(255,255,255,0.72)"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="item in menu" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-card">
        <div class="sidebar-card-title">五步业务闭环</div>
        <p>挂号 → 看诊 → 开方 → 缴费 → 发药</p>
        <span class="sidebar-dot" />
        <span class="sidebar-card-status">全程留痕 · 数据可追溯</span>
      </div>

      <div class="sidebar-foot">HIS Outpatient · v1.0</div>
    </el-aside>

    <el-container class="body">
      <el-header class="header">
        <div class="crumb">
          <span class="crumb-root">HIS 门诊挂号</span>
          <el-icon class="crumb-sep"><ArrowRight /></el-icon>
          <span class="crumb-current">{{ route.meta.title || '工作台' }}</span>
        </div>
        <div class="header-right">
          <div class="identity">
            <span class="avatar">{{ initial }}</span>
            <span class="identity-text">当前登录人：<strong>{{ auth.realName || auth.user?.username }}</strong></span>
            <span class="identity-sep">｜</span>
            <span class="identity-text">角色：<strong>{{ roleLabel }}</strong></span>
          </div>
          <el-button text class="logout" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            退出
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}

.sidebar {
  background: var(--his-sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 22px 14px 18px;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #1e6fd9);
  display: grid;
  place-items: center;
  font-weight: 700;
  letter-spacing: 0.5px;
  font-size: 13px;
  box-shadow: 0 10px 24px -12px rgba(59, 130, 246, 0.9);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text strong {
  font-size: 15px;
}

.brand-text span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.4px;
}

.menu-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.35);
  padding: 0 12px;
}

.menu {
  border-right: none;
  flex: 1;
}

.menu :deep(.el-menu-item) {
  border-radius: 10px;
  margin-bottom: 6px;
  height: 44px;
}

.menu :deep(.el-menu-item .el-icon) {
  margin-right: 8px;
}

.sidebar-card {
  margin: 0 4px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.sidebar-card-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 6px;
}

.sidebar-card p {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
}

.sidebar-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3ddc97;
  box-shadow: 0 0 8px #3ddc97;
  margin-right: 6px;
  vertical-align: middle;
}

.sidebar-card-status {
  display: inline-block;
  margin-top: 8px;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.5);
  vertical-align: middle;
}

.sidebar-foot {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.28);
  text-align: center;
}

.body {
  background: var(--his-bg);
}

.header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid var(--his-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.crumb-root {
  color: var(--his-text-muted);
}

.crumb-sep {
  font-size: 11px;
  color: #b8c9de;
}

.crumb-current {
  font-weight: 600;
  color: var(--his-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 8px;
  border-radius: 999px;
  background: #f2f7ff;
  border: 1px solid #dce8f8;
  font-size: 13px;
  color: var(--his-text-muted);
  white-space: nowrap;
}

.identity-text strong {
  color: var(--his-text);
  font-weight: 600;
}

.identity-sep {
  color: #b8c9de;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(30, 111, 217, 0.12);
  color: var(--his-primary);
  font-size: 13px;
  font-weight: 600;
}

.logout {
  color: var(--his-text-muted);
}

.main {
  padding: 24px 26px 32px;
  overflow-y: auto;
}

@media (max-width: 860px) {
  .sidebar {
    display: none;
  }

  .main {
    padding: 18px 14px 28px;
  }

  .header {
    padding: 0 16px;
  }

  .identity {
    font-size: 12px;
    padding: 5px 10px 5px 6px;
  }

  .identity-text:first-of-type {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
