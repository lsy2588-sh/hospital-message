<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'
import { notifyError } from '@/api/http'
import { emitBusinessEvent } from '@/utils/businessBus'
import { formatDateTime, formatMoney } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref(null)
const formRef = ref()

const emptyForm = {
  name: '',
  spec: '',
  unit: '',
  price: 0,
  stock: 0,
  category: '',
  batch: '',
}

const form = reactive({ ...emptyForm })
const keyword = ref('')

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value
  return list.value.filter((row) =>
    [row.name, row.spec, row.category, row.batch, row.unit]
      .filter(Boolean)
      .some((value) => String(value).includes(kw)),
  )
})

const rules = {
  name: [{ required: true, message: '请输入药品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入药品单价', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    list.value = await adminApi.drugs()
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
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
    name: row.name,
    spec: row.spec || '',
    unit: row.unit || '',
    price: Number(row.price) || 0,
    stock: Number(row.stock) || 0,
    category: row.category || '',
    batch: row.batch || '',
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
    spec: form.spec.trim(),
    unit: form.unit.trim(),
    price: Number(form.price),
    stock: Number(form.stock),
    category: form.category.trim(),
    batch: form.batch.trim(),
  }
  try {
    if (editing.value) {
      await adminApi.updateDrug(editing.value.id, payload)
      ElMessage.success('药品更新成功')
    } else {
      await adminApi.createDrug(payload)
      ElMessage.success('药品创建成功')
    }
    emitBusinessEvent('admin:changed', { entity: 'drugs' })
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
    await ElMessageBox.confirm(`确认删除药品「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await adminApi.deleteDrug(row.id)
    emitBusinessEvent('admin:changed', { entity: 'drugs' })
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
        <el-input v-model="keyword" placeholder="搜索药品 / 分类 / 批号" clearable style="width: 240px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="muted">共 {{ filteredList.length }} 种药品</span>
      </div>
      <div class="toolbar-left">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate">新增药品</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="filteredList" stripe>
      <template #empty>
        <el-empty description="暂无药品" :image-size="80" />
      </template>
      <el-table-column prop="name" label="药品名称" min-width="150" />
      <el-table-column prop="spec" label="规格" min-width="130">
        <template #default="{ row }">{{ row.spec || '-' }}</template>
      </el-table-column>
      <el-table-column prop="unit" label="单位" width="80">
        <template #default="{ row }">{{ row.unit || '-' }}</template>
      </el-table-column>
      <el-table-column label="单价" width="100">
        <template #default="{ row }"><span class="money">{{ formatMoney(row.price) }}</span></template>
      </el-table-column>
      <el-table-column label="库存" width="100">
        <template #default="{ row }">
          <span :class="{ 'low-stock': row.stock <= 20 }">{{ row.stock }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" min-width="110">
        <template #default="{ row }">{{ row.category || '-' }}</template>
      </el-table-column>
      <el-table-column prop="batch" label="批号" min-width="110">
        <template #default="{ row }">{{ row.batch || '-' }}</template>
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑药品' : '新增药品'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="grid-2">
          <el-form-item label="药品名称" prop="name">
            <el-input v-model="form.name" placeholder="如：阿莫西林胶囊" />
          </el-form-item>
          <el-form-item label="规格">
            <el-input v-model="form.spec" placeholder="如：0.25g*24粒" />
          </el-form-item>
          <el-form-item label="单位">
            <el-input v-model="form.unit" placeholder="如：盒" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="如：抗生素类" />
          </el-form-item>
          <el-form-item label="单价（元）" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" :step="0.5" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="库存数量" prop="stock">
            <el-input-number v-model="form.stock" :min="0" :precision="0" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="批号">
            <el-input v-model="form.batch" placeholder="可选" />
          </el-form-item>
        </div>
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

.low-stock {
  color: #c2410c;
  font-weight: 600;
}

@media (max-width: 560px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
