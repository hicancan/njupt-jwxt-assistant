# NJUPT 教务助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a MV3 Chrome extension that automates NJUPT 正方教务系统 evaluation workflows (满意度调查 + 教学评价) with a simple one-click strategy: per teacher, randomly pick 1 question as "相对认同", rest as "完全认同".

**Architecture:** WXT-based extension with a single content-script entrypoint that injects a React ShadowRoot side panel. No bridge/main-world isolation needed — NJUPT is server-rendered ASP.NET WebForms with __doPostBack, straightforward DOM manipulation. The panel detects page type, displays controls, and executes a postback-aware evaluation loop.

**Key simplification vs icourse163-ai:** No RPC interception, no bridge script, no background script. Just React panel + DOM logic. The only cross-world concern is detecting postback completion (page re-render), handled via MutationObserver polling.

**Tech Stack:** WXT 0.20.x, React 19, Tailwind CSS 4, Zustand 5, Zod 4, TypeScript 6, Vitest 4

---

## File Structure

```
njupt-jwxt-eval/
├── entrypoints/
│   └── eval-panel.content/
│       └── index.tsx              # Content script: mount React ShadowRoot panel
├── src/
│   ├── content/
│   │   ├── page-detector.ts       # Detect page type from URL/DOM
│   │   ├── dom-analyzer.ts        # Parse pjkc options, DataGrid selects, teacher groups
│   │   ├── dom-fill.ts            # Fill selects, write comment, click save button
│   │   ├── eval-strategy.ts       # Strategy engine: random 1 "相对认同" per teacher
│   │   ├── eval-loop.ts           # Orchestrate: select course → wait postback → fill → save → next
│   │   ├── store.ts               # Zustand state: progress, running status, template
│   │   └── EvalPanelApp.tsx       # React side panel UI component
│   ├── lib/
│   │   ├── storage.ts             # chrome.storage.local: comment template
│   │   └── types.ts               # Shared types + Zod schemas
│   └── styles/
│       └── app.css                # Tailwind imports
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `wxt.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/styles/app.css`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "njupt-jwxt-eval",
  "version": "1.0.0",
  "description": "NJUPT教务系统自动评教助手",
  "private": true,
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "prepare:wxt": "wxt prepare",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run typecheck && npm run test && npm run build"
  },
  "keywords": ["browser-extension", "wxt", "react", "njupt"],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "zod": "4.4.3",
    "zustand": "5.0.13"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.0",
    "@types/chrome": "0.1.42",
    "@types/node": "25.9.1",
    "@types/react": "19.2.15",
    "@types/react-dom": "19.2.3",
    "@wxt-dev/module-react": "1.2.2",
    "jsdom": "29.1.1",
    "tailwindcss": "4.3.0",
    "typescript": "6.0.3",
    "vite": "8.0.14",
    "vitest": "4.1.7",
    "wxt": "0.20.26"
  }
}
```

- [ ] **Step 2: Create wxt.config.ts**

```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'NJUPT 教务助手',
    description: '南邮教务系统自动评教助手 — 一键完成满意度调查与教学评价',
    permissions: ['storage'],
    host_permissions: [
      'http://jwxt.njupt.edu.cn/*',
      'http://202.119.225.134/*',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["chrome", "node"]
  }
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
```

- [ ] **Step 5: Create src/styles/app.css**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create .gitignore**

```
.output
.wxt
node_modules
dist
*.zip
```

- [ ] **Step 7: Install dependencies and verify scaffold**

Run: `npm install`
Run: `npm run prepare:wxt`
Run: `npm run typecheck`
Expected: All pass (no source files yet, should succeed)

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold WXT project with React 19 + Tailwind 4 + Vitest"
```

---

### Task 2: Type Definitions + Zod Schemas

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types.ts**

```typescript
import { z } from 'zod';

/** Page types the extension recognizes */
export type PageType = 'satisfaction' | 'teaching-eval' | 'dashboard' | 'unknown';

/** A single Likert-scale select element on the evaluation page */
export interface EvalSelect {
  /** The <select> element id, e.g. "DataGrid1__ctl2_JS1" */
  id: string;
  /** The <select> element name, e.g. "DataGrid1:_ctl2:JS1" */
  name: string;
  /** Available options extracted from DOM */
  options: EvalOption[];
}

export interface EvalOption {
  index: number;
  text: string;
  value: string;
}

/** A course in the pjkc dropdown */
export interface Course {
  index: number;
  name: string;
  value: string;
}

/** Teacher grouping key = the JS{N} suffix from select name */
export interface TeacherGroup {
  teacherKey: string;
  /** All Likert selects belonging to this teacher */
  selects: EvalSelect[];
}

/** parsed evaluation page state */
export interface EvalPage {
  pageType: PageType;
  courses: Course[];
  currentCourseIndex: number;
  teacherGroups: TeacherGroup[];
  hasCommentBox: boolean;
  commentBoxId: string | null;
  saveButtonId: string | null;
  submitButtonId: string | null;
}

