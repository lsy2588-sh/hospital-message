<script setup>
defineProps({
  active: { type: Number, default: 0 },
})

const steps = [
  { title: '患者挂号', desc: '扣减号源' },
  { title: '医生看诊', desc: '记录主诉诊断' },
  { title: '开具处方', desc: '生成明细' },
  { title: '收费缴费', desc: '处方已缴费' },
  { title: '药师发药', desc: '扣减库存' },
]
</script>

<template>
  <div class="flow-steps">
    <div
      v-for="(step, index) in steps"
      :key="step.title"
      class="flow-step"
      :class="{ 'is-active': active === index + 1, 'is-done': active > index + 1 }"
    >
      <span class="flow-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="flow-text">
        <strong>{{ step.title }}</strong>
        <em>{{ step.desc }}</em>
      </span>
    </div>
  </div>
</template>

<style scoped>
.flow-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--his-border);
  background: #fff;
  position: relative;
  overflow: hidden;
}

.flow-step::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
}

.flow-index {
  font-size: 12px;
  font-weight: 700;
  color: #b8c9de;
  letter-spacing: 0.5px;
}

.flow-text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
  min-width: 0;
}

.flow-text strong {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--his-text);
  white-space: nowrap;
}

.flow-text em {
  font-style: normal;
  font-size: 11px;
  color: var(--his-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-step.is-active {
  border-color: rgba(30, 111, 217, 0.45);
  background: linear-gradient(135deg, #f0f6ff, #ffffff);
}

.flow-step.is-active::after {
  background: var(--his-primary);
}

.flow-step.is-active .flow-index {
  color: var(--his-primary);
}

.flow-step.is-done {
  background: #f6faff;
}

.flow-step.is-done::after {
  background: #93bdf5;
}

.flow-step.is-done .flow-index {
  color: #4a86d6;
}

@media (max-width: 1100px) {
  .flow-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .flow-steps {
    grid-template-columns: 1fr;
  }
}
</style>
