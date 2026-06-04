# 抗蒸性测试 Web 应用部署说明

这是一个纯静态 Web 应用，不依赖后端服务。可直接部署到云服务器、Nginx、OSS/CDN、Vercel、Netlify、Cloudflare Pages 等静态托管环境。

## 部署内容

只需要发布 `web/` 目录下的文件：

- `index.html`
- `styles.css`
- `app.js`

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

## 火山引擎临时服务器部署

当前服务器的 OpenClaw 已占用公网 `18789` 端口，请不要复用该端口。建议把本测试页部署在 `18080`：

```bash
mkdir -p "$HOME/anti-distilled-web"
tar -xzf anti-distilled-web.tgz -C "$HOME/anti-distilled-web"
cd "$HOME/anti-distilled-web"
nohup python3 -m http.server 18080 --bind 0.0.0.0 > server.log 2>&1 &
curl -I http://127.0.0.1:18080/
```

公网访问地址：

```text
http://118.196.75.36:18080/
```

如果服务器本机 `curl` 正常，但公网打不开，需要在火山引擎安全组/防火墙放行入方向 TCP `18080`。如果 `18080` 已被占用，可改用 `18081`，同样需要放行对应公网端口。

本次已经生成可上传压缩包：

```text
deploy/anti-distilled-web.tgz
```
