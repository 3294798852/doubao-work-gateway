# Magpie 豆包工作供应商

供应商 ID 为 `doubaowork`。独立网关和 Magpie 插件共用原生豆包协议，插件由 Magpie 的 Bun 宿主加载。

## 安装

安装近期版本的 Magpie，通过 GitHub 安装本插件。

```sh
magpie plugin add github:3294798852/doubao-work-gateway
magpie plugin login doubaowork
```

Windows 与 Linux 使用相同的安装命令。本地源码目录也可作为插件加载，在解压后的项目根目录运行以下命令。

```sh
magpie plugin add "$PWD"
magpie plugin login doubaowork
```

Magpie 桌面界面可在「插件 → 发现」搜索本仓库的名称，或添加上述 GitHub 地址。仓库使用 `magpie-plugin` 标签进入 GitHub 插件发现列表。本地目录安装通过 `package.json` 的 `main` 找到 `magpie/index.mjs`。更新本地源码后，重启 Magpie 的插件宿主即可加载新代码。

独立网关源码包通过 [GitHub Releases](https://github.com/3294798852/doubao-work-gateway/releases/latest) 分发。

插件接口按 Magpie 提交 `11ab58c5874268d2607ff43f6ce13abb366c518b` 实现，本轮宿主测试使用 Bun 1.4.4。Magpie 管理其 Bun 运行时。独立网关使用 Node.js 22+。

## 账号与模型

浏览器登录会打开专用 Chrome / Edge 临时会话。Linux 图形桌面也可使用 Chromium。每次登录成功后核验官方身份，Magpie 按身份合并重复账号。`DW_CHROME_BIN` 和 `DW_EDGE_BIN` 可指定浏览器绝对路径，应在启动 Magpie 的环境中设置。

无图形桌面的 Linux 可先在 Windows 或其他桌面环境运行独立网关，登录后从工作台导出账号 JSON，再在服务器导入。

```sh
magpie accounts import doubaowork /absolute/path/doubao-accounts.json --yes
```

桌面界面的「从文件导入账号」调用相同导入钩子。支持原生 v3 和旧版 v2 账号 JSON。导入时逐账号访问官方身份接口，成功与失败分别列出。单文件最多 20 个账号、512 KB。备份包含登录会话，应保存于私有目录。

Magpie 的账号开关、代理、路由和签到开关在 Magpie 中设置。模型列表从各账号的上游目录读取，模型名称与 ID 保持一致。在客户端选择 `doubaowork/<实际模型ID>`，Magpie 会将原始 ID 传给插件。

## 文本调用与签到

插件实现 OpenAI 风格 `chat/completions`，支持文本角色、多轮历史、文本分块、流式与非流式回复，以及上游返回的 `reasoning_content`。流式输出随消费者拉取，取消请求会中止上游并释放账号。工具调用、结构化输出、图片和工作流仍待实现。

额度通过 Magpie 用量页读取，数值与展示文字来自上游。目前目录适配提供模型 ID，上下文和输出上限仍待补充。

每日签到通过 `auth.checkin` 接入 Magpie。启用后由 Magpie 调度。插件在领取请求前把当日提交记录写入当前账号凭据，结果待确认时，当天后续操作只查询领取状态。自动签到的计划和执行状态在 Magpie 中查看。

上游要求人工验证时，插件保存实际账号的暂停状态，后续请求返回验证提示。请使用相同账号在豆包官网完成验证，然后在 Magpie 重新登录该账号。普通限流按上游延时暂停，登录失效通过 `X-Magpie-Sign-In` 通知 Magpie。

## 实现结构

| 位置 | 职责 |
| --- | --- |
| `launcher.mjs`、`platform.mjs` | 独立网关启动、运行目录、端口和跨平台浏览器发现 |
| `native/doubao-client.mjs`、`native/doubao-stream.mjs` | 官方请求、账号模型目录和上游事件解析 |
| `native/session.mjs` | 两种运行方式共用的会话与账号备份解析 |
| `native/completion.mjs` | 共用请求解析、文本响应编码和错误结构 |
| `magpie/provider.mjs` | Magpie 供应商配置、账号钩子、模型、额度及签到 |
| `magpie/login.mjs`、`magpie/response.mjs` | 隔离浏览器登录和 Fetch Response 流适配 |

独立网关的账号保存在原生加密库中，插件账号通过 `client.auth.set` 交由 Magpie 保存。账号状态更新使用 Magpie 提供的当前账号作用域。每个账号的写操作串行执行，旧请求按登录代次检查后更新状态。插件在执行请求期间按账号限制并发，状态和签到记录随 Magpie 凭据持久保存。

## 验证

```sh
npm run check
npm test
```

真实 Magpie 宿主测试通过环境变量指定本机 Bun 和 Magpie 源码中的宿主入口。测试加载本项目实际包入口，在临时账号目录中用模拟豆包响应检查模型、转发、额度、签到和重启状态。

Windows PowerShell 可按以下示例配置。

```powershell
$env:MAGPIE_BUN_BIN = "C:\path\to\bun.exe"
$env:MAGPIE_HOST_FILE = "C:\path\to\magpie\internal\plugin\host.js"
npm run test:magpie-host
```

Linux 可按以下示例配置。

```sh
MAGPIE_BUN_BIN=/absolute/path/to/bun \
MAGPIE_HOST_FILE=/absolute/path/to/magpie/internal/plugin/host.js \
npm run test:magpie-host
```

`DW_PLUGIN_PACKAGE` 可将宿主测试对象指定为已解压的发行目录。实际运行环境、结果和账号联调进度见 [验收记录](validation-magpie.md)。
