<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ROLE_LABELS } from '@/utils/constants'
import { auth, homePath } from '@/stores/auth'

const router = useRouter()
const roleLabel = computed(() => ROLE_LABELS[auth.user?.role] || '当前角色')
</script>

<template>
  <div class="forbidden">
    <div class="card">
      <div class="code">403</div>
      <h2>无权限访问</h2>
      <p>{{ roleLabel }}账号无法进入该页面，请返回自己的工作台，或使用具备权限的账号登录。</p>
      <div class="actions">
        <el-button type="primary" @click="router.replace(homePath())">返回我的工作台</el-button>
        <el-button @click="router.replace({ name: 'login' })">切换账号</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--his-bg);
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border: 1px solid var(--his-border);
  border-radius: 20px;
  padding: 40px 36px;
  text-align: center;
  box-shadow: 0 24px 60px -40px rgba(16, 42, 38, 0.5);
}

.code {
  font-size: 56px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--his-primary);
}

h2 {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 600;
}

p {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--his-text-muted);
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
