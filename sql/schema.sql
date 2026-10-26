-- ============================================================
-- HIS 医院门诊挂号管理子系统 - 数据库建表脚本
-- 数据库：MySQL 8.x (InnoDB / utf8mb4)
-- 说明：共 11 张表 = 鉴权底座 users + 十大核心业务实体
-- 注：按外键依赖顺序创建（先主表后子表）
-- ============================================================

CREATE DATABASE IF NOT EXISTS his DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE his;

-- ------------------------------------------------------------
-- 0. 用户表（鉴权底座，不属于十大业务实体）
-- ------------------------------------------------------------
CREATE TABLE users (
  id            VARCHAR(64)  NOT NULL COMMENT '主键',
  username      VARCHAR(64)  NOT NULL COMMENT '登录名',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  role          ENUM('admin','doctor','cashier','pharmacist','patient') NOT NULL COMMENT '角色',
  status        ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE' COMMENT '状态',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户（鉴权底座）';

-- ------------------------------------------------------------
-- 3. 科室（Department）
-- ------------------------------------------------------------
CREATE TABLE departments (
  id          VARCHAR(64)  NOT NULL COMMENT '主键',
  name        VARCHAR(64)  NOT NULL COMMENT '科室名',
  description VARCHAR(255) DEFAULT NULL COMMENT '描述',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科室';

-- ------------------------------------------------------------
-- 2. 医生（Doctor）
-- ------------------------------------------------------------
CREATE TABLE doctors (
  id            VARCHAR(64) NOT NULL COMMENT '主键',
  user_id       VARCHAR(64) NOT NULL COMMENT 'FK -> users.id',
  name          VARCHAR(64) NOT NULL COMMENT '姓名',
  title         VARCHAR(32) DEFAULT NULL COMMENT '职称',
  department_id VARCHAR(64) NOT NULL COMMENT 'FK -> departments.id',
  phone         VARCHAR(20) DEFAULT NULL COMMENT '电话',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user (user_id),
  KEY idx_department (department_id),
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_doctors_dept FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医生';

-- ------------------------------------------------------------
-- 1. 患者（Patient）
-- ------------------------------------------------------------
CREATE TABLE patients (
  id         VARCHAR(64) NOT NULL COMMENT '主键',
  user_id    VARCHAR(64) NOT NULL COMMENT 'FK -> users.id',
  name       VARCHAR(64) NOT NULL COMMENT '姓名',
  gender     ENUM('M','F') DEFAULT NULL COMMENT '性别',
  age        INT          DEFAULT NULL COMMENT '年龄',
  phone      VARCHAR(20)  DEFAULT NULL COMMENT '电话',
  id_card    VARCHAR(32)  DEFAULT NULL COMMENT '身份证',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user (user_id),
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='患者';

-- ------------------------------------------------------------
-- 4. 排班号源（Schedule）
-- ------------------------------------------------------------
CREATE TABLE schedules (
  id            VARCHAR(64) NOT NULL COMMENT '主键',
  doctor_id     VARCHAR(64) NOT NULL COMMENT 'FK -> doctors.id',
  department_id VARCHAR(64) NOT NULL COMMENT 'FK -> departments.id',
  work_date     DATE         NOT NULL COMMENT '出诊日期',
  time_slot     ENUM('AM','PM') NOT NULL COMMENT '上午/下午',
  total_num     INT          NOT NULL DEFAULT 0 COMMENT '总号源',
  remaining_num INT          NOT NULL DEFAULT 0 COMMENT '剩余号源',
  status        ENUM('AVAILABLE','CLOSED') NOT NULL DEFAULT 'AVAILABLE' COMMENT '状态',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doctor (doctor_id),
  KEY idx_dept (department_id),
  CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id),
  CONSTRAINT fk_schedules_dept FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排班号源';

-- ------------------------------------------------------------
-- 5. 挂号单（Registration）
-- ------------------------------------------------------------
CREATE TABLE registrations (
  id              VARCHAR(64) NOT NULL COMMENT '主键',
  registration_no VARCHAR(64) NOT NULL COMMENT '挂号单号',
  patient_id      VARCHAR(64) NOT NULL COMMENT 'FK -> patients.id',
  schedule_id     VARCHAR(64) NOT NULL COMMENT 'FK -> schedules.id',
  doctor_id       VARCHAR(64) NOT NULL COMMENT 'FK -> doctors.id',
  department_id   VARCHAR(64) NOT NULL COMMENT 'FK -> departments.id',
  chief_complaint TEXT COMMENT '主诉（看诊时写入）',
  diagnosis       TEXT COMMENT '诊断（看诊时写入）',
  status          ENUM('WAITING','CONSULTING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING' COMMENT '候诊/就诊/完成/取消',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_no (registration_no),
  KEY idx_patient (patient_id),
  KEY idx_doctor (doctor_id),
  CONSTRAINT fk_reg_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_reg_schedule FOREIGN KEY (schedule_id) REFERENCES schedules (id),
  CONSTRAINT fk_reg_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id),
  CONSTRAINT fk_reg_dept FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='挂号单';

-- ------------------------------------------------------------
-- 8. 药品库存（Drug）
-- ------------------------------------------------------------
CREATE TABLE drugs (
  id         VARCHAR(64)   NOT NULL COMMENT '主键',
  name       VARCHAR(64)   NOT NULL COMMENT '药品名',
  spec       VARCHAR(64)   DEFAULT NULL COMMENT '规格',
  unit       VARCHAR(16)   DEFAULT NULL COMMENT '单位',
  price      DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '单价',
  stock      INT           NOT NULL DEFAULT 0 COMMENT '库存',
  category   VARCHAR(64)   DEFAULT NULL COMMENT '分类',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='药品库存';

-- ------------------------------------------------------------
-- 6. 处方（Prescription）
-- ------------------------------------------------------------
CREATE TABLE prescriptions (
  id              VARCHAR(64)   NOT NULL COMMENT '主键',
  registration_id VARCHAR(64)   NOT NULL COMMENT 'FK -> registrations.id（1:1）',
  patient_id      VARCHAR(64)   NOT NULL COMMENT 'FK -> patients.id',
  doctor_id       VARCHAR(64)   NOT NULL COMMENT 'FK -> doctors.id',
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '合计金额',
  status          ENUM('PENDING','PAID','DISPENSED','CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '待缴费/已缴费/已发药/取消',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_registration (registration_id),
  KEY idx_patient (patient_id),
  KEY idx_doctor (doctor_id),
  CONSTRAINT fk_rx_reg FOREIGN KEY (registration_id) REFERENCES registrations (id),
  CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_rx_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='处方';

-- ------------------------------------------------------------
-- 7. 处方明细（PrescriptionItem）
-- ------------------------------------------------------------
CREATE TABLE prescription_items (
  id              VARCHAR(64)   NOT NULL COMMENT '主键',
  prescription_id VARCHAR(64)   NOT NULL COMMENT 'FK -> prescriptions.id',
  drug_id         VARCHAR(64)   NOT NULL COMMENT 'FK -> drugs.id',
  quantity        INT           NOT NULL DEFAULT 1 COMMENT '数量',
  unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '单价快照',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '小计',
  dosage          VARCHAR(255) DEFAULT NULL COMMENT '用法用量',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prescription (prescription_id),
  KEY idx_drug (drug_id),
  CONSTRAINT fk_item_rx FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
  CONSTRAINT fk_item_drug FOREIGN KEY (drug_id) REFERENCES drugs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='处方明细';

-- ------------------------------------------------------------
-- 9. 收费单（Payment）
-- ------------------------------------------------------------
CREATE TABLE payments (
  id              VARCHAR(64)   NOT NULL COMMENT '主键',
  payment_no      VARCHAR(64)   NOT NULL COMMENT '收费单号',
  prescription_id VARCHAR(64)   NOT NULL COMMENT 'FK -> prescriptions.id',
  patient_id      VARCHAR(64)   NOT NULL COMMENT 'FK -> patients.id',
  cashier_id      VARCHAR(64)   NOT NULL COMMENT 'FK -> users.id（收费员）',
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '实收金额',
  status          ENUM('PAID','REFUNDED') NOT NULL DEFAULT 'PAID' COMMENT '已缴/已退',
  paid_at         DATETIME DEFAULT NULL COMMENT '缴费时间',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_no (payment_no),
  KEY idx_prescription (prescription_id),
  KEY idx_patient (patient_id),
  CONSTRAINT fk_pay_rx FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
  CONSTRAINT fk_pay_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_pay_cashier FOREIGN KEY (cashier_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收费单';

-- ------------------------------------------------------------
-- 10. 发药记录（DispenseRecord）
-- ------------------------------------------------------------
CREATE TABLE dispense_records (
  id              VARCHAR(64) NOT NULL COMMENT '主键',
  prescription_id VARCHAR(64) NOT NULL COMMENT 'FK -> prescriptions.id',
  pharmacist_id   VARCHAR(64) NOT NULL COMMENT 'FK -> users.id（药师）',
  status          ENUM('DISPENSED') NOT NULL DEFAULT 'DISPENSED' COMMENT '状态',
  dispensed_at    DATETIME DEFAULT NULL COMMENT '发药时间',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prescription (prescription_id),
  CONSTRAINT fk_disp_rx FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
  CONSTRAINT fk_disp_pharmacist FOREIGN KEY (pharmacist_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发药记录';
