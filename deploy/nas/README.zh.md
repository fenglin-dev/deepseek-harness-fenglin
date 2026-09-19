# NAS 部署（预览）

[English](README.md) | 中文

此 Compose 方案在 NAS 上运行 Harness，并让桌面客户端共享 `/config` 中的插件、模型配置和历史记录，以及 `/workspaces` 中的工作区。容器不会挂载 Docker Socket，也不会把 Harness 的 HTTP 端口暴露到局域网；只有 Caddy 的 HTTPS 端口对外开放。

## 启动

1. 复制 `.env.example` 为 `.env`，设置 NAS 专用的根域名，例如 `harness.local`。v1 不支持子路径。
2. 确保该域名在每台电脑上解析到 NAS，并确保 `CONFIG_PATH`、`WORKSPACES_PATH` 可由 `PUID:PGID` 写入。
3. 在仓库根目录执行 `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml up -d --build`。
4. 查看 `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml logs harness`，取得十分钟内有效的一次性八位配对码。
5. 在 NAS 管理终端运行 `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml run --rm identity`，取得站点证书的 TLS SHA-256 指纹。
6. 在桌面端“设置 → 运行端与 NAS”输入 `https://<NAS_HOSTNAME>`。首次连接会显示 TLS SHA-256 指纹；必须与上一步通过 NAS 管理终端取得的值一致，再输入配对码。

Caddy 首次启动会生成内部 CA 与站点证书，并把状态保存在 `caddy_data` 卷。重建容器不会改变证书；删除该卷会改变指纹，桌面端将拒绝旧连接，必须重新核对并配对。

配对码连续输错十次后会被锁定，需等待当前十分钟窗口到期并从日志取得新码。设备令牌默认有效 90 天；可以在桌面设置中查看并撤销已配对设备。

`discovery` 服务使用 Linux host 网络发布 `_open-dsh._tcp.local` mDNS 记录，桌面端可以据此预填地址。发现记录不是信任凭据，仍必须核对证书并输入配对码。若 NAS 不允许 host 网络或 UDP 5353，请删除或禁用该服务并手动输入地址；核心连接不依赖 mDNS。

## 数据与恢复

- `/config` 是必须备份的 Harness 数据目录，包含历史记录、插件和模型设置。
- `/workspaces` 是共享工作目录。默认不会自动迁移任何桌面文件；请由用户显式复制。
- 升级前先备份两个挂载目录。当前预览版不会访问 Docker Socket，也不会自动更新容器。
- 桌面离线时不会静默回退到本机 Harness。可在连接页重试或切回本机。

若使用已有受信任的 HTTPS 反向代理，可只运行 `harness` 服务并把代理转发到同一 Docker 网络内的 `harness:3080`。不要直接向局域网发布 3080 端口。
