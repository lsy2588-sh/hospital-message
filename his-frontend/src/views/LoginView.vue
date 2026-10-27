<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi, doctorApi } from '@/api'
import { notifyError } from '@/api/http'
import { homePath, setDoctorId, setSession } from '@/stores/auth'

const route = useRoute()
const router = useRouter()

const tab = ref('login')
const loginRef = ref()
const registerRef = ref()
const loginLoading = ref(false)
const registerLoading = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  gender: 'M',
  age: 30,
  phone: '',
  id_card: '',
})

const demoAccounts = [
  { label: '管理员', username: 'admin', password: 'admin123' },
  { label: '医生', username: '张伟', password: 'doctor123' },
  { label: '收费员', username: 'cashier1', password: 'cashier123' },
  { label: '药师', username: 'pharmacist1', password: 'pharma123' },
  { label: '患者', username: 'patient1', password: 'patient123' },
]

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const validateConfirm = (rule, value, callback) => {
  if (value !== registerForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3-20 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }],
  id_card: [{ pattern: /^\d{17}[\dXx]$/, message: '请输入 18 位身份证号', trigger: 'blur' }],
}

function fillAccount(account) {
  tab.value = 'login'
  loginForm.username = account.username
  loginForm.password = account.password
}

async function handleLogin() {
  try {
    await loginRef.value.validate()
  } catch {
    return
  }

  loginLoading.value = true
  try {
    const data = await authApi.login({
      username: loginForm.username.trim(),
      password: loginForm.password,
    })
    setSession(data.token, data.user)

    // 医生登录后同步自身 doctorId，后续候诊列表查询会显式携带该参数
    if (data.user.role === 'doctor') {
      try {
        const registrations = await doctorApi.registrations()
        const doctorId = registrations.find((item) => item.doctor_id)?.doctor_id
        if (doctorId) setDoctorId(doctorId)
      } catch {
        // 暂无挂号记录时忽略，进入医生页后会继续补全 doctorId
      }
    }

    ElMessage.success('登录成功')
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : homePath()
    router.replace(target)
  } catch (error) {
    notifyError(error)
  } finally {
    loginLoading.value = false
  }
}

