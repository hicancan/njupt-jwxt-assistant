import { describe, it, expect, beforeEach } from 'vitest';
import { parseEvalPage } from './dom-analyzer';

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
