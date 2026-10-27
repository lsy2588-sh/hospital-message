export const ROLE_LABELS = {
  admin: '管理员',
  doctor: '医生',
  cashier: '收费员',
  pharmacist: '药师',
  patient: '患者',
}

export const ROLE_HOME = {
  admin: '/admin',
  doctor: '/doctor',
  cashier: '/cashier',
  pharmacist: '/pharmacist',
  patient: '/patient',
}

// 账号 -> 真实姓名 映射（覆盖所有角色，供右上角「当前登录人」展示）
// 医生账号在 seed 中已直接用真实姓名（张伟/李娜/…），故无需映射，这里仅列出以便核对
export const ACCOUNT_REAL_NAME = {
  admin: '管理员',
  cashier1: '李四',
  cashier2: '李静',
  pharmacist1: '王五',
  pharmacist2: '王芳',
  patient1: '王小明',
  patient2: '李红',
  patient3: '张三',
  patient4: '刘洋',
  patient5: '陈晨',
  patient6: '赵敏',
  patient7: '黄伟',
  patient8: '周芳',
  patient9: '吴磊',
  patient10: '徐静',
  patient11: '孙丽',
  patient12: '马超',
}

export const MENU_BY_ROLE = {
  patient: [{ path: '/patient', label: '门诊挂号', icon: 'Calendar' }],
  doctor: [{ path: '/doctor', label: '医生工作站', icon: 'FirstAidKit' }],
  cashier: [{ path: '/cashier', label: '收费工作站', icon: 'Wallet' }],
  pharmacist: [{ path: '/pharmacist', label: '药房发药', icon: 'Goods' }],
  admin: [{ path: '/admin', label: '管理后台', icon: 'Setting' }],
}

export const REGISTRATION_STATUS = {
  WAITING: { label: '待候诊', type: 'warning' },
  CONSULTING: { label: '接诊中', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' },
}

export const PRESCRIPTION_STATUS = {
  PENDING: { label: '待缴费', type: 'warning' },
  PAID: { label: '已缴费', type: 'primary' },
  DISPENSED: { label: '已发药', type: 'success' },
}

export const SCHEDULE_STATUS = {
  AVAILABLE: { label: '可挂号', type: 'success' },
  CLOSED: { label: '已停诊', type: 'info' },
}

export const PAYMENT_STATUS = {
  PAID: { label: '已缴费', type: 'success' },
  UNPAID: { label: '未缴费', type: 'warning' },
}

export const USER_STATUS = {
  ACTIVE: { label: '正常', type: 'success' },
  DISABLED: { label: '已禁用', type: 'danger' },
}

export const STATUS_MAPS = {
  registration: REGISTRATION_STATUS,
  prescription: PRESCRIPTION_STATUS,
  schedule: SCHEDULE_STATUS,
  payment: PAYMENT_STATUS,
  user: USER_STATUS,
}

export const TIME_SLOT_LABELS = {
  AM: '上午',
  PM: '下午',
}

export const GENDER_LABELS = {
  M: '男',
  F: '女',
}

export const REGISTRATION_STATUS_OPTIONS = Object.entries(REGISTRATION_STATUS).map(
  ([value, meta]) => ({ value, label: meta.label }),
)

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export const USER_STATUS_OPTIONS = Object.entries(USER_STATUS).map(([value, meta]) => ({
  value,
  label: meta.label,
}))
