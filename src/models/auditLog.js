// ============================================================
// 内存审计日志（记录「谁 + 何时 + 调了什么接口 + 结果」）
// 与 mockDb 分开，不依赖 seed；重启后自动清空（内存存储）
// ============================================================
const { genId } = require('../utils/idGenerator');

const MAX_LOGS = 1000; // 最多保留 1000 条，防止内存无限增长

let logs = [];

const record = (entry) => {
  const log = {
    id: genId('audit_'),
    ...entry,
    created_at: new Date().toISOString(),
  };
  logs.push(log);
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  return log;
};

// 最新在前
const list = () => [...logs].reverse();

const reset = () => { logs = []; };

module.exports = { record, list, reset };
