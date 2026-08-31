# njupt-jwxt development rules

`njupt-jwxt` 是当前南邮教务系统的课表采集扩展。Git 保存历史，源码只支持当前
`jwglxt.njupt.edu.cn` JSON 接口。

## Commands

```bash
npm run dev          # Dev mode with HMR (load .output/chrome-mv3/ unpacked)
npm run build        # Production build → .output/chrome-mv3/
npm run zip          # Production zip for distribution
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (jsdom environment)
npm run check        # Full check: typecheck + test + build
```

CI 运行 `npm ci` → `prepare:wxt` → `typecheck` → `test` → `build` → `zip`。

## Architecture

- `entrypoints/teaching-schedule.content`：在班级课表页注入 Shadow DOM 面板。
- `entrypoints/background.ts`：用扩展域 IndexedDB 保存任务和逐条结果。
- `src/api`：当前接口、严格解码和公开字段规范化。
- `src/collector`：限速、重试、暂停、恢复与终态统计。
- `src/export`：确定性 `TeachingScheduleSource` 与 ZIP。
- `src/ui`：采集进度与导出界面。

禁止重新加入旧域名、DOM 课表解析、日期猜测、评教、成绩导出或任何兼容分支。
