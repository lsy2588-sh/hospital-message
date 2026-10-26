# HIS 数据模型与鉴权设计

## 一、角色说明

统一通过 `User.role` 区分鉴权，共 5 个角色：

`admin` 管理员 / `doctor` 医生 / `cashier` 收费员 / `pharmacist` 药师 / `patient` 患者

---

## 二、实体结构（十大实体 + 鉴权底座）

### 0. User（鉴权底座，不属于十大业务实体）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| username | string | 登录名，唯一 |
| password_hash | string | bcrypt 哈希，禁存明文 |
| role | enum | admin/doctor/cashier/pharmacist/patient |
| status | enum | ACTIVE/DISABLED |

### 1. Patient（患者）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| user_id | string | FK → User |
| name | string | |
| gender | enum | M/F |
| age | number | |
| phone | string | |
| id_card | string | |

### 2. Doctor（医生）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| user_id | string | FK → User |
| name | string | |
| title | string | 职称 |
| department_id | string | FK → Department |

### 3. Department（科室）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| name | string | 唯一 |
| description | string | |

### 4. Schedule（排班号源）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| doctor_id | string | FK → Doctor |
| department_id | string | FK → Department |
| work_date | date | |
| time_slot | enum | AM/PM |
| total_num | number | 总号源 |
| remaining_num | number | 剩余号源（挂号原子扣减） |
| status | enum | AVAILABLE/CLOSED |

> 说明：挂号不收费，已删除 `fee` 字段。

### 5. Registration（挂号单）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| registration_no | string | 挂号单号 |
| patient_id | string | FK → Patient |
| schedule_id | string | FK → Schedule |
| doctor_id | string | FK → Doctor |
| department_id | string | FK → Department |
| chief_complaint | string | 主诉（看诊时由 accept 接口写入） |
| diagnosis | string | 诊断（看诊时由 accept 接口写入） |
| status | enum | WAITING 候诊 / CONSULTING 就诊 / COMPLETED 完成 / CANCELLED 取消 |

### 6. Prescription（处方）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| registration_id | string | FK → Registration（1:1，一个挂号单只一张处方） |
| patient_id | string | FK → Patient |
| doctor_id | string | FK → Doctor |
| total_amount | decimal | 合计金额 |
| status | enum | PENDING 待缴费 / PAID 已缴费 / DISPENSED 已发药 / CANCELLED 取消 |

### 7. PrescriptionItem（处方明细）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| prescription_id | string | FK → Prescription |
| drug_id | string | FK → Drug |
| quantity | number | 数量 |
| unit_price | decimal | 开方时单价快照（取自 Drug.price） |
| subtotal | decimal | 小计 |
| dosage | string | 用法用量 |

### 8. Drug（药品库存）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| name | string | 药品名 |
| spec | string | 规格 |
| unit | string | 单位 |
| price | decimal | 单价（仅 admin 可改） |
| stock | number | 库存（发药原子扣减） |
| category | string | 分类 |

### 9. Payment（收费单）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| payment_no | string | 收费单号 |
| prescription_id | string | FK → Prescription |
| patient_id | string | FK → Patient |
| cashier_id | string | FK → User（收费员） |
| amount | decimal | 实收金额（由后端取处方 total_amount） |
| status | enum | PAID（预留 REFUNDED 扩展位） |

### 10. DispenseRecord（发药记录）
| 字段 | 类型 | 主/外键 |
|---|---|---|
| id | string | PK |
| prescription_id | string | FK → Prescription |
| pharmacist_id | string | FK → User（药师） |
| status | enum | DISPENSED |

---

## 三、E-R 关系

```
User 1─1 Patient
User 1─1 Doctor
Department 1─N Doctor 1─N Schedule
Department 1─N Schedule
Schedule 1─N Registration N─1 Patient
Registration 1─1 Prescription 1─N PrescriptionItem N─1 Drug
Prescription 1─1 Payment N─1 User(cashier)
Prescription 1─1 DispenseRecord N─1 User(pharmacist)
```

---

## 四、业务状态流转（五步闭环）

| 步骤 | 操作角色 | 状态变化 |
|---|---|---|
| ① 挂号 | patient | `Schedule.remaining_num - 1`（原子扣减）；新建 Registration（WAITING） |
| ② 看诊 | doctor | Registration：WAITING → CONSULTING；同时写入主诉/诊断 |
| ③ 开处方 | doctor | 新建 Prescription（PENDING）+ 明细；Registration：CONSULTING → COMPLETED |
| ④ 缴费 | cashier | 校验 PENDING；新建 Payment（PAID，金额=处方 total_amount）；Prescription：PENDING → PAID |
| ⑤ 发药 | pharmacist | 校验 PAID 且已缴费；`Drug.stock - 数量`（原子扣减，校验库存充足）；新建 DispenseRecord；Prescription：PAID → DISPENSED |

- 取消挂号（仅 WAITING）：`Schedule.remaining_num + 1` 回补号源
- 一个挂号单只允许开一张处方（1:1）
- 挂号不收费；退费本期不做（Payment 保留 REFUNDED 扩展位）

---

## 五、依赖注入式鉴权设计

核心：一个高阶中间件工厂函数，接收「允许的角色数组」，返回真正的中间件。

```js
const requireRole = (...allowedRoles) => (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const payload = verifyJwt(token);          // 失败 -> 401
  if (!allowedRoles.includes(payload.role))   // 不在白名单 -> 403
    return res.status(403).json({ code: 403, message: '无权限' });
  req.user = payload;                         // 注入用户信息
  next();
};
```

- 用法：`router.post('/prescriptions', requireRole('doctor'), ctrl.create);`
- 叠加「资源归属二次校验」：患者只能访问自己的资源，医生只能访问自己名下的资源。
- **身份 id 反查约定**：`patientId`/`doctorId`/`cashierId` 一律由后端从 `token.userId` 反查，前端不传身份 id。

---

## 六、安全防范（四大红线 + 并发防护）

1. **SQL 注入**：所有 DB 访问走参数化查询/占位符，禁止字符串拼接 SQL。
2. **越权访问**：JWT 鉴权（角色白名单）+ 资源归属二次校验双保险，越权返回 403。
3. **敏感信息硬编码**：`JWT_SECRET` 等放 `.env`，`.gitignore` 排除 `.env`，代码零明文密钥。
4. **输入不校验**：统一校验中间件做白名单/长度/类型/格式校验，非法输入返回 400。

### 并发与防重（扣减环节硬规则）

- **挂号扣号源**：「校验 `remaining_num > 0` + 扣减」必须原子完成。
- **发药扣库存**：「校验处方 `PAID` + 校验 `stock >= quantity` + 扣减」必须原子完成，靠状态机防重复发药。
- **缴费防重**：校验处方 `PENDING`，缴费后变 `PAID`，重复缴费 → 400。
- **开方防重**：校验挂号单 `CONSULTING`，开方后变 `COMPLETED`，同一挂号单无法开第二张处方。
- **金额安全**：收费金额由后端取处方 `total_amount`，前端传值一律忽略。
