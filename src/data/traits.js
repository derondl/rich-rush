/* 开局通用词条池：3 个角色固定词条之外，再抽 10 选 3
 * 这些是永久被动，不占用卡牌卡槽。
 * 每条带稀有度 r（white<green<blue<purple<gold<red）与流派 school。
 * 抽卡时按稀有度加权，越高越稀有，最高可出红色。
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  RR.TRAITS = [
    /* ---------- 白板（常见） ---------- */
    { id: 'tr_night', r: 'white', school: 'ap', name: '熬夜冠军', desc: '每日 +2 行动点。凌晨三点的购物车最诚实。', eff: { dailyAp: 2 } },
    { id: 'tr_coffee', r: 'white', school: 'ap', name: '咖啡依赖', desc: '每日 +1 行动点。', eff: { dailyAp: 1 } },
    { id: 'tr_collect', r: 'white', school: 'general', name: '收藏癖', desc: '全场景消费 +5%。', eff: { sceneSpend: [{ scene: 'all', pct: 0.05 }] } },
    { id: 'tr_compare', r: 'white', school: 'general', name: '比价失败', desc: '全场景消费 +8%。看了三家店，最后买了最贵的。', eff: { sceneSpend: [{ scene: 'all', pct: 0.08 }] } },
    { id: 'tr_waste', r: 'white', school: 'general', name: '挥霍无度', desc: '全场景消费 +6%。', eff: { sceneSpend: [{ scene: 'all', pct: 0.06 }] } },
    { id: 'tr_impulse', r: 'white', school: 'general', name: '冲动的惩罚', desc: '全场景消费 +10%。想买就买，不问价格。', eff: { sceneSpend: [{ scene: 'all', pct: 0.1 }] } },

    /* ---------- 绿色 ---------- */
    { id: 'tr_member', r: 'green', school: 'lux', name: '会员收集者', desc: '商场消费 +25%。', eff: { sceneSpend: [{ scene: 'mall', pct: 0.25 }] } },
    { id: 'tr_brand', r: 'green', school: 'lux', name: '品牌信徒', desc: '商场消费 +25%。', eff: { sceneSpend: [{ scene: 'mall', pct: 0.25 }] } },
    { id: 'tr_speed', r: 'green', school: 'car', name: '速度与激情', desc: '4S 店消费 +30%。', eff: { sceneSpend: [{ scene: 'car', pct: 0.3 }] } },
    { id: 'tr_house', r: 'green', school: 'estate', name: '有房才有家', desc: '房产市场消费 +30%。', eff: { sceneSpend: [{ scene: 'estate', pct: 0.3 }] } },
    { id: 'tr_toy', r: 'green', school: 'car', name: '大玩具爱好者', desc: '进口商消费 +30%。', eff: { sceneSpend: [{ scene: 'import', pct: 0.3 }] } },
    { id: 'tr_angel', r: 'green', school: 'stock', name: '天使投资人', desc: '投资公司单次投资额 +40%。', eff: { investAmount: 0.4 } },
    { id: 'tr_rookie', r: 'green', school: 'stock', name: '股市新手', desc: '股票每日操作次数 +2。', eff: { stockOps: 2 } },
    { id: 'tr_slip', r: 'green', school: 'ap', name: '手滑党', desc: '批量购买行动点消耗 -1。', eff: { batchAp: 1 } },
    { id: 'tr_digital', r: 'green', school: 'digital', name: '数码控', desc: '数码品类消费 +40%。', eff: { catSpend: [{ cat: 'digital', pct: 0.4 }] } },
    { id: 'tr_street', r: 'green', school: 'lux', name: '潮人', desc: '潮牌品类消费 +40%。', eff: { catSpend: [{ cat: 'streetwear', pct: 0.4 }] } },
    { id: 'tr_jewel', r: 'green', school: 'lux', name: '珠光宝气', desc: '珠宝腕表品类消费 +40%。', eff: { catSpend: [{ cat: 'jewelry', pct: 0.4 }] } },
    { id: 'tr_appl', r: 'green', school: 'digital', name: '家电狂', desc: '家电品类消费 +40%。', eff: { catSpend: [{ cat: 'appliance', pct: 0.4 }] } },
    { id: 'tr_lux', r: 'green', school: 'lux', name: '奢靡主义', desc: '奢侈品品类消费 +45%。', eff: { catSpend: [{ cat: 'luxury', pct: 0.45 }] } },
    { id: 'tr_urgent', r: 'green', school: 'ap', name: '时间紧迫', desc: '每日 +3 行动点，但全场景消费 +10%（急了就加价）。', eff: { dailyAp: 3, sceneSpend: [{ scene: 'all', pct: 0.1 }] } },
    { id: 'tr_bigshot', r: 'green', school: 'general', name: '大款做派', desc: '全场景消费 +12%，但每日 -1 行动点。', eff: { sceneSpend: [{ scene: 'all', pct: 0.12 }], dailyAp: -1 } },
    { id: 'tr_friends', r: 'green', school: 'general', name: '朋友多', desc: '随机事件触发概率 +30%。', eff: { eventRate: 0.3 } },
    { id: 'tr_point', r: 'green', school: 'point', name: '积分达人', desc: '积分获取 +50%。', eff: { pointGain: 0.5 } },
    { id: 'tr_social', r: 'green', school: 'point', name: '社交名媛', desc: '随机事件触发概率 +40%，积分获取 +30%。', eff: { eventRate: 0.4, pointGain: 0.3 } },

    /* ---------- 蓝色 ---------- */
    { id: 'tr_whale', r: 'blue', school: 'general', name: '鲸鱼体质', desc: '全场景消费 +15%。天生的大客户。', eff: { sceneSpend: [{ scene: 'all', pct: 0.15 }] } },
    { id: 'tr_machine', r: 'blue', school: 'ap', name: '人形印钞机', desc: '每日 +4 行动点。', eff: { dailyAp: 4 } },
    { id: 'tr_midas', r: 'blue', school: 'lux', name: '点金手指', desc: '商场 +35%、奢侈品品类 +30%。', eff: { sceneSpend: [{ scene: 'mall', pct: 0.35 }], catSpend: [{ cat: 'luxury', pct: 0.3 }] } },
    { id: 'tr_fleet', r: 'blue', school: 'car', name: '车队指挥官', desc: '4S 店 +40%、进口商 +35%。', eff: { sceneSpend: [{ scene: 'car', pct: 0.4 }, { scene: 'import', pct: 0.35 }] } },
    { id: 'tr_landlord', r: 'blue', school: 'estate', name: '包租帝王', desc: '房产市场 +45%、每持有 1 商铺全场景 +2%（上限 40%）。', eff: { sceneSpend: [{ scene: 'estate', pct: 0.45 }], perShop: { pct: 0.02, cap: 0.4 } } },
    { id: 'tr_bear', r: 'blue', school: 'stock', name: '做空之魂', desc: '股票每日操作 +4，且股市暴跌概率 +25%。', eff: { stockOps: 4, stockCrash: 0.25 } },
    { id: 'tr_otaku', r: 'blue', school: 'digital', name: '极客血脉', desc: '数码品类 +60%、家电 +40%。', eff: { catSpend: [{ cat: 'digital', pct: 0.6 }, { cat: 'appliance', pct: 0.4 }] } },
    { id: 'tr_magnate', r: 'blue', school: 'point', name: '积分大亨', desc: '积分获取 +120%，卡槽 +1。', eff: { pointGain: 1.2, cardSlot: 1 } },

    /* ---------- 紫色 ---------- */
    { id: 'tr_tycoon', r: 'purple', school: 'general', name: '首富之姿', desc: '全场景消费 +20%，每日 +3 行动点。', eff: { sceneSpend: [{ scene: 'all', pct: 0.2 }], dailyAp: 3 } },
    { id: 'tr_overlord', r: 'purple', school: 'ap', name: '时间领主', desc: '每日 +8 行动点，行动点上限 +5。', eff: { dailyAp: 8, maxAp: 5 } },
    { id: 'tr_monopoly', r: 'purple', school: 'lux', name: '垄断资本家', desc: '商场 +50%、潮牌/奢侈品/珠宝各 +40%、卡槽 +1。', eff: { sceneSpend: [{ scene: 'mall', pct: 0.5 }], catSpend: [{ cat: 'streetwear', pct: 0.4 }, { cat: 'luxury', pct: 0.4 }, { cat: 'jewelry', pct: 0.4 }], cardSlot: 1 } },
    { id: 'tr_ai_king', r: 'purple', school: 'digital', name: 'AI 教父', desc: '数码品类 +80%，且投资/持股 AI 时数码再 +50%（叠加核心红卡更猛）。', eff: { catSpend: [{ cat: 'digital', pct: 0.8 }], aiDigital: 0.5 } },

    /* ---------- 金色 ---------- */
    { id: 'tr_legend', r: 'gold', school: 'general', name: '传说级挥霍', desc: '全场景消费 +35%，每日 +6 行动点，卡槽 +1。', eff: { sceneSpend: [{ scene: 'all', pct: 0.35 }], dailyAp: 6, cardSlot: 1 } },
    { id: 'tr_void', r: 'gold', school: 'ap', name: '虚空吞噬者', desc: '每日 +12 行动点，行动点上限 +10。', eff: { dailyAp: 12, maxAp: 10 } },

    /* ---------- 红色（极稀有） ---------- */
    { id: 'tr_reality', r: 'red', school: 'general', name: ' reality 扭曲者', desc: '全场景消费 +60%，但每日资产自动 -2%。越花越上瘾。', eff: { sceneSpend: [{ scene: 'all', pct: 0.6 }], drainPct: 0.02 } },
  ];

  /* 词条稀有度权重（越高越稀有） */
  RR.TRAIT_WEIGHT = {
    white: 100, green: 46, blue: 18, purple: 6, gold: 1.8, red: 0.5,
  };

  /* 按稀有度加权抽 n 张不重复词条 */
  RR.rollTraits = function (n, forced) {
    const U = RR.util;
    const pool = RR.TRAITS.slice();
    const out = [];
    const used = new Set();
    (forced || []).forEach((id) => {
      const t = RR.TRAITS.find((x) => x.id === id);
      if (t) { out.push(t.id); used.add(t.id); }
    });
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const t = U.weightedPick(pool, (x) => (used.has(x.id) ? 0 : (RR.TRAIT_WEIGHT[x.r] || 10)));
      if (!t || used.has(t.id)) continue;
      out.push(t.id);
      used.add(t.id);
    }
    return out;
  };
})(window.RR);
