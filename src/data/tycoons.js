/* 剧本（首富）数据
 * 财富数据来源：
 *  - 全球：Forbes Real-Time Billionaires，2026-08-29
 *  - 中国：Forbes 中国富豪榜，2026-01
 * 人物均使用谐音 / 外号，避免直接指名。
 *
 * 每位首富 = 3 个专属词条（蓝/紫/金，固定开局） + 1 套签名卡组 deck（开局即带，占槽卡自动装备）。
 * deck 卡片 id 取自 cards.js，按各自主流派挑选（蓝/紫为主，不送红卡以保持平衡）。
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  /* 初始词条效果字段说明
   * sceneSpend  [{scene, pct}]      指定场景消费加成
   * catSpend    [{cat, pct}]        指定品类消费加成
   * sceneAp     [{scene, delta}]    指定场景行动点增减
   * dailyAp     n                   每日行动点
   * stockOps    n                   股票每日操作次数
   * pointGain   pct                 积分获取加成
   * eventRate   pct                 随机事件触发率
   * batchAp     n                   批量购买行动点减免
   * spendEcho   pct                 消费回响：再扣一次
   * investAmount pct                投资金额加成
   * investSlots n                   投资席位
   * investLife  pct                 投资公司倒闭概率降低
   * firstFree   scene               每日该场景首次免费
   * perShop     {pct, cap}          每个商铺提供全场景消费加成
   * perCar      {ap, cap}           每辆车提供每日行动点
   * semiAp      {ap, cap}           每个半永久增益提供每日行动点
   * apFreeChance pct                消费后不消耗行动点概率
   * eventDouble bool                事件可选"加倍下注"
   * cardSlot    n                   卡槽
   * priceSpike  pct                 进入场景随机单品加价
   * bulkSurcharge pct               批量购买 ×N 时总价加价
   * missionPoint pct                挑战任务积分加成
   * unlock      id                  解锁限定商品
   * investApPerCompany n            每持有 1 家投资公司每日 +N 行动点
   */

  RR.TYCOONS = [
    {
      id: 'tesla',
      name: '特斯马',
      alias: '钢铁侠本人',
      tag: '造车 / 造火箭 / 造推特',
      region: '海外',
      wealth: 873100000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 90,
      avatar: '🚀',
      desc: '人类史上第一位万亿富豪。钱对他来说只是火箭燃料的计量单位。',
      // 数码暴涨流签名卡组：极客装备库（永久数码+30%/家电+20%）+ 芯片涨价潮（7天数码+25%）
      deck: ['b_p8', 'b_b2'],
      perks: [
        {
          id: 'tesla_p1', name: '第一性原理', desc: '把每一笔账单拆到原子级：每次消费后，再按本笔金额的 6% 追加一笔"研发返工费"。',
          eff: { spendEcho: 0.06 },
        },
        {
          id: 'tesla_p2', name: '火箭回收复用', desc: '进口商场景行动点 -1（最低 1），且该场景消费 +15%。造完就扔，扔完再造。',
          eff: { sceneAp: [{ scene: 'import', delta: -1 }], sceneSpend: [{ scene: 'import', pct: 0.15 }] },
        },
        {
          id: 'tesla_p3', name: '星链覆盖', desc: '每天首次进入任意消费场景不消耗行动点。全球无死角，包括你的钱包。',
          eff: { firstFree: 'any' },
        },
      ],
    },
    {
      id: 'bezos',
      name: '光头杰',
      alias: '卖书的那个光头',
      tag: '电商 / 云 / 上天',
      region: '海外',
      wealth: 273500000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 70,
      avatar: '📦',
      desc: '把"一键下单"写进了人类肌肉记忆的男人。',
      // 商场流 + 进口流签名卡组：商场常客/进口猎人（永久）+ 商场促销周（限时）
      deck: ['b_ma1', 'b_im1', 'g_b1'],
      perks: [
        {
          id: 'bezos_p1', name: '一键下单', desc: '商场消费行动点 -1（最低 1），商场消费 +20%。手指比大脑快。',
          eff: { sceneAp: [{ scene: 'mall', delta: -1 }], sceneSpend: [{ scene: 'mall', pct: 0.2 }] },
        },
        {
          id: 'bezos_p2', name: '长期主义', desc: '每持有 1 家投资公司，每日 +1 行动点。不看季度财报，只看十年。',
          eff: { investApPerCompany: 1 },
        },
        {
          id: 'bezos_p3', name: '蓝色起源', desc: '解锁进口商限定商品「亚轨道航班」，且进口商消费 +25%。',
          eff: { sceneSpend: [{ scene: 'import', pct: 0.25 }], unlock: 'orbital_flight' },
        },
      ],
    },
    {
      id: 'zuck',
      name: '小扎',
      alias: '那个蓝 App 的爸爸',
      tag: '社交 / 元宇宙 / VR',
      region: '海外',
      wealth: 198500000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 60,
      avatar: '🥽',
      desc: '坚信人应该活在虚拟世界里——至少那里的钱更好花。',
      // 数码暴涨流签名卡组（升级版）：极客装备库·升级（永久数码+50%/家电+30%）+ 芯片涨价潮（限时）
      deck: ['p_p8', 'b_b2'],
      perks: [
        {
          id: 'zuck_p1', name: '元宇宙基建', desc: '数码品类消费 +30%。头显一戴，谁都不爱。',
          eff: { catSpend: [{ cat: 'digital', pct: 0.3 }] },
        },
        {
          id: 'zuck_p2', name: '社交裂变', desc: '每次消费有 25% 概率不消耗行动点（分享给好友，好友帮你买）。',
          eff: { apFreeChance: 0.25 },
        },
        {
          id: 'zuck_p3', name: '无上限竞购', desc: '随机事件中出现"加倍下注"选项时，可花双倍拿双倍奖励。',
          eff: { eventDouble: true },
        },
      ],
    },
    {
      id: 'ellison',
      name: '浪里白条',
      alias: '数据库界的海王',
      tag: '数据库 / 帆船 / 买岛',
      region: '海外',
      wealth: 193600000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 60,
      avatar: '⛵',
      desc: '人生信条：既然能买下一座岛，为什么要租？',
      // 囤房流签名卡组：房产猎手（永久买入价+20%）+ 地产中介终身VIP（永久买入价+40%/暴跌+20%）+ 楼市小阳春（限时）
      deck: ['b_re1', 'p_p4', 'b_b1'],
      perks: [
        {
          id: 'ellison_p1', name: '买岛成瘾', desc: '房产市场买入价 +40%。',
          eff: { sceneSpend: [{ scene: 'estate', pct: 0.4 }] },
        },
        {
          id: 'ellison_p2', name: '帆船狂热', desc: '进口商"船 / 游艇"品类消费 +50%。',
          eff: { catSpend: [{ cat: 'yacht', pct: 0.5 }] },
        },
        {
          id: 'ellison_p3', name: '甲骨文', desc: '投资公司投资金额 +25%。',
          eff: { investAmount: 0.25 },
        },
      ],
    },
    {
      id: 'buffett',
      name: '奥马哈先知',
      alias: '喝可乐的老头',
      tag: '价值投资 / 保险 / 复利',
      region: '海外',
      wealth: 143600000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 55,
      avatar: '🥤',
      desc: '别人恐惧我贪婪——而你贪婪的方向，是把它全花掉。',
      // 股市崩盘流签名卡组：私人银行黑卡（股票操作+3/上限×2）+ 做空基金（暴跌+40%/每日强制下挫5%）
      deck: ['p_f1', 'k_p16'],
      perks: [
        {
          id: 'buffett_p1', name: '价值投资', desc: '投资公司单次投资额 +50%，且投资公司倒闭概率 -30%。',
          eff: { investAmount: 0.5, investLife: 0.3 },
        },
        {
          id: 'buffett_p2', name: '浮存金', desc: '每持有 1 个商铺，每日 +1 行动点（上限 10）。别人的钱，随便花。',
          eff: { perShop: { ap: 1, cap: 10 } },
        },
        {
          id: 'buffett_p3', name: '可乐续命', desc: '每日 +2 行动点。糖分就是生产力。',
          eff: { dailyAp: 2 },
        },
      ],
    },
    {
      id: 'arnault',
      name: '奢侈品教父',
      alias: '那个 LV 的老板',
      tag: '奢侈品 / 并购 / 饥饿营销',
      region: '海外',
      wealth: 143000000000,
      source: 'Forbes 实时榜 2026-08-29',
      days: 55,
      avatar: '👜',
      desc: '擅长让别人为了一个 Logo 多付十倍价钱。这次对象是你。',
      // 奢靡流签名卡组：品牌溢价/高定工坊包场（永久商场+）+ 盲盒手办墙（一次性消费）
      deck: ['b_p1', 'p_p1', 'g04'],
      perks: [
        {
          id: 'arnault_p1', name: '品牌溢价', desc: '商场场景消费 +40%。',
          eff: { sceneSpend: [{ scene: 'mall', pct: 0.4 }] },
        },
        {
          id: 'arnault_p2', name: '饥饿营销', desc: '商场 / 4S 店 / 进口商积分获取 +80%。',
          eff: { pointGain: 0.8 },
        },
        {
          id: 'arnault_p3', name: '并购狼性', desc: '投资公司席位数 +2。',
          eff: { investSlots: 2 },
        },
      ],
    },
    {
      id: 'zhangym',
      name: '字节张',
      alias: '算法信徒',
      tag: '推荐算法 / 短视频 / 大力出奇迹',
      region: '国内',
      wealth: 69300000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 45,
      avatar: '🎵',
      desc: '你以为你在刷视频，其实是算法在帮你花钱。',
      // 高积分流签名卡组：积分核弹（积分×3，装备）+ 直播间抽奖/限量秒杀节（刷新抽卡）
      deck: ['rf_pmul', 'rf_g1', 'rf_b1'],
      perks: [
        {
          id: 'zym_p1', name: '算法推荐', desc: '每次进入消费场景，随机 1 件商品当天被推成"限量爆款"，价格 +100%。',
          eff: { priceSpike: 1.0 },
        },
        {
          id: 'zym_p2', name: '大力出奇迹', desc: '批量购买 ≥ ×100 时，行动点消耗 -2。',
          eff: { batchAp: 2 },
        },
        {
          id: 'zym_p3', name: '延迟满足', desc: '每佩戴 1 张半永久增益卡，每日 +1 行动点（上限 5）。',
          eff: { semiAp: { ap: 1, cap: 5 } },
        },
      ],
    },
    {
      id: 'zhongss',
      name: '卖水的',
      alias: '大自然的搬运工',
      tag: '包装饮用水 / 疫苗 / 广告',
      region: '国内',
      wealth: 68000000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 45,
      avatar: '💧',
      desc: '一瓶水两块钱，卖成了首富。你的任务是把这些水钱全花掉。',
      // 商场流签名卡组：商场常客/品牌溢价（永久）+ 商场促销周（限时）
      deck: ['b_ma1', 'b_p1', 'g_b1'],
      perks: [
        {
          id: 'zss_p1', name: '大自然的搬运工', desc: '商场消费 +55%。',
          eff: { sceneSpend: [{ scene: 'mall', pct: 0.55 }] },
        },
        {
          id: 'zss_p2', name: '线下冰柜', desc: '每持有 1 个商铺，全场景消费 +2%（上限 +50%）。铺满全国。',
          eff: { perShop: { pct: 0.02, cap: 0.5 } },
        },
        {
          id: 'zss_p3', name: '广告轰炸', desc: '随机事件触发概率 +50%。洗脑循环，无处不在。',
          eff: { eventRate: 0.5 },
        },
      ],
    },
    {
      id: 'pony',
      name: '企鹅马',
      alias: '那只胖企鹅的主人',
      tag: '社交 / 游戏 / 小程序',
      region: '国内',
      wealth: 62700000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 45,
      avatar: '🐧',
      desc: '充钱你会变强——而你的目标是变穷，所以更要充。',
      // 高积分流（复制向）签名卡组：万物复制机（复制背包消耗卡）+ 黑五预售/直播间抽奖（刷新抽卡）
      deck: ['rf_copy', 'rf_p1', 'rf_g1'],
      perks: [
        {
          id: 'pony_p1', name: '皮肤氪金', desc: '虚拟商品（游戏氪金）品类消费 +200%。抽卡是另一种消费。',
          eff: { catSpend: [{ cat: 'virtual', pct: 2.0 }] },
        },
        {
          id: 'pony_p2', name: '流量裂变', desc: '商场场景消费 +25%。',
          eff: { sceneSpend: [{ scene: 'mall', pct: 0.25 }] },
        },
        {
          id: 'pony_p3', name: '小程序生态', desc: '每日 +1 行动点。用完即走，走了还来。',
          eff: { dailyAp: 1 },
        },
      ],
    },
    {
      id: 'huangz',
      name: '拼哥',
      alias: '砍一刀创始人',
      tag: '拼团 / 下沉市场 / 百亿补贴',
      region: '国内',
      wealth: 42400000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 40,
      avatar: '🔪',
      desc: '省下的每一分钱，都会以另一种方式被花出去。',
      // 高积分流（普惠向）签名卡组：限量秒杀节/直播间抽奖/随手刷刷（刷新抽卡）
      deck: ['rf_b1', 'rf_g1', 'rf_w1'],
      perks: [
        {
          id: 'hz_p1', name: '百亿补贴', desc: '批量购买 ×10 及以上时，本笔总价 +30%（你被补贴了，所以多买）。',
          eff: { bulkSurcharge: 0.3 },
        },
        {
          id: 'hz_p2', name: '拼团成功', desc: '每日首次消费不消耗行动点。',
          eff: { firstFree: 'any' },
        },
        {
          id: 'hz_p3', name: '砍一刀', desc: '随机事件中"砍价"类选项必定成功，且返还的积分翻倍。',
          eff: { eventDouble: true, pointGain: 0.3 },
        },
      ],
    },
    {
      id: 'leijun',
      name: '雷布斯',
      alias: 'Are you OK',
      tag: '手机 / 汽车 / 性价比',
      region: '国内',
      wealth: 30400000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 35,
      avatar: '📱',
      desc: '性价比是给别人省的，你负责把省下的都花光。',
      // 车流签名卡组：4S店熟客/进口狂热（永久）+ 汽车嘉年华（限时）
      deck: ['b_ca1', 'b_p3', 'g_b2'],
      perks: [
        {
          id: 'lj_p1', name: '极致堆料', desc: '4S 店场景消费 +45%。',
          eff: { sceneSpend: [{ scene: 'car', pct: 0.45 }] },
        },
        {
          id: 'lj_p2', name: '为发烧而生', desc: '数码品类消费 +70%。',
          eff: { catSpend: [{ cat: 'digital', pct: 0.7 }] },
        },
        {
          id: 'lj_p3', name: '饥饿抢购', desc: '每持有 1 辆汽车，每日 +1 行动点（上限 5）。提车要排队。',
          eff: { perCar: { ap: 1, cap: 5 } },
        },
      ],
    },
    {
      id: 'jackma',
      name: '杰可马',
      alias: '那个英语老师',
      tag: '商场 / 金融 / 教师',
      region: '国内',
      wealth: 29600000000,
      source: 'Forbes 中国富豪榜 2026-01',
      days: 35,
      avatar: '🧑‍🏫',
      desc: '我对钱没有兴趣——所以他要把钱全花掉，证明这一点。',
      // 股市崩盘流签名卡组：私人银行黑卡（股票操作+3/上限×2）+ 私人中央银行牌照（单次上限×2）
      deck: ['p_f1', 'k_f6'],
      perks: [
        {
          id: 'jm_p1', name: '商场达人', desc: '商场消费 +50%，且商场行动点 -1（最低 1）。',
          eff: { sceneSpend: [{ scene: 'mall', pct: 0.5 }], sceneAp: [{ scene: 'mall', delta: -1 }] },
        },
        {
          id: 'jm_p2', name: '金融', desc: '股票场景每日操作次数 +3。',
          eff: { stockOps: 3 },
        },
        {
          id: 'jm_p3', name: '教师', desc: '每完成 1 个挑战任务，额外获得 30% 积分奖励。',
          eff: { missionPoint: 0.3 },
        },
      ],
    },
  ];

  /* 每位首富的主流派（用于开局词条与卡牌联动）
   * 3 个专属词条按出现顺序固定为：蓝 / 紫 / 金（贴合"一条金色、一条紫色、一条蓝色"） */
  const SCHOOL_MAP = {
    tesla: 'digital', bezos: 'mall', zuck: 'digital', ellison: 'estate', buffett: 'stock',
    arnault: 'lux', zhangym: 'point', zhongss: 'mall', pony: 'point', huangz: 'point',
    leijun: 'car', jackma: 'stock',
  };
  const PERK_RARITY = ['blue', 'purple', 'gold'];

  RR.TYCOONS.forEach((t) => {
    t.school = SCHOOL_MAP[t.id] || 'general';
    t.perks.forEach((p, i) => {
      p.r = PERK_RARITY[i % 3];
      p.school = t.school;
    });
  });

  RR.getTycoon = function (id) {
    return RR.TYCOONS.find((t) => t.id === id) || null;
  };
})(window.RR);
