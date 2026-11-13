# 原生版验收记录

## 0.5.1 设备参数修复与真实账号

2026-11-13 在 Windows 11 使用现有网页登录会话排查 `710022004`。官网与客户端可用，原网关请求缺少客户端设备号。读取 `%LOCALAPPDATA%\Doubao\User Data\Local State` 的 `aha.device.device_id`，发送配套的 `device_id` 与 `fp=verify_<device_id>` 后，原生客户端返回完整文本 `OK`。

同一原生适配器的独立 Magpie 插件 0.5.1 在 Magpie 0.1.3620、Bun 1.4.4 中通过非流式调用。实际 Magpie 网关的流式入口返回 HTTP 200、`OK` 及 `[DONE]`。测试模型为 `person-deepseek-v4-1-flash-261017`，其余模型与真实签到待验收。

修复使用统一的设备查询模块，兼容 Windows、Linux、macOS 的 `Doubao` 和 `DoubaoWork` 目录。新增回归覆盖账号设备优先级、配套指纹、设备缺失、缓存和客户端文件更新。Windows 的两项原生网关 HTTP 回归通过。

[0.5.1 CI 运行 43396263014](https://github.com/3294798852/doubao-work-gateway/actions/runs/43396263014) 的 Windows、Ubuntu、macOS × Node.js 22 / 24 全部 6 个任务通过，代码提交为 `8685bb806b623b6d5f3b1d95c46be60d916a21c7`。

## 本地已验证

- macOS、Node.js 24：`npm run check`、`npm test`；模型协议测试使用可重复的模拟上游。
- 在空的临时状态目录启动一个 Node 进程，模型与面板分别监听回环；认证停止和端口冲突处理通过。
- 模拟 `710022004` 后只暂停触发账号、不在原请求切换账号；重启保持暂停。流式输出中发生验证错误时无成功结束标记。
- 签到持久预约后发生超时，当天的自动任务不再提交，手动回查只查询。
- 旧状态目录的两个账号已在隔离目标中离线迁移演练，重复迁移均跳过，原文件保留；账号仍待官方核验。
- 使用模拟账号检查工作台验证提示，图中没有真实账号、凭据或公网地址。

## 历史三系统 CI

[上游基线 CI 运行 43378348745](https://github.com/245678000000/doubao-work-gateway/actions/runs/43378348745) 覆盖 Windows Server 2025、macOS 15、Ubuntu 24.04，分别使用 Node.js 22 和 24，共 6 个任务通过。

## 待独立验收

- Linux / macOS 图形浏览器的真实登录。
- 独立网关面板的 Windows 真实账号全流程，以及真实签到回查。
- 现有云端实例尚未切换到原生版，原出口的验证问题仍待复测。
