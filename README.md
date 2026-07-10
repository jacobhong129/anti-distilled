# 抗蒸性测试 Web App

面向外部用户的抗蒸性 / 含活人量测评页面。当前版本使用 React + Vite 开发，构建产物输出到 `web/`，Netlify 发布该目录。

## 目录结构

- `src/`: React 应用源码、评测引擎源码和结果视图逻辑。
- `config/game-config-v11.json`: 当前评测配置源。
- `public/assets/ui-art/`: 当前应用使用的正式视觉资产。
- `web/`: Vite 构建后的正式静态发布目录。
- `design/approved-uiux-v1/`: 已定稿的 UI/UX 视觉标准、页面稿和资产说明。
- `docs/`: 仅保留当前版本相关的准入、回归和样本依据文档。
- `scripts/`: 保留当前视觉资产生成与配置校验脚本。
- `DEPLOY.md`: 部署说明。

## 本地预览

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 发布

Netlify 使用 `netlify.toml` 执行 `npm run build`，然后发布 `web/` 目录。推送到 GitHub `main` 后，Netlify 会从仓库更新线上站点。

也可以在 GitHub Pages、云服务器、Nginx、OSS/CDN、Vercel 或 Cloudflare Pages 中直接选择 `web/` 目录部署。

## 校验

```bash
npm run test:app:unit
npm run build
npm run validate:config
npm run validate:engine
npm run regress
```

## 应用分层

- `src/app/`: 产品静态内容、结果视图模型、正式资产和会话持久化。
- `src/hooks/`: 配置加载、测评流程和弹窗可访问性等应用行为。
- `src/engine/`: 独立动态评测引擎，不依赖页面组件。
- `src/components/`: 跨页面基础组件与运行时错误边界。

会话缓存带配置版本与 24 小时有效期，配置升级时不会恢复不兼容的旧题目路径。
