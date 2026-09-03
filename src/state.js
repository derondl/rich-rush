/* 游戏状态：创建、存档、每日结算、胜负判定 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';
  const U = RR.util;

  RR.DIFFS = [
    { key: 'short', name: '极限', mult: 0.7, desc: '天数 ×0.7，钱多时间少，压力拉满' },
    { key: 'normal', name: '标准', mult: 1.0, desc: '推荐节奏，正常体验完整流程' },
    { key: 'long', name: '从容', mult: 1.4, desc: '天数 ×1.4，慢慢享受花钱的过程' },
  ];

  RR.newGame = function (tycoonId, diffKey, traitIds, opts) {
    const T = RR.getTycoon(tycoonId);
    const diff = RR.DIFFS.find((d) => d.key === diffKey) || RR.DIFFS[1];
    const totalDays = Math.max(12, Math.round(T.days * diff.mult));

    const traits = T.perks.map((p) => ({ id: p.id, name: p.name, desc: p.desc, eff: p.eff, from: T.name, r: p.r, school: p.school }));
    (traitIds || []).forEach((id) => {
      const t = RR.TRAITS.find((x) => x.id === id);
      if (t) traits.push({ id: t.id, name: t.name, desc: t.desc, eff: t.eff, from: '开局抽取', r: t.r, school: t.school });
    });

    const S = {
      v: 1,
      tycoonId: T.id,
      tycoonName: T.name,
      tycoonAvatar: T.avatar,
      tycoonAlias: T.alias,
      initAsset: T.wealth,
      asset: T.wealth,
      day: 1,
      totalDays,
      capScale: U.clamp(60 / totalDays, 0.6, 2.2),
      difficulty: diff.key,
      baseAp: 10,
      ap: 10,
      baseSlots: 5,
      points: 0,
      traits,
      equipped: [],
      bag: [],
      permanent: [],
      buffs: [],
      inv: {},
      catCount: {},
      tagCount: {},
      companyHistory: [],
      investOffers: [],
      investOfferDay: 0,
      companies: [],
      holdings: [],
      hoard: [],          // 资产市场囤积物（房产/物资/艺术/球队）
      refreshPoints: 0,   // 刷新流专用点数（一次性消费卡来源）
      stockOpsLeft: 3,
      dailySpends: [],
      daySpendByScene: {},
      usedFirstFree: false,
      seenCards: {},
      doneMissions: [],
      doneTitles: [],
      pendingDraws: [],
      priceMult: {},
      spikeItem: null,
      log: [],
      over: false,
      won: false,
      endReason: '',
      keepCardFrom: null,
      stats: {
        totalSpent: 0, byScene: {}, byCat: {}, maxOnce: 0, maxDaySpend: 0, maxDayAp: 0,
        daySpend: 0, dayAp: 0, stockLoss: 0, stockGain: 0, companyDead: 0, companyAlive: 0,
        events: 0, recycled: 0, purchases: 0, cardsUsed: 0, daysFinished: 0,
      },
    };
    // 上一局 S 级奖励：带入一张占槽卡（仅 1 回合）
    const o = opts || {};
    if (o.keptCard && RR.CARD_MAP[o.keptCard] && RR.isEquipType(RR.CARD_MAP[o.keptCard])) {
      S.equipped.push(o.keptCard);
      S.keepCardFrom = o.keptCard;
    }
    // 开局签名卡组：放入背包，占槽卡（permanent/functional）自动装备，受卡槽上限约束
    (T.deck || []).forEach((id) => {
      const c = RR.CARD_MAP[id];
      if (!c) return;
      S.bag.push(id);
      S.seenCards[id] = 1;
      if (RR.isEquipType(c)) {
        const r = RR.equipCard(S, id);
        if (!r.ok) RR.log(S, '⚠️ 卡槽已满，签名卡【' + c.name + '】暂存背包');
      }
    });
    if (T.deck && T.deck.length) {
      const names = T.deck.map((id) => (RR.CARD_MAP[id] || {}).name).filter(Boolean).join('、');
      RR.log(S, '签名卡组已就位：' + names + '。');
    }
    RR.log(S, '【' + T.name + '】开局：' + U.money(T.wealth) + '，' + totalDays + ' 天内花光。');
    return S;
  };

  /* ---------------- 元进度（跨局保留） ---------------- */
  RR.META_KEY = 'rich-rush-meta-v2';
  RR.metaLoad = function () {
    try { const m = JSON.parse(localStorage.getItem(RR.META_KEY)); return m || {}; } catch (e) { return {}; }
  };
  RR.metaSave = function (m) {
    try { localStorage.setItem(RR.META_KEY, JSON.stringify(m)); } catch (e) {}
  };
  RR.metaReset = function () {
    try { localStorage.removeItem(RR.META_KEY); } catch (e) {}
  };

  /* 通关评级：按难度系数与用时占比 */
  RR.rateGame = function (S) {
    const daysUsed = Math.min(S.day, S.totalDays + 1) - 1;
    const ratio = daysUsed / S.totalDays;        // 越小越快
    const diffMul = S.difficulty === 'short' ? 1.3 : S.difficulty === 'long' ? 0.8 : 1.0;
    const score = (1 - ratio) * diffMul;
    let grade = 'C';
    if (score >= 0.45) grade = 'S';
    else if (score >= 0.25) grade = 'A';
    else if (score >= 0.1) grade = 'B';
    return { grade, score, daysUsed };
  };

  RR.log = function (S, msg) {
    if (!S.log) S.log = [];
    S.log.unshift({ day: S.day, msg });
    if (S.log.length > 200) S.log.length = 200;
  };

  /* ---------- 存档 ---------- */
  RR.saveGame = function (S) {
    return U.save({ S, ts: Date.now() });
  };
  RR.loadGame = function () {
    const d = U.load();
    return d && d.S ? d.S : null;
  };

  /* ---------- 每日结算 ---------- */
  RR.endDay = function (S) {
    if (S.over) return { events: [] };
    const out = { lines: [], dead: [], dividends: [], stockSwing: [] };
    const b = RR.bonuses(S);

    // 0) 资产市场每日行为（涨跌 / 收租回流 / 暴跌 / 养护费）
    (RR.assetDaily(S) || []).forEach((l) => out.lines.push(l));

    // 1) 投资公司分红 / 倒闭
    S.companies.forEach((c) => {
      if (!c.alive) return;
      const div = Math.round(c.amount * c.daily);
      if (div > 0) {
        RR.gainRaw(S, div);
        out.dividends.push({ name: c.name, amount: div });
        RR.log(S, '【' + c.name + '】分红到账 ' + U.money(div) + '（钱又回来了…）');
      }
      c.daysLeft--;
      if (c.daysLeft <= 0) {
        c.alive = false;
        S.stats.companyDead++;
        out.dead.push(c.name);
        (S.companyHistory || []).forEach((h) => {
          if (h.name === c.name && !h.dead) h.dead = true;
        });
        RR.log(S, '💀 【' + c.name + '】倒闭了，' + U.money(c.amount) + ' 本金彻底没了。');
      }
    });
    S.companies = S.companies.filter((c) => c.alive);

    // 2) 股票持仓波动（受暴跌概率 / 强制下挫叠加卡影响）
    S.holdings.forEach((h) => {
      const st = RR.STOCKS.find((x) => x.id === h.stockId);
      let delta = (Math.random() * 2 - 1) * st.vol * 0.6;
      // 暴跌流派：概率性强制大跌
      if (b.stockCrash > 0 && U.chance(Math.min(0.85, b.stockCrash * 0.5))) {
        delta = -(st.vol * (0.6 + b.stockCrash * 0.5) * (0.6 + Math.random() * 0.8));
      }
      // 每日强制下挫（做空之王等）：钱越亏越多
      if (b.stockForceDown > 0) {
        delta -= b.stockForceDown * (0.6 + Math.random() * 0.8);
      }
      const before = h.value;
      h.value = Math.max(0, Math.round(h.value * (1 + delta)));
      out.stockSwing.push({ name: st.name, delta: h.value - before, value: h.value });
    });

    // 3) 每日固定扣款（自动续费等）
    S.dailySpends = S.dailySpends.filter((d) => {
      RR.spendRaw(S, d.amount, 'auto');
      RR.log(S, '自动扣款【' + d.name + '】' + U.money(d.amount));
      d.daysLeft--;
      return d.daysLeft > 0;
    });

    // 4) 资产蒸发类（金钱黑洞 / 复利恶魔 / 宇宙管理费）
    if (b.drainPct > 0 && S.asset > 0) {
      const dr = Math.round(S.asset * b.drainPct);
      RR.spendRaw(S, dr, 'drain');
      RR.log(S, '资产蒸发 ' + U.money(dr) + '（' + (b.drainPct * 100).toFixed(1) + '%）');
      out.lines.push('资产蒸发 ' + U.money(dr));
    }

    // 5) buff 倒计时
    S.buffs = S.buffs.filter((bf) => {
      bf.daysLeft--;
      if (bf.daysLeft <= 0) {
        RR.log(S, '增益【' + bf.name + '】到期');
        return false;
      }
      return true;
    });

    S.stats.daysFinished++;
    if (S.stats.daySpend > S.stats.maxDaySpend) S.stats.maxDaySpend = S.stats.daySpend;
    if (S.stats.dayAp > S.stats.maxDayAp) S.stats.maxDayAp = S.stats.dayAp;

    // 6) 进入下一天
    S.day++;
    S.stats.daySpend = 0;
    S.stats.dayAp = 0;
    S.daySpendByScene = {};
    S.spikeItem = null;
    S.usedFirstFree = false;
    S.investOfferDay = 0;
    if (RR.decayPrices) RR.decayPrices(S);

    const nb = RR.bonuses(S);
    const maxAp = RR.maxApOf(S, nb);
    S.ap = nb.apFull ? Math.round(maxAp * 2) : maxAp;
    S.stockOpsLeft = 3 + nb.stockOps;

    // 7) 判定
    if (S.day > S.totalDays) {
      RR.checkEnd(S);
    }
    return out;
  };

  /* 胜负判定：asset 归零（并自动清仓）即胜利；天数耗尽仍有钱即失败 */
  RR.checkEnd = function (S) {
    if (S.over) return;
    // 资产见底时自动清仓持仓
    if (S.asset < 1 && S.holdings.length) {
      let back = 0;
      S.holdings.forEach((h) => (back += h.value));
      S.holdings = [];
      RR.gainRaw(S, back, 'stock');
      RR.log(S, '自动清仓，回流 ' + U.money(back));
    }
    if (S.asset < 1) {
      S.over = true;
      S.won = true;
      S.endReason = '你在第 ' + (S.day - 1 > S.totalDays ? S.totalDays : S.day) + ' 天花光了最后一分钱。';
      return;
    }
    if (S.day > S.totalDays) {
      S.over = true;
      S.won = false;
      S.endReason = '时间到，你还剩 ' + U.money(S.asset) + ' 没花完。';
    }
  };
})(window.RR);
