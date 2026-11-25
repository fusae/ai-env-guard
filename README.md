# AI Env Guard

按提供的脚本部署的 Cloudflare Pages 网站，包含浏览器环境检测、联盟链接跳转及可选飞书通知。

## 开发与部署

Node.js 22.12+；使用 Bun 安装锁定依赖：

```sh
bun install --frozen-lockfile
npm run dev
npx wrangler login
npx wrangler pages project create ai-env-guard --production-branch=main
npm run deploy
```

Cloudflare Pages 直接上传会同时编译根目录的 `functions/`。
推送 GitHub 不会自动触发部署，更新后执行 `npm run deploy`。

## 可选飞书通知

```sh
npx wrangler pages secret put FEISHU_WEBHOOK_URL --project-name=ai-env-guard
npm run deploy
```

Webhook 只存储为 Cloudflare Secret，禁止提交到仓库。未配置时，联盟跳转正常工作，但不发送通知。

## 原始版本的功能边界

- 中英文按钮当前只切换主标题，未实现全站翻译。
- 检测分数是启发式计算，不能预测或保证账号安全、付款成功。
- 地址池是预置示例；付款账单资料应与本人及发卡行记录一致。
- IP 检测会查询第三方 ipapi.is；其可用性与配额影响结果。
- 页面样式依赖 Tailwind CDN；可选 KV 默认未启用。
