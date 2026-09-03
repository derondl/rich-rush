/* 词条 / 卡牌效果聚合与结算 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';
  const U = RR.util;

  function blank() {
    return {
      scenePct: {}, catPct: {}, sceneAp: {},
      dailyAp: 0, maxAp: 0, batchAp: 0, slots: 0,
      investAmount: 0, investSlots: 0, investLife: 0,
      stockOps: 0, stockCap: 1,
      pointGain: 0, pointMul: 1, eventRate: 0,
      taxPct: 0, apFreeChance: 0,
      firstFree: null,
      perShopAp: 0, perShopApCap: 99, perShopPct: 0, perShopPctCap: 1,
      perCarAp: 0, perCarCap: 5,
      semiAp: 0, semiApCap: 5,
      investApPerCompany: 0,
      drainPct: 0,
      apFull: false, apCost1: false,
      dailyInfl: 0,
      echoRandom: null,
      auction: false,
      spendMult: 1,
      priceSpike: 0,
      bulkSurcharge: 0,
      missionPoint: 0,
      eventDouble: false,
      unlocks: [],
      stockCrash: 0,        // 股市暴跌概率加成
      stockForceDown: 0,    // 每日强制下挫比例
      aiDigital: 0,         // 持有AI股+投资AI公司时数码品类额外溢价
      hoardBuyUp: {},       // 囤积类：买入价抬高 {kind: pct}
      hoardVol: {},         // 囤积类：每日波动放大 {kind: pct}
      hoardCrash: {},       // 囤积类：暴跌概率提高 {kind: pct}
      hoardCrashDeep: {},   // 囤积类：暴跌深度加大 {kind: pct}
      artUpkeep: 0,         // 艺术品养护费倍率（叠加进基类 1.8%）
      investSeat: 0,        // 投资席位（叠加进 S.bonusSlots）
    };
  }

  function addScene(b, scene, pct) { b.scenePct[scene] = (b.scenePct[scene] || 0) + pct; }
  function addCat(b, cat, pct) { b.catPct[cat] = (b.catPct[cat] || 0) + pct; }
  function addSceneAp(b, scene, d) { b.sceneAp[scene] = (b.sceneAp[scene] || 0) + d; }
  function applyPerShop(b, eff) {
    if (!eff || !eff.perShop) return;
    if (eff.perShop.ap) { b.perShopAp += eff.perShop.ap; b.perShopApCap = Math.min(b.perShopApCap, eff.perShop.cap || 99); }
    if (eff.perShop.pct) { b.perShopPct += eff.perShop.pct; b.perShopPctCap = Math.min(b.perShopPctCap, eff.perShop.cap || 1); }
  }

  /* 解析一个词条 eff（角色 perk / 开局 trait） */
  function applyTrait(b, eff) {
    if (!eff) return;
    (eff.sceneSpend || []).forEach((x) => addScene(b, x.scene, x.pct));
    (eff.catSpend || []).forEach((x) => addCat(b, x.cat, x.pct));
    (eff.sceneAp || []).forEach((x) => addSceneAp(b, x.scene, x.delta));
    if (eff.dailyAp) b.dailyAp += eff.dailyAp;
    if (eff.maxAp) b.maxAp += eff.maxAp;
    if (eff.stockOps) b.stockOps += eff.stockOps;
    if (eff.pointGain) b.pointGain += eff.pointGain;
    if (eff.eventRate) b.eventRate += eff.eventRate;
    if (eff.batchAp) b.batchAp += eff.batchAp;
    if (eff.spendEcho) b.taxPct += eff.spendEcho;
    if (eff.investAmount) b.investAmount += eff.investAmount;
    if (eff.investSlots) b.investSlots += eff.investSlots;
    if (eff.investLife) b.investLife += eff.investLife;
    if (eff.investApPerCompany) b.investApPerCompany += eff.investApPerCompany;
    if (eff.firstFree) b.firstFree = eff.firstFree;
    if (eff.apFreeChance) b.apFreeChance += eff.apFreeChance;
    if (eff.priceSpike) b.priceSpike += eff.priceSpike;
    if (eff.bulkSurcharge) b.bulkSurcharge += eff.bulkSurcharge;
    if (eff.missionPoint) b.missionPoint += eff.missionPoint;
    if (eff.eventDouble) b.eventDouble = true;
    if (eff.cardSlot) b.slots += eff.cardSlot;
    if (eff.unlock) b.unlocks.push(eff.unlock);
    if (eff.stockCrash) b.stockCrash += eff.stockCrash;
    if (eff.aiDigital) b.aiDigital += eff.aiDigital;
    if (eff.hoardBuyUp) Object.assign(b.hoardBuyUp, eff.hoardBuyUp);
    if (eff.hoardVol) Object.assign(b.hoardVol, eff.hoardVol);
    if (eff.hoardCrash) Object.assign(b.hoardCrash, eff.hoardCrash);
    if (eff.hoardCrashDeep) Object.assign(b.hoardCrashDeep, eff.hoardCrashDeep);
    if (eff.perShop) applyPerShop(b, eff);
    if (eff.perCar) { b.perCarAp += eff.perCar.ap; b.perCarCap = Math.min(b.perCarCap, eff.perCar.cap || 5); }
    if (eff.semiAp) { b.semiAp += eff.semiAp.ap; b.semiApCap = Math.min(b.semiApCap, eff.semiAp.cap || 5); }
  }

  /* 解析一张已装备卡牌的 eff（permanent / functional，占槽） */
  function applyCard(b, card) {
    if (!card || !card.eff) return;
    const e = card.eff;
    (e.perm || []).forEach((x) => {
      if (x.scope && x.scope.indexOf('cat:') === 0) addCat(b, x.scope.slice(4), x.pct);
      else addScene(b, x.scope, x.pct);
    });
    if (e.permAp) b.dailyAp += e.permAp;
    if (e.permMaxAp) b.maxAp += e.permMaxAp;
    if (e.permSlot) b.slots += e.permSlot;
    if (e.permStockOps) b.stockOps += e.permStockOps;
    if (e.permStockCap) b.stockCap *= e.permStockCap;
    if (e.permBatchAp) b.batchAp += e.permBatchAp;
    if (e.permDrainPct) b.drainPct += e.permDrainPct;
    if (e.permTaxPct) b.taxPct += e.permTaxPct;
    if (e.permApFull) b.apFull = true;
    if (e.permApCost1) b.apCost1 = true;
    if (e.permDailyInfl) b.dailyInfl += e.permDailyInfl;
    if (e.permAuction) b.auction = true;
    if (e.permSpendMult) b.spendMult *= (1 + e.permSpendMult);
    if (e.permSpendEcho) b.echoRandom = e.permSpendEcho;
    if (e.permPointMul) b.pointMul *= (1 + e.permPointMul);
    if (e.stockCrash) b.stockCrash += e.stockCrash;
    if (e.stockForceDown) b.stockForceDown += e.stockForceDown;
    if (e.aiDigital) b.aiDigital += e.aiDigital;
    if (e.hoardBuyUp) Object.assign(b.hoardBuyUp, e.hoardBuyUp);
    if (e.hoardVol) Object.assign(b.hoardVol, e.hoardVol);
    if (e.hoardCrash) Object.assign(b.hoardCrash, e.hoardCrash);
    if (e.hoardCrashDeep) Object.assign(b.hoardCrashDeep, e.hoardCrashDeep);
    if (e.artUpkeep) b.artUpkeep += e.artUpkeep;
    if (e.investSeat) b.investSeat += e.investSeat;
    if (e.perShop) applyPerShop(b, e);
  }

  /* 条件核心效果（特定红卡 / 流派联动） */
  function specialBonus(S, b) {
    // AI 联动：同时持有 AI 股 + 投资了名称含 AI 的公司
    let aiActive = false;
    if (S.holdings && S.holdings.some((h) => RR.isAiStock(h.stockId))) {
      const aiCo = (S.companies || []).some((c) => /AI|智算|脑机|自动|量子/.test(c.name));
      if (aiCo) aiActive = true;
    }
    if (aiActive && b.aiDigital) addCat(b, 'digital', b.aiDigital);
    const ids = (S.equipped || []).concat(S.permanent || []);
    if (aiActive && ids.indexOf('r_memory') >= 0) {
      addCat(b, 'digital', 2.0);
      addScene(b, 'mall', 0.5);
    }
  }

  /* 主聚合：词条 + 装备卡牌（permanent/functional）+ 限时 buff */
  RR.bonuses = function (S) {
    const b = blank();
    (S.traits || []).forEach((t) => applyTrait(b, t.eff));
    (S.equipped || []).forEach((cid) => applyCard(b, RR.CARD_MAP[cid]));
    (S.permanent || []).forEach((cid) => applyCard(b, RR.CARD_MAP[cid]));

    (S.buffs || []).forEach((bf) => {
      if (bf.kind === 'spend') {
        if (bf.scope.indexOf('cat:') === 0) addCat(b, bf.scope.slice(4), bf.pct);
        else addScene(b, bf.scope, bf.pct);
      } else if (bf.kind === 'ap') {
        b.dailyAp += bf.ap;
      }
    });

    if (b.dailyInfl > 0) {
      const acc = b.dailyInfl * Math.max(0, S.day - 1);
      addScene(b, 'all', acc);
    }
    if (b.perShopPct) {
      const shopCount = RR.countCat(S, 'shop');
      addScene(b, 'all', Math.min(b.perShopPctCap, b.perShopPct * shopCount));
    }
    specialBonus(S, b);
    return b;
  };

  /* 某场景 / 品类的消费加成倍率 */
  RR.spendMultFor = function (b, scene, cat) {
    let m = 1;
    m += b.scenePct.all || 0;
    m += b.scenePct[scene] || 0;
    if (cat) m += b.catPct[cat] || 0;
    return Math.max(0.1, m);
  };

  /* 场景行动点消耗 */
  RR.apCostFor = function (S, b, scene, extra) {
    const base = (RR.getScene(scene) || { ap: 1 }).ap;
    if (b.apCost1) return 1;
    let ap = base + (extra || 0);
    ap += b.sceneAp[scene] || 0;
    ap += b.sceneAp.all || 0;
    return Math.max(1, ap);
  };

  /* 每日行动点上限 */
  RR.maxApOf = function (S, b) {
    let n = (S.baseAp || 10) + b.dailyAp + b.maxAp;
    if (b.perShopAp) n += Math.min(b.perShopApCap, b.perShopAp * RR.countCat(S, 'shop'));
    if (b.perCarAp) n += Math.min(b.perCarCap, b.perCarAp * RR.countTag(S, 'car'));
    if (b.investApPerCompany) n += b.investApPerCompany * S.companies.filter((c) => c.alive).length;
    if (b.semiAp) {
      const semi = (S.equipped || []).filter((cid) => {
        const c = RR.CARD_MAP[cid];
        return c && (c.eff.timed || c.eff.perm || c.eff.timedAp);
      }).length;
      n += Math.min(b.semiApCap, b.semiAp * semi);
    }
    return Math.max(1, Math.round(n));
  };

  RR.countCat = function (S, cat) { return (S.catCount && S.catCount[cat]) || 0; };
  RR.countTag = function (S, tag) { return (S.tagCount && S.tagCount[tag]) || 0; };

  /* ---------------- 卡牌使用 ----------------
   * instant / buff：不占槽，立即生效并消耗。
   * permanent / functional：走装备流程（占槽），见 equipCard。
   */
  RR.useCard = function (S, cardId) {
    const c = RR.CARD_MAP[cardId];
    if (!c) return null;
    if (RR.isEquipType(c)) return { error: 'need-equip' };
    const b = RR.bonuses(S);
    const results = [];

    if (c.type === 'instant' || c.type === 'event') {
      let mult = b.spendMult;
      let spent = 0;
      if (c.eff.spend) spent = Math.round(c.eff.spend * mult);
      if (c.eff.spendPct) spent += Math.round(S.asset * c.eff.spendPct * mult);
      if (spent > 0) {
        const real = Math.min(spent, S.asset);
        RR.spendRaw(S, real, 'card');
        results.push({ type: 'spend', amount: real });
      }
      if (c.eff.ap) { S.ap += c.eff.ap; results.push({ type: 'ap', amount: c.eff.ap }); }
      if (c.eff.points) {
        const p = Math.round(c.eff.points * (1 + b.pointGain));
        S.points += p; results.push({ type: 'points', amount: p });
      }
      // 刷新流：花积分抽卡
      if (c.eff.draw) {
        const n = c.eff.draw;
        let cost = c.eff.costPoints || 0;
        cost = Math.round(cost * (1 + b.pointGain));
        if (cost > 0) {
          if (S.points < cost) return { error: 'points', need: cost };
          S.points -= cost;
        }
        for (let i = 0; i < n; i++) {
          const r = RR.rollRarity(0.4);
          const c2 = RR.rollCard(r);
          S.bag.push(c2.id); S.seenCards[c2.id] = 1;
          results.push({ type: 'draw', name: c2.name });
        }
      }
      // 超级稀有：复制背包中一张卡
      if (c.eff.copyCard) {
        const pool = S.bag.filter((id) => RR.CARD_MAP[id] && !RR.isEquipType(RR.CARD_MAP[id]));
        if (pool.length) {
          const src = U.pick(pool);
          S.bag.push(src); S.seenCards[src] = 1;
          results.push({ type: 'copy', name: RR.CARD_MAP[src].name });
        }
      }
      if (c.eff.dailySpend) {
        S.dailySpends.push({ amount: c.eff.dailySpend.amount, daysLeft: c.eff.dailySpend.days, name: c.name });
        results.push({ type: 'dailySpend', amount: c.eff.dailySpend.amount, days: c.eff.dailySpend.days });
      }
      // 极少数字卡（如「万物皆可拍卖」）附带永久解锁效果：入 permanent，不占槽
      const permKeys = ['permAuction'];
      if (permKeys.some((k) => c.eff[k])) {
        S.permanent.push(cardId);
        results.push({ type: 'permanent', name: c.name });
      }
    } else if (c.type === 'buff') {
      (c.eff.timed || []).forEach((t) => {
        S.buffs.push({ id: c.id, name: c.name, kind: 'spend', scope: t.scope, pct: t.pct, daysLeft: t.days });
        results.push({ type: 'buff', name: c.name, scope: t.scope, pct: t.pct, days: t.days });
      });
      (c.eff.timedAp || []).forEach((t) => {
        S.buffs.push({ id: c.id, name: c.name, kind: 'ap', scope: 'all', ap: t.ap, daysLeft: t.days });
        results.push({ type: 'buff', name: c.name, ap: t.ap, days: t.days });
      });
      if (c.eff.timedPerJet) {
        const n = RR.countTag(S, 'jet') * c.eff.timedPerJet.ap;
        if (n > 0) S.buffs.push({ id: c.id, name: c.name + '（机队）', kind: 'ap', scope: 'all', ap: n, daysLeft: c.eff.timedPerJet.days });
      }
      if (c.eff.timedPerCar) {
        const n = RR.countTag(S, 'car') * c.eff.timedPerCar.ap;
        if (n > 0) S.buffs.push({ id: c.id, name: c.name + '（车队）', kind: 'ap', scope: 'all', ap: n, daysLeft: c.eff.timedPerCar.days });
      }
    }

    S.stats.cardsUsed++;
    RR.log(S, '使用卡牌【' + c.name + '】');
    return results;
  };

  /* 佩戴 / 卸下（permanent / functional 占槽） */
  RR.equipCard = function (S, cardId) {
    const c = RR.CARD_MAP[cardId];
    if (!c) return { ok: false, msg: '没有这张卡' };
    if (!RR.isEquipType(c)) return { ok: false, msg: '这张卡直接「使用」即可' };
    const b = RR.bonuses(S);
    const slots = RR.slotCount(S, b);
    // 带「增加卡槽」效果的卡自身不占槽：只用 non-slot 卡计入已用卡槽
    if (RR.usedSlots(S) >= slots) return { ok: false, msg: '卡槽已满（' + slots + '）' };
    const i = S.bag.indexOf(cardId);
    if (i < 0) return { ok: false, msg: '背包中没有这张卡' };
    S.bag.splice(i, 1);
    S.equipped.push(cardId);
    // 投资席位类卡：装备时把席位计入 S.bonusSlots（doInvest / canInvest 共用）
    if (c.eff && c.eff.investSeat) S.bonusSlots = (S.bonusSlots || 0) + c.eff.investSeat;
    return { ok: true };
  };
  RR.unequipCard = function (S, cardId) {
    const i = S.equipped.indexOf(cardId);
    if (i < 0) return { ok: false };
    const c = RR.CARD_MAP[cardId];
    S.equipped.splice(i, 1);
    S.bag.push(cardId);
    S.buffs = S.buffs.filter((bf) => bf.id !== cardId);
    if (c && c.eff && c.eff.investSeat) S.bonusSlots = Math.max(0, (S.bonusSlots || 0) - c.eff.investSeat);
    return { ok: true };
  };
  RR.slotCount = function (S, b) {
    const bb = b || RR.bonuses(S);
    // 总卡槽 = 基础 + 词条/卡牌增加的卡槽(bb.slots) + 事件投资席位(bonusSlots)
    return Math.max(0, (S.baseSlots || 3) + bb.slots + (S.bonusSlots || 0));
  };
  // 已占用卡槽：排除「增加卡槽」类卡（它们不占槽）
  RR.usedSlots = function (S) {
    return (S.equipped || []).filter((cid) => {
      const c = RR.CARD_MAP[cid];
      return !(c && c.eff && c.eff.permSlot);
    }).length;
  };

  /* 回收成积分 */
  RR.recycleCard = function (S, cardId) {
    const c = RR.CARD_MAP[cardId];
    if (!c) return 0;
    const b = RR.bonuses(S);
    const p = Math.round(RR.RARITY[c.r].recycle * (1 + b.pointGain));
    S.points += p;
    S.stats.recycled++;
    return p;
  };

  /* ---------------- 花钱的底层入口 ---------------- */
  RR.spendRaw = function (S, amount, scene) {
    amount = Math.round(amount);
    if (amount <= 0) return 0;
    const real = Math.min(amount, S.asset);
    S.asset -= real;
    S.stats.totalSpent += real;
    S.stats.daySpend += real;
    S.stats.byScene[scene] = (S.stats.byScene[scene] || 0) + real;
    if (real > S.stats.maxOnce) S.stats.maxOnce = real;
    if (S.stats.daySpend > S.stats.maxDaySpend) S.stats.maxDaySpend = S.stats.daySpend;
    return real;
  };

  RR.gainRaw = function (S, amount, reason) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    S.asset += amount;
    if (reason === 'stock') S.stats.stockGain += amount;
  };

  /* 流派叠加汇总（用于「增益总览」展示） */
  RR.schoolSummary = function (S, b) {
    const schools = {};
    const add = (sc, label, pct) => {
      if (!sc) return;
      schools[sc] = schools[sc] || { name: RR.SCHOOL_NAME[sc] || sc, items: [] };
      schools[sc].items.push(label + ' +' + Math.round(pct * 100) + '%');
    };
    Object.keys(b.scenePct).forEach((k) => add(RR.sceneSchool(k), RR.sceneName(k), b.scenePct[k]));
    Object.keys(b.catPct).forEach((k) => add(RR.catSchool(k), RR.CATEGORIES[k] ? RR.CATEGORIES[k].name : k, b.catPct[k]));
    return schools;
  };
  RR.SCHOOL_NAME = {
    digital: '数码暴涨流', stock: '股市崩盘流', ap: '高行动流', point: '高积分流',
    estate: '囤房流', lux: '奢靡流', car: '车流', general: '通用',
    mall: '商场流', import: '进口流',
    refresh: '刷新流', commodity: '囤物流', art: '艺术流', team: '球队流', invest: '投资流',
  };
  RR.sceneSchool = (scene) => {
    const m = { mall: 'mall', car: 'car', realestate: 'estate', estate: 'estate', commodity: 'commodity', art: 'art', team: 'team', import: 'import', invest: 'invest', stock: 'stock', all: 'general' };
    return m[scene];
  };
  RR.sceneName = (scene) => {
    if (scene === 'all') return '全场景';
    const s = RR.getScene(scene);
    return s ? s.name : scene;
  };
  RR.catSchool = (cat) => {
    const m = {
      digital: 'digital', appliance: 'digital', streetwear: 'lux', luxury: 'lux', jewelry: 'lux',
      car: 'car', hypercar: 'car', house: 'estate', villa: 'estate', shop: 'estate', office: 'estate',
      yacht: 'car', jet: 'car', food: 'general', daily: 'general', virtual: 'point',
      gpu: 'commodity', memory: 'commodity', gold: 'commodity', oil: 'commodity',
      art: 'art', player: 'team',
    };
    return m[cat] || 'general';
  };
})(window.RR);
