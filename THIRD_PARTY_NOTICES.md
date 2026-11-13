# 第三方来源与素材

## 协议与工具

本项目直接实现豆包工作协议。接口与事件格式参考豆包官网前端资源及 [Agent2Providers](https://github.com/ProvidersPlugin/Agent2Providers)（提交 `3055f416841c1393ec04294a702603fd41e840aa`，其项目声明 AGPL-3.0，上游协议研究参考 [EchoBird](https://github.com/edison7009/EchoBird)）。

跨平台网关基于 [245678000000/doubao-work-gateway](https://github.com/245678000000/doubao-work-gateway)，基线提交为 `a816f9bcb46d5ea0d7510214fca49c75e5bddd34`。该基线已含 Windows、Linux 和 macOS 的原生运行入口。本轮增加 Magpie 插件，并提取共用的会话解析与文本响应编码。

Magpie 插件按 [yetone/magpie](https://github.com/yetone/magpie) 的 OpenCode 风格供应商接口实现，参考提交为 `11ab58c5874268d2607ff43f6ce13abb366c518b`。Magpie 自身采用 MIT 许可。插件通过 Magpie 提供的 Bun 宿主运行，发行包仅包含本项目源码。

浏览器登录通过 [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) 的临时会话，无 npm 第三方运行依赖。

## 产品图标、截图与社区

豆包工作图标和界面截图仅用于识别或展示，品牌权益归各自权利人。本项目不是官方客户端。继承源码与素材保留原始声明。新增 Magpie 集成由 3294798852 以 MIT 许可证提供，具体授权范围见 [LICENSE](LICENSE) 与 [MIT 许可证](magpie/LICENSE)。

感谢 LINUX DO 社区的讨论与分享；不表示官方背书、合作或隶属。
