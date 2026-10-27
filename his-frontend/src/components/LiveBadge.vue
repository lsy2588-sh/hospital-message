<script setup>
defineProps({
  interval: { type: Number, default: 5 },
})
</script>

<template>
  <el-tooltip :content="`每 ${interval} 秒自动拉取最新数据；切回页面时立即刷新`" placement="top">
    <span class="live-badge">
      <span class="live-dot" />
      自动刷新
    </span>
  </el-tooltip>
</template>

<style scoped>
.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  color: var(--his-primary);
  background: var(--his-primary-soft);
  border: 1px solid rgba(31, 122, 107, 0.16);
  white-space: nowrap;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
  animation: live-pulse 1.8s infinite;
}

@keyframes live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}
</style>
