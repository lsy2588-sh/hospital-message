# 医院门诊挂号管理子系统（HIS）

## 项目简介

本项目是医院信息系统（HIS）中的**门诊挂号管理子系统**，目标是用 Node.js + Express 实现一条完整的门诊业务闭环。

## 项目背景：五步业务闭环

本系统严格围绕以下五步闭环展开，每一步状态必须留痕：

```
① 患者挂号（扣减号源，挂号不收费）
       ↓
② 医生看诊（挂号单：候诊 → 就诊，并写入主诉/诊断）
       ↓
③ 医生开处方（生成处方，状态：待缴费，一个挂号单只一张处方）
       ↓
④ 收费员缴费（生成收费单，处方：待缴费 → 已缴费）
       ↓
⑤ 药师发药（扣减库存，处方：已缴费 → 已发药）✅ 闭环结束
```

## 角色体系（RBAC）

系统共 5 个角色，统一通过 `User.role` 字段区分与鉴权：

| 角色 | role 值 | 职责 |
|---|---|---|
| 管理员 | `admin` | 基础数据维护（科室/医生/排班/药品） |
| 医生 | `doctor` | 看诊、开处方 |
| 收费员 | `cashier` | 收费、生成收费单 |
| 药师 | `pharmacist` | 发药、扣减库存 |
| 患者 | `patient` | 挂号、查询自己的记录 |

## 技术栈

- Node.js + Express
- JWT（接口鉴权）
- bcryptjs（密码哈希）
- dotenv（环境变量，防敏感信息硬编码）
- 数据层：内存存储（预留 MySQL 扩展口）

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制示例文件并修改）
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 等

# 3. 初始化种子数据（预置科室/医生/排班/药品/演示账号）
npm run seed

# 4. 启动开发服务
npm run dev
```

服务默认运行在 `http://localhost:3000`。

## 演示账号（seed 预置）

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | admin | admin123 |
| 医生 | doctor1 | doctor123 |
| 收费员 | cashier1 | cashier123 |
| 药师 | pharmacist1 | pharma123 |
| 患者 | patient1 | patient123 |

## 项目结构

```
his-backend/
├── src/
│   ├── app.js              # Express 装配
│   ├── server.js           # 启动入口
│   ├── config/             # 端口、密钥等配置
│   ├── db/                 # 数据源（内存实现 + 预留 MySQL）
│   ├── models/             # 十大实体
│   ├── routes/             # 路由
│   ├── controllers/        # 控制器
│   ├── services/           # 业务逻辑层（状态流转）
│   ├── middlewares/        # 鉴权、权限、校验、错误处理
│   ├── utils/              # jwt、bcrypt、响应、ID 生成
│   └── seed/               # 种子数据
├── .env.example
├── package.json
└── README.md
```

## 接口文档

详见 [API_Docs.md](./API_Docs.md)；数据模型与 E-R 图详见 [Data_Model.md](./Data_Model.md)。
