/* UI 组件与渲染 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';
  const U = RR.util;
  const $ = U.$;

  /* ---------------- 通用组件 ---------------- */
  RR.toast = function (msg, type, ms) {
    const root = $('#toast-root');
    const t = U.el('div', 'toast' + (type ? ' ' + type : ''), msg);
    root.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(-8px)';
      setTimeout(() => t.remove(), 320);
    }, ms || 2200);
  };

  RR.modal = function (opt) {
    const root = $('#modal-root');
    const mask = U.el('div', 'modal-mask');
    const box = U.el('div', 'modal' + (opt.wide ? ' wide' : ''));
    let head = '';
    if (opt.title) {
      head = '<div class="modal-head">' + (opt.emoji ? '<span class="evt-emoji" style="font-size:22px">' + opt.emoji + '</span>' : '') +
        '<h3>' + opt.title + '</h3>' + (opt.closable === false ? '' : '<button class="x-btn" data-x>×</button>') + '</div>';
    }
    box.innerHTML = head + '<div class="modal-body">' + (opt.body || '') + '</div>' +
      (opt.foot === false ? '' : '<div class="modal-foot">' + (opt.foot || '') + '</div>');
    mask.appendChild(box);
    root.appendChild(mask);
    const close = () => mask.remove();
    mask.addEventListener('click', (e) => {
      if (e.target === mask && opt.closable !== false) close();
      if (e.target.hasAttribute && e.target.hasAttribute('data-x')) close();
    });
    return { el: box, mask, close };
  };

  const RNAME = { white: '白板', green: '绿色', blue: '蓝色', purple: '紫色', gold: '金色', red: '红色' };
  RR.rarityName = (r) => RNAME[r] || r;

  /* 卡牌效果文字化 */
  function scopeName(scope) {
    if (!scope) return '';
    if (scope.indexOf('cat:') === 0) {
      const c = RR.CATEGORIES[scope.slice(4)];
      return c ? c.name : scope.slice(4);
    }
    if (scope === 'all') return '全场景';
    const s = RR.getScene(scope);
    return s ? s.name : scope;
  }
  RR.scopeName = scopeName;

  RR.effSummary = function (card) {
    const e = card.eff || {};
    const out = [];
    if (e.spend) out.push('消费 ' + U.money(e.spend));
    if (e.spendPct) out.push('消费资产 ' + (e.spendPct * 100).toFixed(0) + '%');
    if (e.ap) out.push('+' + e.ap + ' 行动点');
    if (e.points) out.push('+' + U.fmt(e.points) + ' 积分');
    if (e.dailySpend) out.push(e.dailySpend.days + ' 天内每天扣 ' + U.money(e.dailySpend.amount));
    (e.timed || []).forEach((t) => out.push(t.days + ' 天 ' + scopeName(t.scope) + ' +' + Math.round(t.pct * 100) + '%'));
    (e.timedAp || []).forEach((t) => out.push(t.days + ' 天 每天 +' + t.ap + ' AP'));
    if (e.timedPerJet) out.push(e.timedPerJet.days + ' 天 每架飞机 +' + e.timedPerJet.ap + ' AP');
    if (e.timedPerCar) out.push(e.timedPerCar.days + ' 天 每辆车 +' + e.timedPerCar.ap + ' AP');
    (e.perm || []).forEach((t) => out.push('永久 ' + scopeName(t.scope) + ' +' + Math.round(t.pct * 100) + '%'));
    if (e.permAp) out.push('永久 每天 ' + (e.permAp > 0 ? '+' : '') + e.permAp + ' AP');
    if (e.permMaxAp) out.push('永久 AP 上限 +' + e.permMaxAp);
    if (e.permSlot) out.push('永久 卡槽 +' + e.permSlot);
    if (e.permStockOps) out.push('永久 股票操作 +' + e.permStockOps);
    if (e.permStockCap) out.push('永久 股票上限 ×' + e.permStockCap);
    if (e.permBatchAp) out.push('永久 批量 AP -' + e.permBatchAp);
    if (e.permDrainPct) out.push('永久 每天资产 -' + (e.permDrainPct * 100).toFixed(1) + '%');
    if (e.permTaxPct) out.push('永久 每笔额外 -' + (e.permTaxPct * 100).toFixed(0) + '%');
    if (e.permApFull) out.push('永久 每天行动点翻倍');
    if (e.permApCost1) out.push('永久 行动点消耗固定 1');
    if (e.permDailyInfl) out.push('永久 每天全场景 +' + (e.permDailyInfl * 100).toFixed(0) + '%');
    if (e.permAuction) out.push('永久 解锁限量加价');
    if (e.permSpendMult) out.push('永久 一次性消费 ×' + (1 + e.permSpendMult));
    if (e.permSpendEcho) out.push('永久 ' + Math.round(e.permSpendEcho.chance * 100) + '% 概率消费翻倍');
    if (e.permPointMul) out.push('永久 积分获取 ×' + (1 + e.permPointMul));
    if (e.stockCrash) out.push('永久 股市暴跌概率 +' + (e.stockCrash * 100).toFixed(0) + '%');
    if (e.stockForceDown) out.push('永久 股市每日下挫 ' + (e.stockForceDown * 100).toFixed(0) + '%');
    if (e.aiDigital) out.push('持有AI股+投AI公司时 数码 +' + (e.aiDigital * 100).toFixed(0) + '%');
    if (e.draw) out.push('抽 ' + e.draw + ' 张卡' + (e.costPoints ? '（耗 ◆' + e.costPoints + '）' : ''));
    if (e.copyCard) out.push('复制背包 1 张卡');
    if (e.hoardBuyUp && Object.keys(e.hoardBuyUp).length) out.push('囤积买入价 +' + Math.round(Object.values(e.hoardBuyUp).reduce((a, x) => a + x, 0) * 100) + '%');
    if (e.hoardVol && Object.keys(e.hoardVol).length) out.push('囤积波动 +' + Math.round(Object.values(e.hoardVol).reduce((a, x) => a + x, 0) * 100) + '%');
    if (e.hoardCrash && Object.keys(e.hoardCrash).length) out.push('囤积暴跌率 +' + Math.round(Object.keys(e.hoardCrash).reduce((a, x) => a + e.hoardCrash[x], 0) * 100) + '%');
    if (e.hoardCrashDeep && Object.keys(e.hoardCrashDeep).length) out.push('囤积暴跌深度 +' + Math.round(Object.keys(e.hoardCrashDeep).reduce((a, x) => a + e.hoardCrashDeep[x], 0) * 100) + '%');
    return out;
  };

  RR.traitSummary = function (t) {
    const e = t.eff || {};
    const out = [];
    (e.sceneSpend || []).forEach((x) => out.push(scopeName(x.scene) + ' +' + Math.round(x.pct * 100) + '%'));
    (e.catSpend || []).forEach((x) => {
      const c = RR.CATEGORIES[x.cat];
      out.push((c ? c.name : x.cat) + ' +' + Math.round(x.pct * 100) + '%');
    });
    (e.sceneAp || []).forEach((x) => out.push(scopeName(x.scene) + ' AP ' + x.delta));
    if (e.dailyAp) out.push('每天 ' + (e.dailyAp > 0 ? '+' : '') + e.dailyAp + ' AP');
    if (e.stockOps) out.push('股票操作 +' + e.stockOps);
    if (e.pointGain) out.push('积分 +' + Math.round(e.pointGain * 100) + '%');
    if (e.eventRate) out.push('事件率 +' + Math.round(e.eventRate * 100) + '%');
    if (e.batchAp) out.push('批量 AP -' + e.batchAp);
    if (e.spendEcho) out.push('每笔追加 -' + Math.round(e.spendEcho * 100) + '%');
    if (e.investAmount) out.push('投资额 +' + Math.round(e.investAmount * 100) + '%');
    if (e.investSlots) out.push('投资席位 +' + e.investSlots);
    if (e.investLife) out.push('倒闭概率 -' + Math.round(e.investLife * 100) + '%');
    if (e.investApPerCompany) out.push('每家公司 +' + e.investApPerCompany + ' AP');
    if (e.firstFree) out.push('每日首次' + scopeName(e.firstFree) + '免费');
    if (e.apFreeChance) out.push(Math.round(e.apFreeChance * 100) + '% 不耗 AP');
    if (e.priceSpike) out.push('随机单品 +' + Math.round(e.priceSpike * 100) + '%');
    if (e.bulkSurcharge) out.push('批量 ≥×10 时 +' + Math.round(e.bulkSurcharge * 100) + '%');
    if (e.missionPoint) out.push('任务积分 +' + Math.round(e.missionPoint * 100) + '%');
    if (e.eventDouble) out.push('事件可加倍下注');
    if (e.cardSlot) out.push('卡槽 +' + e.cardSlot);
    if (e.unlock) out.push('解锁限定商品');
    if (e.perShop) {
      if (e.perShop.ap) out.push('每商铺 +' + e.perShop.ap + ' AP（上限 ' + e.perShop.cap + '）');
      if (e.perShop.pct) out.push('每商铺 +' + Math.round(e.perShop.pct * 100) + '%（上限 ' + Math.round(e.perShop.cap * 100) + '%）');
    }
    if (e.perCar) out.push('每辆车 +' + e.perCar.ap + ' AP（上限 ' + e.perCar.cap + '）');
    if (e.semiAp) out.push('每个半永久增益 +' + e.semiAp.ap + ' AP');
    if (e.maxAp) out.push('AP 上限 +' + e.maxAp);
    if (e.stockCrash) out.push('股市暴跌概率 +' + (e.stockCrash * 100).toFixed(0) + '%');
    if (e.aiDigital) out.push('AI联动时数码 +' + (e.aiDigital * 100).toFixed(0) + '%');
    if (e.cardSlot) out.push('卡槽 +' + e.cardSlot);
    if (e.hoardBuyUp && Object.keys(e.hoardBuyUp).length) out.push('囤积买入价 +' + Math.round(Object.values(e.hoardBuyUp).reduce((a, x) => a + x, 0) * 100) + '%');
    if (e.hoardVol && Object.keys(e.hoardVol).length) out.push('囤积波动 +' + Math.round(Object.values(e.hoardVol).reduce((a, x) => a + x, 0) * 100) + '%');
    if (e.hoardCrash && Object.keys(e.hoardCrash).length) out.push('囤积暴跌率 +' + Math.round(Object.keys(e.hoardCrash).reduce((a, x) => a + e.hoardCrash[x], 0) * 100) + '%');
    if (e.hoardCrashDeep && Object.keys(e.hoardCrashDeep).length) out.push('囤积暴跌深度 +' + Math.round(Object.keys(e.hoardCrashDeep).reduce((a, x) => a + e.hoardCrashDeep[x], 0) * 100) + '%');
    return out;
  };

  /* 卡片 HTML */
  RR.cardHTML = function (card, opt) {
    const o = opt || {};
    const r = RR.RARITY[card.r];
    const eff = RR.effSummary(card);
    const typeName = RR.CARD_TYPE_NAME[card.type] || card.type;
    const slotTag = RR.isEquipType(card) ? ' · 占槽' : ' · 不占槽';
    const schoolName = RR.SCHOOL_NAME[card.school] || '';
    return '<div class="draw-card rw-' + card.r + '" data-card="' + card.id + '"' + (o.attr || '') + '>' +
      '<div class="dc-r c-' + card.r + '">' + r.name + (schoolName ? ' · ' + schoolName : '') + '</div>' +
      '<div class="dc-name">' + card.name + '</div>' +
      '<div class="dc-type">' + typeName + slotTag + '</div>' +
      '<div class="dc-desc">' + card.desc + '</div>' +
      (eff.length ? '<div class="dc-eff c-' + card.r + '">' + eff.join(' · ') + '</div>' : '') +
      (o.foot ? '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' + o.foot + '</div>' : '') +
      '</div>';
  };

  RR.miniCardHTML = function (card, attr, extra) {
    const r = RR.RARITY[card.r];
    const eff = RR.effSummary(card).slice(0, 3).join(' · ');
    return '<div class="mini-card rw-' + card.r + '" ' + (attr || '') + '>' +
      '<div class="mc-r c-' + card.r + '">' + r.name + '</div>' +
      '<div class="mc-name">' + card.name + '</div>' +
      (eff ? '<div class="mc-desc">' + eff + '</div>' : '') +
      (extra || '') + '</div>';
  };

  /* ---------------- 顶栏 ---------------- */
  RR.renderTop = function (S) {
    const b = RR.bonuses(S);
    const maxAp = RR.maxApOf(S, b);
    const spent = Math.max(0, S.initAsset - S.asset);
    const pctDone = U.clamp(spent / S.initAsset, 0, 1);
    const daysLeft = Math.max(0, S.totalDays - S.day + 1);

    let dots = '';
    const shown = Math.min(maxAp, 26);
    for (let i = 0; i < shown; i++) dots += '<span class="ap-dot' + (i < S.ap ? ' on' : '') + '"></span>';
    if (maxAp > shown) dots += '<span class="ap-dot" title="更多"></span>';

    $('#topbar').innerHTML =
      '<div class="tb-who">' +
        '<div class="tb-avatar">' + S.tycoonAvatar + '</div>' +
        '<div><div class="tb-name">' + S.tycoonName + '</div><div class="tb-sub">' + S.tycoonAlias + '</div></div>' +
      '</div>' +
      '<div class="tb-asset">' +
        '<div class="tb-label">剩余资产</div>' +
        '<div class="tb-value num">' + U.money(S.asset) + '</div>' +
        '<div class="bar gold"><i style="width:' + (pctDone * 100).toFixed(2) + '%"></i></div>' +
        '<div class="tb-sub num">已花掉 ' + U.money(spent) + '（' + (pctDone * 100).toFixed(2) + '%）</div>' +
      '</div>' +
      '<div class="tb-stat"><div class="tb-label">第几天</div>' +
        '<div class="tb-value num">' + S.day + ' <span style="font-size:12px;color:var(--ink3)">/ ' + S.totalDays + '</span></div>' +
        '<div class="tb-sub num">剩 ' + daysLeft + ' 天</div></div>' +
      '<div class="tb-stat"><div class="tb-label">行动点</div>' +
        '<div class="tb-value num sm">' + S.ap + ' / ' + maxAp + '</div>' +
        '<div class="ap-dots">' + dots + '</div></div>' +
      '<div class="tb-stat"><div class="tb-label">积分</div>' +
        '<div class="tb-value sm gold num">◆ ' + U.fmt(S.points) + '</div></div>' +
      '<div class="tb-right">' +
        '<button class="btn" data-act="inv">清单</button>' +
        '<button class="btn" data-act="bag">背包' + (S.bag.length ? '<span class="badge">' + S.bag.length + '</span>' : '') + '</button>' +
        '<button class="btn gold" data-act="sleep">结束今天</button>' +
        '<button class="btn" data-act="menu">⋯</button>' +
      '</div>';
  };

  /* ---------------- 左栏 ---------------- */
  RR.renderLeft = function (S) {
    const b = RR.bonuses(S);
    let h = '<div class="side-title">消费场景</div>';
    RR.SCENES.forEach((sc) => {
      const ap = RR.apCostFor(S, b, sc.id, 0);
      h += '<button class="scene-btn' + (RR.view === sc.id ? ' on' : '') + '" data-act="scene" data-id="' + sc.id + '">' +
        '<span class="sc-emoji">' + sc.emoji + '</span>' +
        '<span class="sc-name">' + sc.name + '</span>' +
        '<span class="sc-ap">' + ap + ' AP</span></button>';
    });
    h += '<div class="side-title">功能</div>';
    h += '<button class="func-btn' + (RR.view === 'mission' ? ' on' : '') + '" data-act="mission"><span>🎯 挑战任务</span></button>';
    h += '<button class="func-btn' + (RR.view === 'title' ? ' on' : '') + '" data-act="title"><span>🏅 称号</span></button>';
    h += '<button class="func-btn' + (RR.view === 'shop' ? ' on' : '') + '" data-act="shop"><span>🎰 积分商城</span></button>';
    h += '<button class="func-btn' + (RR.view === 'refresh' ? ' on' : '') + '" data-act="refresh"><span>🔄 刷新流</span></button>';
    h += '<button class="func-btn" data-act="inv"><span>📦 物品清单</span></button>';
    h += '<button class="func-btn" data-act="bag"><span>🃏 卡牌背包</span>' + (S.bag.length ? '<span class="badge">' + S.bag.length + '</span>' : '') + '</button>';
    $('#side-left').innerHTML = h;
  };

  /* ---------------- 右栏 ---------------- */
  RR.renderRight = function (S) {
    const b = RR.bonuses(S);
    let h = '<div class="side-title">词条（' + S.traits.length + '）</div>';
    S.traits.forEach((t) => {
      h += '<div class="trait-item" title="' + t.desc + '">' +
        '<div class="trait-name">◆ ' + t.name + (t.r ? ' <span class="t-r c-' + t.r + '">' + RR.RARITY[t.r].name + '</span>' : '') + '</div>' +
        '<div class="trait-desc">' + RR.traitSummary(t).join(' · ') + '</div></div>';
    });

    // 增益总览
    h += '<div class="side-title">增益总览</div><div class="ov-box">' + RR.renderOverview(S, b) + '</div>';

    const slots = RR.slotCount(S, b);
    const used = RR.usedSlots(S);
    h += '<div class="side-title">卡槽（' + used + ' / ' + slots + ' 占用' + (S.equipped.length > used ? '，+' + (S.equipped.length - used) + ' 张免占槽' : '') + '）</div><div class="card-slot-row">';
    for (let i = 0; i < slots; i++) {
      const cid = S.equipped[i];
      if (cid) {
        const c = RR.CARD_MAP[cid];
        h += '<div style="width:calc(50% - 3px)">' + RR.miniCardHTML(c, 'data-act="unequip" data-id="' + cid + '"',
          '<div style="font-size:9.5px;color:var(--ink3);margin-top:3px">点击卸下</div>') + '</div>';
      } else {
        h += '<div class="slot-box" data-act="bag">空槽位<br>点击装备</div>';
      }
    }
    h += '</div>';

    if (S.buffs.length) {
      h += '<div class="side-title">生效中的增益</div>';
      S.buffs.forEach((bf) => {
        const txt = bf.kind === 'spend'
          ? scopeName(bf.scope) + ' +' + Math.round(bf.pct * 100) + '%'
          : '每天 +' + bf.ap + ' AP';
        h += '<div class="buff-item"><span>' + bf.name + '</span><b>' + txt + ' · ' + bf.daysLeft + '天</b></div>';
      });
    }

    if (S.permanent.length) {
      h += '<div class="side-title">永久词条（' + S.permanent.length + '）</div>';
      S.permanent.forEach((cid) => {
        const c = RR.CARD_MAP[cid];
        if (c) h += '<div style="margin:0 12px 4px">' + RR.miniCardHTML(c, 'data-act="cardinfo" data-id="' + cid + '"') + '</div>';
      });
    }

    h += '<div class="side-title">最近动态</div>';
    (S.log || []).slice(0, 14).forEach((l) => {
      h += '<div class="log-item"><span class="d">D' + l.day + '</span>' + l.msg + '</div>';
    });
    $('#side-right').innerHTML = h;
  };

  /* 增益总览：把所有叠加后的增益属性汇总展示 */
  RR.renderOverview = function (S, b) {
    const maxAp = RR.maxApOf(S, b);
    const rows = [];
    const add = (k, v) => rows.push('<div class="ov-row"><span>' + k + '</span><b class="num">' + v + '</b></div>');

    add('每日行动点', (S.ap) + ' / ' + maxAp + (b.maxAp ? '（+' + b.maxAp + ' 上限）' : ''));
    add('积分倍率', '×' + (b.pointMul).toFixed(2) + (b.pointGain ? ' · +' + Math.round(b.pointGain * 100) + '%' : ''));
    if (b.scenePct.all) add('全场景消费', '+' + Math.round(b.scenePct.all * 100) + '%');
    Object.keys(b.scenePct).forEach((k) => { if (k !== 'all') add(RR.sceneName(k) + '消费', '+' + Math.round(b.scenePct[k] * 100) + '%'); });
    Object.keys(b.catPct).forEach((k) => {
      const c = RR.CATEGORIES[k];
      add((c ? c.name : k) + '品类', '+' + Math.round(b.catPct[k] * 100) + '%');
    });
    if (b.stockOps) add('股票每日操作', '+' + b.stockOps);
    if (b.stockCap !== 1) add('股票单次上限', '×' + b.stockCap);
    if (b.stockCrash) add('股市暴跌概率', '+' + Math.round(b.stockCrash * 100) + '%');
    if (b.stockForceDown) add('股市每日下挫', Math.round(b.stockForceDown * 100) + '%');
    if (b.drainPct) add('每日资产蒸发', Math.round(b.drainPct * 100) + '%');
    if (b.taxPct) add('每笔额外扣', Math.round(b.taxPct * 100) + '%');
    if (b.spendMult !== 1) add('一次性消费', '×' + b.spendMult.toFixed(2));
    if (b.dailyInfl) add('每日通胀', '+' + Math.round(b.dailyInfl * 100) + '%');
    if (b.apFull) add('行动点', '每天回满');
    if (b.apCost1) add('行动点消耗', '固定 1');
    if (b.auction) add('限量加价', '已解锁');
    if (b.batchAp) add('批量 AP', '-' + b.batchAp);

    // 流派叠加
    const sch = RR.schoolSummary(S, b);
    const schLines = Object.keys(sch).map((k) => '<div class="ov-sch"><b>' + sch[k].name + '</b>：' + sch[k].items.join('，') + '</div>');
    return rows.join('') + (schLines.length ? '<div class="ov-sch-wrap">' + schLines.join('') + '</div>' : '');
  };

  /* ---------------- 主区 ---------------- */
  RR.renderMain = function (S) {
    const v = RR.view;
    const el = $('#main-scroll');
    if (RR.getScene(v)) el.innerHTML = RR.viewScene(S, v);
    else if (v === 'bag') el.innerHTML = RR.viewBag(S);
    else if (v === 'inv') el.innerHTML = RR.viewInv(S);
    else if (v === 'mission') el.innerHTML = RR.viewMission(S);
    else if (v === 'title') el.innerHTML = RR.viewTitle(S);
    else if (v === 'shop') el.innerHTML = RR.viewShop(S);
    else if (v === 'refresh') el.innerHTML = RR.viewRefresh(S);
    else el.innerHTML = RR.viewScene(S, 'mall');
  };

  RR.goodHTML = function (S, scene, item, b) {
    const bi = RR.bulkIdx[scene] || 0;
    const q = RR.quote(S, scene, item, bi);
    const owned = S.inv[item.id] || 0;
    const spiked = S.spikeItem === item.id && b.priceSpike > 0;
    const cat = RR.CATEGORIES[item.cat] || { name: item.cat, emoji: '•' };
    const up = (S.priceMult[item.id] || 1) > 1.05;
    let bulkBtns = '';
    RR.BULK.forEach((bk, i) => {
      bulkBtns += '<button class="bulk-btn' + (i === bi ? ' on' : '') + '" data-act="bulk" data-scene="' + scene + '" data-i="' + i + '">' + bk.label + '</button>';
    });
    const canAp = q.ap <= S.ap;
    const canMoney = q.affordable;
    const qtyLabel = q.qty >= 10000 ? U.fmt(q.qty) + ' 件' : q.qty + ' 件';
    return '<div class="good' + (spiked ? ' spike' : '') + '">' +
      '<div class="good-top"><div class="good-name">' + cat.emoji + ' ' + item.name + '</div>' +
      (owned ? '<span class="good-owned">已购 ' + U.fmt(owned) + '</span>' : '') + '</div>' +
      (spiked ? '<div class="good-meta" style="color:var(--gold)">🔥 今日算法推荐 · 限量加价</div>' : '') +
      '<div class="good-meta"><span>' + cat.name + '</span>' + (up ? '<span style="color:var(--danger)">稀缺涨价 ×' + (S.priceMult[item.id] || 1).toFixed(2) + '</span>' : '') + '</div>' +
      '<div class="good-price num' + (up ? ' up' : '') + '">' + U.money(q.unit) + '</div>' +
      '<div class="good-bulk">' + bulkBtns + '</div>' +
      '<div class="good-buy">' +
        '<button class="btn primary sm" data-act="buy" data-scene="' + scene + '" data-id="' + item.id + '"' + ((!canAp || !canMoney) ? ' disabled' : '') + '>' +
        '买 ' + qtyLabel + '<br>' + U.money(q.total) + '</button>' +
        '<span class="good-cost">' + q.ap + ' AP' + (q.points ? '<br>◆' + U.fmt(q.points) : '') + '</span>' +
      '</div></div>';
  };

  RR.viewScene = function (S, scene) {
    const b = RR.bonuses(S);
    const sc = RR.getScene(scene);
    let h = '<div class="panel-head"><div class="panel-title">' + sc.emoji + ' ' + sc.name + '</div>' +
      '<div class="panel-desc">' + sc.desc + '</div></div>';

    if (RR.ASSET_SCENES.indexOf(scene) >= 0) return RR.viewAssetMarket(S, scene);
    if (scene === 'invest') return RR.viewInvest(S, h, b);
    if (scene === 'stock') return RR.viewStock(S, h, b);

    h += '<div class="panel-note">本场景「今天还能花」的预算约 <b class="num">' + U.money(RR.sceneBudgetLeft(S, scene)) +
      '</b>。这是当天上限，<b>次日自动恢复</b>、且不随剩余资产收缩——所以行动点才是真正的约束' +
      '（AP 越多、能扫的场景越多）。选「上限」档会自动买到顶、把当天预算一次花光。</div>';

    let items = (RR.ITEMS[scene] || []).filter((it) => {
      if (!it.locked) return true;
      return b.unlocks.indexOf(it.id) >= 0;
    });

    // 进入场景时随机推一款"限量爆款"
    if (b.priceSpike > 0 && !S.spikeItem && items.length) {
      S.spikeItem = U.pick(items).id;
    }

    if (scene === 'mall' || scene === 'car' || scene === 'import') {
      const groups = {};
      items.forEach((it) => { (groups[it.cat] = groups[it.cat] || []).push(it); });
      Object.keys(groups).forEach((cat) => {
        const c = RR.CATEGORIES[cat] || { name: cat, emoji: '•' };
        h += '<div class="group-title">' + c.emoji + ' ' + c.name + '</div><div class="goods-grid">';
        groups[cat].forEach((it) => (h += RR.goodHTML(S, scene, it, b)));
        h += '</div>';
      });
    } else {
      h += '<div class="goods-grid">';
      items.forEach((it) => (h += RR.goodHTML(S, scene, it, b)));
      h += '</div>';
    }
    return h;
  };

  RR.viewInvest = function (S, h, b) {
    if (!RR.canInvest(S)) {
      return h + '<div class="panel-note warn">⚠️ 需要先在「🏠 房产市场」买下至少一套写字楼，才能开投资公司。</div>';
    }
    if (!S.investOffers || !S.investOffers.length || S.investOfferDay !== S.day) RR.refreshOffers(S);
    const maxN = RR.maxCompanies(S, b);
    h += '<div class="panel-note">投资席位 ' + S.companies.length + ' / ' + maxN +
      ' · 投资额固定，投出去的钱会每天分红回流（对你是坏消息）；只有公司倒闭，这笔钱才真正消失，席位才会空出来。</div>';

    if (S.companies.length) {
      h += '<div class="group-title">💼 在投公司</div><div class="goods-grid">';
      S.companies.forEach((c) => {
        h += '<div class="good"><div class="good-top"><div class="good-name">' + c.name + '</div>' +
          '<span class="good-owned">剩 ' + c.daysLeft + ' 天</span></div>' +
          '<div class="good-meta"><span>档位 T' + c.tier + '</span><span>每日分红 ' + (c.daily * 100).toFixed(2) + '%</span></div>' +
          '<div class="good-price num">' + U.money(c.amount) + '</div>' +
          '<div class="good-meta">每天回流约 ' + U.money(c.amount * c.daily) + '</div></div>';
      });
      h += '</div>';
    }

    h += '<div class="group-title">📋 今日项目（每天刷新）</div><div class="goods-grid">';
    S.investOffers.forEach((c) => {
      const amount = Math.round(c.amount * (1 + b.investAmount + (b.scenePct.invest || 0)));
      const ap = RR.apCostFor(S, b, 'invest', 0);
      const full = S.companies.length >= maxN;
      h += '<div class="good"><div class="good-top"><div class="good-name">' + c.name + '</div>' +
        '<span class="good-owned">T' + c.tier + '</span></div>' +
        '<div class="good-meta"><span>预计存活 ' + c.life + ' 天</span><span>每天回流 ' + (c.daily * 100).toFixed(2) + '%</span></div>' +
        '<div class="good-price num">' + U.money(amount) + '</div>' +
        '<div class="good-buy"><button class="btn primary sm" data-act="invest" data-id="' + c.uid + '"' +
        ((full || ap > S.ap || amount > S.asset) ? ' disabled' : '') + '>' + (full ? '席位已满' : '投！') + '</button>' +
        '<span class="good-cost">' + ap + ' AP</span></div></div>';
    });
    h += '</div>';
    return h;
  };

  RR.viewStock = function (S, h, b) {
    const cap = RR.stockCapOf(S, b);
    h += '<div class="panel-note">今日剩余操作 ' + S.stockOpsLeft + ' 次 · 单次上限 ' + U.money(cap) +
      ' · <b>买了赚钱是坏消息</b>：钱会变多。亏了才是你想要的。</div>';

    if (S.holdings.length) {
      h += '<div class="group-title">📊 持仓</div><table class="tbl"><thead><tr><th>标的</th><th class="r">投入</th><th class="r">市值</th><th class="r">浮动</th><th></th></tr></thead><tbody>';
      S.holdings.forEach((hd) => {
        const st = RR.STOCKS.find((x) => x.id === hd.stockId);
        const d = hd.value - hd.amount;
        h += '<tr><td>' + st.emoji + ' ' + st.name + '</td>' +
          '<td class="r num">' + U.money(hd.amount) + '</td>' +
          '<td class="r num">' + U.money(hd.value) + '</td>' +
          '<td class="r num" style="color:' + (d >= 0 ? 'var(--up)' : 'var(--down)') + ';font-weight:700">' +
          (d >= 0 ? '+' : '') + U.money(d) + '</td>' +
          '<td class="r"><button class="btn sm" data-act="sell" data-id="' + hd.stockId + '">卖出</button></td></tr>';
      });
      h += '</tbody></table>';
      h += '<div style="margin-top:8px"><button class="btn sm" data-act="sellall">全部清仓</button></div>';
    }

    h += '<div class="group-title">📈 行情</div><div class="goods-grid">';
    RR.STOCKS.forEach((st) => {
      h += '<div class="good"><div class="good-top"><div class="good-name">' + st.emoji + ' ' + st.name + '</div>' +
        '<span class="good-owned">' + st.code + '</span></div>' +
        '<div class="good-meta"><span>波动 ±' + (st.vol * 100).toFixed(0) + '%</span></div>' +
        '<div class="good-buy" style="gap:6px">' +
        '<button class="btn sm" data-act="buystock" data-id="' + st.id + '" data-p="0.25">25%</button>' +
        '<button class="btn sm" data-act="buystock" data-id="' + st.id + '" data-p="0.5">50%</button>' +
        '<button class="btn primary sm" data-act="buystock" data-id="' + st.id + '" data-p="1">满仓</button>' +
        '</div>' +
        '<div class="good-cost" style="text-align:right">上限 ' + U.money(cap) + ' · 1 AP</div></div>';
    });
    h += '</div>';
    return h;
  };

  /* ---------- 资产市场（囤积类：买入即花、每日行为、平仓消耗） ---------- */
  RR.viewAssetMarket = function (S, scene) {
    const b = RR.bonuses(S);
    const sc = RR.getScene(scene);
    const kind = scene; // 场景 id 与资产 kind 同名
    let h = '<div class="panel-head"><div class="panel-title">' + sc.emoji + ' ' + sc.name + '</div>' +
      '<div class="panel-desc">' + sc.desc + '</div></div>';
    const ap = RR.apCostFor(S, b, scene, 0);
    let tip;
    if (kind === 'commodity') tip = '物资<b>不回钱</b>，只有行情波动——囤得越久、跌得越狠，亏得越多。';
    else if (kind === 'art') tip = '艺术每天收<b>养护费</b>（钱直接蒸发），买得越贵养护越狠。';
    else if (kind === 'estate') tip = '每天<b>收租</b>把钱回流给你（坏消息），暴跌时平仓才真正亏掉本金。';
    else tip = '球员每天有<b>效益回钱</b>（坏消息），高价买低价卖、暴跌时亏得最多。';
    h += '<div class="panel-note">买入即「囤」：<b>买价当场从资产里扣掉（直接花掉）</b>。' + tip + ' 行动点 ' + ap + ' AP / 笔。</div>';

    const mine = (S.hoard || []).filter((a) => a.kind === kind);
    if (mine.length) {
      h += '<div class="group-title">📦 我的囤积（' + mine.length + '）</div><div class="goods-grid">';
      mine.forEach((a) => {
        const loss = a.buyPrice - a.value;
        h += '<div class="good"><div class="good-top"><div class="good-name">' + a.name + '</div>' +
          '<span class="good-owned">本金 ' + U.money(a.buyPrice) + '</span></div>' +
          '<div class="good-meta"><span>现值 ' + U.money(a.value) + '</span>' +
          (loss > 0 ? '<span style="color:var(--down)">已亏 ' + U.money(loss) + '</span>' : '<span style="color:var(--up)">赚 ' + U.money(-loss) + '</span>') + '</div>' +
          '<div class="good-buy"><button class="btn primary sm" data-act="sellasset" data-kind="' + kind + '" data-uid="' + a.uid + '">平仓回款 ' + U.money(a.value) + '</button></div></div>';
      });
      h += '</div>';
    }

    const items = RR.assetItems(kind);
    h += '<div class="group-title">🛒 可囤商品</div><div class="goods-grid">';
    items.forEach((it) => {
      const info = RR.ASSET_CAT_OF[it.id];
      let price = info.price;
      if (b.hoardBuyUp && b.hoardBuyUp[kind]) price = Math.round(price * (1 + b.hoardBuyUp[kind]));
      const can = price <= S.asset && ap <= S.ap;
      h += '<div class="good"><div class="good-top"><div class="good-name">' + it.name + '</div></div>' +
        '<div class="good-meta"><span>' + (RR.CATEGORIES[it.cat] || { name: it.cat }).name + '</span></div>' +
        '<div class="good-price num">' + U.money(price) + '</div>' +
        '<div class="good-buy"><button class="btn primary sm" data-act="buyasset" data-kind="' + kind + '" data-id="' + it.id + '"' + (can ? '' : ' disabled') + '>囤入</button>' +
        '<span class="good-cost">' + ap + ' AP</span></div></div>';
    });
    h += '</div>';
    return h;
  };

  /* ---------- 刷新流（积分抽卡 / 复制，消耗型卡片滚雪球） ---------- */
  RR.viewRefresh = function (S) {
    let h = '<div class="panel-head"><div class="panel-title">🔄 刷新流</div>' +
      '<div class="panel-desc">花积分刷新抽「一次性消费卡」，抽到就花掉、花完再抽，滚雪球。配合「高积分流 / 积分翻倍卡」越刷越猛；其他流派的「一次性消费 ×N」词条让抽到的卡花得更多。</div></div>';
    h += '<div class="panel-note">当前积分 <b class="gold num">◆ ' + U.fmt(S.points) + '</b>。消费（商场 / 4S / 进口）和回收卡牌都能攒积分。</div>';
    h += '<div style="margin:14px 0"><button class="btn primary" data-act="refreshdraw"' + (S.points >= RR.refreshCost ? '' : ' disabled') + '>刷新抽 1 张卡（◆' + RR.refreshCost + '）</button></div>';
    h += '<div class="panel-note" style="margin-top:8px">背包里标「刷新流」的卡（抽 N 张 / 复制卡）也能直接用，效果同上。<br>一次性消费卡 <b>不占卡槽</b>，用完即消失——这正是「过卡牌增加花费金额」的玩法。</div>';
    return h;
  };

  /* ---------- 背包 ---------- */
  RR.viewBag = function (S) {
    const b = RR.bonuses(S);
    let h = '<div class="panel-head"><div class="panel-title">🃏 卡牌背包</div>' +
      '<div class="panel-desc">即时卡点「使用」立即生效；装备卡需要放进卡槽才生效。多余的卡可以回收成积分。</div></div>';
    if (!S.bag.length) {
      return h + '<div class="panel-note">背包是空的。去消费、做任务、或者到「🎰 积分商城」抽卡。</div>';
    }
    const order = { red: 0, gold: 1, purple: 2, blue: 3, green: 4, white: 5 };
    const sorted = S.bag.slice().sort((x, y) => {
      const a = RR.CARD_MAP[x], c = RR.CARD_MAP[y];
      return (order[a.r] - order[c.r]) || a.name.localeCompare(c.name);
    });
    h += '<div class="draw-grid">';
    sorted.forEach((cid) => {
      const c = RR.CARD_MAP[cid];
      let foot = '';
      if (RR.isEquipType(c)) foot = '<button class="btn primary sm" data-act="equip" data-id="' + cid + '">装备</button>';
      else foot = '<button class="btn primary sm" data-act="use" data-id="' + cid + '">使用</button>';
      foot += '<button class="btn sm" data-act="recycle" data-id="' + cid + '">回收 ◆' +
        Math.round(RR.RARITY[c.r].recycle * (1 + b.pointGain)) + '</button>';
      h += RR.cardHTML(c, { foot });
    });
    h += '</div>';
    return h;
  };

  /* ---------- 清单 ---------- */
  RR.viewInv = function (S) {
    let h = '<div class="panel-head"><div class="panel-title">📦 我的资产清单</div>' +
      '<div class="panel-desc">买过的所有东西都在这儿。有些称号靠它们解锁。</div></div>';
    const rows = [];
    Object.keys(S.inv).forEach((k) => rows.push(k));
    const real = rows.filter((k) => RR.CAT_OF[k]);
    if (!real.length && !(S.companyHistory || []).length) {
      return h + '<div class="panel-note">还什么都没买。</div>';
    }
    const groups = {};
    real.forEach((id) => {
      const cat = RR.CAT_OF[id];
      (groups[cat] = groups[cat] || []).push(id);
    });
    h += '<table class="tbl"><thead><tr><th>物品</th><th>品类</th><th class="r">数量</th></tr></thead><tbody>';
    Object.keys(groups).forEach((cat) => {
      const c = RR.CATEGORIES[cat] || { name: cat, emoji: '•' };
      groups[cat].forEach((id) => {
        const it = RR.findItem(id);
        if (!it) return;
        h += '<tr><td>' + it.name + '</td><td>' + c.emoji + ' ' + c.name + '</td><td class="r num">' + U.fmt(S.inv[id]) + '</td></tr>';
      });
    });
    h += '</tbody></table>';

    if ((S.companyHistory || []).length) {
      h += '<div class="group-title">💼 投资过的公司</div><table class="tbl"><thead><tr><th>公司</th><th class="r">投资额</th><th>状态</th></tr></thead><tbody>';
      S.companyHistory.slice().reverse().forEach((c) => {
        h += '<tr><td>' + c.name + '</td><td class="r num">' + U.money(c.amount) + '</td>' +
          '<td>' + (c.dead ? '<span style="color:var(--down);font-weight:700">已倒闭 ✓</span>' : '在投') + '</td></tr>';
      });
      h += '</tbody></table>';
    }

    h += '<div class="group-title">📈 消费统计</div><table class="tbl"><thead><tr><th>场景</th><th class="r">累计消费</th></tr></thead><tbody>';
    RR.SCENES.forEach((sc) => {
      const v = S.stats.byScene[sc.id] || 0;
      if (v > 0) h += '<tr><td>' + sc.emoji + ' ' + sc.name + '</td><td class="r num">' + U.money(v) + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  };

  RR.findItem = function (id) {
    let found = null;
    Object.keys(RR.ITEMS).forEach((sc) => {
      RR.ITEMS[sc].forEach((it) => { if (it.id === id) found = it; });
    });
    return found;
  };

  /* ---------- 任务 ---------- */
  function pg(cur, goal) {
    const p = U.clamp(cur / goal, 0, 1);
    return '<div class="task-bar' + (p >= 1 ? ' full' : '') + '"><i style="width:' + (p * 100).toFixed(1) + '%"></i></div>' +
      '<div class="task-pg"><span>' + U.fmt(cur) + '</span><span>' + U.fmt(goal) + '</span></div>';
  }

  RR.viewMission = function (S) {
    let h = '<div class="panel-head"><div class="panel-title">🎯 挑战任务</div>' +
      '<div class="panel-desc">每达成一个，立刻三选一抽卡。任务越难，出高级卡的概率越高。</div></div>';
    const list = RR.MISSIONS.slice().sort((a, b2) => {
      const da = S.doneMissions.indexOf(a.id) >= 0 ? 1 : 0;
      const db = S.doneMissions.indexOf(b2.id) >= 0 ? 1 : 0;
      return da - db;
    });
    h += '<div class="task-grid">';
    list.forEach((m) => {
      const done = S.doneMissions.indexOf(m.id) >= 0;
      const [cur, goal] = m.p(S);
      h += '<div class="task' + (done ? ' done' : '') + '">' +
        '<div class="task-name">' + (done ? '✅ ' : '⬜ ') + m.name + '</div>' +
        '<div class="task-desc">' + m.desc + '</div>' + pg(cur, goal) +
        '<div class="task-pg"><span>奖励：三选一抽卡</span><span>幸运 ' + m.luck.toFixed(1) + '</span></div>' +
        '</div>';
    });
    h += '</div>';
    return h;
  };

  RR.viewTitle = function (S) {
    let h = '<div class="panel-head"><div class="panel-title">🏅 称号</div>' +
      '<div class="panel-desc">靠你买的东西解锁。达成后给积分，少数称号还送卡槽。</div></div>';
    const list = RR.TITLES.slice().sort((a, b2) => {
      const da = S.doneTitles.indexOf(a.id) >= 0 ? 0 : 1;
      const db = S.doneTitles.indexOf(b2.id) >= 0 ? 0 : 1;
      return da - db;
    });
    h += '<div class="task-grid">';
    list.forEach((t) => {
      const done = S.doneTitles.indexOf(t.id) >= 0;
      const [cur, goal] = t.p(S);
      h += '<div class="task' + (done ? ' done' : '') + '">' +
        '<div class="task-name">' + (done ? '🏅 ' : '🔒 ') + t.name + '</div>' +
        '<div class="task-desc">' + t.desc + '</div>' + pg(cur, goal) +
        '<div class="task-pg"><span>奖励：◆' + U.fmt(t.reward.points || 0) + (t.reward.slot ? ' + 卡槽 +' + t.reward.slot : '') + '</span></div>' +
        '</div>';
    });
    h += '</div>';
    return h;
  };

  /* ---------- 积分商城 ---------- */
  RR.SHOP_PACKS = [
    { id: 'pk_white', name: '便利店抽奖机', rarity: 'white', price: 120, n: 3, desc: '三连抽，白板保底' },
    { id: 'pk_green', name: '商场满赠礼盒', rarity: 'green', price: 420, n: 3, desc: '三连抽，绿色保底' },
    { id: 'pk_blue', name: '品牌会员福袋', rarity: 'blue', price: 1100, n: 3, desc: '三连抽，蓝色保底' },
    { id: 'pk_purple', name: '高定私享卡包', rarity: 'purple', price: 3200, n: 3, desc: '三连抽，紫色保底' },
    { id: 'pk_gold', name: '拍卖行夜场邀请函', rarity: 'gold', price: 9800, n: 3, desc: '三连抽，金色保底' },
    { id: 'pk_red', name: '禁忌契约', rarity: 'red', price: 32000, n: 3, desc: '三连抽，红色保底（规则级）' },
  ];

  RR.viewShop = function (S) {
    let h = '<div class="panel-head"><div class="panel-title">🎰 积分商城</div>' +
      '<div class="panel-desc">当前积分 ◆' + U.fmt(S.points) + '。消费（商场 / 4S 店 / 进口商）和回收卡牌都能攒积分。</div></div>';
    h += '<div class="shop-grid">';
    RR.SHOP_PACKS.forEach((p) => {
      const r = RR.RARITY[p.rarity];
      const can = S.points >= p.price;
      h += '<div class="pack rw-' + p.rarity + '" data-act="buypack" data-id="' + p.id + '" style="' + (can ? '' : 'opacity:.5') + '">' +
        '<div class="pk-n c-' + p.rarity + '">' + p.name + '</div>' +
        '<div class="pk-d">' + p.desc + '</div>' +
        '<div class="pk-p">◆ ' + U.fmt(p.price) + '</div>' +
        '<div style="font-size:11px;color:var(--ink3);margin-top:4px">' + r.name + '保底 × ' + p.n + '</div>' +
        '</div>';
    });
    h += '</div>';
    h += '<div class="panel-note" style="margin-top:16px">💡 卡池等级越高，越容易出「消耗巨额资产」和「永久规则级」的狠角色。</div>';
    return h;
  };
})(window.RR);
