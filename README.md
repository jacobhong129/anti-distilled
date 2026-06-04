# Anti-Distilled Web App

面向外部用户的 V4.1 抗蒸性 / 含活人量测评页面。

## 内容

- `web/`: 可直接部署的静态 Web 应用。
- `docs/`: 题目、评分、结果话术和评测设定文档。
- `DEPLOY.md`: 云服务器和静态托管部署说明。

## 本地预览

```bash
cd web
python3 -m http.server 4173
```

打开：

```text
http://localhost:4173/
```

## GitHub Pages

仓库包含 GitHub Pages 工作流：`.github/workflows/pages.yml`。

推送到 GitHub 后，Actions 会把 `web/` 目录作为静态站点发布。也可以在云服务器、Nginx、OSS/CDN、Vercel、Netlify 或 Cloudflare Pages 中直接选择 `web/` 目录部署。
