# 控制理论模拟器 V6.3 · 项目规则（CONVENTIONS）

本文件是 `控制理论模拟器V6.0/` 目录的工程约定与验收基线。修改代码、文档、工具链前先读本文件；与本文冲突的临时做法应在评审中显式说明。

## 1. 运行形态（不可破坏的边界）

- 前端是**零构建、零外部依赖、零运行时网络请求**的静态站，必须支持 `file://` 双击运行。
- 禁止引入 ES Module、打包器、CSS 预处理器或运行时 CDN；新增脚本一律用经典 `<script>` + IIFE 挂到 `window.CtrlSim`。
- `public/` 是 Netlify 的 publish 目录；`netlify/functions/` 与 `functions/api/` 分别是 Netlify、Cloudflare 两套后端适配，**保持各自可独立部署**，不强行合并。
- 后端密钥只从环境变量读取，任何日志、响应、前端代码都不得回显密钥。

## 2. 模块边界与加载顺序

| 文件 | 职责 | 禁止 |
|---|---|---|
| `public/js/core.js` | 无状态工具：`esc / icon / clamp / clampFinite / fmt / $` | 持有业务状态 |
| `public/js/data.js` | 159 法配置、对象模型、预设、标签、`VERSION`、`REF_FLOW_METHODS` | 触碰 DOM |
| `public/js/simulation.js` | 控制律、物理积分、轨迹与指标、唯一可写状态 | 触碰 DOM；直接读写 UI |
| `public/js/charts.js` | Canvas 动画与曲线绘制 | 写仿真状态（只读 `sim`） |
| `public/js/ui.js` | DOM 构建、局部更新、浮层与焦点管理 | 直接改 `settings` / `ctrlParams` |
| `public/js/docs.js` | 教学文档渲染与阅读器 | 绕过 `app` 切换实验方法 |
| `public/js/app.js` | 编排层：初始化、主循环、快捷键、持久化、分享、导出 | 承载具体控制律或绘图细节 |
| `public/js/assistant.js` `pad.js` `layout.js` | 可选智能助手 / 批注板 / 设备布局 | 修改仿真内核状态 |

**index.html 脚本顺序**（新脚本必须插到正确位置）：

```
core.js → data.js → method-meta.js → papers.js → math.js → guides-content.js
→ simulation.js → charts.js → fit-data.js → ui.js → docs.js → rails.js
→ app.js → assistant.js → pad.js → layout.js
```

`tools/` 中任何用 `vm` / `new Function` 加载浏览器模块的脚本，必须复刻同样的前置依赖；凡加载 `simulation.js` 或 `docs.js`，先加载 `core.js`。

## 3. 状态与数据流

- 唯一可写状态在 `simulation.js`：`settings`、`stateRef`、`tracks`。UI 通过 `sim.get*()` 读取。
- 所有参数写入必须走 `sim.setParam(key, value, store)`，由内核统一做有限性检查与范围钳制；分享链接还原也不例外。
- 方法切换走 `sim.setMethod`，对象切换走 `sim.setPlant`，场景加载走 `sim.applyPreset`；这三个入口内部负责整定、重置与限幅同步。
- 控制器不得提前给 `settings.method` 赋值再调用 `resetSim`：A/B 对比下 `resetSim` 依赖旧值封存上一条轨迹。

## 4. 单一事实源（SSOT）

| 事实 | 权威位置 | 消费方 |
|---|---|---|
| 产品版本 | `data.js::VERSION` | 前端标题/页脚、分享 `VERSION`、PNG 标题、`/api/health` |
| 参考流形白名单 | `data.js::REF_FLOW_METHODS` | `ui.js` 图例、`charts.js` 量程与绘制 |
| 参数标签/单位/范围 | `data.js::PARAM_LABELS / PARAM_UNITS / PARAM_SECTIONS` | `ui.js`、`simulation.js::paramRange` |
| 适用性矩阵 | `tools/build-fit.js` → `fit-data.js` | 文档评级表、界面徽章 |
| 文档正文 | `public/docs/methods/*.md`（唯一源） | `tools/build-docs.js` → `docs-content.js` |

**禁止**在其它文件复制上述字面量。版本号、白名单出现第二份即视为缺陷。

## 5. 生成文件（禁止手改）

- `public/js/docs-content.js`、`guides-content.js`、`plant-docs.js`：由 `node tools/build-docs.js` 生成。
- `public/js/fit-data.js`、`public/docs/方法适配审计.md`：由 `node tools/build-fit.js` 生成。
- 生成文件首行带「自动生成，请勿手动编辑」标记；修改内容请改源头 Markdown / 数据后重新生成。

## 6. 验收门槛（每次改动必须通过）

```bash
node tools/verify-v5.js   # 静态验收：语法、计数、文档一致性、SSOT、文案
node tools/smoke.js       # 浏览器验收：首屏、交互、文档、修复项回归
```

- 两者必须 **0 FAIL**，且 PASS 数量与 README 记录一致。
- 每修一个缺陷，必须同时补一条回归断言：行为类进 `tools/smoke.js`，静态约束类进 `tools/verify-v5.js`。没有回归断言的修复不算完成。
- 修改控制律、对象动力学或整定参数后，额外运行 `node tools/audit-dynamics.js --plants all --out audit-all.csv` 复核评级分布。

## 7. 版本与提交

- 采用 `主版本.次版本.修订号`；每轮成体系的修复/文档更新至少升次版本，并同步 `package.json`、`data.js::VERSION`、`index.html` 标题与页脚、后端 `health.js`、README 版本记录。
- 版本记录写在 README 顶部新章节，历史章节保留不改写。
- 仅在用户明确要求时创建 git commit；提交信息用 `type(scope): 摘要`，说明「为什么」而非逐条罗列 diff。
- 历史版本（`../历史归档/`）只读，不在其中修改或重新生成产物。

## 8. 文案与文档

- 方法文档必须包含：生活类比 → 被控对象 → 为什么需要 → 推导 → 稳定性证明 → 算例 → 参数 → 陷阱 → 延伸 → 速查 → 练习。
- 文档中的默认参数、对象手册增益必须与运行时一致；由 `verify-v5.js` 自动校验。
- 行文避免模板化套话；新增内容先改 Markdown 再重新打包，不直接改 `docs-content.js`。
