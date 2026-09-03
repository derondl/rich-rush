/* 消费 / 投资 / 股票核心逻辑 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';
  const U = RR.util;

  /* 单件价格（未乘批量） */
  RR.unitPrice = function (S, b, item, scene) {
    let p = item.price;
    const pm = S.priceMult[item.id] || 1;
    p *= pm;
    if (S.spikeItem === item.id && b.priceSpike > 0) p *= 1 + b.priceSpike;
    p *= RR.spendMultFor(b, scene, item.cat);
    return Math.max(1, p);
  };

  /* 报价（使用「当天剩余场景预算」作为上限，而非资产%硬上限） */
  RR.quote = function (S, scene, item, bulkIdx) {
    const b = RR.bonuses(S);
    const bulk = RR.BULK[bulkIdx] || RR.BULK[0];
    const cap = RR.sceneBudgetLeft(S, scene);
    const unit = RR.unitPrice(S, b, item, scene);

    // 数量：固定档位 or 顶到当天预算
    let qty = bulk.mult;
    if (bulk.mult === 'max') {
      let pu = unit * (1 + b.taxPct);
      qty = Math.floor(cap / pu);
      if (qty >= 10 && b.bulkSurcharge > 0) {
        pu = unit * (1 + b.taxPct) * (1 + b.bulkSurcharge);
        qty = Math.floor(cap / pu);
      }
    }
    qty = Math.max(1, Math.min(qty, 99999999));

    let total = unit * qty;
    if (qty >= 10 && b.bulkSurcharge > 0) total *= 1 + b.bulkSurcharge;
    if (b.taxPct > 0) total *= 1 + b.taxPct;

    const extra = RR.bulkApExtra(qty);
    let ap = RR.apCostFor(S, b, scene, extra);
    ap = Math.max(1, ap - (qty >= 10 ? b.batchAp : 0));

    const pointScene = (RR.getScene(scene) || {}).point;
    const totalR = Math.round(total);
    const points = pointScene ? RR.pointsFor(totalR, b) : 0;
    return {
      unit, qty, total: totalR, ap, points, cap,
      // 只判"是否超过当天场景预算"；buy() 内部会把 total 封顶到当前资产，
      // 这样当剩余资产 < 预算时，"上限"档也能一次性把余数花光（用于收尾通关）。
      affordable: totalR <= cap + 1,
    };
  };

  RR.pointsFor = function (amount, b) {
    if (amount <= 0) return 0;
    const p = Math.pow(amount / 1000, 0.42);
    const mul = (b && b.pointMul) || 1;
    const gain = (b && b.pointGain) || 0;
    return Math.max(1, Math.round(p * (1 + gain) * mul));
  };

  /* 执行购买 */
  RR.buy = function (S, scene, item, bulkIdx) {
    const b = RR.bonuses(S);
    const q = RR.quote(S, scene, item, bulkIdx);
    if (q.ap > S.ap) return { ok: false, msg: '行动点不足（需要 ' + q.ap + '）' };
    if (!q.affordable) return { ok: false, msg: '今天「' + RR.getScene(scene).name + '」的预算用完了，明天再来' };

    let total = q.total;
    // 薛定谔的钱包：概率翻倍 / 概率返还
    let echoMsg = null;
    if (b.echoRandom) {
      if (U.chance(b.echoRandom.chance)) {
        total = Math.round(total * (1 + b.echoRandom.pct));
        echoMsg = '【薛定谔的钱包】这一笔翻倍了！';
      } else if (b.echoRandom.refund > 0) {
        const back = Math.round(total * b.echoRandom.refund);
        RR.gainRaw(S, back);
        echoMsg = '【薛定谔的钱包】返还了 ' + U.money(back);
      }
    }
    if (total > S.asset) total = S.asset;
    if (total <= 0) return { ok: false, msg: '没钱了' };

    RR.spendRaw(S, total, scene);
    S.inv[item.id] = (S.inv[item.id] || 0) + q.qty;
    S.catCount[item.cat] = (S.catCount[item.cat] || 0) + q.qty;
    if (item.tag) S.tagCount[item.tag] = (S.tagCount[item.tag] || 0) + q.qty;
    S.stats.byCat[item.cat] = (S.stats.byCat[item.cat] || 0) + total;
    S.stats.purchases++;
    S.daySpendByScene[scene] = (S.daySpendByScene[scene] || 0) + total;

    // 稀缺性涨价
    S.priceMult[item.id] = (S.priceMult[item.id] || 1) * 1.12;

    // 行动点
    const freeByChance = b.apFreeChance > 0 && U.chance(b.apFreeChance);
    const freeFirst = b.firstFree && (b.firstFree === 'any' || b.firstFree === scene) && !S.usedFirstFree;
    if (freeFirst) S.usedFirstFree = true;
    const cost = freeByChance || freeFirst ? 0 : q.ap;
    S.ap -= cost;
    S.stats.dayAp += cost;

    // 积分
    if (q.points > 0) S.points += q.points;

    RR.log(S, '购买 ' + item.name + ' ×' + q.qty + '，花费 ' + U.money(total));

    // 股票操作次数专属
    if (scene === 'stock') S.stockOpsLeft--;

    RR.checkEnd(S);
    return { ok: true, total, points: q.points, ap: cost, echo: echoMsg, free: freeByChance || freeFirst };
  };

  RR.decayPrices = function (S) {
    Object.keys(S.priceMult).forEach((k) => {
      S.priceMult[k] = Math.max(1, (S.priceMult[k] - 1) * 0.9 + 1);
    });
  };

  /* ---------------- 投资公司 ---------------- */
  RR.investTierOf = function (S) {
    const t = RR.INVEST_TIERS.slice().reverse().find((x) => S.asset >= x.minAsset);
    return t ? t.tier : 1;
  };
  RR.maxCompanies = function (S, b) {
    return 3 + (b.investSlots || 0) + (S.bonusSlots || 0);
  };
  RR.canInvest = function (S) {
    return RR.countCat(S, 'office') >= 1;
  };
  RR.refreshOffers = function (S) {
    const n = 4;
    S.investOffers = [];
    for (let i = 0; i < n; i++) {
      const t = 1 + i; // 1~5 档，越靠后投资额越大
      S.investOffers.push(RR.genCompany(t, S.asset));
    }
    S.investOfferDay = S.day;
  };
  RR.doInvest = function (S, uid) {
    const b = RR.bonuses(S);
    if (!RR.canInvest(S)) return { ok: false, msg: '需要先在房产市场买下一套写字楼' };
    if (S.companies.length >= RR.maxCompanies(S, b)) return { ok: false, msg: '投资席位已满，等公司倒闭吧' };
    const off = (S.investOffers || []).find((c) => c.uid === uid);
    if (!off) return { ok: false, msg: '这个项目已经被人抢走了' };
    let amount = Math.round(off.amount * (1 + b.investAmount + (b.scenePct.invest || 0)));
    if (amount > S.asset) amount = S.asset;
    if (amount <= 0) return { ok: false, msg: '没钱了' };
    const apCost = RR.apCostFor(S, b, 'invest', 0);
    if (apCost > S.ap) return { ok: false, msg: '行动点不足（需要 ' + apCost + '）' };

    RR.spendRaw(S, amount, 'invest');
    S.ap -= apCost;
    S.stats.dayAp += apCost;
    S.stats.purchases++;
    S.inv['company'] = (S.inv['company'] || 0) + 1;
    S.companyHistory = S.companyHistory || [];
    S.companyHistory.push({ name: off.name, amount, day: S.day, dead: false });

    let life = off.life;
    if (b.investLife > 0) life = Math.round(life / (1 - Math.min(0.9, b.investLife)));
    S.companies.push({
      uid: off.uid, name: off.name, tier: off.tier,
      amount, life, daysLeft: Math.max(1, life), daily: off.daily, alive: true,
    });
    S.investOffers = S.investOffers.filter((c) => c.uid !== uid);
    RR.log(S, '投资【' + off.name + '】' + U.money(amount) + '，' + off.name + ' 开始每天给你分红。');
    RR.checkEnd(S);
    return { ok: true, amount, name: off.name, ap: apCost };
  };

  /* ---------------- 股票 ---------------- */
  RR.stockCapOf = function (S, b) {
    return Math.max(1, Math.round(S.asset * 0.01 * b.stockCap));
  };
  RR.buyStock = function (S, stockId, amount) {
    const b = RR.bonuses(S);
    if (S.stockOpsLeft <= 0) return { ok: false, msg: '今天的股票操作次数用完了' };
    const cap = RR.stockCapOf(S, b);
    if (amount <= 0) return { ok: false, msg: '请输入金额' };
    if (amount > cap) return { ok: false, msg: '单次上限 ' + U.money(cap) };
    if (amount > S.asset) amount = S.asset;
    const apCost = RR.apCostFor(S, b, 'stock', 0);
    if (apCost > S.ap) return { ok: false, msg: '行动点不足' };
    if (amount <= 0) return { ok: false, msg: '没钱了' };

    RR.spendRaw(S, amount, 'stock');
    S.ap -= apCost;
    S.stats.dayAp += apCost;
    S.stats.purchases++;
    S.stockOpsLeft--;

    const st = RR.STOCKS.find((x) => x.id === stockId);
    const h = S.holdings.find((x) => x.stockId === stockId);
    if (h) { h.amount += amount; h.value += amount; }
    else S.holdings.push({ stockId, amount, value: amount });

    // 立即结算一次波动
    const delta = (Math.random() * 2 - 1) * st.vol * 0.6;
    const hh = S.holdings.find((x) => x.stockId === stockId);
    const before = hh.value;
    hh.value = Math.max(0, Math.round(hh.value * (1 + delta)));

    RR.log(S, '买入【' + st.name + '】' + U.money(amount) + '，当前市值 ' + U.money(hh.value));
    return { ok: true, amount, delta: hh.value - before, value: hh.value };
  };
  RR.sellStock = function (S, stockId) {
    const i = S.holdings.findIndex((x) => x.stockId === stockId);
    if (i < 0) return { ok: false };
    const h = S.holdings[i];
    const pnl = h.value - h.amount;
    if (pnl < 0) S.stats.stockLoss += -pnl;
    else S.stats.stockGain += pnl;
    RR.gainRaw(S, h.value, 'stock');
    S.holdings.splice(i, 1);
    const st = RR.STOCKS.find((x) => x.id === stockId);
    RR.log(S, (pnl >= 0 ? '卖出【' + st.name + '】赚了 ' : '卖出【' + st.name + '】亏了 ') + U.money(Math.abs(pnl)));
    return { ok: true, pnl, value: h.value };
  };
  RR.sellAll = function (S) {
    let pnl = 0;
    S.holdings.slice().forEach((h) => {
      const r = RR.sellStock(S, h.stockId);
      if (r.ok) pnl += r.pnl;
    });
    return pnl;
  };

  /* ---------------- 资产市场（囤积类） ----------------
   * 买入即囤：花掉买价（主要消耗）；每天有涨跌 / 收租回流 / 暴跌；平仓回款越少，净消耗越多。
   */
  RR.countHoardCat = function (S, cat) {
    let n = 0;
    (S.hoard || []).forEach((a) => { if (a.cat === cat) n++; });
    return n;
  };
  RR.canInvest = function (S) {
    // 买下至少一套写字楼（房产市场 office 类）才能开投资公司
    return RR.countHoardCat(S, 'office') >= 1;
  };

  RR.buyAsset = function (S, kind, itemId) {
    const b = RR.bonuses(S);
    const info = RR.ASSET_CAT_OF[itemId];
    if (!info || info.kind !== kind) return { ok: false, msg: '没有这个资产' };
    let price = info.price;
    // 囤积类卡牌可抬高买入价（让平仓亏得更多）
    if (b.hoardBuyUp && b.hoardBuyUp[kind]) price = Math.round(price * (1 + b.hoardBuyUp[kind]));
    // 场景消费加成同样作用于资产市场（让"囤"花得更多）
    const spPct = (b.scenePct.all || 0) + (b.scenePct[kind] || 0);
    if (spPct) price = Math.round(price * (1 + spPct));
    if (price > S.asset) return { ok: false, msg: '钱不够（需要 ' + U.money(price) + '）' };
    const apCost = RR.apCostFor(S, b, kind, 0);
    if (apCost > S.ap) return { ok: false, msg: '行动点不足（需要 ' + apCost + '）' };
    RR.spendRaw(S, price, kind);
    S.ap -= apCost; S.stats.dayAp += apCost; S.stats.purchases++;
    S.catCount[info.cat] = (S.catCount[info.cat] || 0) + 1;
    const a = {
      uid: 'as_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
      kind, itemId, name: info.name, cat: info.cat,
      buyPrice: price, value: price,
    };
    (S.hoard || (S.hoard = [])).push(a);
    RR.log(S, '囤入【' + info.name + '】' + U.money(price));
    RR.checkEnd(S);
    return { ok: true, price, ap: apCost, asset: a };
  };

  RR.sellAsset = function (S, kind, uid) {
    const arr = S.hoard || [];
    const i = arr.findIndex((x) => x.uid === uid && x.kind === kind);
    if (i < 0) return { ok: false, msg: '没有这个资产' };
    const a = arr[i];
    RR.gainRaw(S, a.value, 'asset'); // 平仓回款（越少越好）
    arr.splice(i, 1);
    S.catCount[a.cat] = Math.max(0, (S.catCount[a.cat] || 0) - 1);
    RR.log(S, '平仓【' + a.name + '】回款 ' + U.money(a.value) + '（本金 ' + U.money(a.buyPrice) + '，净亏 ' + U.money(a.buyPrice - a.value) + '）');
    return { ok: true, value: a.value, loss: a.buyPrice - a.value };
  };

  // 资产市场每日行为（涨跌 / 收租回流 / 暴跌 / 养护费），返回日志
  RR.assetDaily = function (S) {
    const b = RR.bonuses(S);
    const lines = [];
    (S.hoard || []).forEach((a) => {
      const cfg = RR.ASSET_KIND[a.kind];
      if (!cfg) return;
      if (a.kind === 'art') {
        // 艺术品：每日固定养护费（直接蒸发，不回流）；artUpkeep 倍率由卡牌叠加
        const up = Math.round(a.buyPrice * (cfg.upkeepPct || 0.018) * (1 + (b.artUpkeep || 0)));
        if (up > 0) RR.spendRaw(S, up, 'asset-upkeep');
        RR.log(S, '🖼️【' + a.name + '】养护费 ' + U.money(up) + '（钱直接蒸发）');
        lines.push('养护 ' + a.name + ' ' + U.money(up));
        return;
      }
      // 涨跌波动
      const vol = (cfg.vol || 0.08) * (1 + (b.hoardVol && b.hoardVol[a.kind] ? b.hoardVol[a.kind] : 0));
      const delta = (Math.random() * 2 - 1) * vol;
      a.value = Math.max(1, Math.round(a.value * (1 + delta)));
      // 暴跌（事件 / 卡牌可放大概率与幅度）
      let crashP = (cfg.crashChance || 0) * (1 + (b.hoardCrash && b.hoardCrash[a.kind] ? b.hoardCrash[a.kind] : 0));
      if (U.chance(crashP)) {
        const cp = (cfg.crashPct || 0.4) * (1 + (b.hoardCrashDeep && b.hoardCrashDeep[a.kind] ? b.hoardCrashDeep[a.kind] : 0));
        a.value = Math.max(1, Math.round(a.value * (1 - cp)));
        RR.log(S, '💥【' + a.name + '】暴跌 ' + Math.round(cp * 100) + '%，现值 ' + U.money(a.value));
        lines.push(a.name + ' 暴跌');
      }
      // 收租 / 球员效益（回流，对玩家是坏消息）
      if (a.kind === 'estate') {
        const rentRate = (cfg.rent[a.cat] || 0.01) * (1 + (b.hoardRent && b.hoardRent[a.kind] ? b.hoardRent[a.kind] : 0));
        const rent = Math.round(a.value * rentRate);
        if (rent > 0) { RR.gainRaw(S, rent, 'asset'); RR.log(S, '🏠【' + a.name + '】收租回流 ' + U.money(rent)); lines.push(a.name + ' 收租'); }
      } else if (a.kind === 'team') {
        const inc = Math.round(a.value * (cfg.incomeDaily || 0.012));
        if (inc > 0) { RR.gainRaw(S, inc, 'asset'); RR.log(S, '⚽【' + a.name + '】球员效益回流 ' + U.money(inc)); lines.push(a.name + ' 效益'); }
      }
    });
    return lines;
  };
})(window.RR);
