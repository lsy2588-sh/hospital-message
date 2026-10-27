const express = require('express');
const helmet = require('helmet');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet()); // 安全响应头（X-Frame-Options / X-Content-Type-Options 等）（安全加固 S5）

app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 200, message: 'ok', data: { status: 'up' } }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
