# Open DSH 运行端上下文

Open DSH Desktop 可以使用当前电脑上的 Harness，也可以使用由 NAS 独立拥有的 Harness。以下术语用于区分运行端数据与执行所在的位置，以及负责展示它们的 Desktop 设备。

## 语言

**运行端（Runtime）**：
为当前 Desktop 会话拥有插件、模型设置、会话和工作区的 Harness 实例。
_避免使用_：服务器、后端

**本机运行端（Local Runtime）**：
由当前 Desktop 电脑拥有并执行的运行端。
_避免使用_：本机服务器、本机后端

**NAS 运行端（NAS Runtime）**：
由已配对 NAS 部署拥有并执行的运行端；它不是本机运行端的远程数据目录。
_避免使用_：远程数据目录、共享 Profile

**运行端选择（Runtime Selection）**：
在本机运行端与某个已保存 NAS 运行端之间持久化的选择；通过重启 Desktop 生效，不会静默回退或热切换。
_避免使用_：活动服务器

**已配对设备（Paired Device）**：
针对一个 NAS 运行端持有独立可撤销凭据的 Desktop 安装。
_避免使用_：用户、账户

**NAS 线路协议（NAS Wire Protocol）**：
NAS 运行端与 Desktop 为健康检查、配对及已配对设备管理而交换的版本化固定路由 JSON 消息。
_避免使用_：NAS API、Desktop bridge

**配对流程（Pairing Ceremony）**：
检查 NAS 运行端证书、确认其指纹，并以一次性代码换取一份已配对设备凭据的用户可见顺序。
_避免使用_：登录、信任复选框
