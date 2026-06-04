# 南邮教务助手 · NJUPT JWXT Assistant

<p align="center">
  <img src="https://img.shields.io/github/v/release/hicancan/njupt-jwxt-assistant?color=blue&label=release" alt="Release">
  <img src="https://img.shields.io/badge/tests-22%20passed-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/platform-Chrome%20MV3-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-ISC-lightgrey" alt="License">
  <img src="https://img.shields.io/badge/WXT-0.20-ff6b35" alt="WXT">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React">
</p>

<p align="center">
  <b>Chrome MV3 浏览器扩展 — 南邮正方教务系统全方位增强工具</b><br>
  一键评教 · 课表导出 · 无侵入体验
</p>

---

## 功能总览

<table>
<tr>
<td width="50%">

### 满意度调查
自动完成 7 门课程 Likert 量表（完全认同 / 相对认同 / 勉强认同 / 不太认同 / 完全不认同），逐门保存，全评完后手动提交。

</td>
<td width="50%">

### 教学评价
自动完成每门课的教师评分（好 / 较好 / 一般 / 较差 / 差），自适应评分量表，与满意度调查共享策略引擎。

</td>
</tr>
<tr>
<td>

### 课表 ICS 导出
解析学生个人课表 `#Table1`，生成标准 iCalendar 文件，支持单双周过滤、rowspan/colspan 精确解析、自定义时间映射。

</td>
<td>

### 智能评分策略
每位教师随机选 1 个次高分，其余最高分 —— 避免全部满分被系统识别为异常。`option[1]`/`option[2]` 索引自适应，两种评分量表通用。

</td>
</tr>
</table>

### 更多特性

- **跨页面连续执行** — `sessionStorage` 持久化，保存后页面刷新自动继续下一门，无需人工干预
- **可拖拽面板 + 悬浮球** — 按住标题栏拖动，点击 `—` 折叠为蓝色悬浮球，点击球展开
- **弹窗自动屏蔽** — `document_start` 阶段拦截 `alert`/`confirm`，保存确认弹窗不会打断流程
- **iframe 自适应** — 全页面导航和 iframe 嵌入两种模式自动适配
- **教务首页导航** — 一键跳转到满意度调查 / 教学评价 / 学生课表

---

## 快速开始

```bash
git clone https://github.com/hicancan/njupt-jwxt-assistant.git
cd njupt-jwxt-assistant
npm install
npm run build
```

然后 Chrome → `chrome://extensions/` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3/`

> 也可以从 [Releases](https://github.com/hicancan/njupt-jwxt-assistant/releases) 下载 `.zip` 直接加载。

---

## 使用流程

```
教务首页                    评价页面                    完成
┌──────────┐   点击    ┌──────────────┐   自动    ┌──────────┐
│ 前往满意度  │ ──────→ │ 一键满意度     │ ──────→ │ 全部完成   │
│ 前往教学    │         │ 7/7 自动循环   │          │ 手动点提交 │
│ 前往课表    │         └──────────────┘          └──────────┘
└──────────┘
```

| 操作 | 方式 |
|------|------|
| 拖动面板 | 按住标题栏拖拽 |
| 折叠 / 展开 | 点击标题栏 `—` → 蓝色悬浮球 `助` |
| 停止评教 | 运行中点击红色「停止」 |
| 修改评语 | 面板内直接编辑评语模板（自动保存） |
| 导出课表 | 课表页点击「导出课表 ICS」→ 设置学期日期 → 下载 |

---

## 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 框架 | **WXT 0.20** | Chrome MV3 扩展框架，自动处理 manifest |
| UI | **React 19** + **Tailwind CSS 4** | ShadowRoot 隔离，不污染宿主页面 |
| 状态 | **Zustand 5** | 响应式状态管理 |
| 校验 | **Zod 4** | 评分策略配置、课表解析 schema |
| 语言 | **TypeScript 6** | 严格模式，零 `any` |
| 测试 | **Vitest 4** + **jsdom** | 22 个单元测试，覆盖核心逻辑 |
| 持久化 | `sessionStorage` + `chrome.storage.local` | 跨刷新状态 + 持久配置 |

### 架构

```
entrypoints/
├── eval-panel.content/index.tsx     # 主面板 (xs_main.aspx + 所有 iframe 页)
└── schedule.content/index.tsx       # 课表独立入口 (xskbcx.aspx)

src/
├── content/
│   ├── EvalPanelApp.tsx             # 可拖拽面板 + 悬浮球 + 页面路由
│   ├── page-detector.ts             # URL + iframe 三层检测 (contentWindow/src/DOM)
│   ├── dom-analyzer.ts              # pjkc / DataGrid / 教师列分组
│   ├── eval-strategy.ts             # 自适应评分引擎 (option 索引)
│   ├── dom-fill.ts                  # select / textarea / button 操作
│   ├── eval-loop.ts                 # sessionStorage 持久化评价循环
│   └── store.ts                     # Zustand store
├── schedule/
│   ├── parser.ts                    # #Table1 课表解析 + Zod CourseSchema
│   ├── ics.ts                       # RFC 5545 iCalendar 生成器
│   └── ScheduleExporter.tsx         # 导出按钮 + 学期日期弹窗
└── lib/
    ├── types.ts                     # 类型定义
    └── storage.ts                   # chrome.storage 封装
```

---

## 开发

```bash
npm run dev         # 开发模式 (热更新)
npm run build       # 生产构建
npm run test        # 运行 22 个测试
npm run typecheck   # TypeScript 检查
npm run check       # 全量检查 (typecheck + test + build)
```

---

## 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| **v2.1.0** | 2026-06-04 | 课表 ICS 日历导出 |
| **v2.0.0** | 2026-06-04 | 全面重构：双评价引擎 |
| **v1.0.0** | 2025-12-29 | 初版：评教 + 登录 + 课表 |

详见 [Releases](https://github.com/hicancan/njupt-jwxt-assistant/releases) 和 [Changelog](https://github.com/hicancan/njupt-jwxt-assistant/compare/v1.0.0...main)

---

## License

ISC © 2025–2026
