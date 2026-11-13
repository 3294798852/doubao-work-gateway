# 0.5.0 验收记录

验证日期为 2026-11-13。豆包网关基线为 `a816f9bcb46d5ea0d7510214fca49c75e5bddd34`，Magpie 宿主基线为 `11ab58c5874268d2607ff43f6ce13abb366c518b`。本轮交付版本为 0.5.0。

## 自动测试

| 环境 | 范围 | 结果 |
| --- | --- | --- |
| Windows 11，build 26200，Node.js 24.18.0 | `npm run check`、`npm test` | 语法通过，72 项通过 |
| Ubuntu 22.04.3，WSL2，Node.js 24.18.0 | 同一源码的语法检查和完整测试 | 语法通过，72 项通过 |
| Windows / Ubuntu | 结构化额度补充后运行 `node --test test/native-client.test.mjs test/magpie.test.mjs` | 各 14 项通过 |
| Windows，Google Chrome | `node scripts/browser-smoke.mjs` | 真实浏览器匿名管道、临时会话和关闭通过 |

完整测试后只修改了额度结构化字段的免限处理，并补充相应回归。该范围在两系统各补验 14 项，其余有效结果复用。当前测试目录共 73 个测试案例。

## Magpie 宿主联调

Windows 与 Ubuntu 均使用 Bun 1.4.4 运行上述 Magpie 提交中的真实 `internal/plugin/host.js`，加载本项目 `package.json` 指定的实际插件入口。

两系统均通过包加载、两个账号的 JSON 导入、账号模型发现、非流式文本、SSE 流式文本、额度、单次签到提交、人工验证错误，以及重启后的账号状态隔离。宿主联调使用固定模拟豆包响应，过程在临时目录中保存测试账号。

测试脚本为 `scripts/magpie-smoke.mjs`，通过 `MAGPIE_BUN_BIN`、`MAGPIE_HOST_FILE` 指定运行时和宿主。记录见 [验收数据](evidence/validation-0.5.0.json)。

## 交付与入口

独立网关使用 Windows `start.cmd` 或 Linux `sh start.sh` 启动，`npm start` 在两系统通用。管理端口默认为 `43862`，模型端口默认为 `43861`。Magpie 从项目根目录加载 `magpie/index.mjs`，供应商 ID 为 `doubaowork`。

发行文件为 `dist/doubao-work-gateway-0.5.0.zip` 和 `dist/doubao-work-gateway-0.5.0.tgz`，均包含跨平台源码、插件、测试和使用文档。ZIP 适合桌面解压，TGZ 内的源码位于 `package/`。

发行包解压后，Windows `start.cmd` 与 Ubuntu `sh start.sh` 均通过启动、空账号面板访问、模型端口认证、状态查询和停止检查。两系统也通过解压目录中的实际 Magpie 插件入口联调。打包采用 `package.json` 的文件清单，运行数据和测试运行时保存在项目的私有 `.local/` 中。

原始验收输出保存在 `.local/evidence/0.5.0/`。Linux 隔离测试目录已清理。自动审批以 `blocked by policy` 拒绝删除 Windows 临时目录及缩小范围后的指定临时文件，`.local/qa/` 暂存目录因此保留。

## 待账号持有人完成

- Windows / Linux 图形桌面的真实豆包账号登录。
- 真实账号的模型目录、一次流式调用与额度查询。
- 真实账号的签到领取与回查，以及人工验证后的重新登录。

0.6.0 增加客户端 function 工具、工具选择、并行开关与结果回传，验证结果见 [工具调用记录](tool-calling.md)。严格约束解码、结构化输出、图片和工作流待实现，模型上下文与输出上限仍待补充。
