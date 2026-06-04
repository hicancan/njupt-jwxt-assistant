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
  beforeEach(() => {
    document.body.innerHTML = '';
  });

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
