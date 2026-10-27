import { createRouter, createWebHistory } from 'vue-router'
import { auth, homePath, isLoggedIn } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'root', redirect: () => homePath() },
      {
        path: 'patient',
        name: 'patient',
        component: () => import('@/views/PatientView.vue'),
        meta: { title: '门诊挂号', roles: ['patient'] },
      },
      {
        path: 'doctor',
        name: 'doctor',
        component: () => import('@/views/DoctorView.vue'),
        meta: { title: '医生工作站', roles: ['doctor'] },
      },
      {
        path: 'cashier',
        name: 'cashier',
        component: () => import('@/views/CashierView.vue'),
        meta: { title: '收费工作站', roles: ['cashier'] },
      },
      {
        path: 'pharmacist',
        name: 'pharmacist',
        component: () => import('@/views/PharmacistView.vue'),
        meta: { title: '药房发药', roles: ['pharmacist'] },
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/AdminView.vue'),
        meta: { title: '管理后台', roles: ['admin'] },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: '无权限' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} · HIS 门诊挂号`
    : 'HIS 门诊挂号管理子系统'

  if (to.meta.public) {
    if (to.name === 'login' && isLoggedIn()) return homePath()
    return true
  }

  if (!isLoggedIn()) {
    const redirect = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    return { name: 'login', query: redirect }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {
    return { name: 'forbidden' }
  }

  return true
})

export default router
