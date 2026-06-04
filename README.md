# NJUPT 教务助手

> Chrome MV3 浏览器扩展 — 南邮正方教务系统一键自动评教

[![Release](https://img.shields.io/badge/release-v2.0.0-blue)](https://github.com/hicancan/njupt-jwxt-assistant/releases/tag/v2.0.0)
[![Tests](https://img.shields.io/badge/tests-21%20passed-green)](https://github.com/hicancan/njupt-jwxt-assistant)
[![License](https://img.shields.io/badge/license-ISC-lightgrey)](LICENSE)

## 功能

- **满意度调查（课程评价）** — 一键自动完成 7 门课的 Likert 量表填写
- **教学评价（教师评价）** — 一键自动完成每门课的教师评分
- **自适应评分量表** — 满意度调查（完全认同/相对认同/...）和教学评价（好/较好/...）自动适配
- **智能策略** — 每位教师随机选 1 个次高分，其余最高分，避免全部满分被识别
- **跨页面连续执行** — 保存后页面刷新自动继续，无需人工干预
- **可拖拽面板 + 悬浮球** — 面板可拖动、可折叠为悬浮球，不遮挡页面
- **弹窗屏蔽** — 自动拦截 `alert`/`confirm`，防止保存确认弹窗打断流程

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | WXT 0.20 |
| UI | React 19 + Tailwind CSS 4 (ShadowRoot 隔离) |
| 状态 | Zustand 5 |
| 校验 | Zod 4 |
| 语言 | TypeScript 6 |
| 测试 | Vitest 4 + jsdom |

## 安装

### 从源码构建

```bash
git clone https://github.com/hicancan/njupt-jwxt-assistant.git
cd njupt-jwxt-assistant
npm install
npm run build
```

然后：
1. 打开 Chrome → `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `.output/chrome-mv3/` 目录

### 从 Release 安装

1. 下载 [最新 Release](https://github.com/hicancan/njupt-jwxt-assistant/releases) 的 `.zip` 文件
2. 解压到任意目录
3. Chrome → `chrome://extensions/` → 加载已解压的扩展程序 → 选择解压目录

## 使用方法

1. 用 Chrome 打开教务系统登录并进入首页
2. 右上角出现 **NJUPT 教务助手** 面板
3. 在教务首页点击「前往满意度调查」或「前往教学评价」
4. 进入评价页面后点击「一键满意度」或「一键评价」
5. 等待自动完成（页面会刷新，请勿操作）
6. 全部完成后手动点击页面底部的「提交」按钮

### 面板控制

| 操作 | 方式 |
|------|------|
| 拖动 | 按住标题栏拖动 |
| 折叠 | 点击标题栏 `—` 按钮 |
| 展开 | 点击蓝色悬浮球 `助` |
| 停止 | 运行中点击红色「停止」按钮 |
| 重置 | 完成后点击「重置」 |
| 修改评语 | 直接在面板的评语模板框中编辑 |

## 项目结构

```
src/
├── content/
│   ├── EvalPanelApp.tsx       # React 侧边面板 UI（可拖拽 + 悬浮球）
│   ├── page-detector.ts       # URL + iframe 页面类型识别
│   ├── dom-analyzer.ts        # pjkc / DataGrid DOM 解析 + 教师分组
│   ├── eval-strategy.ts       # 自适应评分策略引擎
│   ├── dom-fill.ts            # DOM 填充操作（select / textarea / button）
│   ├── eval-loop.ts           # 评价循环编排（sessionStorage 持久化）
│   └── store.ts               # Zustand 状态管理
├── lib/
│   ├── types.ts               # 类型定义 + Zod Schema
│   └── storage.ts             # chrome.storage.local 持久化
└── styles/
    └── app.css                # Tailwind
```

## 开发

```bash
npm run dev        # 开发模式（热更新）
npm run build      # 生产构建
npm run test       # 运行测试（21 tests）
npm run typecheck  # TypeScript 类型检查
npm run check      # 全部检查（typecheck + test + build）
```

## License

ISC