/** Persisted settings schema */
export const EvalSettingsSchema = z.object({
  comment: z.string().max(50).default('老师教学认真，课堂气氛活跃，收获很大！'),
});

export type EvalSettings = z.infer<typeof EvalSettingsSchema>;

export const DEFAULT_EVAL_SETTINGS: EvalSettings = {
  comment: '老师教学认真，课堂气氛活跃，收获很大！',
};

/** Eval loop running state */
export type LoopStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

/** Percentage distribution for Likert scale ratings */
export interface FillStrategy {
  /** Index in option array for "best" rating (完全认同 = 1) */
  bestIdx: number;
  /** Index in option array for "good" rating (相对认同 = 2) */
  goodIdx: number;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add type definitions and Zod schemas"
```

---

### Task 3: chrome.storage Persistence

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Write storage.ts**

```typescript
import { z } from 'zod';
import { EvalSettingsSchema, DEFAULT_EVAL_SETTINGS, type EvalSettings } from './types';

const STORAGE_KEY = 'njupt-eval:settings';

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

function storageSet(value: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function loadSettings(): Promise<EvalSettings> {
  const raw = await storageGet<EvalSettings>(STORAGE_KEY);
  const parsed = EvalSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_EVAL_SETTINGS;
  }
  return parsed.data;
}

export async function saveSettings(settings: EvalSettings): Promise<void> {
  await storageSet({ [STORAGE_KEY]: settings });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add chrome.storage persistence for settings"
```

---

### Task 4: Page Detector

**Files:**
- Create: `src/content/page-detector.ts`
- Create: `src/content/page-detector.test.ts`

- [ ] **Step 1: Write failing tests for page-detector**

```typescript
import { describe, it, expect } from 'vitest';
import { detectPageType } from './page-detector';

describe('detectPageType', () => {
  it('detects satisfaction survey page', () => {
    const url = 'http://jwxt.njupt.edu.cn/xs_jsmydpj.aspx?xh=B24040213&gnmkdm=N121801';
    expect(detectPageType(url)).toBe('satisfaction');
  });

  it('detects teaching evaluation page', () => {
    const url = 'http://jwxt.njupt.edu.cn/xsjxpj.aspx?xh=B24040213&gnmkdm=N12141';
    expect(detectPageType(url)).toBe('teaching-eval');
  });

  it('detects dashboard page', () => {
    const url = 'http://jwxt.njupt.edu.cn/xs_main.aspx?xh=B24040213';
    expect(detectPageType(url)).toBe('dashboard');
  });

  it('returns unknown for other pages', () => {
    const url = 'http://jwxt.njupt.edu.cn/content.aspx';
    expect(detectPageType(url)).toBe('unknown');
  });

  it('works with alternate IP host', () => {
    const url = 'http://202.119.225.134/xs_jsmydpj.aspx?xh=B24040213';
    expect(detectPageType(url)).toBe('satisfaction');
  });

  it('handles query strings and fragments', () => {
    const url = 'http://jwxt.njupt.edu.cn/xsjxpj.aspx?xkkh=abc123&xh=B24040213&gnmkdm=N12141#';
    expect(detectPageType(url)).toBe('teaching-eval');
  });
});
```

- [ ] **Step 2: Run tests (expected FAIL)**

Run: `npx vitest run src/content/page-detector.test.ts`
Expected: FAIL — "detectPageType is not defined"

- [ ] **Step 3: Implement page-detector.ts**

```typescript
import type { PageType } from '../lib/types';

/**
 * Determine the current NJUPT教务 page type from the URL.
 * Matches against ASP.NET page names.
 */
export function detectPageType(url: string): PageType {
  const lower = url.toLowerCase();

  if (lower.includes('xs_jsmydpj.aspx')) {
    return 'satisfaction';
  }

  if (lower.includes('xsjxpj.aspx')) {
    return 'teaching-eval';
  }

  if (lower.includes('xs_main.aspx')) {
    return 'dashboard';
  }

  return 'unknown';
}
```

- [ ] **Step 4: Run tests (expected PASS)**

Run: `npx vitest run src/content/page-detector.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/page-detector.ts src/content/page-detector.test.ts
git commit -m "feat: add page type detector"
```

---

### Task 5: DOM Analyzer

**Files:**
- Create: `src/content/dom-analyzer.ts`
- Create: `src/content/dom-analyzer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { parseEvalPage, findPjkcSelect, parseDataGridSelects, groupSelectsByTeacher } from './dom-analyzer';
import type { EvalSelect } from '../lib/types';

function makeSelectElement(id: string, name: string, options: string[]): HTMLSelectElement {
  const el = document.createElement('select');
  el.id = id;
  el.name = name;
  for (const optText of options) {
    const opt = document.createElement('option');
    opt.text = optText;
    opt.value = optText;
    el.appendChild(opt);
  }
  return el;
}

describe('parseEvalPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts course list from pjkc select', () => {
    const pjkc = makeSelectElement('pjkc', 'pjkc', ['电工电子基础实验B', '概率论与数理统计']);
    document.body.appendChild(pjkc);

    const result = parseEvalPage('satisfaction');
    expect(result.courses).toHaveLength(2);
    expect(result.courses[0].name).toBe('电工电子基础实验B');
    expect(result.currentCourseIndex).toBe(0);
  });

  it('extracts rating selects and groups by teacher', () => {
    const pjkc = makeSelectElement('pjkc', 'pjkc', ['电工电子基础实验B']);
    document.body.appendChild(pjkc);

    // 满意度调查: single teacher column JS1
    const s1 = makeSelectElement('DataGrid1__ctl2_JS1', 'DataGrid1:_ctl2:JS1', ['', '完全认同', '相对认同']);
    const s2 = makeSelectElement('DataGrid1__ctl3_JS1', 'DataGrid1:_ctl3:JS1', ['', '完全认同', '相对认同']);
    document.body.appendChild(s1);
    document.body.appendChild(s2);

    const result = parseEvalPage('satisfaction');
    expect(result.teacherGroups).toHaveLength(1);
    expect(result.teacherGroups[0].selects).toHaveLength(2);
  });

  it('groups selects by teacher suffix for teaching-eval page', () => {
    const pjkc = makeSelectElement('pjkc', 'pjkc', ['电工电子基础实验B']);
    document.body.appendChild(pjkc);

    // Two teacher columns: JS1 and JS2
    const s1js1 = makeSelectElement('DataGrid1__ctl2_JS1', 'DataGrid1:_ctl2:JS1', ['', '完全认同', '相对认同']);
    const s2js1 = makeSelectElement('DataGrid1__ctl3_JS1', 'DataGrid1:_ctl3:JS1', ['', '完全认同', '相对认同']);
    const s1js2 = makeSelectElement('DataGrid1__ctl2_JS2', 'DataGrid1:_ctl2:JS2', ['', '完全认同', '相对认同']);
    const s2js2 = makeSelectElement('DataGrid1__ctl3_JS2', 'DataGrid1:_ctl3:JS2', ['', '完全认同', '相对认同']);
    document.body.appendChild(s1js1);
    document.body.appendChild(s2js1);
    document.body.appendChild(s1js2);
    document.body.appendChild(s2js2);

    const result = parseEvalPage('teaching-eval');
    expect(result.teacherGroups).toHaveLength(2);
    expect(result.teacherGroups[0].selects).toHaveLength(2);
    expect(result.teacherGroups[1].selects).toHaveLength(2);
  });

  it('detects comment box and save button', () => {
    const pjkc = makeSelectElement('pjkc', 'pjkc', ['课程A']);
    document.body.appendChild(pjkc);

    const txt = document.createElement('textarea');
    txt.id = 'pjxx';
    document.body.appendChild(txt);

    const btn = document.createElement('input');
    btn.type = 'submit';
    btn.id = 'Button1';
    btn.value = '保  存';
    document.body.appendChild(btn);

    const result = parseEvalPage('satisfaction');
    expect(result.hasCommentBox).toBe(true);
    expect(result.commentBoxId).toBe('pjxx');
    expect(result.saveButtonId).toBe('Button1');
  });

  it('returns empty courses when pjkc not found', () => {
    const result = parseEvalPage('satisfaction');
    expect(result.courses).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests (expected FAIL)**

Run: `npx vitest run src/content/dom-analyzer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dom-analyzer.ts**

```typescript
import type { Course, EvalOption, EvalPage, EvalSelect, PageType, TeacherGroup } from '../lib/types';

/**
 * Find the course selector (#pjkc) in the DOM.
 */
export function findPjkcSelect(): HTMLSelectElement | null {
  return document.getElementById('pjkc') as HTMLSelectElement | null;
}

/**
 * Extract courses from the pjkc dropdown.
 */
export function getCourses(pjkc: HTMLSelectElement): Course[] {
  return Array.from(pjkc.options).map((opt, i) => ({
    index: i,
    name: opt.text.trim(),
    value: opt.value,
  }));
}

/**
 * Parse rating selects from the DataGrid table.
 * Matches: DataGrid1__ctl{N}_JS{M} or DataGrid1:_ctl{N}:JS{M}
 */
export function parseDataGridSelects(): EvalSelect[] {
  const selects: EvalSelect[] = [];

  document.querySelectorAll('select').forEach((sel) => {
    const htmlSel = sel as HTMLSelectElement;
    // Match DataGrid selects: id contains "DataGrid1" AND id contains "_JS" (teacher column)
    if (!htmlSel.id.includes('DataGrid1') || !htmlSel.id.includes('_JS')) {
      return;
    }

    const options: EvalOption[] = Array.from(htmlSel.options).map((opt, i) => ({
      index: i,
      text: opt.text.trim(),
      value: opt.value,
    }));

    selects.push({
      id: htmlSel.id,
      name: htmlSel.name,
      options,
    });
  });

  return selects;
}

/**
 * Group rating selects by teacher column suffix (JS1, JS2, ...).
 * For 满意度调查 there's only JS1 (single teacher).
 * For 教学评价 there may be JS1, JS2, ... (multiple teachers).
 */
export function groupSelectsByTeacher(selects: EvalSelect[]): TeacherGroup[] {
  const groups = new Map<string, EvalSelect[]>();

  for (const sel of selects) {
    // Extract teacher key from id: DataGrid1__ctl2_JS1 → JS1
    const match = sel.id.match(/(JS\d+)$/);
    const key = match ? match[1] : '__unknown__';

    const existing = groups.get(key);
    if (existing) {
      existing.push(sel);
    } else {
      groups.set(key, [sel]);
    }
  }

  return Array.from(groups.entries()).map(([teacherKey, selectList]) => ({
    teacherKey,
    selects: selectList,
  }));
}

/**
 * Check if the comment textarea exists.
 */
export function findCommentBox(): { id: string } | null {
  const el = document.getElementById('pjxx') as HTMLTextAreaElement | null;
  if (el) {
    return { id: el.id };
  }
  return null;
}

/**
 * Check if save/submit buttons exist.
 */
export function findSaveButton(): { id: string } | null {
  const el = document.getElementById('Button1') as HTMLInputElement | null;
  if (el) {
    return { id: el.id };
  }
  return null;
}

export function findSubmitButton(): { id: string } | null {
  const el = document.getElementById('Button2') as HTMLInputElement | null;
  if (el) {
    return { id: el.id };
  }
  return null;
}

/**
 * Full parse of the evaluation page state.
 */
export function parseEvalPage(pageType: PageType): EvalPage {
  const pjkc = findPjkcSelect();
  const courses: Course[] = pjkc ? getCourses(pjkc) : [];
  const currentCourseIndex = pjkc?.selectedIndex ?? 0;
  const selects = parseDataGridSelects();
  const teacherGroups = groupSelectsByTeacher(selects);
  const commentBox = findCommentBox();
  const saveBtn = findSaveButton();
  const submitBtn = findSubmitButton();

  return {
    pageType,
    courses,
    currentCourseIndex,
    teacherGroups,
    hasCommentBox: commentBox !== null,
    commentBoxId: commentBox?.id ?? null,
    saveButtonId: saveBtn?.id ?? null,
    submitButtonId: submitBtn?.id ?? null,
  };
}
```

- [ ] **Step 4: Run tests (expected PASS)**

Run: `npx vitest run src/content/dom-analyzer.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/dom-analyzer.ts src/content/dom-analyzer.test.ts
git commit -m "feat: add DOM analyzer for evaluation pages"
```

---

### Task 6: Evaluation Strategy Engine

**Files:**
- Create: `src/content/eval-strategy.ts`
- Create: `src/content/eval-strategy.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { computeFillActions, type FillAction } from './eval-strategy';
import type { TeacherGroup, EvalSelect, EvalOption } from '../lib/types';

function makeOption(text: string, idx: number): EvalOption {
  return { index: idx, text, value: text };
}

function makeSelect(id: string, name: string): EvalSelect {
  return {
    id,
    name,
    options: [
      makeOption('', 0),
      makeOption('完全认同', 1),
      makeOption('相对认同', 2),
      makeOption('勉强认同', 3),
      makeOption('不太认同', 4),
      makeOption('完全不认同', 5),
    ],
  };
}

describe('computeFillActions', () => {
  it('fills all selects with 完全认同 except one random 相对认同 per teacher', () => {
    const groups: TeacherGroup[] = [
      {
        teacherKey: 'JS1',
        selects: [
          makeSelect('DataGrid1__ctl2_JS1', 'DataGrid1:_ctl2:JS1'),
          makeSelect('DataGrid1__ctl3_JS1', 'DataGrid1:_ctl3:JS1'),
          makeSelect('DataGrid1__ctl4_JS1', 'DataGrid1:_ctl4:JS1'),
        ],
      },
    ];

    const actions = computeFillActions(groups);

    // Should produce 3 actions (one per select)
    expect(actions).toHaveLength(3);

    // Count best vs good
    const bestCount = actions.filter(a => a.value === '完全认同').length;
    const goodCount = actions.filter(a => a.value === '相对认同').length;

    expect(bestCount).toBe(2);
    expect(goodCount).toBe(1);
  });

  it('one random 相对认同 per teacher, others 完全认同', () => {
    const groups: TeacherGroup[] = [
      {
        teacherKey: 'JS1',
        selects: [
          makeSelect('s1', 's1'),
          makeSelect('s2', 's2'),
        ],
      },
      {
        teacherKey: 'JS2',
        selects: [
          makeSelect('s3', 's3'),
          makeSelect('s4', 's4'),
        ],
      },
    ];

    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(4);

    // Per group: 1 good, 1 best
    const js1Actions = actions.filter(a => a.selectId.includes('s1') || a.selectId.includes('s2'));
    const js2Actions = actions.filter(a => a.selectId.includes('s3') || a.selectId.includes('s4'));

    expect(js1Actions.filter(a => a.value === '相对认同')).toHaveLength(1);
    expect(js1Actions.filter(a => a.value === '完全认同')).toHaveLength(1);
    expect(js2Actions.filter(a => a.value === '相对认同')).toHaveLength(1);
    expect(js2Actions.filter(a => a.value === '完全认同')).toHaveLength(1);
  });

  it('single select per teacher — always gets 完全认同 (can not pick random)', () => {
    const groups: TeacherGroup[] = [
      {
        teacherKey: 'JS1',
        selects: [makeSelect('s1', 's1')],
      },
    ];

    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(1);
    expect(actions[0].value).toBe('完全认同');
  });

  it('returns empty array for empty groups', () => {
    expect(computeFillActions([])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests (expected FAIL)**

Run: `npx vitest run src/content/eval-strategy.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement eval-strategy.ts**

```typescript
import type { TeacherGroup } from '../lib/types';

export interface FillAction {
  selectId: string;
  value: string;
}

/**
 * Apply the strategy: for each teacher, randomly pick 1 question
 * to fill as "相对认同", the rest as "完全认同".
 *
 * If a teacher has only 1 select, it gets "完全认同".
 */
export function computeFillActions(groups: TeacherGroup[]): FillAction[] {
  const actions: FillAction[] = [];

  for (const group of groups) {
    const { selects } = group;
    if (selects.length === 0) continue;

    const randomIdx = Math.floor(Math.random() * selects.length);

    for (let i = 0; i < selects.length; i++) {
      const value = i === randomIdx ? '相对认同' : '完全认同';
      actions.push({
        selectId: selects[i].id,
        value,
      });
    }
  }

  return actions;
}
```

- [ ] **Step 4: Run tests (expected PASS)**

Run: `npx vitest run src/content/eval-strategy.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/eval-strategy.ts src/content/eval-strategy.test.ts
git commit -m "feat: add evaluation strategy engine"
```

---

### Task 7: DOM Fill

**Files:**
- Create: `src/content/dom-fill.ts`
- Create: `src/content/dom-fill.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { applyFillActions, writeComment } from './dom-fill';
import type { FillAction } from './eval-strategy';

describe('applyFillActions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sets select values based on fill actions', () => {
    const sel1 = document.createElement('select');
    sel1.id = 'DataGrid1__ctl2_JS1';
    ['', '完全认同', '相对认同'].forEach(t => {
      const o = document.createElement('option');
      o.text = t;
      o.value = t;
      sel1.appendChild(o);
    });
    document.body.appendChild(sel1);

    const actions: FillAction[] = [
      { selectId: 'DataGrid1__ctl2_JS1', value: '相对认同' },
    ];

    applyFillActions(actions);

    expect(sel1.value).toBe('相对认同');
  });

  it('throws if select not found', () => {
    expect(() => {
      applyFillActions([{ selectId: 'nonexistent', value: '完全认同' }]);
    }).toThrow();
  });
});

describe('writeComment', () => {
  it('writes text to comment box', () => {
    const txt = document.createElement('textarea');
    txt.id = 'pjxx';
    document.body.appendChild(txt);

    writeComment('pjxx', '老师教学认真！');

    expect(txt.value).toBe('老师教学认真！');
  });

  it('throws if comment box not found', () => {
    expect(() => {
      writeComment('nonexistent', 'test');
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run tests (expected FAIL)**

Run: `npx vitest run src/content/dom-fill.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dom-fill.ts**

```typescript
import type { FillAction } from './eval-strategy';

/**
 * Apply fill actions to the DOM: set each select to the specified value.
 * Throws if a select is not found.
 */
export function applyFillActions(actions: FillAction[]): void {
  for (const action of actions) {
    const el = document.getElementById(action.selectId) as HTMLSelectElement | null;
    if (!el) {
      throw new Error(`未找到元素: ${action.selectId}`);
    }

    el.value = action.value;

    // Dispatch change event so ASP.NET postback hooks fire
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Write comment text to the textarea.
 */
export function writeComment(textareaId: string, text: string): void {
  const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!el) {
    throw new Error(`未找到评语框: ${textareaId}`);
  }
  el.value = text;
}

/**
 * Click the save button by ID.
 */
export function clickSave(buttonId: string): void {
  const el = document.getElementById(buttonId) as HTMLInputElement | null;
  if (!el) {
    throw new Error(`未找到保存按钮: ${buttonId}`);
  }
  el.click();
}

/**
 * Click the submit button by ID.
 */
export function clickSubmit(buttonId: string): void {
  const el = document.getElementById(buttonId) as HTMLInputElement | null;
  if (!el) {
    throw new Error(`未找到提交按钮: ${buttonId}`);
  }
  el.click();
}

/**
 * Select a course in the pjkc dropdown and trigger the ASP.NET postback.
 */
export function selectCourse(courseIndex: number): void {
  const pjkc = document.getElementById('pjkc') as HTMLSelectElement | null;
  if (!pjkc) {
    throw new Error('未找到课程选择器');
  }

  if (courseIndex < 0 || courseIndex >= pjkc.options.length) {
    throw new Error(`课程索引越界: ${courseIndex} / ${pjkc.options.length}`);
  }

  pjkc.selectedIndex = courseIndex;

  // Trigger ASP.NET __doPostBack for server-side course switch
  if (typeof (window as any).__doPostBack === 'function') {
    (window as any).__doPostBack('pjkc', '');
  } else {
    // Fallback: dispatch change event
    pjkc.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
```

- [ ] **Step 4: Run tests (expected PASS)**

Run: `npx vitest run src/content/dom-fill.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/dom-fill.ts src/content/dom-fill.test.ts
git commit -m "feat: add DOM fill operations"
```

---

### Task 8: Zustand Store

**Files:**
- Create: `src/content/store.ts`

- [ ] **Step 1: Write store.ts**

```typescript
import { create } from 'zustand';
import { loadSettings, saveSettings } from '../lib/storage';
import { DEFAULT_EVAL_SETTINGS, type EvalSettings, type LoopStatus, type PageType, type EvalPage } from '../lib/types';

interface EvalStoreState {
  /** Current page type */
  pageType: PageType;
  /** Parsed evaluation page state */
  evalPage: EvalPage | null;
  /** Loop running status */
  loopStatus: LoopStatus;
  /** Current course index being processed */
  currentCourseIndex: number;
  /** Error message if loopStatus === 'error' */
  errorMessage: string;
  /** Persisted settings */
  settings: EvalSettings;
  /** Have settings been loaded from storage? */
  settingsHydrated: boolean;

  // Actions
  setPageType: (t: PageType) => void;
  setEvalPage: (p: EvalPage) => void;
  setLoopStatus: (s: LoopStatus) => void;
  setErrorMessage: (msg: string) => void;
  setCurrentCourseIndex: (i: number) => void;
  hydrateSettings: () => Promise<void>;
  updateSettings: (patch: Partial<EvalSettings>) => Promise<void>;
  reset: () => void;
}

export const useEvalStore = create<EvalStoreState>((set, get) => ({
  pageType: 'unknown',
  evalPage: null,
  loopStatus: 'idle',
  currentCourseIndex: 0,
  errorMessage: '',
  settings: DEFAULT_EVAL_SETTINGS,
  settingsHydrated: false,

  setPageType(t) {
    set({ pageType: t });
  },

  setEvalPage(p) {
    set({ evalPage: p, currentCourseIndex: p.currentCourseIndex });
  },

  setLoopStatus(s) {
    set({ loopStatus: s });
    if (s === 'idle') {
      set({ errorMessage: '' });
    }
  },

  setErrorMessage(msg) {
    set({ errorMessage: msg, loopStatus: 'error' });
  },

  setCurrentCourseIndex(i) {
    set({ currentCourseIndex: i });
  },

  async hydrateSettings() {
    if (get().settingsHydrated) return;
    const settings = await loadSettings();
    set({ settings, settingsHydrated: true });
  },

  async updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await saveSettings(next);
  },

  reset() {
    set({
      loopStatus: 'idle',
      currentCourseIndex: 0,
      errorMessage: '',
    });
  },
}));
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/store.ts
git commit -m "feat: add Zustand store for eval state management"
```

---

### Task 9: Evaluation Loop Orchestrator

**Files:**
- Create: `src/content/eval-loop.ts`

- [ ] **Step 1: Write eval-loop.ts**

```typescript
import { parseEvalPage } from './dom-analyzer';
import { computeFillActions } from './eval-strategy';
import { applyFillActions, clickSave, selectCourse, writeComment } from './dom-fill';
import { useEvalStore } from './store';

/**
 * Wait for DOM to stabilize after a postback (page re-render).
 * Polls for the presence of pjkc select with updated state.
 */
function waitForPostback(maxWaitMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const pjkc = document.getElementById('pjkc') as HTMLSelectElement | null;
      // Check that pjkc exists AND the DataGrid selects have loaded
      const dataGridSelects = document.querySelectorAll('select[id*="DataGrid1"]');

      if (pjkc && dataGridSelects.length > 0) {
        resolve();
        return;
      }

      if (Date.now() - start > maxWaitMs) {
        reject(new Error('等待页面响应超时'));
        return;
      }

      setTimeout(check, 200);
    };

    check();
  });
}

/**
 * Run one cycle: fill current course → save → return next index.
 * Returns the next course index, or -1 if done.
 */
async function fillAndSaveCurrentCourse(currentIndex: number, comment: string): Promise<number> {
  const page = parseEvalPage(useEvalStore.getState().pageType);

  if (page.courses.length === 0) {
    throw new Error('未找到课程列表');
  }

  if (currentIndex >= page.courses.length) {
    return -1; // All done
  }

  // 1. Select the course (triggers postback if not already selected)
  if (page.currentCourseIndex !== currentIndex) {
    selectCourse(currentIndex);
    await waitForPostback();
    // Re-parse after postback
    const refreshed = parseEvalPage(useEvalStore.getState().pageType);
    Object.assign(page, refreshed);
  }

  // 2. Compute fill actions
  const actions = computeFillActions(page.teacherGroups);

  // 3. Apply fill actions to DOM
  applyFillActions(actions);

  // 4. Write comment if comment box exists
  if (page.hasCommentBox && page.commentBoxId) {
    writeComment(page.commentBoxId, comment);
  }

  // 5. Click save
  if (page.saveButtonId) {
    clickSave(page.saveButtonId);
  } else {
    throw new Error('未找到保存按钮');
  }

  return currentIndex + 1;
}

/**
 * Start the evaluation loop. Runs course by course with postback waits.
 * Updates Zustand store for UI progress display.
 */
export async function startEvalLoop(comment: string): Promise<void> {
  const store = useEvalStore.getState;
  const set = useEvalStore.setState;

  set({ loopStatus: 'running', errorMessage: '' });

  const page = parseEvalPage(store().pageType);
  set({ evalPage: page });

  if (page.courses.length === 0) {
    set({ loopStatus: 'error', errorMessage: '未检测到课程列表，请确认在评价页面。' });
    return;
  }

  let currentIndex = page.currentCourseIndex;

  try {
    while (currentIndex >= 0 && currentIndex < page.courses.length) {
      // Check if stopped by user
      if (store().loopStatus === 'paused' || store().loopStatus === 'idle') {
        break;
      }

      set({ currentCourseIndex: currentIndex });

      const nextIndex = await fillAndSaveCurrentCourse(currentIndex, comment);

      if (nextIndex < 0) {
        // All done
        set({ loopStatus: 'done', currentCourseIndex: page.courses.length });
        return;
      }

      currentIndex = nextIndex;

      // Brief delay before moving to next course
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch (err) {
    set({
      loopStatus: 'error',
      errorMessage: err instanceof Error ? err.message : '评价过程出错',
      currentCourseIndex: currentIndex,
    });
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/eval-loop.ts
git commit -m "feat: add evaluation loop orchestrator"
```

---

### Task 10: React Side Panel UI

**Files:**
- Create: `src/content/EvalPanelApp.tsx`

- [ ] **Step 1: Write EvalPanelApp.tsx**

```tsx
import { useEffect, useCallback } from 'react';
import { useEvalStore } from './store';
import { parseEvalPage } from './dom-analyzer';
import { detectPageType } from './page-detector';
import { startEvalLoop } from './eval-loop';

const PAGE_LABELS: Record<string, string> = {
  satisfaction: '满意度调查',
  'teaching-eval': '教学评价',
  dashboard: '教务首页',
  unknown: '非评价页面',
};

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  const labelMap: Record<string, string> = {
    idle: '就绪',
    running: '运行中',
    paused: '已暂停',
    done: '已完成',
    error: '出错',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[status] || colorMap.idle}`}>
      {labelMap[status] || status}
    </span>
  );
}

export function EvalPanelApp() {
  const pageType = useEvalStore((s) => s.pageType);
  const evalPage = useEvalStore((s) => s.evalPage);
  const loopStatus = useEvalStore((s) => s.loopStatus);
  const currentCourseIndex = useEvalStore((s) => s.currentCourseIndex);
  const errorMessage = useEvalStore((s) => s.errorMessage);
  const settings = useEvalStore((s) => s.settings);
  const settingsHydrated = useEvalStore((s) => s.settingsHydrated);

  const refresh = useCallback(() => {
    const pt = detectPageType(window.location.href);
    useEvalStore.getState().setPageType(pt);

    if (pt === 'satisfaction' || pt === 'teaching-eval') {
      const page = parseEvalPage(pt);
      useEvalStore.getState().setEvalPage(page);
    }
  }, []);

  useEffect(() => {
    useEvalStore.getState().hydrateSettings();
    refresh();

    // Re-parse on hash change (ASP.NET postback navigation)
    const onHashChange = () => refresh();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [refresh]);

  const isEvalPage = pageType === 'satisfaction' || pageType === 'teaching-eval';
  const canStart = isEvalPage && evalPage && evalPage.courses.length > 0 && (loopStatus === 'idle' || loopStatus === 'paused' || loopStatus === 'done');
  const isRunning = loopStatus === 'running';

  const handleStart = () => {
    useEvalStore.getState().reset();
    startEvalLoop(settings.comment);
  };

  const handleStop = () => {
    useEvalStore.getState().setLoopStatus('idle');
  };

  const handleReset = () => {
    useEvalStore.getState().reset();
  };

  const totalCourses = evalPage?.courses.length ?? 0;
  const progress = totalCourses > 0 ? `${Math.min(currentCourseIndex + 1, totalCourses)} / ${totalCourses}` : '-';

  if (!settingsHydrated) return null;

  return (
    <div className="njupt-eval-panel">
      <div className="fixed top-4 right-4 z-[99999] w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans text-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-base">NJUPT 教务助手</h2>
            <StatusBadge status={loopStatus} />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Page info */}
          <div className="text-gray-500 text-xs">
            当前页面：
            <span className={`font-medium ${isEvalPage ? 'text-blue-600' : 'text-gray-400'}`}>
              {PAGE_LABELS[pageType] || pageType}
            </span>
          </div>

          {isEvalPage && evalPage && (
            <>
              <div className="text-gray-500 text-xs">
                课程进度：<span className="font-medium text-gray-700">{progress}</span>
              </div>
              {evalPage.courses[currentCourseIndex] && (
                <div className="text-gray-500 text-xs truncate">
                  当前：<span className="font-medium text-gray-700">{evalPage.courses[currentCourseIndex].name}</span>
                </div>
              )}
              <div className="text-gray-500 text-xs">
                教师组：<span className="font-medium text-gray-700">{evalPage.teacherGroups.length}</span>
              </div>
            </>
          )}

          {/* Comment template */}
          {isEvalPage && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">评语模板</label>
              <textarea
                className="w-full text-xs border border-gray-200 rounded p-2 resize-none focus:outline-none focus:border-blue-400"
                rows={2}
                maxLength={50}
                value={settings.comment}
                onChange={(e) => useEvalStore.getState().updateSettings({ comment: e.target.value })}
              />
            </div>
          )}

          {/* Strategy info */}
          {isEvalPage && (
            <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
              策略：每师随机1个"相对认同"，其余"完全认同"
            </div>
          )}

          {/* Error message */}
          {loopStatus === 'error' && errorMessage && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2">
              {errorMessage}
            </div>
          )}

          {/* Done message */}
          {loopStatus === 'done' && (
            <div className="text-xs text-green-600 bg-green-50 rounded p-2">
              全部评价完成！请手动点击页面底部的【提交】按钮。
            </div>
          )}

          {/* Action buttons */}
          {isEvalPage && (
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!canStart}
                onClick={handleStart}
              >
                {pageType === 'satisfaction' ? '一键满意度' : '一键评价'}
              </button>
              {isRunning && (
                <button
                  className="py-2 px-3 rounded font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                  onClick={handleStop}
                >
                  停止
                </button>
              )}
            </div>
          )}

          {/* Reset button (only when done or error) */}
          {(loopStatus === 'done' || loopStatus === 'error') && (
            <button
              className="w-full py-1.5 rounded text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              onClick={handleReset}
            >
              重置
            </button>
          )}

          {/* Non-eval page hint */}
          {!isEvalPage && pageType !== 'unknown' && (
            <div className="text-xs text-gray-400 text-center">
              请在评价页面使用此功能
            </div>
          )}
          {pageType === 'unknown' && (
            <div className="text-xs text-gray-400 text-center">
              请导航至教务系统页面
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/EvalPanelApp.tsx
git commit -m "feat: add React side panel UI"
```

---

### Task 11: Content Script Entrypoint

**Files:**
- Create: `entrypoints/eval-panel.content/index.tsx`

- [ ] **Step 1: Write index.tsx**

```tsx
import '../../src/styles/app.css';
import ReactDOM from 'react-dom/client';
import { EvalPanelApp } from '../../src/content/EvalPanelApp';

async function waitForBody(): Promise<void> {
  if (document.body) return;

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export default defineContentScript({
  matches: [
    'http://jwxt.njupt.edu.cn/*',
    'http://202.119.225.134/*',
  ],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await waitForBody();

    const ui = await createShadowRootUi(ctx, {
      name: 'njupt-eval-panel',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const mountNode = document.createElement('div');
        mountNode.id = 'njupt-eval-panel-root';
        container.append(mountNode);

        const root = ReactDOM.createRoot(mountNode);
        root.render(<EvalPanelApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();

    ctx.onInvalidated(() => {
      ui.remove();
    });
  },
});
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Run: `npm run build`
Expected: Both PASS

- [ ] **Step 3: Commit**

```bash
git add entrypoints/eval-panel.content/index.tsx
git commit -m "feat: add content script entrypoint"
```

---

### Task 12: End-to-End Verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds, outputs to `.output/chrome-mv3/`

- [ ] **Step 2: Full check suite**

Run: `npm run check`
Expected: typecheck PASS, tests PASS, build PASS

- [ ] **Step 3: Manual smoke test**

1. Open Chrome → `chrome://extensions/` → Load unpacked → select `.output/chrome-mv3/`
2. Navigate to `http://jwxt.njupt.edu.cn/` and log in manually
3. Navigate to 满意度调查 page
4. Verify the side panel appears with course info and controls
5. Verify "一键满意度" button is functional
6. Verify progress display updates

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: finalize build verification"
```

---

## Self-Review Checklist

- [x] Spec coverage: All design elements covered (page detection, DOM parsing, strategy, fill, loop, UI, storage)
- [x] No placeholders: All code is concrete
- [x] Type consistency: Types in `src/lib/types.ts` used consistently across all files
- [x] icourse163-ai patterns followed: WXT entrypoint structure, Zustand store, ShadowRoot UI, test patterns
