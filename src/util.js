/* 花光首富的钱 — 通用工具函数 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  /* ---------- 数字格式化 ---------- */
  // 中文习惯：万 / 亿 / 万亿
  const UNITS = [
    { v: 1e12, s: '万亿' },
    { v: 1e8, s: '亿' },
    { v: 1e4, s: '万' },
  ];

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    const neg = n < 0;
    let a = Math.abs(n);
    if (a < 10000) {
      let s;
      if (!Number.isInteger(a)) {
        s = trimZeros(a.toFixed(2));
      } else {
        s = Math.floor(a).toLocaleString('en-US');
      }
      return (neg ? '-' : '') + s;
    }
    for (const u of UNITS) {
      if (a >= u.v) {
        let val = a / u.v;
        let digits = val >= 1000 ? 0 : val >= 100 ? 1 : 2;
        // 只在有小数点时去掉尾部多余的 0，避免把 1430 变成 143
        let s = trimZeros(val.toFixed(digits));
        return (neg ? '-' : '') + s + u.s;
      }
    }
    return String(Math.floor(a));
  }

  // 去掉小数部分末尾的 0（整数原样返回）
  function trimZeros(s) {
    if (s.indexOf('.') < 0) return s;
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  // 带 $ 前缀
  function money(n) {
    return '$' + fmt(n);
  }

  // 完整数字（悬停用）
  function full(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /* ---------- 随机 ---------- */
  function rnd(min, max) {
    return Math.random() * (max - min) + min;
  }
  function rndInt(min, max) {
    return Math.floor(rnd(min, max + 1));
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // 按权重抽取
  function weightedPick(list, weightFn) {
    let total = 0;
    for (const it of list) total += Math.max(0, weightFn(it));
    let r = Math.random() * total;
    for (const it of list) {
      r -= Math.max(0, weightFn(it));
      if (r <= 0) return it;
    }
    return list[list.length - 1];
  }
  function chance(p) {
    return Math.random() < p;
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ---------- DOM ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* ---------- 百分比 ---------- */
  function pct(n, digits) {
    const d = digits === undefined ? 0 : digits;
    return (n >= 0 ? '+' : '') + (n * 100).toFixed(d) + '%';
  }

  /* ---------- 存档 ---------- */
  const SAVE_KEY = 'rich-rush-save-v1';
  function save(obj) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  }
  function load() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  }
  function wipeSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  RR.util = {
    fmt, money, full, rnd, rndInt, pick, shuffle, weightedPick, chance, clamp,
    el, $, $$, clear, pct, save, load, wipeSave, SAVE_KEY,
  };
})(window.RR);
