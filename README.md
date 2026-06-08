# 抗蒸性测试 Web App

面向外部用户的抗蒸性 / 含活人量测评页面。当前版本以 `web/` 为正式发布目录，并已按最终视觉方案完成端到端页面实现。

## 目录结构

- `web/`: 正式静态 Web 应用，Netlify 直接发布这个目录。
- `web/data/game-config.json`: 当前线上应用使用的评测配置。
- `web/assets/ui-art/`: 当前线上应用使用的视觉资产。
- `design/approved-uiux-v1/`: 已定稿的 UI/UX 视觉标准、页面稿和资产说明。
- `config/game-config-v10.10.json`: 当前评测配置的归档版本。
- `docs/`: 仅保留当前版本相关的准入、回归和样本依据文档。
- `scripts/`: 保留当前视觉资产生成与配置校验脚本。
- `DEPLOY.md`: 部署说明。

## 本地预览

```bash
cd web
python3 -m http.server 4173
```

打开：

```text
http://localhost:4173/
```

## 发布

Netlify 使用 `netlify.toml` 发布 `web/` 目录。推送到 GitHub `main` 后，Netlify 会从仓库更新线上站点。

也可以在 GitHub Pages、云服务器、Nginx、OSS/CDN、Vercel 或 Cloudflare Pages 中直接选择 `web/` 目录部署。

## 校验

```bash
node --check web/app.js
python3 scripts/validate_game_config.py web/data/game-config.json
```
