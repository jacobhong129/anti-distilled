# 抗蒸性测试 Web 应用部署说明

这是一个纯静态 Web 应用，不依赖后端服务。可直接部署到云服务器、Nginx、OSS/CDN、Vercel、Netlify、Cloudflare Pages 等静态托管环境。

## 部署内容

只需要发布 `web/` 目录：

- `index.html`
- `styles.css`
- `app.js`
- `adaptive-engine.js`
- `data/game-config.json`
- `assets/`

当前 Netlify 配置见 `netlify.toml`：

```toml
[build]
  publish = "web"
  command = ""
```

推送到 GitHub `main` 后，Netlify 会从仓库发布 `web/` 目录。

线上地址：

```text
https://anti-distilled.netlify.app/
```

## 发布前校验

```bash
node --check web/app.js
python3 scripts/validate_game_config.py web/data/game-config.json
```

## Nginx 部署示例

1. 上传文件到服务器：

```bash
scp -r web/* root@your-server:/var/www/anti-distilled/
```

2. 配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/anti-distilled;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. 重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

## 本地预览

```bash
cd web
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173/
```

## 面向用户版本说明

当前页面已经移除测试环境功能：

- 不展示虚拟用户回放。
- 不展示原始测量分。
- 不展示内部锚点命中。
- 不允许未答完提前看结果。
- 不暴露后台评分表或调试诊断。

用户只会看到测试入口、答题流程、最终结果、六维拆解和分享短句。
