# GitHub 与 Magpie 发布记录

本轮版本为 0.5.0，发布日期为 2026-11-13。

| 项目 | 地址或标识 |
| --- | --- |
| GitHub 仓库 | https://github.com/3294798852/doubao-work-gateway |
| 发行标签 | `v0.5.0` |
| 发行页面 | https://github.com/3294798852/doubao-work-gateway/releases/tag/v0.5.0 |
| Magpie 安装地址 | `github:3294798852/doubao-work-gateway` |
| Magpie 供应商 | `doubaowork` |
| 市场发现标签 | `magpie-plugin` |

## 代码与授权

Git 历史保留原项目的提交。新增 Magpie 集成采用用户选择的 MIT 许可证，继承或提取的代码保留原始来源与声明。具体授权范围见 [LICENSE](../LICENSE)。

## 市场发布方式

Magpie 的 GitHub 插件发现读取带有 `magpie-plugin` 标签的公开独立仓库，并从默认分支读取 `package.json` 和插件入口。本项目通过该发现入口分发，安装使用上述 GitHub 地址。发现机制见 [Magpie 源码](https://github.com/yetone/magpie/blob/main/internal/plugin/github.go)。

## 验证

本轮复用 [0.5.0 验收记录](validation-magpie.md) 中的跨平台和宿主联调结果。浏览器取消测试改用启动信号同步，替代固定时间等待，相关 10 项插件测试通过。远端 CI 运行三系统 × Node.js 22 / 24 的语法与测试检查。
