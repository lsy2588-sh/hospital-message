# ============================================================
# 后端 Dockerfile —— 把 Node 环境 + 依赖 + 代码封成镜像
# ============================================================

# ① 基础镜像：Node 22 官方镜像的 alpine 精简版（体积小、启动快）
FROM node:22-alpine

# ② 设定容器内的工作目录（后续命令都在这下面执行）
WORKDIR /app

# ③ 先只复制依赖清单，再安装依赖
#    这样做是为了利用 Docker 的"层缓存"：
#    只要 package.json / package-lock.json 不变，依赖就不用重装，构建飞快
COPY package.json package-lock.json ./

# ④ 安装依赖：npm ci 按 lock 文件精确安装（版本锁定，可复现）
RUN npm ci --omit=dev

# ⑤ 复制其余源码（src/、task4/ 等）
COPY . .

# ⑥ 声明运行环境为生产（会触发 config 里的 JWT_SECRET 强校验）
ENV NODE_ENV=production

# ⑦ 声明容器对外暴露的端口（后端监听 3000）
EXPOSE 3000

# ⑧ 容器启动时执行的命令（正式启动入口）
CMD ["node", "src/server.js"]
