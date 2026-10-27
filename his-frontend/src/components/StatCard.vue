<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: 0 },
  hint: { type: String, default: '' },
  icon: { type: String, default: 'DataLine' },
  tone: { type: String, default: 'primary' },
})
</script>

<template>
  <div class="stat-card" :class="`tone-${tone}`">
    <div class="stat-icon">
      <el-icon :size="20"><component :is="icon" /></el-icon>
    </div>
    <div class="stat-body">
      <span class="stat-label">{{ label }}</span>
      <strong class="stat-value">{{ value }}</strong>
      <span v-if="hint" class="stat-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--his-border);
  border-radius: var(--his-radius);
  padding: 16px 18px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px -24px rgba(14, 37, 66, 0.45);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--tone-bg);
  color: var(--tone-fg);
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  color: var(--his-text-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--his-text);
}

.stat-hint {
  font-size: 11px;
  color: var(--his-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tone-primary {
  --tone-bg: rgba(30, 111, 217, 0.12);
  --tone-fg: #1e6fd9;
}

.tone-success {
  --tone-bg: rgba(22, 163, 74, 0.12);
  --tone-fg: #15803d;
}

.tone-warning {
  --tone-bg: rgba(217, 119, 6, 0.14);
  --tone-fg: #b45309;
}

.tone-info {
  --tone-bg: rgba(59, 130, 246, 0.12);
  --tone-fg: #2563eb;
}

.tone-danger {
  --tone-bg: rgba(220, 38, 38, 0.12);
  --tone-fg: #b91c1c;
}
</style>
