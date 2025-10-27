# 爱情宇宙法庭 · MVP

## 项目简介

基于 uni-app (Vue 3 + TypeScript) 构建的微信小程序 MVP，提供情感检举、案情总结与大法官判决以及分享功能。项目默认支持直连 Dify API，同时提供本地 Mock 以便在无后端时演示完整流程。

## 目录结构

```
project-root/
├─ pages.json            # 小程序页面与全局样式配置
├─ manifest.json         # uni-app 平台配置
├─ uni.scss              # 全局样式
├─ .env.example          # 环境变量示例
├─ src/
│  ├─ app.vue
│  ├─ main.ts
│  ├─ types.d.ts         # 共享数据类型
│  ├─ utils/             # API、存储、守卫工具
│  ├─ composables/       # 业务逻辑 hooks
│  ├─ pages/             # 三个业务页面
│  ├─ components/        # UI 组件
│  ├─ styles/            # SCSS 变量
│  └─ mocks/             # Mock 数据
└─ ...
```

## 环境变量配置

复制 `.env.example` 为 `.env`，并填写真实的 Dify 服务地址与密钥：

```
DIFY_BASE_URL=https://your-dify-host
DIFY_API_KEY=your-api-key
USE_MOCK=false
```

- `USE_MOCK=true` 时，将完全启用本地 Mock，适合演示或离线开发。
- 小程序端可通过 `manifest.json` / `ext.json` 或构建工具注入上述变量。

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动微信小程序开发调试：
   ```bash
   npm run dev:mp-weixin
   ```
   使用 HBuilderX 或 `@dcloudio/uni-app` CLI 构建到 `mp-weixin` 目录后，导入微信开发者工具。

## 构建发布

```bash
npm run build:mp-weixin
```

构建完成后，`dist/build/mp-weixin` 即为可导入微信开发者工具的项目包。

## Dify API 对接

- 检举流程接口：`POST /v1/chat-messages`
- 大法官审判接口：`POST /v1/judge`

在 `src/utils/apiClient.ts` 中集中配置了 Base URL、鉴权 Header、错误处理与 Mock 逻辑，可根据实际返回结构进行适配。

## Mock 演示

将环境变量 `USE_MOCK` 设为 `true` 后：

- 检举流程会在第 3 轮回复生成包含 `summary` 的示例数据。
- 判决接口返回固定的结构化判决。

Mock 数据位于 `src/mocks/` 目录，可按需调整。

## 代码质量

- ESLint + Prettier 提供基础规范：
  ```bash
  npm run lint
  npm run format
  ```
- TypeScript 严格模式开启，推荐保持类型注释完整。

## 功能亮点

- 对话消息、摘要与会话 ID 持久化，返回检举页可继续。
- 判决页支持复制 `share_summary` 到剪贴板，并实现好友/朋友圈分享钩子。
- 错误状态下提供重试提示，Mock 模式下全流程可用。
