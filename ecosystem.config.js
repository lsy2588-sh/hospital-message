// PM2 进程守护配置（生产环境部署用）
// 安装：npm install -g pm2
// 启动：pm2 start ecosystem.config.js
// 说明：本系统数据为内存存储，PM2 重启会自动重置数据（见部署运维文档）
module.exports = {
  apps: [
    {
      name: 'his-backend',
      cwd: './',
      script: 'src/server.js',
      instances: 1, // 内存存储，必须单实例，不能开 cluster
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // 生产环境 JWT_SECRET 必须 >= 32 位随机字符串，否则服务拒绝启动
        JWT_SECRET: 'CHANGE_ME_USE_A_LONG_RANDOM_STRING',
        JWT_EXPIRES_IN: '7d',
        RATE_LIMIT_MAX: 20,
      },
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
};
