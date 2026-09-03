/* 主流程：开局 → 抽卡 → 游戏循环 → 结算 */
(function (RR) {
  'use strict';
  const U = RR.util;
  const $ = U.$;

  RR.view = 'mall';
  RR.bulkIdx = {};
  RR.S = null;
  RR.sel = { tycoon: null, diff: 'normal', traits: [], picks: [], reroll: 1, used: {} };

  /* ================= 屏幕切换 ================= */
  function show(id) {
    U.$$('.screen').forEach((s) => s.classList.remove('active'));
    $('#' + id).classList.add('active');
  }

  /* ================= 1. 选剧本 ================= */
  function renderSelect() {
    const used = RR.sel.used || {};
    let h = '';
    RR.TYCOONS.forEach((t) => {
      const cleared = used[t.id] ? '<span class="tyc-region" style="background:#e6f4ee;color:#14614a">已通关</span>' : '';
      h += '<div class="tyc' + (RR.sel.tycoon === t.id ? ' on' : '') + '" data-act="pick-tyc" data-id="' + t.id + '">' +
        '<div class="tyc-region' + (t.region === '国内' ? ' cn' : '') + '">' + t.region + '</div>' +
        (used[t.id] ? cleared : '') +
        '<div class="tyc-top"><div class="tyc-av">' + t.avatar + '</div>' +
        '<div><div class="tyc-name">' + t.name + '</div><div class="tyc-alias">' + t.alias + ' · ' + t.tag + '</div></div></div>' +
        '<div class="tyc-wealth num">' + U.money(t.wealth) + '</div>' +
        '<div class="tyc-wl">' + t.source + ' · 建议 ' + t.days + ' 天</div>' +
        '<div class="tyc-desc">' + t.desc + '</div>' +
        '<div class="tyc-perks">' + t.perks.map((p) =>
          '<div class="tyc-perk"><b>◆ ' + p.name + '</b><span>' + p.desc + '</span></div>').join('') + '</div>' +
        (t.deck && t.deck.length ?
          '<div class="tyc-deck-title">🎴 签名卡组（开局即带，占槽卡自动装备）</div>' +
          '<div class="tyc-deck">' + t.deck.map((id) => {
            const c = RR.CARD_MAP[id];
            return c ? RR.miniCardHTML(c) : '';
          }).join('') + '</div>'
        : '') +
        '</div>';
    });
    $('#tyc-grid').innerHTML = h;

    $('#diff-group').innerHTML = RR.DIFFS.map((d) =>
      '<button class="diff-btn' + (RR.sel.diff === d.key ? ' on' : '') + '" data-act="pick-diff" data-id="' + d.key + '" title="' + d.desc + '">' +
      d.name + '</button>').join('');

    const t = RR.getTycoon(RR.sel.tycoon);
    if (t) {
      const d = RR.DIFFS.find((x) => x.key === RR.sel.diff);
      const days = Math.max(12, Math.round(t.days * d.mult));
      $('#sel-info').innerHTML = '已选：<b>' + t.name + '</b> · ' + d.name + ' · <b>' + days + '</b> 天 · 目标 ' + U.money(t.wealth);
      $('#btn-to-draw').disabled = false;
    } else {
      $('#sel-info').textContent = '请先选择一位首富';
      $('#btn-to-draw').disabled = true;
    }
    const sv = RR.loadGame();
    $('#btn-continue').style.display = sv && !sv.over ? 'inline-block' : 'none';
  }

  /* ================= 2. 开局抽卡（10 选 3，按稀有度加权） ================= */
  function rollPicks() {
    const meta = RR.metaLoad();
    const forced = (meta.keptTrait && RR.TRAITS.some((x) => x.id === meta.keptTrait)) ? [meta.keptTrait] : [];
    RR.sel.picks = RR.rollTraits(10, forced);
    RR.sel.traits = [];
    renderDraw();
  }

  function renderDraw() {
    const t = RR.getTycoon(RR.sel.tycoon);
    $('#draw-sub').innerHTML = '你已经拥有 <b>' + t.name + '</b> 的 3 个专属词条（蓝/紫/金）。再从下面 <b>10 张</b>通用词条里挑 <b>3 张</b>，凑齐 6 个开局。<br>' +
      '<span style="color:var(--ink3);font-size:12px">颜色越深越稀有、效果越强；还有概率出红色。剩余可选 ' + (3 - RR.sel.traits.length) + ' 个</span>';
    let h = '';
    RR.sel.picks.forEach((id) => {
      const tr = RR.TRAITS.find((x) => x.id === id);
      const on = RR.sel.traits.indexOf(id) >= 0;
      const eff = RR.traitSummary(tr);
      const rName = RR.RARITY[tr.r] ? RR.RARITY[tr.r].name : '通用';
      const sch = RR.SCHOOL_NAME[tr.school] || '';
      h += '<div class="draw-card rw-' + tr.r + (on ? ' on' : '') + '" data-act="pick-trait" data-id="' + id + '">' +
        '<div class="dc-r c-' + tr.r + '">' + rName + (sch ? ' · ' + sch : '') + '</div>' +
        '<div class="dc-name">' + tr.name + '</div>' +
        '<div class="dc-desc">' + tr.desc + '</div>' +
        '<div class="dc-eff c-' + tr.r + '">' + eff.join(' · ') + '</div></div>';
    });
    $('#draw-grid').innerHTML = h;
    $('#btn-start').disabled = RR.sel.traits.length !== 3;
    $('#btn-reroll').textContent = RR.sel.reroll > 0 ? '🎲 重抽一次（剩 ' + RR.sel.reroll + ' 次）' : '🎲 已用完重抽机会';
    $('#btn-reroll').disabled = RR.sel.reroll <= 0;
  }

  /* ================= 3. 主游戏 ================= */
  function startGame() {
    const meta = RR.metaLoad();
    const keptCard = (meta.keptCard && RR.CARD_MAP[meta.keptCard] && RR.isEquipType(RR.CARD_MAP[meta.keptCard])) ? meta.keptCard : null;
    RR.S = RR.newGame(RR.sel.tycoon, RR.sel.diff, RR.sel.traits, keptCard ? { keptCard } : undefined);
    const b = RR.bonuses(RR.S);
    RR.S.ap = RR.maxApOf(RR.S, b);
    RR.S.stockOpsLeft = 3 + b.stockOps;
    RR.view = 'mall';
    RR.bulkIdx = {};
    show('screen-game');
    RR.saveGame(RR.S);
    renderAll();
    RR.toast('目标：' + RR.S.totalDays + ' 天花光 ' + U.money(RR.S.initAsset), 'gold', 3200);
    setTimeout(() => {
      RR.modal({
        title: '你怎么会有这么多钱', emoji: '💸',
        body: '<div class="evt-desc">' +
          '你是 <b>' + RR.S.tycoonName + '</b>，账上有 <b class="num" style="color:var(--brand);font-size:17px">' + U.money(RR.S.initAsset) + '</b>。<br><br>' +
          '规则很简单：<b>' + RR.S.totalDays + ' 天内，把它全部花光。</b><br><br>' +
          '· 每天有 <b>' + RR.maxApOf(RR.S, b) + ' 点行动点</b>，不同场景消耗不同，花完就得睡觉<br>' +
          '· 消费场景（商场 / 4S / 进口）有日预算上限，行动点是真正约束；资产市场（房产 / 物资 / 艺术 / 球队）无上限、买入即花，但每天会回钱 / 养护费折磨你<br>' +
          '· 消费时可能弹出随机事件，<b>越舍得花，拿到的词条越好</b><br>' +
          '· 达成挑战任务可以三选一抽卡，卡池里全是帮你烧钱的东西<br>' +
          '· 股票很特殊：<b>赚了是坏消息，亏了才是好消息</b><br>' +
          '· 🔄 刷新流：用积分刷一次性消费卡，抽到就花、花完再刷，配合「一次性消费 ×N」词条滚雪球<br>' +
          '· 🎴 你自带一套<b>签名卡组</b>（选人界面可见），开局即生效，占槽卡已自动装备<br><br>' +
          '<span style="color:var(--ink3)">提示：光靠买东西是花不完的，善用「批量购买」+ 高级流派卡 + 囤积平仓 + 刷新流。</span></div>',
        foot: '<button class="btn primary" data-x>开始败家</button>',
      });
    }, 260);
  }

  function renderAll() {
    if (!RR.S) return;
    RR.renderTop(RR.S);
    RR.renderLeft(RR.S);
    RR.renderRight(RR.S);
    RR.renderMain(RR.S);
  }

  function save() { if (RR.S) RR.saveGame(RR.S); }

  /* ---------- 行动后统一处理 ---------- */
  function afterAction(opts) {
    const S = RR.S;
    const o = opts || {};
    // 1) 称号
    const got = RR.checkAll(S);
    got.titles.forEach((t) => {
      RR.toast('🏅 称号达成：' + t.name + (t.points ? ' +' + U.fmt(t.points) + ' 积分' : ''), 'gold', 3000);
    });
    // 2) 任务 → 排入抽卡队列
    got.missions.forEach((m) => {
      RR.toast('🎯 任务达成：' + m.name, 'good', 2600);
      S.pendingDraws.push({ luck: m.luck, title: '任务达成：' + m.name, desc: '三选一，选一张带走' });
    });

    // 3) 随机事件：基础概率下调，避免太频繁；eventRate 也打折扣（概率×奖励成正比，去掉高概率低奖励）
    if (o.allowEvent !== false && !S.over) {
      const b = RR.bonuses(S);
      const p = Math.min(0.5, 0.10 + b.eventRate * 0.5);
      if (U.chance(p)) {
        S.stats.events++;
        const evt = U.pick(RR.EVENTS);
        renderAll();
        setTimeout(() => openEvent(evt), 260);
        return;
      }
    }
    renderAll();
    save();
    processQueue();
  }

  function processQueue() {
    const S = RR.S;
    if (S.over) { openEnd(); return; }
    if (S.pendingDraws.length) {
      const d = S.pendingDraws.shift();
      renderAll();
      setTimeout(() => openDraw(d.luck, d.title, d.desc), 220);
      return;
    }
    save();
  }

  /* ---------- 随机事件 ---------- */
  // 事件「加倍下注」：把选项的奖励翻倍（卡牌给 2 张、积分/行动点 ×2、花费 ×2）
  function evtDoubleEff(eff) {
    const e = {};
    if (eff.spend) e.spend = eff.spend * 2;
    if (eff.spendPct) e.spendPct = eff.spendPct * 2;
    if (eff.ap) e.ap = eff.ap * 2;
    if (eff.apDelta) e.apDelta = eff.apDelta * 2;
    if (eff.points) e.points = eff.points * 2;
    if (eff.investSlot) e.investSlot = eff.investSlot * 2;
    // 卡牌：数量翻倍（给 2 张），不再只升稀有度
    if (eff.card) { e.card = eff.card; e.cardCount = 2; }
    if (eff.forceStock) e.forceStock = true;
    if (eff.unlockInvest) e.unlockInvest = true;
    if (eff.luckDelta) e.luckDelta = (eff.luckDelta || 0) * 2;
    if (eff.nothing) e.nothing = true;
    return e;
  }
  RR.evtDoubleEff = evtDoubleEff;
  // 把事件 eff 里的卡牌奖励发放到背包（加倍下注时 cardCount=2，普通为 1）。抽到红卡提示更有分量。
  RR.grantCardReward = function (S, eff) {
    if (!eff || !eff.card) return [];
    const n = eff.cardCount || 1;
    const names = [];
    for (let i = 0; i < n; i++) {
      const pool = RR.CARDS.filter((c) => c.r === eff.card);
      const c = U.pick(pool.length ? pool : RR.CARDS);
      S.bag.push(c.id);
      S.seenCards[c.id] = 1;
      names.push(c.name);
    }
    RR.toast('获得卡牌 ×' + n + '：' + names.join('、'), 'good', 2800);
    return names;
  };
  function evtDoubleDesc(op) {
    const e = op.eff || {};
    const parts = [];
    if (e.spend) parts.push('花 ' + RR.util.money(e.spend * 2));
    if (e.spendPct) parts.push('花双倍资产比例');
    const cardR = e.card ? e.card : null;
    if (cardR) parts.push(RR.RARITY[cardR].name + '卡 ×2');
    if (e.points) parts.push('积分 ×2');
    if (e.ap || e.apDelta) parts.push('行动点 ×2');
    if (e.investSlot) parts.push('投资席位 ×2');
    return parts.length ? parts.join('，') + '（双倍奖励）' : '双倍奖励';
  }

  function openEvent(evt) {
    const S = RR.S;
    const b = RR.bonuses(S);
    let body = '<div class="evt-desc">' + evt.desc + '</div>';
    evt.options.forEach((op, i) => {
      let disabled = false;
      if (op.eff.spend && op.eff.spend > S.asset) disabled = true;
      if (op.eff.spendPct && S.asset <= 0) disabled = true;
      if (op.eff.apDelta && S.ap + op.eff.apDelta < 0) disabled = true;
      body += '<button class="opt" data-act="evt-pick" data-i="' + i + '"' + (disabled ? ' disabled' : '') + '>' +
        '<div class="opt-label">' + op.label + '</div><div class="opt-desc">' + op.desc + '</div></button>';
      // 小扎「无上限竞购」：可花双倍拿双倍奖励
      if (b.eventDouble && !op.eff.nothing) {
        let ddis = disabled;
        if (op.eff.spend && op.eff.spend * 2 > S.asset) ddis = true;
        body += '<button class="opt dbl" data-act="evt-pick" data-i="' + i + '" data-dbl="1"' + (ddis ? ' disabled' : '') + '>' +
          '<div class="opt-label">💎 ×2 加倍下注</div><div class="opt-desc">' + evtDoubleDesc(op) + '</div></button>';
      }
    });
    if (b.eventDouble) {
      body += '<div class="panel-note" style="margin-top:10px">💎 你的词条让你「加倍下注」：花双倍，拿双倍奖励（卡牌 ×2、积分 / 行动点翻倍）。</div>';
    }
    const m = RR.modal({ title: evt.title, emoji: evt.emoji, body, closable: false, foot: '' });
    const cur = evt;
    m.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="evt-pick"]');
      if (!btn) return;
      const op = cur.options[+btn.dataset.i];
      m.close();
      applyEventOpt(op, btn.dataset.dbl === '1');
    });
  }

  function applyEventOpt(op, dbl) {
    const S = RR.S;
    const eff = dbl ? evtDoubleEff(op.eff || {}) : (op.eff || {});
    const b = RR.bonuses(S);
    if (eff.spend) RR.spendRaw(S, Math.min(eff.spend, S.asset), 'event');
    if (eff.spendPct) RR.spendRaw(S, Math.round(S.asset * eff.spendPct), 'event');
    if (eff.ap) S.ap += eff.ap;
    if (eff.apDelta) S.ap = Math.max(0, S.ap + eff.apDelta);
    if (eff.points) S.points += Math.round(eff.points * (1 + b.pointGain));
    if (eff.investSlot) S.bonusSlots = (S.bonusSlots || 0) + eff.investSlot;
    if (eff.forceStock && S.holdings && S.holdings.length) {
      let lost = 0;
      S.holdings.forEach((h) => {
        const st = RR.STOCKS.find((x) => x.id === h.stockId);
        if (!st) return;
        const d = -(st.vol * (0.7 + Math.random() * 1.1));
        const before = h.value;
        h.value = Math.max(1, Math.round(h.value * (1 + d)));
        lost += before - h.value;
      });
      if (lost > 0) RR.log(S, '📉 内幕消息应验，持仓当日即暴跌 ' + U.money(lost));
    }
    if (eff.card) RR.grantCardReward(S, eff);
    RR.log(S, '事件选择：' + op.label + (dbl ? '（加倍下注）' : ''));
    if (dbl) RR.toast('💎 加倍下注！双倍奖励到手', 'gold', 2000);
    RR.checkEnd(S);
    renderAll();
    save();
    afterAction({ allowEvent: false });
  }

  /* ---------- 三选一抽卡 ---------- */
  function openDraw(luck, title, desc, opts) {
    const S = RR.S;
    const o = opts || {};
    const ids = o.ids || RR.drawThree(luck, {});
    let body = '<div class="evt-desc">' + (desc || '选一张带走，剩下的会消失。') + '</div><div class="draw-grid">';
    ids.forEach((cid) => {
      const c = RR.CARD_MAP[cid];
      S.seenCards[cid] = 1;
      body += RR.cardHTML(c, { attr: 'data-act="draw-pick" data-id="' + cid + '"' });
    });
    body += '</div>';
    const m = RR.modal({ title: title || '三选一', emoji: '🎴', wide: true, body, closable: false, foot: '' });
    m.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="draw-pick"]');
      if (!btn) return;
      m.close();
      S.bag.push(btn.dataset.id);
      const c = RR.CARD_MAP[btn.dataset.id];
      RR.toast('获得【' + c.name + '】', 'good');
      RR.log(S, '抽到卡牌【' + c.name + '】');
      renderAll();
      save();
      processQueue();
    });
  }

  /* ---------- 结束今天 ---------- */
  function sleep() {
    const S = RR.S;
    const out = RR.endDay(S);
    let body = '';
    if (out.dividends.length) {
      body += '<div class="group-title">💰 分红到账（钱又回来了…）</div>';
      out.dividends.forEach((d) => (body += '<div style="font-size:13px;padding:3px 0">· ' + d.name + '：<b class="num">' + U.money(d.amount) + '</b></div>'));
    }
    if (out.dead.length) {
      body += '<div class="group-title">💀 公司倒闭（本金彻底没了 ✓）</div>';
      out.dead.forEach((d) => (body += '<div style="font-size:13px;padding:3px 0">· ' + d + '</div>'));
    }
    if (out.stockSwing.length) {
      body += '<div class="group-title">📊 持仓波动</div><table class="tbl"><tbody>';
      out.stockSwing.forEach((d) => (body += '<tr><td>' + d.name + '</td><td class="r num" style="color:' +
        (d.delta >= 0 ? 'var(--up)' : 'var(--down)') + ';font-weight:700">' + (d.delta >= 0 ? '+' : '') + U.money(d.delta) + '</td></tr>'));
      body += '</tbody></table>';
    }
    if (out.lines.length) {
      body += '<div class="group-title">🌀 自动蒸发</div>';
      out.lines.forEach((l) => (body += '<div style="font-size:13px;padding:3px 0">· ' + l + '</div>'));
    }
    if (!body) body = '<div class="evt-desc">平静的一天，什么都没发生。</div>';
    const b = RR.bonuses(S);
    const maxAp = RR.maxApOf(S, b);
    body += '<div class="panel-note" style="margin-top:14px">第 ' + S.day + ' 天开始 · 行动点恢复至 <b>' + S.ap + '</b>（上限 ' + maxAp + '） · 股票操作 ' + S.stockOpsLeft + ' 次</div>';

    renderAll();
    save();
    const done = S.over;
    RR.modal({
      title: '第 ' + (S.day - 1) + ' 天结束', emoji: '🌙', body,
      foot: '<button class="btn primary" data-x>继续</button>',
    });
    if (done) { setTimeout(openEnd, 300); return; }
    // 任务检查
    setTimeout(() => afterAction({ allowEvent: false }), 60);
  }

  /* ---------- 结算 ---------- */
  function openEnd() {
    const S = RR.S;
    const won = S.won;
    const rt = RR.rateGame(S);
    const spent = S.initAsset - S.asset;
    const gradeColor = { S: 'var(--gold)', A: '#3a9', B: '#4a8', C: '#999' }[rt.grade] || '#999';
    let h = '<div class="end-wrap"><div class="end-emoji">' + (won ? '🎉' : '⏰') + '</div>' +
      '<div class="end-title" style="color:' + (won ? 'var(--brand)' : 'var(--danger)') + '">' + (won ? '花光了！' : '时间到') + '</div>' +
      '<div class="end-desc">' + (S.endReason || '') + '</div>' +
      (won ? '<div class="end-grade">本局评级 <b style="color:' + gradeColor + '">' + rt.grade + '</b> 级' +
        (rt.grade === 'S' ? ' 🌟' : '') + ' · 用时 ' + rt.daysUsed + ' 天（满分基准 ' + S.totalDays + ' 天）</div>' : '') +
      '<div class="end-stats">' +
      '<div class="end-stat"><div class="v num">' + U.money(spent) + '</div><div class="l">累计消费</div></div>' +
      '<div class="end-stat"><div class="v num">' + (S.day > S.totalDays ? S.totalDays : S.day) + ' / ' + S.totalDays + '</div><div class="l">用时（天）</div></div>' +
      '<div class="end-stat"><div class="v num">' + S.stats.purchases + '</div><div class="l">购买次数</div></div>' +
      '<div class="end-stat"><div class="v num">' + S.doneTitles.length + '</div><div class="l">称号</div></div>' +
      '<div class="end-stat"><div class="v num">' + S.doneMissions.length + '</div><div class="l">任务</div></div>' +
      '<div class="end-stat"><div class="v num">' + U.money(S.stats.maxOnce) + '</div><div class="l">最大单笔</div></div>' +
      '</div>' +
      (won ? '<div class="panel-note">你证明了：钱，是可以花完的。</div>'
           : '<div class="panel-note warn">还剩 <b class="num">' + U.money(S.asset) + '</b>。下次试试更早堆高级卡牌、多用批量购买。</div>') +
      '</div>';
    RR.modal({
      title: won ? '通关' : '未通关', emoji: won ? '🏆' : '⌛',
      body: h, wide: true, closable: false,
      foot: '<button class="btn" data-act="back-menu">换个首富</button><button class="btn primary" data-act="restart">再来一局</button>',
    });
    if (won) {
      RR.sel.used = RR.sel.used || {};
      RR.sel.used[S.tycoonId] = 1;
      // 元进度：固定 1 个开局词条进下一局池子；S 级额外保留 1 张占槽卡（仅 1 回合）
      const m = RR.metaLoad();
      const keepTrait = U.pick(S.traits);
      m.keptTrait = keepTrait.id;
      let keepCardId = null;
      if (rt.grade === 'S' && S.equipped.length) {
        const kc = U.pick(S.equipped);
        if (RR.isEquipType(RR.CARD_MAP[kc])) { m.keptCard = kc; keepCardId = kc; }
      } else {
        m.keptCard = null;
      }
      RR.metaSave(m);
      let note = '📌 下一局开局 10 抽里，会固定出现词条【' + keepTrait.name + '】。';
      if (keepCardId) note += ' 因达成 S 级，还将带入占槽卡【' + RR.CARD_MAP[keepCardId].name + '】（仅本回合生效）。';
      else note += ' 未达成 S 级，本局占槽卡不保留。';
      RR.toast(note, 'gold', 4200);
    }
    U.wipeSave();
  }

  /* ---------- 购买 ---------- */
  function doBuy(scene, itemId) {
    const S = RR.S;
    const item = (RR.ITEMS[scene] || []).find((x) => x.id === itemId);
    if (!item) return;
    const r = RR.buy(S, scene, item, RR.bulkIdx[scene] || 0);
    if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
    RR.toast('-' + U.money(r.total) + (r.points ? ' · +' + U.fmt(r.points) + ' 积分' : '') + (r.free ? ' · 免行动点！' : ''), 'good');
    if (r.echo) setTimeout(() => RR.toast(r.echo, 'bad', 2600), 400);
    afterAction({});
  }

  /* ---------- 买卡包 ---------- */
  function buyPack(pid) {
    const S = RR.S;
    const p = RR.SHOP_PACKS.find((x) => x.id === pid);
    if (!p) return;
    if (S.points < p.price) { RR.toast('积分不足，还差 ' + U.fmt(p.price - S.points), 'bad'); return; }
    S.points -= p.price;
    const ids = [];
    ids.push(RR.rollCard(p.rarity).id);
    while (ids.length < p.n) {
      const r = RR.rollRarity(RR.RARITY_ORDER.indexOf(p.rarity) * 0.35);
      const c = RR.rollCard(r);
      if (ids.indexOf(c.id) < 0) ids.push(c.id);
    }
    RR.toast('积分 -' + U.fmt(p.price), '', 1600);
    renderAll();
    save();
    openDraw(0, p.name, '卡包 ' + p.desc + '，选一张带走。', { ids });
  }

  /* ---------- 菜单 ---------- */
  function openMenu() {
    RR.modal({
      title: '游戏菜单', emoji: '⚙️',
      body: '<div class="evt-desc">' +
        '<b>当前剧本</b>：' + RR.S.tycoonName + ' · 第 ' + RR.S.day + ' / ' + RR.S.totalDays + ' 天<br>' +
        '<b>剩余资产</b>：<span class="num">' + U.money(RR.S.asset) + '</span><br>' +
        '<b>已获称号</b>：' + RR.S.doneTitles.length + ' / ' + RR.TITLES.length + '<br>' +
        '<b>已完成挑战</b>：' + RR.S.doneMissions.length + ' / ' + RR.MISSIONS.length + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">' +
        '<button class="btn" data-act="help">📖 玩法说明</button>' +
        '<button class="btn" data-act="traits">🎴 查看我的 6 个词条</button>' +
        '<button class="btn danger" data-act="restart">🔄 重新开始本局</button>' +
        '<button class="btn" data-act="back-menu">🏠 返回选人界面</button>' +
        '</div>',
      foot: '<button class="btn primary" data-x>关闭</button>',
    });
  }

  function openHelp() {
    RR.modal({
      title: '玩法说明', emoji: '📖', wide: true,
      body: '<div class="evt-desc" style="line-height:1.8">' +
        '<b>目标</b>：在规定天数内，把首富的钱全部花光。<br><br>' +
        '<b>① 行动点</b>：每天有限。消费场景分「花钱场景」和「囤货场景」：商场/4S店/进口商有每日预算上限（吃行动点，一笔顶万亿）；房产/物资/艺术品/球队/投资/股票无上限、买即囤（但会随行情波动，崩盘平仓才真正花掉）。行动点用完只能「结束今天」。<br><br>' +
        '<b>② 批量购买</b>：×1 / ×10 / ×100 / ×1K / ×10K，倍数越高附加行动点越多。想花光万亿，必须靠它。<br><br>' +
        '<b>③ 随机事件</b>：消费时有概率弹出。<b>花钱越多的选项，给的卡越好</b>——这是本游戏最重要的资源循环。<br><br>' +
        '<b>④ 挑战任务</b>：达成后三选一抽卡，任务越难，出金卡红卡概率越高。<br><br>' +
        '<b>⑤ 称号</b>：靠买的东西解锁（球鞋、飞机、别墅…），给积分，少数给卡槽。<br><br>' +
        '<b>⑥ 卡牌</b>：白板 → 绿色 → 蓝色 → 紫色 → 金色 → 红色。白绿是即时消耗品；蓝紫金红多为「需佩戴」，装备进卡槽才生效，也可以回收成积分。<br><br>' +
        '<b>⑦ 股票</b>：操作次数和单笔金额都有限制。<b>赚了钱变多是坏消息，亏了才是好消息。</b><br><br>' +
        '<b>⑧ 投资公司</b>：需要先买写字楼。投出去的钱会每天分红回流（阻碍你花光），只有公司倒闭这笔钱才真正消失、席位才空出来。<br><br>' +
        '<span style="color:var(--ink3)">核心思路：光靠买东西花不完，必须靠「一次性巨额消费卡」+「永久增益卡」+「批量购买」三件套。</span>' +
        '</div>',
      foot: '<button class="btn primary" data-x>知道了</button>',
    });
  }

  function openTraits() {
    const S = RR.S;
    let body = '<div class="evt-desc">这 6 个词条全程生效，不占卡槽。</div>';
    S.traits.forEach((t) => {
      body += '<div class="trait-item" style="margin:0 0 8px"><div class="trait-name">◆ ' + t.name +
        '<span style="font-weight:400;color:var(--ink3);font-size:11px"> · ' + t.from + '</span></div>' +
        '<div class="trait-desc">' + t.desc + '</div>' +
        '<div style="font-size:11px;color:#8a6212;margin-top:3px">' + RR.traitSummary(t).join(' · ') + '</div></div>';
    });
    if (S.permanent.length) {
      body += '<div class="group-title">永久生效的卡牌</div>';
      S.permanent.forEach((cid) => {
        const c = RR.CARD_MAP[cid];
        if (c) body += '<div class="trait-item" style="margin:0 0 6px"><div class="trait-name">' + c.name + '</div>' +
          '<div class="trait-desc">' + RR.effSummary(c).join(' · ') + '</div></div>';
      });
    }
    RR.modal({ title: '我的词条', emoji: '🎴', body, foot: '<button class="btn primary" data-x>关闭</button>' });
  }

  /* ================= 事件委托 ================= */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const id = t.dataset.id;
    const S = RR.S;

    switch (act) {
      /* --- 选人界面 --- */
      case 'pick-tyc':
        RR.sel.tycoon = id; renderSelect(); break;
      case 'pick-diff':
        RR.sel.diff = id; renderSelect(); break;
      case 'to-draw':
        if (!RR.sel.tycoon) return;
        rollPicks(); show('screen-draw'); break;
      case 'pick-trait': {
        const i = RR.sel.traits.indexOf(id);
        if (i >= 0) RR.sel.traits.splice(i, 1);
        else if (RR.sel.traits.length < 3) RR.sel.traits.push(id);
        renderDraw(); break;
      }
      case 'reroll':
        if (RR.sel.reroll <= 0) return;
        RR.sel.reroll--; rollPicks(); break;
      case 'start':
        if (RR.sel.traits.length !== 3) return;
        startGame(); break;
      case 'continue': {
        const sv = RR.loadGame();
        if (sv) { RR.S = sv; RR.view = 'mall'; show('screen-game'); renderAll(); RR.toast('继续第 ' + sv.day + ' 天', 'good'); }
        break;
      }

      /* --- 主界面 --- */
      case 'scene': RR.view = id; RR.renderLeft(S); RR.renderMain(S); break;
      case 'bulk': RR.bulkIdx[t.dataset.scene] = +t.dataset.i; RR.renderMain(S); break;
      case 'buy': doBuy(t.dataset.scene, id); break;
      case 'invest': {
        const r = RR.doInvest(S, id);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('投资【' + r.name + '】-' + U.money(r.amount), 'good', 2600);
        afterAction({}); break;
      }
      case 'buystock': {
        const b = RR.bonuses(S);
        const cap = RR.stockCapOf(S, b);
        const amt = Math.round(cap * parseFloat(t.dataset.p || '1'));
        const r = RR.buyStock(S, id, amt);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('买入 ' + U.money(r.amount) + ' · 浮动 ' + (r.delta >= 0 ? '+' : '') + U.money(r.delta), r.delta >= 0 ? 'bad' : 'good', 2600);
        afterAction({}); break;
      }
      case 'sell': {
        const r = RR.sellStock(S, id);
        if (r.ok) RR.toast((r.pnl >= 0 ? '卖出，赚了 ' : '卖出，亏了 ') + U.money(Math.abs(r.pnl)), r.pnl >= 0 ? 'bad' : 'good', 2600);
        afterAction({ allowEvent: false }); break;
      }
      case 'sellall': {
        const pnl = RR.sellAll(S);
        RR.toast('清仓，合计' + (pnl >= 0 ? '赚 ' : '亏 ') + U.money(Math.abs(pnl)), pnl >= 0 ? 'bad' : 'good');
        afterAction({ allowEvent: false }); break;
      }
      case 'buyasset': {
        const r = RR.buyAsset(S, t.dataset.kind, id);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('囤入【' + r.asset.name + '】-' + U.money(r.price), 'good', 2600);
        afterAction({}); break;
      }
      case 'sellasset': {
        const r = RR.sellAsset(S, t.dataset.kind, id);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('平仓回款 ' + U.money(r.value) + '（净亏 ' + U.money(r.loss) + '）', 'good', 2600);
        afterAction({ allowEvent: false }); break;
      }
      case 'refreshdraw': {
        const r = RR.refreshDraw(S);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('刷新抽中【' + r.card.name + '】', 'gold', 2600);
        afterAction({ allowEvent: false }); break;
      }
      case 'sleep': sleep(); break;
      case 'menu': openMenu(); break;
      case 'help': openHelp(); break;
      case 'traits': openTraits(); break;
      case 'inv': RR.view = 'inv'; RR.renderLeft(S); RR.renderMain(S); break;
      case 'bag': RR.view = 'bag'; RR.renderLeft(S); RR.renderMain(S); break;
      case 'mission': RR.view = 'mission'; RR.renderLeft(S); RR.renderMain(S); break;
      case 'title': RR.view = 'title'; RR.renderLeft(S); RR.renderMain(S); break;
      case 'shop': RR.view = 'shop'; RR.renderLeft(S); RR.renderMain(S); break;

      /* --- 卡牌 --- */
      case 'use': {
        const c = RR.CARD_MAP[id];
        const i = S.bag.indexOf(id);
        if (i < 0) return;
        const results = RR.useCard(S, id);
        if (results && results.error === 'need-equip') {
          RR.toast('这张卡需要「装备」到卡槽才生效', 'bad');
          RR.checkEnd(S);
          afterAction({ allowEvent: false });
          break;
        }
        S.bag.splice(i, 1);
        if (results) {
          results.forEach((r) => {
            if (r.type === 'spend') RR.toast('-' + U.money(r.amount), 'good');
            if (r.type === 'ap') RR.toast('+' + r.amount + ' 行动点', 'good');
            if (r.type === 'points') RR.toast('+' + U.fmt(r.amount) + ' 积分', 'gold');
            if (r.type === 'permanent') RR.toast('【' + r.name + '】永久生效', 'gold', 2800);
          });
        }
        RR.toast('使用了【' + c.name + '】', 'good');
        RR.checkEnd(S);
        afterAction({ allowEvent: false }); break;
      }
      case 'equip': {
        const r = RR.equipCard(S, id);
        if (!r.ok) { RR.toast(r.msg, 'bad'); return; }
        RR.toast('已装备【' + RR.CARD_MAP[id].name + '】', 'good');
        renderAll(); save(); break;
      }
      case 'unequip': {
        RR.unequipCard(S, id);
        renderAll(); save(); break;
      }
      case 'recycle': {
        const c = RR.CARD_MAP[id];
        const i = S.bag.indexOf(id);
        if (i < 0) return;
        S.bag.splice(i, 1);
        const p = RR.recycleCard(S, id);
        RR.toast('回收【' + c.name + '】+ ' + U.fmt(p) + ' 积分', 'gold');
        renderAll(); save(); afterAction({ allowEvent: false }); break;
      }
      case 'cardinfo': {
        const c = RR.CARD_MAP[id];
        if (c) RR.modal({ title: c.name, emoji: '🃏', body: '<div class="evt-desc">' + c.desc +
          '</div><div style="font-size:12px;color:var(--ink2)">' + RR.effSummary(c).join('<br>') + '</div>',
          foot: '<button class="btn primary" data-x>关闭</button>' });
        break;
      }
      case 'buypack': buyPack(id); break;

      /* --- 结算 --- */
      case 'restart': {
        const m = t.closest('.modal-mask'); if (m) m.remove();
        startGame(); break;
      }
      case 'back-menu': {
        const m = t.closest('.modal-mask'); if (m) m.remove();
        RR.S = null; U.wipeSave(); show('screen-select'); renderSelect(); break;
      }
    }
  });

  /* ================= 启动 ================= */
  function init() {
    RR.sel.used = {};
    $('#btn-to-draw').addEventListener('click', () => {
      if (RR.sel.tycoon) { rollPicks(); show('screen-draw'); }
    });
    $('#btn-continue').addEventListener('click', () => {
      const sv = RR.loadGame();
      if (sv) { RR.S = sv; RR.view = 'mall'; show('screen-game'); renderAll(); }
    });
    $('#btn-reroll').addEventListener('click', () => {
      if (RR.sel.reroll > 0) { RR.sel.reroll--; rollPicks(); }
    });
    $('#btn-start').addEventListener('click', () => {
      if (RR.sel.traits.length === 3) startGame();
    });
    show('screen-select');
    renderSelect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.RR);
