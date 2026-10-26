# HIS 接口文档（前端联调用）

## 约定

- 基础路径：`/api`
- 除标注 `public` 外，所有接口需在请求头携带：`Authorization: Bearer <JWT>`
- **身份 id 一律由后端从 token 反查**：前端只传资源 id（如 `scheduleId`、`registrationId`），**永不传 `patientId` / `doctorId` / `cashierId`**。
- 统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

| code | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 / token 失效 |
| 403 | 无权限（角色或资源越权） |
| 404 | 资源不存在 |

---

## 一、认证 Auth

### 1. 患者注册
- `POST /api/auth/register`（public）
- 权限：无
- 校验：用户名唯一、密码长度 ≥ 6、手机号/身份证格式
- 说明：仅支持注册 `patient` 角色，注册时同时创建 `User` 和 `Patient`

### 2. 登录
- `POST /api/auth/login`（public）
- 权限：无
- 校验：用户名存在、bcrypt 密码比对
- 返回：`data.token`（JWT，内含 `userId`、`role`）

---

## 二、公共查询（任意登录角色）

| 方法 | 路径 | 说明 | 校验 |
|---|---|---|---|
| GET | `/api/departments` | 科室列表 | 登录即可 |
| GET | `/api/doctors?departmentId=` | 医生列表 | 可选按科室筛选 |
| GET | `/api/schedules?doctorId=&date=` | 排班号源（含剩余号源，无挂号费） | 登录即可 |
| GET | `/api/drugs` | 药品目录 | 仅 doctor / pharmacist |

---

## 三、患者端

| 方法 | 路径 | 权限 | 核心校验 |
|---|---|---|---|
| POST | `/api/registrations` | patient | 号源 `remaining_num > 0` 且 `AVAILABLE`；挂号成功原子扣减号源 |
| GET | `/api/registrations` | patient（本人） | 只能查自己的挂号 |
| GET | `/api/registrations/:id` | patient（本人） | 只能查自己的挂号详情 |
| POST | `/api/registrations/:id/cancel` | patient（本人） | 仅 `WAITING` 状态可取消，取消回补号源 |
| GET | `/api/prescriptions` | patient（本人） | 只能查自己的处方 |
| GET | `/api/prescriptions/:id` | patient（本人） | 只能查自己的处方详情（含状态） |
| GET | `/api/payments` | patient（本人） | 只能查自己的收费单 |

---

## 四、医生端

| 方法 | 路径 | 权限 | 核心校验 |
|---|---|---|---|
| GET | `/api/doctor/registrations?status=` | doctor | 只返回自己名下的挂号 |
| POST | `/api/doctor/registrations/:id/accept` | doctor（本人） | 挂号须为 `WAITING`；**一次完成**：改 `CONSULTING` + 写入主诉/诊断 |
| POST | `/api/doctor/prescriptions` | doctor | 开方须为本人名下 `CONSULTING` 状态的挂号；一个挂号单只一张处方；生成明细并算总额；处方 `PENDING`；挂号单 `CONSULTING → COMPLETED` |
| GET | `/api/doctor/prescriptions` | doctor（本人） | 回看自己开的处方列表 |
| GET | `/api/doctor/patients/:id/records` | doctor（本人患者） | 只能查自己名下患者的记录 |

**`POST /api/doctor/registrations/:id/accept` 请求体示例：**

```json
{
  "chief_complaint": "头痛伴发热三天",
  "diagnosis": "上呼吸道感染"
}
```

---

## 五、收费员端

| 方法 | 路径 | 权限 | 核心校验 |
|---|---|---|---|
| GET | `/api/cashier/prescriptions?status=PENDING` | cashier | 查待缴费处方 |
| POST | `/api/cashier/payments` | cashier | 处方须为 `PENDING`；**金额由后端取 `prescription.total_amount`，不信任前端传值**；生成收费单 `PAID`；处方 `PENDING → PAID` |

**`POST /api/cashier/payments` 请求体示例：**

```json
{
  "prescription_id": "xxx"
}
```

---

## 六、药师端

| 方法 | 路径 | 权限 | 核心校验 |
|---|---|---|---|
| GET | `/api/pharmacist/prescriptions?status=PAID` | pharmacist | 查已缴费待发药处方 |
| POST | `/api/pharmacist/prescriptions/:id/dispense` | pharmacist | 处方须为 `PAID` 且已缴费；**原子校验并扣减库存**（每个明细 `stock >= quantity`）；生成发药记录；处方 `PAID → DISPENSED` |

---

## 七、管理端 Admin（由管理端同学负责）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET/POST | `/api/admin/departments` | admin | 科室维护 |
| PUT/DELETE | `/api/admin/departments/:id` | admin | 科室更新/删除 |
| GET/POST | `/api/admin/doctors` | admin | 医生维护 |
| PUT/DELETE | `/api/admin/doctors/:id` | admin | 医生更新/删除 |
| GET/POST | `/api/admin/schedules` | admin | 排班号源维护 |
| PUT/DELETE | `/api/admin/schedules/:id` | admin | 排班更新/删除 |
| GET/POST | `/api/admin/drugs` | admin | 药品维护（含价格） |
| PUT/DELETE | `/api/admin/drugs/:id` | admin | 药品更新/删除 |
| GET | `/api/admin/users` | admin | 用户/角色管理 |

> 越权说明：收费员不能开处方、药师不能改价格、医生不能看收费流水，调用即返回 `403`。
