<script setup>
import { computed } from 'vue'
import { STATUS_MAPS } from '@/utils/constants'

const props = defineProps({
  type: { type: String, required: true },
  value: { type: String, default: '' },
})

const meta = computed(() => STATUS_MAPS[props.type]?.[props.value])
const label = computed(() => meta.value?.label || props.value || '-')
const tagType = computed(() => meta.value?.type || 'info')
</script>

<template>
  <el-tag :type="tagType" effect="light" round>{{ label }}</el-tag>
</template>
