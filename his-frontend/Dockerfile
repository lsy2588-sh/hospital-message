# ============================================================
# 前端 Dockerfile —— 两阶段构建（先打包，再用 nginx 托管静态文件）
# ============================================================

# ---------- 阶段 1：build（用 Node 把 Vue 源码打包成静态文件）----------
# 前端 Vite 8 要求 Node >= 20.19 / >= 22.12，故用 node:22
FROM node:22-alpine AS build

WORKDIR /app

# 先复制依赖清单，利用层缓存加速
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并打包（vite build 产出 dist/）
COPY . .
RUN npm run build

# ---------- 阶段 2：serve（用 nginx 托管打包产物，镜像更小、更安全）----------
FROM nginx:alpine

# 把打包好的 dist/ 复制到 nginx 默认网站目录
COPY --from=build /app/dist /usr/share/nginx/html

# 用我们自己的 nginx 配置覆盖默认配置（负责 SPA 路由回退 + /api 反代）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx 默认监听 80
EXPOSE 80

# 前台运行 nginx（容器内不能用后台模式，否则容器立刻退出）
CMD ["nginx", "-g", "daemon off;"]
