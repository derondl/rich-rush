/* 挑战任务（进度类）与称号（收集类）
 * 挑战任务达成 → 三选一抽卡；称号达成 → 积分 / 卡槽 / 卡牌奖励
 * check(S) 返回布尔；progress(S) 返回 [当前, 目标] 用于显示进度条
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  const U = RR.util;

  /* ---------- 挑战任务：达成后三选一抽卡 ----------
   * 已精简：数量更少、阈值更高、奖励更稀有（luck 越高出高级卡概率越大）。
   */
  RR.MISSIONS = [
    { id: 'ms_spend_100m', name: '一亿只是开始', desc: '累计消费 $100,000,000', luck: 0.4,
      p: (S) => [S.stats.totalSpent, 1e8] },
    { id: 'ms_spend_10b', name: '十亿俱乐部', desc: '累计消费 $10,000,000,000', luck: 0.9,
      p: (S) => [S.stats.totalSpent, 1e10] },
    { id: 'ms_spend_1t', name: '万亿挥霍者', desc: '累计消费 $1,000,000,000,000', luck: 1.6,
      p: (S) => [S.stats.totalSpent, 1e12] },
    { id: 'ms_spend_10t', name: '国家的 GDP', desc: '累计消费 $10,000,000,000,000', luck: 2.4,
      p: (S) => [S.stats.totalSpent, 1e13] },

    { id: 'ms_mall_5b', name: '商场是我开的', desc: '商场累计消费 $5,000,000,000', luck: 1.2,
      p: (S) => [S.stats.byScene.mall || 0, 5e9] },
    { id: 'ms_car_5b', name: '移动车展', desc: '4S 店累计消费 $5,000,000,000', luck: 1.2,
      p: (S) => [S.stats.byScene.car || 0, 5e9] },
    { id: 'ms_re_100b', name: '城市规划局', desc: '房产累计消费 $100,000,000,000', luck: 1.6,
      p: (S) => [S.stats.byScene.estate || 0, 1e11] },
    { id: 'ms_imp_10b', name: '关税贡献者', desc: '进口商累计消费 $10,000,000,000', luck: 1.2,
      p: (S) => [S.stats.byScene.import || 0, 1e10] },

    { id: 'ms_stock_loss_50b', name: '天台的风有点大', desc: '股市累计亏损 $50,000,000,000', luck: 1.5,
      p: (S) => [S.stats.stockLoss, 5e10] },
    { id: 'ms_invest_dead_10', name: '行业冥灯', desc: '累计 10 家投资公司倒闭', luck: 1.5,
      p: (S) => [S.stats.companyDead, 10] },

    { id: 'ms_once_5b', name: '一掷千金', desc: '单笔消费超过 $5,000,000,000', luck: 1.2,
      p: (S) => [S.stats.maxOnce, 5e9] },
    { id: 'ms_10pct', name: '只剩一成', desc: '资产降到初始值的 10% 以下', luck: 1.8,
      p: (S) => [S.initAsset - S.asset, S.initAsset * 0.9] },
  ];

  /* ---------- 称号：收集类，达成给奖励 ---------- */
  const cnt = (S, tag) => (S.tagCount && S.tagCount[tag]) || 0;
  const catCnt = (S, cat) => (S.catCount && S.catCount[cat]) || 0;

  RR.TITLES = [
    { id: 't_sneaker_1', name: '球鞋男孩', desc: '拥有 20 双球鞋', reward: { points: 500 },
      p: (S) => [cnt(S, 'sneaker'), 20] },
    { id: 't_sneaker_2', name: '球鞋教父', desc: '拥有 100 双球鞋', reward: { points: 2000 },
      p: (S) => [cnt(S, 'sneaker'), 100] },
    { id: 't_digital_1', name: '电子发烧友', desc: '拥有 15 件数码产品', reward: { points: 800 },
      p: (S) => [catCnt(S, 'digital'), 15] },
    { id: 't_digital_2', name: '数码仓库', desc: '拥有 100 件数码产品', reward: { points: 3000 },
      p: (S) => [catCnt(S, 'digital'), 100] },
    { id: 't_car_1', name: '车库管理员', desc: '拥有 10 辆汽车', reward: { points: 1000 },
      p: (S) => [catCnt(S, 'car'), 10] },
    { id: 't_car_2', name: '车海战术', desc: '拥有 100 辆汽车', reward: { points: 4000 },
      p: (S) => [catCnt(S, 'car'), 100] },
    { id: 't_hyper_1', name: '超跑收藏家', desc: '拥有 10 辆顶级超跑', reward: { points: 2500 },
      p: (S) => [catCnt(S, 'hypercar'), 10] },
    { id: 't_house_1', name: '住宅收藏家', desc: '拥有 20 套住宅', reward: { points: 1800 },
      p: (S) => [catCnt(S, 'house'), 20] },
    { id: 't_house_2', name: '全球地主', desc: '拥有 50 套住宅', reward: { points: 4000 },
      p: (S) => [catCnt(S, 'house'), 50] },
    { id: 't_villa_1', name: '别墅爱好者', desc: '拥有 5 套别墅 / 庄园', reward: { points: 2000 },
      p: (S) => [catCnt(S, 'villa'), 5] },
    { id: 't_shop_1', name: '包租公', desc: '拥有 20 个商铺', reward: { points: 1500 },
      p: (S) => [catCnt(S, 'shop'), 20] },
    { id: 't_office_1', name: '商业帝国', desc: '拥有 10 套写字楼', reward: { points: 3000 },
      p: (S) => [catCnt(S, 'office'), 10] },
    { id: 't_yacht_1', name: '海王', desc: '拥有 3 艘船 / 游艇', reward: { points: 2000 },
      p: (S) => [catCnt(S, 'yacht'), 3] },
    { id: 't_yacht_2', name: '舰队司令', desc: '拥有 10 艘船 / 游艇', reward: { points: 5000 },
      p: (S) => [catCnt(S, 'yacht'), 10] },
    { id: 't_jet_1', name: '空中飞人', desc: '拥有 5 架私人飞机', reward: { points: 3000 },
      p: (S) => [catCnt(S, 'jet'), 5] },
    { id: 't_jet_2', name: '冲上云霄', desc: '拥有 20 架私人飞机', reward: { points: 8000 },
      p: (S) => [catCnt(S, 'jet'), 20] },
    { id: 't_crazy', name: '壕无人性', desc: '同时拥有 5 套别墅 + 2 架私人飞机', reward: { points: 5000, slot: 1 },
      p: (S) => [Math.min(catCnt(S, 'villa') / 5, 1) * 2 + Math.min(catCnt(S, 'jet') / 2, 1) * 2, 4] },
    { id: 't_appliance_1', name: '家电狂魔', desc: '拥有 50 件家电', reward: { points: 1000 },
      p: (S) => [catCnt(S, 'appliance'), 50] },
    { id: 't_jewelry_1', name: '珠光宝气', desc: '拥有 20 件珠宝腕表', reward: { points: 2000 },
      p: (S) => [catCnt(S, 'jewelry'), 20] },
    { id: 't_street_1', name: '衣冠楚楚', desc: '拥有 50 件潮牌服饰', reward: { points: 1000 },
      p: (S) => [catCnt(S, 'streetwear'), 50] },
    { id: 't_lux_1', name: '奢靡至极', desc: '拥有 50 件奢侈品', reward: { points: 2500 },
      p: (S) => [catCnt(S, 'luxury'), 50] },
    { id: 't_food_1', name: '民以食为天', desc: '拥有 100 份吃喝消费品', reward: { points: 600 },
      p: (S) => [catCnt(S, 'food'), 100] },
    { id: 't_virtual_1', name: '氪金战士', desc: '拥有 50 件虚拟商品', reward: { points: 1200 },
      p: (S) => [catCnt(S, 'virtual'), 50] },
    { id: 't_invest_die', name: '破产投资家', desc: '累计 5 家投资公司倒闭', reward: { points: 2000 },
      p: (S) => [S.stats.companyDead, 5] },
    { id: 't_invest_hold', name: '天使投资人', desc: '同时持有 5 家公司', reward: { points: 2500 },
      p: (S) => [S.companies.filter((c) => c.alive).length, 5] },
    { id: 't_stock_1', name: '股市韭菜', desc: '股市累计亏损 $1,000,000,000', reward: { points: 1500 },
      p: (S) => [S.stats.stockLoss, 1e9] },
    { id: 't_stock_2', name: '天台常客', desc: '股市累计亏损 $100,000,000,000', reward: { points: 5000 },
      p: (S) => [S.stats.stockLoss, 1e11] },
    { id: 't_buy_500', name: '剁手党', desc: '累计完成 500 次购买', reward: { points: 1200 },
      p: (S) => [S.stats.purchases, 500] },
    { id: 't_all_scene', name: '雨露均沾', desc: '在全部 9 个场景都消费过', reward: { points: 1000 },
      p: (S) => [RR.SCENES.filter((s) => (S.stats.byScene[s.id] || 0) > 0).length, RR.SCENES.length] },
    { id: 't_card_30', name: '集卡爱好者', desc: '累计获得过 30 种不同卡牌', reward: { points: 2500 },
      p: (S) => [Object.keys(S.seenCards).length, 30] },
    { id: 't_card_60', name: '卡牌大师', desc: '累计获得过 60 种不同卡牌', reward: { points: 6000, slot: 1 },
      p: (S) => [Object.keys(S.seenCards).length, 60] },
    { id: 't_once_100m', name: '亿点点', desc: '单笔消费超过 $100,000,000', reward: { points: 1500 },
      p: (S) => [S.stats.maxOnce, 1e8] },
    { id: 't_ap_20', name: '时间管理大师', desc: '单日消耗 20 点行动点', reward: { points: 1200 },
      p: (S) => [S.stats.maxDayAp, 20] },
  ];
})(window.RR);
