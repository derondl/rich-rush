/* 消费场景 / 商品库
 * 价格单位：美元（USD），取真实市场价区间中位，取整便于阅读。
 * 玩家靠"批量购买倍数"把单笔金额推到万亿量级。
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  /* 场景定义
   * 三类用途：
   *  - 消费场景（point/有日预算上限、行动点约束）：mall 奢侈品 / car 4S / import 进口商
   *  - 资产市场（买入即囤积、无日预算上限、每日有涨跌/回钱/平仓消耗）：estate 房产 / commodity 物资 / art 艺术 / team 球队
   *  - 投资场景：invest 投资公司 / stock 股票
   * 备注：原「手机网购 / 房产中介」消费场景已退役——网购并入一次性消费卡（刷新流），房产改为囤积类资产市场。
   */
  RR.SCENES = [
    { id: 'mall', name: '商场·奢侈品', emoji: '🏬', ap: 2, kind: 'spend', desc: '潮牌 / 奢侈品 / 珠宝 / 家电 / 数码。消费累计抽卡积分，行动点约束平衡。', point: true },
    { id: 'car', name: '4S 店', emoji: '🚗', ap: 3, kind: 'spend', desc: '从代步车到赛道猛兽。消费累计抽卡积分。', point: true },
    { id: 'import', name: '进口商', emoji: '🛥️', ap: 5, kind: 'spend', desc: '顶级超跑 / 游艇 / 私人飞机。消费累计抽卡积分。', point: true },

    { id: 'estate', name: '房产市场', emoji: '🏠', ap: 4, kind: 'asset', desc: '囤别墅 / 商铺 / 写字楼。每天收租（钱回流），随机涨价或暴跌；暴跌时平仓把本金亏掉才算真正花掉。买写字楼才能开投资公司。', point: false },
    { id: 'commodity', name: '物资市场', emoji: '📦', ap: 3, kind: 'asset', desc: '囤显卡 / 内存 / 黄金 / 原油。不回钱，只随行情波动；低价平仓亏损即消耗。', point: false },
    { id: 'art', name: '艺术品市场', emoji: '🖼️', ap: 3, kind: 'asset', desc: '一次性买入名画 / 雕塑 / 古董，每天持续消耗养护费（钱直接蒸发，不回流）。批量买更猛。', point: false },
    { id: 'team', name: '球队市场', emoji: '⚽', ap: 4, kind: 'asset', desc: '天价购入球员，获得球员市场。不同身价球员每日涨跌波动，每天有球员效益回钱；高价买低价卖。', point: false },

    { id: 'invest', name: '投资公司', emoji: '💼', ap: 6, kind: 'invest', desc: '需先持有写字楼。投出去的钱会每天分红回流——公司破产，钱才真正消失。', point: false },
    { id: 'stock', name: '股票', emoji: '📈', ap: 1, kind: 'invest', desc: '行动点极低、可快进快出。赚了是坏消息，亏了才是好消息。高价买入、暴跌平仓。', point: false },
  ];

  // 消费场景（有日预算上限）
  RR.SPEND_SCENES = RR.SCENES.filter((s) => s.kind === 'spend').map((s) => s.id);
  // 资产市场场景（无日预算，买入即囤积）
  RR.ASSET_SCENES = RR.SCENES.filter((s) => s.kind === 'asset').map((s) => s.id);

  RR.getScene = (id) => RR.SCENES.find((s) => s.id === id);

  /* 品类 */
  RR.CATEGORIES = {
    food: { name: '吃喝', emoji: '🍜' },
    daily: { name: '生活日用', emoji: '🧴' },
    virtual: { name: '虚拟商品', emoji: '🎮' },
    appliance: { name: '家电', emoji: '🧊' },
    digital: { name: '数码', emoji: '💻' },
    streetwear: { name: '潮牌服饰', emoji: '👟' },
    luxury: { name: '奢侈品', emoji: '👜' },
    jewelry: { name: '珠宝腕表', emoji: '💎' },
    car: { name: '汽车', emoji: '🚙' },
    hypercar: { name: '顶级超跑', emoji: '🏎️' },
    house: { name: '住宅', emoji: '🏡' },
    villa: { name: '别墅庄园', emoji: '🏰' },
    shop: { name: '商铺', emoji: '🏪' },
    office: { name: '写字楼', emoji: '🏢' },
    yacht: { name: '船与游艇', emoji: '⛵' },
    jet: { name: '私人飞机', emoji: '✈️' },
    company: { name: '公司股权', emoji: '💼' },
  };

  /* 商品：{ id, name, cat, price, tag? }
   * tag 用于称号统计：sneaker / jet / yacht / villa / hypercar 等
   */
  RR.ITEMS = {
    online: [
      { id: 'o1', name: '便利店关东煮', cat: 'food', price: 8 },
      { id: 'o2', name: '奶茶超大杯', cat: 'food', price: 7 },
      { id: 'o3', name: '外卖凑满减套餐', cat: 'food', price: 35 },
      { id: 'o4', name: '进口零食箱', cat: 'food', price: 259 },
      { id: 'o5', name: '深夜食堂一顿', cat: 'food', price: 128 },
      { id: 'o6', name: '视频会员年卡', cat: 'virtual', price: 120 },
      { id: 'o7', name: '音乐会员年卡', cat: 'virtual', price: 88 },
      { id: 'o8', name: '网盘超级会员', cat: 'virtual', price: 198 },
      { id: 'o9', name: '手游月卡', cat: 'virtual', price: 30 },
      { id: 'o10', name: '游戏皮肤礼包', cat: 'virtual', price: 648 },
      { id: 'o11', name: '抽卡十连', cat: 'virtual', price: 1980 },
      { id: 'o12', name: '直播间打赏火箭', cat: 'virtual', price: 6000 },
      { id: 'o13', name: '公会战全服第一', cat: 'virtual', price: 88000 },
      { id: 'o14', name: '扫地机器人', cat: 'appliance', price: 899 },
      { id: 'o15', name: '空气炸锅', cat: 'appliance', price: 129 },
      { id: 'o16', name: '按摩椅', cat: 'appliance', price: 2499 },
      { id: 'o17', name: '净水系统', cat: 'appliance', price: 1899 },
      { id: 'o18', name: '机械键盘', cat: 'digital', price: 299 },
      { id: 'o19', name: '无线降噪耳机', cat: 'digital', price: 249 },
      { id: 'o20', name: '平板电脑', cat: 'digital', price: 799 },
      { id: 'o21', name: '旗舰手机', cat: 'digital', price: 1299 },
      { id: 'o22', name: '创作者笔记本', cat: 'digital', price: 2499 },
      { id: 'o23', name: '微单相机', cat: 'digital', price: 3499 },
      { id: 'o24', name: '潮牌短袖', cat: 'streetwear', price: 89 },
      { id: 'o25', name: '联名球鞋', cat: 'streetwear', price: 299, tag: 'sneaker' },
      { id: 'o26', name: '冲锋衣', cat: 'streetwear', price: 499 },
      { id: 'o27', name: '定制西装', cat: 'streetwear', price: 1800 },
      { id: 'o28', name: '猫爬架城堡', cat: 'daily', price: 259 },
      { id: 'o29', name: '进口猫粮年供', cat: 'daily', price: 1200 },
      { id: 'o30', name: '健身私教年卡', cat: 'daily', price: 3000 },
      { id: 'o31', name: '行李箱四件套', cat: 'daily', price: 1100 },
      { id: 'o32', name: '设计师台灯', cat: 'daily', price: 399 },
    ],
    mall: [
      { id: 'm1', name: '限量联名球鞋', cat: 'streetwear', price: 1500, tag: 'sneaker' },
      { id: 'm2', name: '设计师夹克', cat: 'streetwear', price: 3200 },
      { id: 'm3', name: '高定西装三件套', cat: 'streetwear', price: 8800 },
      { id: 'm4', name: '球鞋收藏展柜满配', cat: 'streetwear', price: 26000, tag: 'sneaker' },
      { id: 'm5', name: '秀场同款全身穿搭', cat: 'streetwear', price: 15000 },
      { id: 'm6', name: '经典款手提包', cat: 'luxury', price: 6500 },
      { id: 'm7', name: '限量皮衣', cat: 'luxury', price: 18000 },
      { id: 'm8', name: '高定礼服', cat: 'luxury', price: 45000 },
      { id: 'm9', name: '鳄鱼皮公文包', cat: 'luxury', price: 32000 },
      { id: 'm10', name: '品牌家居全屋系列', cat: 'luxury', price: 88000 },
      { id: 'm11', name: '高级定制衣橱整季', cat: 'luxury', price: 220000 },
      { id: 'm12', name: '钻戒', cat: 'jewelry', price: 35000 },
      { id: 'm13', name: '蓝宝石项链', cat: 'jewelry', price: 120000 },
      { id: 'm14', name: '满钻机械腕表', cat: 'jewelry', price: 260000 },
      { id: 'm15', name: '收藏级翡翠套装', cat: 'jewelry', price: 580000 },
      { id: 'm16', name: '高定珠宝皇冠', cat: 'jewelry', price: 1800000 },
      { id: 'm17', name: '稀有粉钻', cat: 'jewelry', price: 4500000 },
      { id: 'm18', name: '双开门冰箱', cat: 'appliance', price: 4200 },
      { id: 'm19', name: '洗烘套装', cat: 'appliance', price: 3600 },
      { id: 'm20', name: '全屋中央空调', cat: 'appliance', price: 28000 },
      { id: 'm21', name: '私家家庭影院', cat: 'appliance', price: 65000 },
      { id: 'm22', name: '全屋智能中控', cat: 'appliance', price: 150000 },
      { id: 'm23', name: '米其林级厨房整套', cat: 'appliance', price: 280000 },
      { id: 'm24', name: '折叠屏手机', cat: 'digital', price: 2400 },
      { id: 'm25', name: '顶配游戏本', cat: 'digital', price: 6800 },
      { id: 'm26', name: '8K 巨幕电视', cat: 'digital', price: 12000 },
      { id: 'm27', name: '专业摄影全套', cat: 'digital', price: 38000 },
      { id: 'm28', name: '家庭数据中心', cat: 'digital', price: 95000 },
      { id: 'm29', name: '发烧级音响系统', cat: 'digital', price: 140000 },
      { id: 'm30', name: '私人电竞房全配', cat: 'digital', price: 260000 },
    ],
    car: [
      { id: 'c1', name: '代步小车', cat: 'car', price: 28000 },
      { id: 'c2', name: '家用 SUV', cat: 'car', price: 45000 },
      { id: 'c3', name: '新能源轿车', cat: 'car', price: 52000 },
      { id: 'c4', name: '皮卡越野版', cat: 'car', price: 68000 },
      { id: 'c5', name: '豪华 SUV', cat: 'car', price: 165000 },
      { id: 'c6', name: '德系行政轿车', cat: 'car', price: 120000 },
      { id: 'c7', name: '性能轿跑', cat: 'car', price: 185000 },
      { id: 'c8', name: '纯电旗舰', cat: 'car', price: 210000 },
      { id: 'c9', name: '英伦 GT', cat: 'car', price: 320000 },
      { id: 'c10', name: '超豪华轿车', cat: 'car', price: 380000 },
      { id: 'c11', name: '手工定制版', cat: 'car', price: 650000 },
      { id: 'c12', name: '限量超跑', cat: 'hypercar', price: 1850000, tag: 'hypercar' },
      { id: 'c13', name: '赛道版猛兽', cat: 'hypercar', price: 2900000, tag: 'hypercar' },
    ],
    realestate: [
      { id: 'r1', name: '二线小户型', cat: 'house', price: 320000 },
      { id: 'r2', name: '一线两居', cat: 'house', price: 1200000 },
      { id: 'r3', name: '学区老破小', cat: 'house', price: 880000 },
      { id: 'r4', name: '江景大平层', cat: 'house', price: 6500000 },
      { id: 'r5', name: '独栋别墅', cat: 'villa', price: 18000000, tag: 'villa' },
      { id: 'r6', name: '半山别墅', cat: 'villa', price: 45000000, tag: 'villa' },
      { id: 'r7', name: '私人庄园', cat: 'villa', price: 80000000, tag: 'villa' },
      { id: 'r8', name: '海边私人岛屿', cat: 'villa', price: 260000000, tag: 'villa' },
      { id: 'r9', name: '社区底商', cat: 'shop', price: 850000, tag: 'shop' },
      { id: 'r10', name: '商场铺位', cat: 'shop', price: 2600000, tag: 'shop' },
      { id: 'r11', name: '步行街金铺', cat: 'shop', price: 7800000, tag: 'shop' },
      { id: 'r12', name: '核心商圈整层', cat: 'shop', price: 30000000, tag: 'shop' },
      { id: 'r13', name: '乙级写字楼整层', cat: 'office', price: 9500000, tag: 'office' },
      { id: 'r14', name: '甲级写字楼整层', cat: 'office', price: 38000000, tag: 'office' },
      { id: 'r15', name: '城市地标写字楼', cat: 'office', price: 180000000, tag: 'office' },
      { id: 'r16', name: 'CBD 双子塔整栋', cat: 'office', price: 900000000, tag: 'office' },
    ],
    import: [
      { id: 'i1', name: '限量超跑（进口）', cat: 'hypercar', price: 2800000, tag: 'hypercar' },
      { id: 'i2', name: '赛道专属 Hypercar', cat: 'hypercar', price: 5500000, tag: 'hypercar' },
      { id: 'i3', name: '装甲定制版', cat: 'hypercar', price: 9800000, tag: 'hypercar' },
      { id: 'i4', name: '收藏级老爷车', cat: 'hypercar', price: 32000000, tag: 'hypercar' },
      { id: 'i5', name: '全球唯一定制款', cat: 'hypercar', price: 48000000, tag: 'hypercar' },
      { id: 'i6', name: '近海快艇', cat: 'yacht', price: 950000, tag: 'yacht' },
      { id: 'i7', name: '中型游艇', cat: 'yacht', price: 12000000, tag: 'yacht' },
      { id: 'i8', name: '豪华游艇', cat: 'yacht', price: 65000000, tag: 'yacht' },
      { id: 'i9', name: '超级游艇', cat: 'yacht', price: 210000000, tag: 'yacht' },
      { id: 'i10', name: '海上宫殿', cat: 'yacht', price: 580000000, tag: 'yacht' },
      { id: 'i11', name: '轻型公务机', cat: 'jet', price: 8500000, tag: 'jet' },
      { id: 'i12', name: '中型公务机', cat: 'jet', price: 32000000, tag: 'jet' },
      { id: 'i13', name: '远程公务机', cat: 'jet', price: 75000000, tag: 'jet' },
      { id: 'i14', name: '改装客机', cat: 'jet', price: 180000000, tag: 'jet' },
      { id: 'i15', name: '空中官邸', cat: 'jet', price: 450000000, tag: 'jet' },
      { id: 'orbital_flight', name: '亚轨道航班（包机）', cat: 'jet', price: 28000000, tag: 'jet', locked: true },
    ],
  };

  /* ---------- 资产市场（囤积类，买入即囤、每日行为、平仓消耗） ----------
   * estate 房产：复用 RR.ITEMS.realestate（别墅/商铺/写字楼/住宅），每天收租（回流），随机涨跌，暴跌时平仓亏本金。
   * commodity 物资：显卡/内存/黄金/原油，不回钱，只随行情波动，低价平仓亏损即消耗。
   * art 艺术：一次性买入，每天固定养护费（钱直接蒸发，不回流）。
   * team 球队：球员按身价买入，每日涨跌波动 + 球员效益回钱，高价买低价卖。
   */
  RR.ASSET_KIND = {
    estate: {
      name: '房产', vol: 0.05, crashPct: 0.5, crashChance: 0.10,
      rent: { house: 0.008, villa: 0.016, shop: 0.012, office: 0.011 }, // 每日租金率（回流）
    },
    commodity: {
      name: '物资', vol: 0.11, crashPct: 0.55, crashChance: 0.09, rent: {}, // 不回钱
    },
    art: {
      name: '艺术品', upkeepPct: 0.018, vol: 0, // 每日养护费（直接蒸发）
    },
    team: {
      name: '球队', vol: 0.09, crashPct: 0.4, crashChance: 0.08, incomeDaily: 0.012, // 每日球员效益（回流）
    },
  };
  // 资产市场商品（estate 复用 RR.ITEMS.realestate）
  RR.ASSET_ITEMS = {
    commodity: [
      { id: 'gc1', name: '高端显卡', cat: 'gpu', price: 80000 },
      { id: 'gc2', name: '矿机整机柜', cat: 'gpu', price: 1200000 },
      { id: 'gc3', name: 'AI 算力集群', cat: 'gpu', price: 25000000 },
      { id: 'mm1', name: '服务器内存条', cat: 'memory', price: 12000 },
      { id: 'mm2', name: '内存晶圆', cat: 'memory', price: 3000000 },
      { id: 'mm3', name: 'HBM 产能包', cat: 'memory', price: 42000000 },
      { id: 'gd1', name: '投资金条', cat: 'gold', price: 600000 },
      { id: 'gd2', name: '金矿权益', cat: 'gold', price: 15000000 },
      { id: 'gd3', name: '央行金库份额', cat: 'gold', price: 420000000 },
      { id: 'ol1', name: '原油储罐', cat: 'oil', price: 900000 },
      { id: 'ol2', name: '油田权益', cat: 'oil', price: 30000000 },
      { id: 'ol3', name: '战略石油储备', cat: 'oil', price: 520000000 },
    ],
    art: [
      { id: 'a1', name: '当代油画', cat: 'art', price: 2000000 },
      { id: 'a2', name: '雕塑装置', cat: 'art', price: 8000000 },
      { id: 'a3', name: '古董瓷器', cat: 'art', price: 15000000 },
      { id: 'a4', name: '印象派真迹', cat: 'art', price: 120000000 },
      { id: 'a5', name: '文艺复兴壁画', cat: 'art', price: 900000000 },
    ],
    team: [
      { id: 'p1', name: '青训小将', cat: 'player', price: 3000000 },
      { id: 'p2', name: '国家队主力', cat: 'player', price: 40000000 },
      { id: 'p3', name: '顶级前锋', cat: 'player', price: 180000000 },
      { id: 'p4', name: '金球先生', cat: 'player', price: 600000000 },
      { id: 'p5', name: '历史级球王', cat: 'player', price: 2500000000 },
    ],
  };
  // 所有资产商品（含 estate 复用）的 id → 信息，便于查找
  RR.ASSET_CAT_OF = {};
  Object.keys(RR.ASSET_ITEMS).forEach((kind) => {
    RR.ASSET_ITEMS[kind].forEach((it) => { RR.ASSET_CAT_OF[it.id] = { kind, cat: it.cat, name: it.name, price: it.price }; });
  });
  // estate 复用 realestate 商品
  (RR.ITEMS.realestate || []).forEach((it) => { RR.ASSET_CAT_OF[it.id] = { kind: 'estate', cat: it.cat, name: it.name, price: it.price }; });

  RR.assetItems = function (kind) {
    if (kind === 'estate') return RR.ITEMS.realestate || [];
    return RR.ASSET_ITEMS[kind] || [];
  };

  /* 批量倍数档位（附加行动点按最终数量级计算）
   * max = 在当前场景单笔上限内尽可能多地买
   */
  RR.BULK = [
    { mult: 1, label: '×1' },
    { mult: 10, label: '×10' },
    { mult: 100, label: '×100' },
    { mult: 1000, label: '×1K' },
    { mult: 10000, label: '×10K' },
    { mult: 'max', label: '上限' },
  ];
  // 数量 → 附加行动点
  RR.bulkApExtra = function (qty) {
    if (qty < 10) return 0;
    if (qty < 100) return 1;
    if (qty < 1000) return 2;
    if (qty < 10000) return 3;
    return 4;
  };

  /* 每日场景预算「权重」：仅决定各场景之间每天可花总额的相对比例
   * （高价场景 import 占大头，低价场景 online 占小头，但都能用乘数滚动起来）。
   * 实际每天预算由 sceneBudgetLeft 按 initAsset / 天数 计算，不再随剩余资产收缩。
   */
  RR.SCENE_DAILY = {
    // 仅消费场景有日预算上限；权重决定每天可花总额的相对比例。
    // 总日预算 = 初始资产 / 天数 × 系数（系数 0.5，给策略玩家充裕盈余），每天重置、不随剩余资产收缩。
    // 资产市场 / 投资场景不在此列——买入直接花资产，无日预算上限，行动点约束平衡。
    mall: 0.30,
    car: 0.34,
    import: 0.36,
  };
  RR.SCENE_DAILY_SUM = Object.keys(RR.SCENE_DAILY).reduce((a, k) => a + RR.SCENE_DAILY[k], 0);

  /* 当天剩余可花预算（仅消费场景 mall/car/import 使用）
   * 设计要点（修复"后期有钱也买不了"的几何衰减死局）：
   *   预算 = 初始资产 / (天数 × 系数) × 该场景权重占比，每天重置、次日恢复，且不随剩余资产收缩。
   *   → 越接近终点，预算相对剩余资产越大，"上限"档购买会自动把剩余资产一次性花光（buy 内部封顶到 asset）。
   *   → 行动点变成真正的约束：AP 越多，每天能扫的场景越多、花得越干净；AP 流类卡直接决定你能多快通关。
   */
  RR.sceneBudgetLeft = function (S, scene) {
    const w = RR.SCENE_DAILY[scene];
    if (!w) return 0; // 资产市场 / 投资场景无日预算上限
    const perDayTotal = S.initAsset / (S.totalDays * 0.5);
    const budget = Math.max(10, perDayTotal * (w / RR.SCENE_DAILY_SUM));
    const used = (S.daySpendByScene && S.daySpendByScene[scene]) || 0;
    return Math.max(0, budget - used);
  };

  /* ---------- 投资公司（随机生成，roguelike） ---------- */
  const BIZ_PREFIX = [
    'AI 养猪', '社区团购', '共享充电宝', '元宇宙地产', '区块链茶叶', '无人便利店',
    '虚拟偶像经纪', '脑机接口', '飞行汽车', '人造肉', '量子算命', '宠物克隆',
    '太空殡葬', '数字藏品煎饼', '预制菜米其林', '孙子兵法商学', '二手火箭回收',
    '情绪价值', '硅基相亲', '赛博中医馆', '广场舞元宇宙', '直播带货代运营',
    '无人机送外卖', '碳中和奶茶', '猫咪情绪识别', '电子木鱼', '云端烧烤',
    '自动驾驶轮椅', 'AI 代吵架', '虚拟墓地', '超导体煎饼', '盲盒殡葬',
    '共享爷爷', 'AI 算命塔罗', '机器人女友', '太空民宿', '元宇宙菜市场',
  ];
  const BIZ_SUFFIX = [
    '有限公司', '科技集团', '控股', '资本', '实验室', '工作室',
    '产业联盟', '研究院', '赛道', '生态', '工场', '科技',
  ];

  // 投资公司：投资额 = 当前资产 × 档位比例（生成后即固定，不能自定义）
  RR.INVEST_TIERS = [
    { tier: 1, ratio: 0.012 },
    { tier: 2, ratio: 0.02 },
    { tier: 3, ratio: 0.03 },
    { tier: 4, ratio: 0.045 },
    { tier: 5, ratio: 0.065 },
  ];

  RR.genCompany = function (tier, asset) {
    const t = RR.INVEST_TIERS.find((x) => x.tier === tier) || RR.INVEST_TIERS[0];
    const name = RR.util.pick(BIZ_PREFIX) + RR.util.pick(BIZ_SUFFIX);
    const amount = Math.max(1e6, Math.round((asset * t.ratio * RR.util.rnd(0.7, 1.4)) / 1e5) * 1e5);
    const life = RR.util.rndInt(2, 10);      // 存活天数
    const daily = RR.util.rnd(0.002, 0.02);  // 每日分红率：回流的钱（阻碍你花光）
    return {
      uid: 'co_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
      name, tier, amount, life, daysLeft: life, daily, alive: true,
    };
  };

  /* ---------- 股票（数量多、波动大，每天都有新波动，受叠加卡片影响） ---------- */
  RR.STOCKS = [
    { id: 's1', name: '特斯马汽车', code: 'TSLA', vol: 0.5, emoji: '🚗' },
    { id: 's2', name: '蓝鸟社交', code: 'BIRD', vol: 0.42, emoji: '🐦' },
    { id: 's3', name: '元宇宙地产', code: 'META-E', vol: 0.85, emoji: '🥽' },
    { id: 's4', name: '云上卖书', code: 'CLD', vol: 0.3, emoji: '📦' },
    { id: 's5', name: '芯片之光', code: 'CHIP', vol: 0.46, emoji: '🔬' },
    { id: 's6', name: '绿色能源', code: 'GRN', vol: 0.44, emoji: '🔋' },
    { id: 's7', name: '太空旅游', code: 'ORB', vol: 0.95, emoji: '🛰️' },
    { id: 's8', name: '短视频算法', code: 'ALG', vol: 0.36, emoji: '🎵' },
    { id: 's9', name: '人造肉快餐', code: 'MEAT', vol: 0.62, emoji: '🍔' },
    { id: 's10', name: '数字货币交易所', code: 'COIN', vol: 1.05, emoji: '🪙' },
    { id: 's11', name: '老牌可乐', code: 'COLA', vol: 0.14, emoji: '🥤' },
    { id: 's12', name: '共享充电宝', code: 'PWR', vol: 0.68, emoji: '🔌' },
    { id: 's13', name: '智算AI', code: 'AICO', vol: 0.78, emoji: '🤖', tag: 'ai' },
    { id: 's14', name: '脑机接口', code: 'BCI', vol: 0.9, emoji: '🧠', tag: 'ai' },
    { id: 's15', name: '自动驾驶', code: 'AUTO', vol: 0.72, emoji: '🚙', tag: 'ai' },
    { id: 's16', name: '量子计算', code: 'QBIT', vol: 1.0, emoji: '⚛️', tag: 'ai' },
    { id: 's17', name: '海运巨头', code: 'SHIP', vol: 0.55, emoji: '🚢' },
    { id: 's18', name: '黄金矿企', code: 'GOLD', vol: 0.33, emoji: '🪙' },
    { id: 's19', name: '生物制药', code: 'BIO', vol: 0.88, emoji: '💊' },
    { id: 's20', name: '直播电商', code: 'LIVE', vol: 0.6, emoji: '📺' },
  ];

  RR.isAiStock = function (id) {
    const s = RR.STOCKS.find((x) => x.id === id);
    return !!(s && s.tag === 'ai');
  };

  RR.CAT_OF = {};
  Object.keys(RR.ITEMS).forEach((scene) => {
    RR.ITEMS[scene].forEach((it) => {
      RR.CAT_OF[it.id] = it.cat;
    });
  });
})(window.RR);
