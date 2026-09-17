# NAS deployment (preview)

English | [中文](README.zh.md)

This Compose deployment runs Harness on a NAS. Desktop clients share plugins, model settings, and sessions under `/config`, plus workspaces under `/workspaces`. The stack neither mounts the Docker socket nor publishes Harness HTTP to the LAN; only Caddy HTTPS is exposed.

## Start

1. Copy `.env.example` to `.env` and configure a dedicated root hostname such as `harness.local`. Version 1 does not support a URL subpath.
2. Make the hostname resolve to the NAS from every client, and make `CONFIG_PATH` and `WORKSPACES_PATH` writable by `PUID:PGID`.
3. From the repository root, run `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml up -d --build`.
4. Run `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml logs harness` and read the one-time eight-digit pairing code, which is valid for ten minutes.
5. On the NAS administration terminal, run `docker compose --env-file deploy/nas/.env -f deploy/nas/compose.yaml run --rm identity` to read the site certificate's TLS SHA-256 fingerprint.
6. In Desktop, open **Settings → Runtime & NAS** and enter `https://<NAS_HOSTNAME>`. Require the displayed fingerprint to match the independently observed value before entering the pairing code.

Caddy creates an internal CA and site certificate on first start and persists them in `caddy_data`. Recreating containers does not change the certificate. Deleting that volume changes the fingerprint, so Desktop rejects the previous identity until it is reviewed and paired again.

Ten consecutive invalid code attempts lock the current pairing window. Wait for the ten-minute window to rotate and read the new code from the log. Device grants expire after 90 days by default and can be listed or revoked from Desktop settings.

The `discovery` service uses Linux host networking to publish `_open-dsh._tcp.local` over mDNS. Desktop uses it only to suggest an address; certificate review and pairing remain mandatory. If the NAS cannot grant host networking or UDP 5353, disable that service and enter the HTTPS origin manually. Core connectivity does not depend on mDNS.

## Data and recovery

- `/config` is the required Harness backup target and contains sessions, plugins, and model settings.
- `/workspaces` contains shared workspaces. The deployment does not migrate desktop files automatically; copy them only through an explicit user operation.
- Back up both mounted directories before an upgrade. This preview does not access the Docker socket or update containers automatically.
- Desktop never silently falls back to local Harness when NAS is offline. Retry the connection or explicitly switch back to local runtime.

When using an existing trusted HTTPS reverse proxy, run only the `harness` service and proxy to `harness:3080` on the same Docker network. Do not publish port 3080 directly to the LAN.