async function handleRegister() {
  try {
    await registerRef.value.validate()
  } catch {
    return
  }

  registerLoading.value = true
  try {
    await authApi.register({
      username: registerForm.username.trim(),
      password: registerForm.password,
      name: registerForm.name.trim(),
      gender: registerForm.gender,
      age: Number(registerForm.age) || 0,
      phone: registerForm.phone.trim(),
      id_card: registerForm.id_card.trim(),
    })
    ElMessage.success('注册成功，请使用新账号登录')
    loginForm.username = registerForm.username.trim()
    loginForm.password = ''
    tab.value = 'login'
    registerRef.value.resetFields()
  } catch (error) {
    notifyError(error)
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="visual">
      <div class="visual-inner">
        <div class="badge">HIS · 门诊挂号管理子系统</div>
        <h1>让每一次就诊<br />都有迹可循</h1>
        <p class="subtitle">挂号、看诊、开方、缴费、发药，一条闭环串联门诊全流程。</p>

        <ol class="flow">
          <li><span>01</span>患者挂号 · 扣减号源</li>
          <li><span>02</span>医生看诊 · 记录主诉</li>
          <li><span>03</span>开具处方 · 生成明细</li>
          <li><span>04</span>收费缴费 · 处方流转</li>
          <li><span>05</span>药师发药 · 扣减库存</li>
        </ol>
      </div>
      <div class="glow glow-a" />
      <div class="glow glow-b" />
    </section>

    <section class="panel-side">
      <div class="login-card">
        <div class="card-head">
          <h2>{{ tab === 'login' ? '欢迎回来' : '患者注册' }}</h2>
          <p>{{ tab === 'login' ? '请使用系统账号登录，系统将按角色进入对应工作台。' : '仅支持注册患者账号，注册后即可在线挂号。' }}</p>
        </div>

        <el-tabs v-model="tab" stretch>
          <el-tab-pane label="账号登录" name="login">
            <el-form ref="loginRef" :model="loginForm" :rules="loginRules" label-position="top" @submit.prevent="handleLogin">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" clearable>
                  <template #prefix><el-icon><User /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-form-item label="密码" prop="password">
                <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" show-password @keyup.enter="handleLogin">
                  <template #prefix><el-icon><Lock /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-button type="primary" size="large" class="submit" :icon="'Right'" :loading="loginLoading" @click="handleLogin">
                登录系统
              </el-button>
            </el-form>

            <div class="demo">
              <div class="demo-title">演示账号（点击自动填充）</div>
              <div class="demo-list">
                <button v-for="account in demoAccounts" :key="account.username" type="button" class="demo-chip" @click="fillAccount(account)">
                  <strong>{{ account.label }}</strong>
                  <span>{{ account.username }}</span>
                </button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="注册患者" name="register">
            <el-form ref="registerRef" :model="registerForm" :rules="registerRules" label-position="top">
              <div class="grid-2">
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="registerForm.username" placeholder="3-20 位字符" />
                </el-form-item>
                <el-form-item label="姓名" prop="name">
                  <el-input v-model="registerForm.name" placeholder="真实姓名" />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                  <el-input v-model="registerForm.password" type="password" placeholder="至少 6 位" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" show-password />
                </el-form-item>
                <el-form-item label="性别">
                  <el-radio-group v-model="registerForm.gender">
                    <el-radio value="M">男</el-radio>
                    <el-radio value="F">女</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="年龄">
                  <el-input-number v-model="registerForm.age" :min="0" :max="120" controls-position="right" />
                </el-form-item>
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="registerForm.phone" placeholder="11 位手机号" />
                </el-form-item>
                <el-form-item label="身份证号" prop="id_card">
                  <el-input v-model="registerForm.id_card" placeholder="18 位身份证号" />
                </el-form-item>
              </div>
              <el-button type="primary" size="large" class="submit" :icon="'Plus'" :loading="registerLoading" @click="handleRegister">
                注册患者账号
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <p class="login-foot">五步闭环 · 挂号 / 看诊 / 开方 / 缴费 / 发药</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  background: #eef4fc;
}

.visual {
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 20% 20%, #1e6fd9 0%, #0e2f5c 55%, #0a2245 100%);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 64px clamp(32px, 6vw, 88px);
}

.visual-inner {
  position: relative;
  z-index: 2;
  max-width: 480px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.visual h1 {
  margin: 26px 0 16px;
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.18;
  font-weight: 600;
  letter-spacing: 1px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.68);
  font-size: 14px;
  line-height: 1.8;
  max-width: 360px;
}

.flow {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
}

.flow li span {
  font-size: 11px;
  font-weight: 600;
  color: #8fc2ff;
  letter-spacing: 1px;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
}

.glow-a {
  width: 380px;
  height: 380px;
  background: #3b82f6;
  top: -80px;
  right: -120px;
}

.glow-b {
  width: 300px;
  height: 300px;
  background: #1d4ed8;
  bottom: -120px;
  left: -60px;
}

.panel-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px clamp(20px, 5vw, 64px);
}

.login-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 20px;
  padding: 36px 34px 30px;
  box-shadow: 0 30px 80px -40px rgba(14, 37, 66, 0.35);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.card-head h2 {
  font-size: 24px;
  font-weight: 600;
}

.card-head p {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--his-text-muted);
}

.submit {
  width: 100%;
  margin-top: 8px;
  letter-spacing: 2px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

.login-foot {
  margin-top: 22px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 1px;
  color: #a8b8cc;
}

.demo {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px dashed var(--his-border);
}

.demo-title {
  font-size: 12px;
  color: var(--his-text-muted);
  margin-bottom: 10px;
}

.demo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--his-border);
  background: #f7faff;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
}

.demo-chip:hover {
  border-color: var(--his-primary);
  background: #eef5ff;
}

.demo-chip strong {
  font-size: 12px;
  color: var(--his-text);
}

.demo-chip span {
  font-size: 11px;
  color: var(--his-text-muted);
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .visual {
    display: none;
  }

  .panel-side {
    min-height: 100vh;
    padding: 24px 16px;
  }
}

@media (max-width: 520px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
