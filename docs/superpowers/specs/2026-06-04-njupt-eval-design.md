# NJUPT 教务助手 — Chrome 扩展设计文档

## 定位

单目标 Chrome MV3 扩展，只做两件事：满意度调查自动化 + 教学评价自动化。大道至简。

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | WXT 0.20.x |
| UI | React 19 + Tailwind CSS 4 (ShadowRoot 注入) |
| 状态 | Zustand |
| 校验 | Zod |
| 语言 | TypeScript 6 |
| 测试 | Vitest + jsdom |
| 持久化 | chrome.storage.local |

## 运行时三域模型

```
eval-bridge.content.ts (main world, document_start)
  → 拦截 __doPostBack，感知页面状态
  → 向 isolated world 发布 CustomEvent

eval-panel.content/index.tsx (isolated world)
  → React ShadowRoot 侧边面板
  → 策略引擎 + DOM fill + 评价循环
  → Zustand store
```

## 页面路由识别

| 路径模式 | 页面类型 |
|----------|---------|
| `xs_jsmydpj.aspx` | 满意度调查（课程评价） |
| `xsjxpj.aspx` | 教学评价（教师评价） |
| `xs_main.aspx` | 仪表盘 |
| `default.aspx` | 登录页（插件不处理） |

## 满意度调查 DOM 结构（已实测）

- `pjkc`: `<select>` 课程列表，7 门课，onchange → `__doPostBack('pjkc','')`
- `DataGrid1__ctl{2..8}_JS1`: 7 个 Likert 量表 select
- `pjxx`: `<textarea>` 评语（max 50 chars）
- `Button1`: 保存按钮
- `Button2`: 提交按钮
- 约束: 逐门保存，全部评完才能提交

## 教学评价 DOM 结构（推测，从用户脚本分析）

- `pjkc`: 课程 selector
- `DataGrid1__ctl{N}_JS{M}`: 多教师列，N=题号, M=教师序号
- 约束: 必须先完成满意度调查才能进入

## 评价策略

每个教师列的所有题目中，随机选 1 个填"相对认同"，其余全部填"完全认同"。
评语字段填入用户配置的模板文本。

## 侧边面板 UI

- 当前页面类型识别显示
- 课程进度 N / Total
- 评语模板可编辑
- "一键满意度" / "一键评价" 按钮
- 重置 / 停止控制按钮
- 策略说明文字

## 评价循环流程

1. 检测页面类型 → 显示对应按钮
2. 用户点击按钮
3. 解析 pjkc.options → 课程列表
4. for each 课程:
   - 选择课程 → 触发 postback → 等待页面刷新
   - 解析 DataGrid selects → 按教师分组
   - 策略填充
   - 填写评语
   - 点击保存
   - 等待响应
5. 全部完成 → 提示提交

## 文件结构

```
njupt-jwxt-eval/
├── entrypoints/
│   ├── eval-bridge.content.ts
│   └── eval-panel.content/
│       └── index.tsx
├── src/
│   ├── content/
│   │   ├── page-detector.ts
│   │   ├── dom-analyzer.ts
│   │   ├── dom-fill.ts
│   │   ├── eval-strategy.ts
│   │   ├── eval-loop.ts
│   │   ├── store.ts
│   │   └── EvalPanelApp.tsx
│   ├── lib/
│   │   ├── storage.ts
│   │   └── types.ts
│   └── styles/
│       └── app.css
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 不做什么

- 不自动登录（用户手动登录）
- 不处理验证码
- 不碰选课、成绩等其他模块
- 不提供多套策略模板（单一策略，大道至简）
- 不自动提交最终结果（用户手动点提交）
