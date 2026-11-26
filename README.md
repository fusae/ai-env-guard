# AI Env Guard

在线网站：https://ai-env-guard.pages.dev

中英双语的网络与浏览器环境检测工具：IP / WebRTC / 时区与语言 / WebGL、WebDriver 与逻辑线程数。

## 功能

- `?lang=en` / `?lang=zh` 优先，其次使用已保存偏好，最后按浏览器语言选择；非中文语言默认英文。
- 所有界面文案、检测结论、复制提示与报告均支持中英切换。
- 红黄项显示一句建议、方案与优惠码；绿灯项只显示结论和轻量链接；原始数据收在「详情」里；不可用项目不推广。
- 复制报告仅包含评分、完成度和四项结论，不含原始 IP、位置、运营商、时区、语言、显卡标识或线程数。
- 完整 Open Graph / X 大图元数据；所有页面样式由本地 CSS 提供，无 Tailwind CDN 或外部字体请求。
- 硬件检测在浏览器本地执行；软件渲染、虚拟显卡和 WebDriver 仅作为线索。限制 GPU 访问或低线程数不作为风险。

## 开发、检查与部署

需要 Node.js 22.12+、Bun 1.3.5。

```sh
bun install --frozen-lockfile
npm test
npm run build
npm run dev
npm run deploy
```

`public/` 是可直接发布的静态文件；`build` 校验翻译、资源与元数据，再编译 Pages Functions。

`.github/workflows/deploy.yml` 在推送 `main` 时运行测试、构建和生产部署，也支持手动触发。所需 GitHub Actions 仓库 Secrets：

- `CLOUDFLARE_ACCOUNT_ID`：目标 Cloudflare 账户 ID。
- `CLOUDFLARE_API_TOKEN`：只限目标账户的 Cloudflare Pages Edit 权限；不可提交到仓库。

仍使用现有 `pages.dev` 域名。

## 可选飞书通知

```sh
npx wrangler pages secret put FEISHU_WEBHOOK_URL --project-name=ai-env-guard
npm run deploy
```

未配置时，跳转及优惠码复制正常工作，但不发送飞书通知。

## 检测范围

IP 检测查询 ipapi.is，4 秒超时后返回已知 ASN 信息或明确标记不可用；单个 IP 独立缓存，不能用邻居地址的信誉替代。四项数据不完整时不显示总分。语言偏好与线程数仅供查看，不扣分。分数不代表账号封禁概率或付款成功率。

WebRTC 使用 Google STUN；IPv4/IPv6 地址不同不一定代表泄露。浏览器隐私限制、VPN 和网络路由可能影响可见结果。

`/go/<target>` 只接受 `proxy`、`adspower`、`github`，其他值返回 404。

## 分享封面

文件：`public/assets/social-cover.png`（1732 × 908）。使用内置 imagegen 生成。

生成提示词：

> Use case: ads-marketing. Create a polished Open Graph social-sharing banner for a browser/network diagnostics website called AI ENV GUARD. Landscape 1200x630 (aspect 1.905:1). Dark navy almost-black background, crisp minimalist technical dashboard aesthetic with subtle thin grid. Exact large white title: "CHECK YOUR AI ENVIRONMENT". Small brand text "AI ENV GUARD". Two contrasting side-by-side diagnostic score rings: red on the left reads "35" with caption "SIGNALS TO REVIEW"; mint green on the right reads "100" with caption "CHECKS PASSED". Bottom labels "IP • WebRTC • Timezone • Hardware" and small "Illustrative scores". Clear typography, generous padding, legible thumbnail, flat vector-style rendering, subtle glow only around rings. No promise of account safety or guaranteed payments, no third-party logos, no photos, no watermark.

技术参考：[WebGL 扩展](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info)、[CPU 线程数](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)、[Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
