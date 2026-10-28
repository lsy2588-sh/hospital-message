const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const audit = require('./middlewares/audit');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet()); // 安全响应头（X-Frame-Options / X-Content-Type-Options 等）（安全加固 S5）

app.use(cors()); // 跨域：前后端分离部署时，前端从别的域名直接调后端 API（生产可按域名收紧白名单）

app.use(express.json());

app.use(audit); // 审计日志：记录每次 API 调用（谁/何时/调了什么/状态码）

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 200, message: 'ok', data: { status: 'up' } }));

app.use('/api', routes);

// 单进程部署模式：若存在前端构建产物（his-frontend/dist），由后端同源托管前端静态文件
const distDir = path.join(__dirname, '..', 'his-frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA 路由回退：非 /api 的 GET 请求都返回 index.html（由 Vue Router 处理）
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
