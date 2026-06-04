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

  it('detects schedule page', () => {
    const url = 'http://jwxt.njupt.edu.cn/xskbcx.aspx?xh=B24040213&gnmkdm=N121603';
    expect(detectPageType(url)).toBe('schedule');
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
