const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`HIS 后端服务已启动: http://localhost:${config.port}`);
});
