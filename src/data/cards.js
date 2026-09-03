/* 卡牌（词条）库
 * 稀有度：white 白板 < green 绿 < blue 蓝 < purple 紫 < gold 金 < red 红
 *
 * 六大类型（清晰区分是否占槽）：
 *   instant    一次性消费  —— 不占槽，点「使用」立即生效（花钱/行动点/积分/抽卡/复制）
 *   event      事件卡      —— 不占槽，点「使用」立即生效（一次性大额消费，主题化）
 *   buff       短期增益    —— 不占槽，点「使用」进增益列表（限时）
 *   permanent  流派主卡    —— 占槽，需装备，永久生效
 *   functional 稀有功能卡  —— 占槽，需装备，提供卡槽/行动点/股票/积分/投资席位
 *
 * 流派 school（15）：
 *   digital 数码暴涨流 / stock 股市崩盘流 / ap 高行动流 / point 高积分流 / refresh 刷新流
 *   estate 囤房流 / commodity 囤物流 / art 艺术流 / team 球队流 / invest 投资流
 *   lux 奢靡流 / car 车流 / mall 商场流 / import 进口流 / general 通用
 * 同类卡效果叠加（如多张数码卡把数码品类越堆越贵），配合核心红卡可组成完整流派。
 *
 * eff 字段（由 cardfx 解析）：
 *   [一次性] spend / spendPct / ap / points / dailySpend / draw(抽N张卡) / costPoints(耗积分) / copyCard(复制背包1张)
 *   [短期]   timed[{scope,pct,days}] / timedAp[{ap,days}] / timedPerJet / timedPerCar
 *   [永久]   perm[{scope,pct}] / permAp / permMaxAp / permSlot / permStockOps / permStockCap /
 *            permBatchAp / permDrainPct / permTaxPct / permApFull / permApCost1 / permDailyInfl /
 *            permAuction / permSpendMult / permSpendEcho / permPointMul / stockCrash / stockForceDown /
 *            artUpkeep(艺术品养护倍率) / investSeat(投资席位) /
 *            hoardBuyUp / hoardVol / hoardCrash / hoardCrashDeep（囤积类：按 kind 提高买入价/波动/暴跌）
 *   [流派]   aiDigital（持有AI股+投资AI公司时，数码品类额外溢价）
 *   [特殊]   unlocks（解锁限定商品）
 * scope: 'all' | 场景 id | 'cat:品类id'
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';
  const U = RR.util;

  RR.RARITY = {
    white: { key: 'white', name: '白板', color: '#8b949e', bg: '#f3f5f7', weight: 100, recycle: 30 },
    green: { key: 'green', name: '绿色', color: '#2f9e5f', bg: '#e8f6ee', weight: 62, recycle: 90 },
    blue: { key: 'blue', name: '蓝色', color: '#2f6fd0', bg: '#e8f0fc', weight: 34, recycle: 260 },
    purple: { key: 'purple', name: '紫色', color: '#8b45d6', bg: '#f2e9fb', weight: 15, recycle: 700 },
    gold: { key: 'gold', name: '金色', color: '#c98a12', bg: '#fdf3dc', weight: 5.5, recycle: 1900 },
    red: { key: 'red', name: '红色', color: '#d13b3b', bg: '#fdeaea', weight: 1.6, recycle: 5200 },
  };
  RR.RARITY_ORDER = ['white', 'green', 'blue', 'purple', 'gold', 'red'];

  RR.CARD_TYPE_NAME = {
    instant: '一次性消费', event: '事件卡', buff: '短期增益', permanent: '流派主卡', functional: '稀有功能卡',
  };
  RR.isEquipType = (c) => c.type === 'permanent' || c.type === 'functional';

  /* 刷新流：用积分直接刷新抽 1 张卡（偏向「一次性消费」类，花完即消失、可再抽） */
  RR.refreshCost = 120;
  RR.rollConsumeCard = function (luck) {
    const pool = RR.CARDS.filter((c) => !RR.isEquipType(c));
    const r = RR.rollRarity(luck || 0.3);
    let sub = pool.filter((c) => c.r === r);
    if (!sub.length) sub = pool;
    return U.pick(sub);
  };
  RR.refreshDraw = function (S) {
    if (S.points < RR.refreshCost) return { ok: false, msg: '积分不足（需 ◆' + RR.refreshCost + '）' };
    S.points -= RR.refreshCost;
    const c = RR.rollConsumeCard(0.5);
    S.bag.push(c.id);
    S.seenCards[c.id] = 1;
    return { ok: true, card: c };
  };

  RR.CARDS = [
    /* ================= 白板 · 一次性消费（不占槽，花完即消失） ================= */
    { id: 'w01', r: 'white', type: 'instant', school: 'general', name: '便利店关东煮', desc: '深夜的慰藉。花掉 $8，换来 +1 行动点。', eff: { spend: 8, ap: 1 } },
    { id: 'w02', r: 'white', type: 'instant', school: 'general', name: '忘了取消自动续费', desc: '你甚至不记得订阅过什么。$299 没了。', eff: { spend: 299 } },
    { id: 'w03', r: 'white', type: 'instant', school: 'ap', name: '外卖凑满减', desc: '为了省 5 块配送费，多花了 35 块。+2 行动点。', eff: { spend: 35, ap: 2 } },
    { id: 'w04', r: 'white', type: 'instant', school: 'ap', name: '共享单车月卡', desc: '骑了两次。$30，+1 行动点。', eff: { spend: 30, ap: 1 } },
    { id: 'w05', r: 'white', type: 'instant', school: 'general', name: '直播间的那只手', desc: '"家人们，上车！"你的手比脑子快。$1,999。', eff: { spend: 1999 } },
    { id: 'w06', r: 'white', type: 'instant', school: 'ap', name: '朋友圈点赞之交', desc: '社交资本也是资本。+2 行动点。', eff: { ap: 2 } },
    { id: 'w07', r: 'white', type: 'instant', school: 'ap', name: '深夜代驾', desc: '车要有人开回家。+1 行动点。', eff: { ap: 1 } },
    { id: 'w08', r: 'white', type: 'instant', school: 'general', name: '二手平台捡漏', desc: '说是九成新，到手是九成旧。$666。', eff: { spend: 666 } },
    { id: 'w09', r: 'white', type: 'instant', school: 'general', name: '自动续费陷阱', desc: '$99 起扣，接下来 7 天每天再扣 $99。', eff: { dailySpend: { amount: 99, days: 7 } } },
    { id: 'w10', r: 'white', type: 'instant', school: 'general', name: '雨天打车溢价', desc: '下雨天，溢价 2.8 倍。$88。', eff: { spend: 88 } },
    { id: 'w11', r: 'white', type: 'instant', school: 'ap', name: '早餐加个蛋', desc: '$3 的蛋白质，撑起一整个上午。+1 行动点。', eff: { spend: 3, ap: 1 } },
    { id: 'w12', r: 'white', type: 'instant', school: 'general', name: '表情包打赏', desc: '作者说要恰饭。$6。', eff: { spend: 6 } },
    { id: 'w13', r: 'white', type: 'instant', school: 'general', name: '会员日凑单', desc: '满 500 减 50，于是你买了 520。', eff: { spend: 520 } },
    { id: 'w14', r: 'white', type: 'instant', school: 'general', name: '快递丢了', desc: '商家说补发，但你已经下单了第二个。$150。', eff: { spend: 150 } },
    { id: 'w15', r: 'white', type: 'instant', school: 'general', name: '朋友结婚随礼', desc: '人到不了，钱得到。$2,000。', eff: { spend: 2000 } },
    { id: 'w16', r: 'white', type: 'instant', school: 'general', name: '洗车打蜡', desc: '明天就下雨。$180。', eff: { spend: 180 } },
    { id: 'w17', r: 'white', type: 'instant', school: 'general', name: '宠物看病', desc: '它只是打了个喷嚏。$3,500。', eff: { spend: 3500 } },
    { id: 'w18', r: 'white', type: 'instant', school: 'ap', name: '手机碎屏险', desc: '买完才发现不含人工费。$199，+1 行动点。', eff: { spend: 199, ap: 1 } },

    /* ================= 绿色 ================= */
    { id: 'g01', r: 'green', type: 'instant', school: 'general', name: '打车只坐专车', desc: '舒适型？不，商务型起步。$2,000，+2 行动点。', eff: { spend: 2000, ap: 2 } },
    { id: 'g02', r: 'green', type: 'instant', school: 'general', name: '米其林一星打卡', desc: '拍照两小时，吃饭二十分钟。$8,800。', eff: { spend: 8800 } },
    { id: 'g03', r: 'green', type: 'instant', school: 'ap', name: '咖啡因续命', desc: '第四杯了。+4 行动点。', eff: { ap: 4 } },
    { id: 'g04', r: 'green', type: 'instant', school: 'lux', name: '盲盒手办墙', desc: '为了凑齐隐藏款，你买了整整一墙。$15,000。', eff: { spend: 15000 } },
    { id: 'g07', r: 'green', type: 'instant', school: 'ap', name: '说走就走的头等舱', desc: '目的地随机，先买了再说。$12,000，+3 行动点。', eff: { spend: 12000, ap: 3 } },
    { id: 'g08', r: 'green', type: 'instant', school: 'general', name: '直播间榜一大哥', desc: '"谢谢大哥的火箭！"×20。$60,000。', eff: { spend: 60000 } },
    { id: 'g10', r: 'green', type: 'instant', school: 'car', name: '米其林轮胎四件套', desc: '车比鞋费鞋。$25,000。', eff: { spend: 25000 } },
    { id: 'g11', r: 'green', type: 'instant', school: 'ap', name: '全屋保洁年卡', desc: '每周来两次，你终于有了干净的罪恶感。$18,000，+2 行动点。', eff: { spend: 18000, ap: 2 } },
    { id: 'g12', r: 'green', type: 'instant', school: 'general', name: '高尔夫球场会员', desc: '杆没买，会籍先办。$80,000。', eff: { spend: 80000 } },
    { id: 'g18', r: 'green', type: 'instant', school: 'ap', name: '家政阿姨包年', desc: '她比你更熟悉你的房子。$45,000，+3 行动点。', eff: { spend: 45000, ap: 3 } },

    { id: 'g_b1', r: 'green', type: 'buff', school: 'lux', name: '商场促销周', desc: '3 天内商场消费 +10%（不占槽）。', eff: { timed: [{ scope: 'mall', pct: 0.1, days: 3 }] } },
    { id: 'g_b2', r: 'green', type: 'buff', school: 'car', name: '汽车嘉年华', desc: '3 天内 4S 店消费 +12%（不占槽）。', eff: { timed: [{ scope: 'car', pct: 0.12, days: 3 }] } },
    { id: 'g_b3', r: 'green', type: 'buff', school: 'estate', name: '楼市特惠', desc: '3 天内房产市场买入 +12%（不占槽）。', eff: { timed: [{ scope: 'estate', pct: 0.12, days: 3 }] } },
    { id: 'g_b4', r: 'green', type: 'buff', school: 'digital', name: '数码以旧换新', desc: '5 天数码品类 +15%（不占槽）。', eff: { timed: [{ scope: 'cat:digital', pct: 0.15, days: 5 }] } },
    { id: 'g_b5', r: 'green', type: 'buff', school: 'lux', name: '潮牌快闪', desc: '4 天潮牌品类 +15%（不占槽）。', eff: { timed: [{ scope: 'cat:streetwear', pct: 0.15, days: 4 }] } },
    { id: 'g_b6', r: 'green', type: 'buff', school: 'ap', name: '咖啡续命水', desc: '2 天内每天 +3 行动点（不占槽）。', eff: { timedAp: [{ ap: 3, days: 2 }] } },
    { id: 'g_b7', r: 'green', type: 'buff', school: 'ap', name: '黄牛代排队', desc: '1 天内每天 +4 行动点（不占槽）。', eff: { timedAp: [{ ap: 4, days: 1 }] } },
    { id: 'g_b8', r: 'green', type: 'buff', school: 'general', name: '限时秒杀', desc: '2 天内全场景 +8%（不占槽）。', eff: { timed: [{ scope: 'all', pct: 0.08, days: 2 }] } },

    /* ================= 蓝色 ================= */
    { id: 'b_i1', r: 'blue', type: 'instant', school: 'lux', name: '商场如战场', desc: '先砸 $200,000 立威；3 天内商场消费 +20%。', eff: { spend: 200000, timed: [{ scope: 'mall', pct: 0.2, days: 3 }] } },
    { id: 'b_i2', r: 'blue', type: 'instant', school: 'lux', name: '球鞋开箱日', desc: '$80,000 买齐一整墙；7 天内潮牌 +25%。', eff: { spend: 80000, timed: [{ scope: 'cat:streetwear', pct: 0.25, days: 7 }] } },
    { id: 'b_i3', r: 'blue', type: 'instant', school: 'car', name: '车展限定款', desc: '$500,000 拿下展台那台；3 天内 4S 店 +30%。', eff: { spend: 500000, timed: [{ scope: 'car', pct: 0.3, days: 3 }] } },
    { id: 'b_i7', r: 'blue', type: 'instant', school: 'general', name: '抄底大礼包', desc: '$1,000,000 打包带走，还附赠 +5 行动点。', eff: { spend: 1000000, ap: 5 } },
    { id: 'b_i11', r: 'blue', type: 'instant', school: 'ap', name: '米其林三星私宴', desc: '主厨出来敬了酒，账单 $150,000。+4 行动点。', eff: { spend: 150000, ap: 4 } },
    { id: 'b_i16', r: 'blue', type: 'instant', school: 'general', name: '涨价前的最后一单', desc: '"明天就涨价了"——每个销售都这么说。$2,000,000。', eff: { spend: 2000000 } },
    { id: 'b_i20', r: 'blue', type: 'instant', school: 'general', name: '私人酒窖进货', desc: '你其实只喝可乐。$600,000。', eff: { spend: 600000 } },
    { id: 'b_i21', r: 'blue', type: 'instant', school: 'general', name: '巡回赛赞助商', desc: '$1,200,000 买了个 Logo；3 天全场景 +10%。', eff: { spend: 1200000, timed: [{ scope: 'all', pct: 0.1, days: 3 }] } },

    { id: 'b_b1', r: 'blue', type: 'buff', school: 'estate', name: '楼市小阳春', desc: '7 天内房产市场买入 +18%（不占槽）。', eff: { timed: [{ scope: 'estate', pct: 0.18, days: 7 }] } },
    { id: 'b_b2', r: 'blue', type: 'buff', school: 'digital', name: '芯片涨价潮', desc: '7 天数码品类 +25%（不占槽）。', eff: { timed: [{ scope: 'cat:digital', pct: 0.25, days: 7 }] } },
    { id: 'b_b3', r: 'blue', type: 'buff', school: 'car', name: '汇率暴跌', desc: '7 天进口商 +25%（不占槽）。', eff: { timed: [{ scope: 'import', pct: 0.25, days: 7 }] } },
    { id: 'b_b5', r: 'blue', type: 'buff', school: 'general', name: '会员日狂欢', desc: '3 天内全场景 +12%（不占槽）。', eff: { timed: [{ scope: 'all', pct: 0.12, days: 3 }] } },
    { id: 'b_b6', r: 'blue', type: 'buff', school: 'lux', name: '钟表展内部名额', desc: '7 天珠宝腕表 +20%（不占槽）。', eff: { timed: [{ scope: 'cat:jewelry', pct: 0.2, days: 7 }] } },
    { id: 'b_b8', r: 'blue', type: 'buff', school: 'car', name: '超跑选配清单', desc: '7 天超跑 +25%（不占槽）。', eff: { timed: [{ scope: 'cat:hypercar', pct: 0.25, days: 7 }] } },

    { id: 'b_p1', r: 'blue', type: 'permanent', school: 'lux', name: '品牌溢价', desc: '装备后：永久商场 +12%。', eff: { perm: [{ scope: 'mall', pct: 0.12 }] } },
    { id: 'b_p2', r: 'blue', type: 'permanent', school: 'car', name: '车迷认证', desc: '装备后：永久 4S 店 +12%。', eff: { perm: [{ scope: 'car', pct: 0.12 }] } },
    { id: 'b_p3', r: 'blue', type: 'permanent', school: 'car', name: '进口狂热', desc: '装备后：永久进口商 +12%。', eff: { perm: [{ scope: 'import', pct: 0.12 }] } },
    { id: 'b_p8', r: 'blue', type: 'permanent', school: 'digital', name: '极客装备库', desc: '装备后：永久数码品类 +30%、家电 +20%。', eff: { perm: [{ scope: 'cat:digital', pct: 0.3 }, { scope: 'cat:appliance', pct: 0.2 }] } },
    { id: 'b_ma1', r: 'blue', type: 'permanent', school: 'mall', name: '商场常客', desc: '装备后：永久商场 +20%。', eff: { perm: [{ scope: 'mall', pct: 0.2 }] } },
    { id: 'b_ca1', r: 'blue', type: 'permanent', school: 'car', name: '4S 店熟客', desc: '装备后：永久 4S 店 +25%。', eff: { perm: [{ scope: 'car', pct: 0.25 }] } },
    { id: 'b_im1', r: 'blue', type: 'permanent', school: 'import', name: '进口猎人', desc: '装备后：永久进口商 +25%。', eff: { perm: [{ scope: 'import', pct: 0.25 }] } },
    { id: 'b_re1', r: 'blue', type: 'permanent', school: 'estate', name: '房产猎手', desc: '装备后：永久房产市场买入价 +20%（囤得越贵，亏得越多）。', eff: { hoardBuyUp: { estate: 0.2 } } },

    /* ================= 紫色 ================= */
    { id: 'p_p1', r: 'purple', type: 'permanent', school: 'lux', name: '高定工坊包场', desc: '装备后：永久商场 +18%。', eff: { perm: [{ scope: 'mall', pct: 0.18 }] } },
    { id: 'p_p2', r: 'purple', type: 'permanent', school: 'ap', name: '私人管家团队', desc: '装备后：永久每天 +2 行动点。', eff: { permAp: 2 } },
    { id: 'p_p3', r: 'purple', type: 'permanent', school: 'car', name: '车库扩建许可证', desc: '装备后：永久 4S 店 +15%。', eff: { perm: [{ scope: 'car', pct: 0.15 }] } },
    { id: 'p_p4', r: 'purple', type: 'permanent', school: 'estate', name: '地产中介终身VIP', desc: '装备后：永久房产市场买入价 +40%、暴跌概率 +20%（囤房流核心之一）。', eff: { hoardBuyUp: { estate: 0.4 }, hoardCrash: { estate: 0.2 } } },
    { id: 'p_p5', r: 'purple', type: 'permanent', school: 'car', name: '游艇俱乐部会籍', desc: '装备后：永久进口商 +15%。', eff: { perm: [{ scope: 'import', pct: 0.15 }] } },
    { id: 'p_p6', r: 'purple', type: 'permanent', school: 'general', name: '苏富比夜场举牌', desc: '装备后：永久全场景 +8%。', eff: { perm: [{ scope: 'all', pct: 0.08 }] } },
    { id: 'p_p7', r: 'purple', type: 'permanent', school: 'general', name: '通胀来了', desc: '装备后：永久全场景 +6%。钱不值钱了，正好。', eff: { perm: [{ scope: 'all', pct: 0.06 }] } },
    { id: 'p_p8', r: 'purple', type: 'permanent', school: 'digital', name: '极客装备库·升级', desc: '装备后：永久数码品类 +50%、家电 +30%。', eff: { perm: [{ scope: 'cat:digital', pct: 0.5 }, { scope: 'cat:appliance', pct: 0.3 }] } },

    { id: 'p_f1', r: 'purple', type: 'functional', school: 'stock', name: '私人银行黑卡', desc: '装备后：股票每日操作 +3、单次上限 ×2。', eff: { permStockOps: 3, permStockCap: 2 } },
    { id: 'p_f2', r: 'purple', type: 'functional', school: 'general', name: '打通供应链', desc: '装备后：批量购买行动点消耗 -2。', eff: { permBatchAp: 2 } },
    { id: 'p_f3', r: 'purple', type: 'functional', school: 'ap', name: '时间管理大师', desc: '装备后：行动点上限 +5。', eff: { permMaxAp: 5 } },
    { id: 'p_f4', r: 'purple', type: 'functional', school: 'general', name: '全球物流帝国', desc: '装备后：卡槽 +1、批量购买行动点 -1。', eff: { permSlot: 1, permBatchAp: 1 } },

    { id: 'p_b1', r: 'purple', type: 'buff', school: 'general', name: '城市灯光秀包场', desc: '30 天全场景 +12%（不占槽）。', eff: { timed: [{ scope: 'all', pct: 0.12, days: 30 }] } },
    { id: 'p_b3', r: 'purple', type: 'buff', school: 'car', name: '私人滑雪场季卡', desc: '90 天进口商 +15%（不占槽）。', eff: { timed: [{ scope: 'import', pct: 0.15, days: 90 }] } },
    { id: 'p_b4', r: 'purple', type: 'buff', school: 'ap', name: '米其林三星包月', desc: '30 天每天 +1 行动点（不占槽）。', eff: { timedAp: [{ ap: 1, days: 30 }] } },

    /* ================= 金色 ================= */
    { id: 'k_p1', r: 'gold', type: 'permanent', school: 'lux', name: '买下一条商业街', desc: '装备后：永久商场 +15%。', eff: { perm: [{ scope: 'mall', pct: 0.15 }] } },
    { id: 'k_p2', r: 'gold', type: 'permanent', school: 'estate', name: '私人岛屿购置', desc: '装备后：永久房产市场买入价 +50%、暴跌概率 +30%。', eff: { hoardBuyUp: { estate: 0.5 }, hoardCrash: { estate: 0.3 } } },
    { id: 'k_p4', r: 'gold', type: 'permanent', school: 'car', name: '太空旅行团包机', desc: '装备后：永久进口商 +25%。', eff: { perm: [{ scope: 'import', pct: 0.25 }] } },
    { id: 'k_p5', r: 'gold', type: 'permanent', school: 'general', name: '全球连锁酒店集团', desc: '装备后：永久全场景 +8%。', eff: { perm: [{ scope: 'all', pct: 0.08 }] } },
    { id: 'k_p10', r: 'gold', type: 'permanent', school: 'car', name: '造车新势力', desc: '装备后：永久 4S 店 +30%。', eff: { perm: [{ scope: 'car', pct: 0.3 }] } },
    { id: 'k_p15', r: 'gold', type: 'permanent', school: 'general', name: '收购社交平台', desc: '装备后：永久全场景 +10%。', eff: { perm: [{ scope: 'all', pct: 0.1 }] } },
    { id: 'k_p16', r: 'gold', type: 'permanent', school: 'stock', name: '做空基金', desc: '装备后：股市暴跌概率 +40%、每日强制下挫 5%。', eff: { stockCrash: 0.4, stockForceDown: 0.05 } },
    { id: 'k_p17', r: 'gold', type: 'permanent', school: 'commodity', name: '大宗商品之王', desc: '装备后：永久物资市场买入价 +60%、暴跌概率 +40%、暴跌深度 +20%（囤物流核心）。', eff: { hoardBuyUp: { commodity: 0.6 }, hoardCrash: { commodity: 0.4 }, hoardCrashDeep: { commodity: 0.2 } } },

    { id: 'k_f1', r: 'gold', type: 'functional', school: 'ap', name: '时间商人', desc: '装备后：永久每天 +5 行动点。', eff: { permAp: 5 } },
    { id: 'k_f2', r: 'gold', type: 'functional', school: 'stock', name: '手续费黑洞券商', desc: '装备后：股票每日操作 +3、单次上限 ×2。', eff: { permStockOps: 3, permStockCap: 2 } },
    { id: 'k_f3', r: 'gold', type: 'functional', school: 'general', name: '收购拍卖行', desc: '装备后：所有一次性消费卡效果 ×1.5。', eff: { permSpendMult: 0.5 } },
    { id: 'k_f4', r: 'gold', type: 'functional', school: 'ap', name: '卫星互联网星座', desc: '装备后：永久每天 +3 行动点。', eff: { permAp: 3 } },
    { id: 'k_f5', r: 'gold', type: 'functional', school: 'general', name: '买下一座大学', desc: '装备后：永久卡槽 +1。', eff: { permSlot: 1 } },
    { id: 'k_f6', r: 'gold', type: 'functional', school: 'stock', name: '私人中央银行牌照', desc: '装备后：股票单次上限 ×2。', eff: { permStockCap: 2 } },
    { id: 'k_f7', r: 'gold', type: 'functional', school: 'invest', name: '资本大鳄', desc: '装备后：投资席位 +3、投资额 +50%（投资公司越多，倒闭亏得越多）。', eff: { investSeat: 3, investAmount: 0.5 } },

    /* ================= 红色（流派核心 / 规则级） ================= */
    { id: 'r_memory', r: 'red', type: 'permanent', school: 'digital', name: '内存爆涨', desc: '数码暴涨流核心。装备后数码品类 +40%、商场 +50%；若同时持有 AI 股且投资了 AI 公司，数码再 +200%。', eff: { perm: [{ scope: 'cat:digital', pct: 0.4 }, { scope: 'mall', pct: 0.5 }], aiDigital: 2.0 } },
    { id: 'r_short', r: 'red', type: 'permanent', school: 'stock', name: '做空之王', desc: '股市崩盘流核心。装备后股票每日操作 +2、每日强制下挫 15%（高价买入、暴跌平仓）。', eff: { permStockOps: 2, stockForceDown: 0.15 } },
    { id: 'r_ap', r: 'red', type: 'permanent', school: 'ap', name: '时间领主', desc: '高行动流核心。装备后行动点上限 +15、每天回满、每天 +10 行动点。', eff: { permMaxAp: 15, permApFull: true, permAp: 10 } },
    { id: 'r_point', r: 'red', type: 'functional', school: 'point', name: '积分永动机', desc: '高积分流核心。装备后积分获取 ×2、再 +100%、卡槽 +1。', eff: { permPointMul: 1, pointGain: 1, permSlot: 1 } },
    { id: 'r_lux', r: 'red', type: 'permanent', school: 'lux', name: '奢侈帝国', desc: '奢靡流核心。装备后全场景 +15%、商场 +25%、奢侈品品类 +25%。', eff: { perm: [{ scope: 'all', pct: 0.15 }, { scope: 'mall', pct: 0.25 }, { scope: 'cat:luxury', pct: 0.25 }] } },
    { id: 'r_car', r: 'red', type: 'permanent', school: 'car', name: '车队帝国', desc: '车流核心。装备后 4S 店 +30%、进口商 +25%、超跑 +30%。', eff: { perm: [{ scope: 'car', pct: 0.3 }, { scope: 'import', pct: 0.25 }, { scope: 'cat:hypercar', pct: 0.3 }] } },
    { id: 'r_estate', r: 'red', type: 'permanent', school: 'estate', name: '地产大亨', desc: '囤房流核心。装备后房产市场买入价 +35%、每商铺全场景 +3%（上限 60%）。', eff: { hoardBuyUp: { estate: 0.35 }, perShop: { pct: 0.03, cap: 0.6 } } },
    { id: 'r_re', r: 'red', type: 'permanent', school: 'estate', name: '地产之主', desc: '囤房流核心（强化）。装备后房产市场买入价 +120%、暴跌概率 +50%、暴跌深度 +30%、每商铺全场景 +3%。', eff: { hoardBuyUp: { estate: 1.2 }, hoardCrash: { estate: 0.5 }, hoardCrashDeep: { estate: 0.3 }, perShop: { pct: 0.03, cap: 0.6 } } },
    { id: 'r_ma', r: 'red', type: 'permanent', school: 'mall', name: '商场之主', desc: '商场流核心。装备后商场 +120%、奢侈品 +50%。', eff: { perm: [{ scope: 'mall', pct: 1.2 }, { scope: 'cat:luxury', pct: 0.5 }] } },
    { id: 'r_imp', r: 'red', type: 'permanent', school: 'import', name: '进口之主', desc: '进口流核心。装备后进口商 +120%、超跑 +50%。', eff: { perm: [{ scope: 'import', pct: 1.2 }, { scope: 'cat:hypercar', pct: 0.5 }] } },

    { id: 'r_drain', r: 'red', type: 'permanent', school: 'general', name: '金钱黑洞', desc: '永久：每天结束时资产自动蒸发 1%。', eff: { permDrainPct: 0.01 } },
    { id: 'r_entropy', r: 'red', type: 'permanent', school: 'general', name: '熵增定律', desc: '永久：每过一天，全场景消费 +3%（累加不封顶）。', eff: { permDailyInfl: 0.03 } },
    { id: 'r_tax', r: 'red', type: 'permanent', school: 'general', name: '薅资本主义羊毛', desc: '永久：每笔消费额外扣 10%"手续费"。你被反向薅了。', eff: { permTaxPct: 0.1 } },
    { id: 'r_spend', r: 'red', type: 'permanent', school: 'general', name: '败家子光环', desc: '永久：所有一次性消费卡效果 ×3。祖传的。', eff: { permSpendMult: 2 } },
    { id: 'r_auction', r: 'red', type: 'instant', school: 'general', name: '万物皆可拍卖', desc: '立刻消费资产的 15%；永久解锁所有场景的"限量加价"选项（价格 ×5）。', eff: { spendPct: 0.15, permAuction: true } },
    { id: 'r_echo', r: 'red', type: 'permanent', school: 'general', name: '薛定谔的钱包', desc: '永久：每笔消费 70% 概率金额翻倍（花双倍），30% 概率返还 50%。', eff: { permSpendEcho: { pct: 1.0, chance: 0.7, refund: 0.5 } } },
    { id: 'r_full', r: 'red', type: 'permanent', school: 'ap', name: '消费主义之神', desc: '永久：行动点上限 +10，且每天行动点直接回满。', eff: { permMaxAp: 10, permApFull: true } },
    { id: 'r_cost1', r: 'red', type: 'permanent', school: 'general', name: '黑洞信用卡', desc: '永久：所有场景行动点消耗固定为 1，但每笔消费金额 ×2。', eff: { permApCost1: true, permSpendEcho: { pct: 1.0, chance: 1.0, refund: 0 } } },

    /* ================= 刷新流（积分抽卡 / 复制，消耗型卡片很稀有） ================= */
    { id: 'rf_w1', r: 'white', type: 'instant', school: 'refresh', name: '随手刷刷', desc: '花 ◆20，刷新抽 2 张一次性消费卡进背包。', eff: { draw: 2, costPoints: 20 } },
    { id: 'rf_g1', r: 'green', type: 'instant', school: 'refresh', name: '直播间抽奖', desc: '花 ◆60，刷新抽 3 张卡。', eff: { draw: 3, costPoints: 60 } },
    { id: 'rf_b1', r: 'blue', type: 'instant', school: 'refresh', name: '限量秒杀节', desc: '花 ◆150，刷新抽 4 张卡。', eff: { draw: 4, costPoints: 150 } },
    { id: 'rf_p1', r: 'purple', type: 'instant', school: 'refresh', name: '黑五预售', desc: '花 ◆400，刷新抽 5 张卡。', eff: { draw: 5, costPoints: 400 } },
    { id: 'rf_copy', r: 'gold', type: 'instant', school: 'refresh', name: '万物复制机', desc: '复制背包里一张不占槽的卡（比如刚抽到的消耗卡），双倍快乐。', eff: { copyCard: true } },
    { id: 'rf_pmul', r: 'gold', type: 'functional', school: 'point', name: '积分核弹', desc: '装备后：积分获取 ×3。配合刷新流滚雪球。', eff: { permPointMul: 2 } },
    { id: 'rf_red', r: 'red', type: 'instant', school: 'refresh', name: '一键刷新', desc: '免积分，直接刷新抽 8 张卡——一次性把卡组铺满，再逐张花掉。', eff: { draw: 8, costPoints: 0 } },

    /* ================= 囤物流（物资市场核心，买入即贵、暴跌即亏） ================= */
    { id: 'cm_b1', r: 'blue', type: 'permanent', school: 'commodity', name: '矿潮投机客', desc: '装备后：物资市场买入价 +20%（显卡/内存买得更贵）。', eff: { hoardBuyUp: { commodity: 0.2 } } },
    { id: 'cm_p1', r: 'purple', type: 'permanent', school: 'commodity', name: '内存寡头', desc: '装备后：物资市场买入价 +35%、暴跌概率 +20%。', eff: { hoardBuyUp: { commodity: 0.35 }, hoardCrash: { commodity: 0.2 } } },
    { id: 'cm_r1', r: 'red', type: 'permanent', school: 'commodity', name: '物资黑洞', desc: '装备后：物资市场买入价 +100%、波动 +50%、暴跌概率 +60%、暴跌深度 +40%。把资源堆到崩盘。', eff: { hoardBuyUp: { commodity: 1.0 }, hoardVol: { commodity: 0.5 }, hoardCrash: { commodity: 0.6 }, hoardCrashDeep: { commodity: 0.4 } } },

    /* ================= 艺术流（买入即花、每日养护费直接蒸发） ================= */
    { id: 'at_b1', r: 'blue', type: 'permanent', school: 'art', name: '美术馆主', desc: '装备后：艺术品市场买入价 +20%（买得更贵，养护基数更大）。', eff: { hoardBuyUp: { art: 0.2 } } },
    { id: 'at_p1', r: 'purple', type: 'permanent', school: 'art', name: '收藏大鳄', desc: '装备后：艺术品买入价 +40%、养护费 ×1.5（钱蒸发更快）。', eff: { hoardBuyUp: { art: 0.4 }, artUpkeep: 0.5 } },
    { id: 'at_r1', r: 'red', type: 'permanent', school: 'art', name: '艺术黑洞', desc: '装备后：艺术品买入价 +100%、养护费 ×3。钱买进来就蒸发。', eff: { hoardBuyUp: { art: 1.0 }, artUpkeep: 2.0 } },

    /* ================= 球队流（高价买球员、暴跌即亏、效益回钱是坏消息） ================= */
    { id: 'tm_b1', r: 'blue', type: 'permanent', school: 'team', name: '球探主管', desc: '装备后：球队市场买入价 +20%。', eff: { hoardBuyUp: { team: 0.2 } } },
    { id: 'tm_p1', r: 'purple', type: 'permanent', school: 'team', name: '转会操盘手', desc: '装备后：球队买入价 +40%、暴跌概率 +20%。', eff: { hoardBuyUp: { team: 0.4 }, hoardCrash: { team: 0.2 } } },
    { id: 'tm_r1', r: 'red', type: 'permanent', school: 'team', name: '金元足球', desc: '装备后：球队买入价 +100%、波动 +50%、暴跌概率 +60%。天价砸钱，砸完就崩。', eff: { hoardBuyUp: { team: 1.0 }, hoardVol: { team: 0.5 }, hoardCrash: { team: 0.6 } } },

    /* ================= 投资流（席位越多、倒闭越多、钱越没） ================= */
    { id: 'iv_b1', r: 'blue', type: 'functional', school: 'invest', name: '风投学徒', desc: '装备后：投资席位 +1（多投一家公司，多一次倒闭亏本金）。', eff: { investSeat: 1 } },
    { id: 'iv_p1', r: 'purple', type: 'functional', school: 'invest', name: '风投合伙人', desc: '装备后：投资席位 +2。', eff: { investSeat: 2 } },
    { id: 'iv_r1', r: 'red', type: 'functional', school: 'invest', name: '秃鹫资本', desc: '装备后：投资席位 +4、公司倒闭概率 -30%（投得快、死得也快，本金一笔笔蒸发）。', eff: { investSeat: 4, investLife: 0.3 } },

    /* ================= 事件卡（一次性消费，主题化大额花销） ================= */
    { id: 'ev_w1', r: 'white', type: 'event', school: 'general', name: '街边套圈', desc: '十块钱三个圈，你买了三百个。$300 没了。', eff: { spend: 300 } },
    { id: 'ev_g1', r: 'green', type: 'event', school: 'general', name: '网红店排队', desc: '$18,000 请全公司喝一杯限定。', eff: { spend: 18000 } },
    { id: 'ev_b1', r: 'blue', type: 'event', school: 'general', name: '天价律师函', desc: '$800,000 请顶级团队发一封你根本看不懂的函。', eff: { spend: 800000 } },
    { id: 'ev_p1', r: 'purple', type: 'event', school: 'general', name: '包场拍卖夜', desc: '$30,000,000 包下整场拍卖，什么都还没买。', eff: { spend: 30000000 } },
    { id: 'ev_r1', r: 'red', type: 'event', school: 'general', name: '任性撒钱', desc: '当场把资产的 8% 撒给路人——只花不回。', eff: { spendPct: 0.08 } },
  ];

  RR.CARD_MAP = {};
  RR.CARDS.forEach((c) => (RR.CARD_MAP[c.id] = c));

  /* 稀有度升一档（用于事件"加倍下注"把卡牌奖励翻倍） */
  RR.upRarity = function (r) {
    const i = RR.RARITY_ORDER.indexOf(r);
    if (i < 0) return r;
    return RR.RARITY_ORDER[Math.min(RR.RARITY_ORDER.length - 1, i + 1)];
  };

  /* 抽卡：按权重抽一张指定稀有度 */
  RR.rollCard = function (rarity) {
    const pool = rarity ? RR.CARDS.filter((c) => c.r === rarity) : RR.CARDS;
    return RR.util.pick(pool);
  };

  /* 加权抽取稀有度（luck 提高高档概率） */
  RR.rollRarity = function (luck) {
    const L = luck || 0;
    const items = RR.RARITY_ORDER.map((k) => {
      const w = RR.RARITY[k].weight;
      const idx = RR.RARITY_ORDER.indexOf(k);
      return { k, w: w * (1 + L * idx * 0.55) };
    });
    const picked = RR.util.weightedPick(items, (x) => x.w);
    return picked.k;
  };

  /* 三选一抽卡：baseLuck 越高越容易出高级 */
  RR.drawThree = function (luck, opts) {
    const o = opts || {};
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < 3 && guard++ < 60) {
      const r = RR.rollRarity(luck);
      let pool = RR.CARDS.filter((c) => c.r === r);
      if (o.noRed) pool = pool.filter((c) => c.r !== 'red');
      if (o.onlyType) pool = pool.filter((c) => c.type === o.onlyType);
      if (o.school) pool = pool.filter((c) => c.school === o.school);
      if (!pool.length) continue;
      const c = RR.util.pick(pool);
      if (used.has(c.id)) continue;
      used.add(c.id);
      out.push(c.id);
    }
    while (out.length < 3) {
      const c = RR.util.pick(RR.CARDS.filter((x) => x.r === 'white' && !used.has(x.id)));
      if (!c) break;
      used.add(c.id);
      out.push(c.id);
    }
    return out;
  };
})(window.RR);
