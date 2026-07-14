# Auth HTTP API

邮箱一次性密码登录服务。运行时需要 Node.js 24+，数据默认存放在 `data/auth.sqlite`，开发邮件默认发送到本机 Mailpit 的 SMTP `1025` 端口。

## 启动

```sh
pnpm install
pnpm start
```

环境变量：

- `PORT`：HTTP 端口，默认 `3000`
- `HOST`：监听地址，默认 `127.0.0.1`
- `DATABASE_PATH`：SQLite 文件，默认 `data/auth.sqlite`
- `AUTH_SECRET`：验证码哈希密钥；生产环境必须显式设置为至少 32 个字符
- `SMTP_HOST` / `SMTP_PORT`：默认 `127.0.0.1` / `1025`
- `MAIL_FROM`：默认 `login@example.test`
- `NODE_ENV`：设为 `production` 时强制检查 `AUTH_SECRET`

## API

请求验证码：

```http
POST /auth/code
Content-Type: application/json

{"email":"user@example.com"}
```

成功接受后返回 `202` 和 `challengeId`。验证码由邮件投递。

用验证码登录：

```http
POST /auth/session
Content-Type: application/json

{"challengeId":"...","code":"123456"}
```

成功返回 `201`，响应中的 `token` 是仅显示一次的会话凭证。随后可校验或退出当前会话：

```http
GET /auth/session
Authorization: Bearer <token>

DELETE /auth/session
Authorization: Bearer <token>
```

健康检查为 `GET /health`。运行测试：`pnpm test`。
