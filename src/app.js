const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet()); // 安全响应头（X-Frame-Options / X-Content-Type-Options 等）（安全加固 S5）

app.use(cors()); // 跨域：前后端分离部署时，前端从别的域名直接调后端 API（生产可按域名收紧白名单）

app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 200, message: 'ok', data: { status: 'up' } }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
