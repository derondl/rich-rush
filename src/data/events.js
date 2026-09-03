/* 随机事件库：消费时随机弹出，选择后获得词条
 * 钱花得越多 → 给的卡越好。这就是本游戏的底层逻辑。
 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  /* 选项 eff：
   *   spend / spendPct / ap / apDelta / points / card(稀有度) / luckDelta
   *   unlockInvest  立即获得一个投资席位
   *   forceStock    强制进入一次股票结算
   *   nothing       什么都不做
   */
  RR.EVENTS = [
    {
      id: 'e01', emoji: '📹', title: '主播喊你榜一大哥',
      desc: '"感谢榜一大哥！大哥再来一个火箭！" 直播间三万人看着你。',
      options: [
        { label: '刷十个火箭', desc: '花 $100,000，拿下一张绿色卡', eff: { spend: 100000, card: 'green' } },
        { label: '直接霸榜', desc: '花 $1,000,000，拿下一张蓝色卡', eff: { spend: 1000000, card: 'blue' } },
        { label: '假装掉线', desc: '-1 行动点，什么也没发生', eff: { apDelta: -1 } },
      ],
    },
    {
      id: 'e02', emoji: '👟', title: '限量球鞋发售',
      desc: '门口排了两百人，黄牛报价已经翻了三倍。',
      options: [
        { label: '雇人排队', desc: '花 $50,000，+3 行动点', eff: { spend: 50000, ap: 3 } },
        { label: '亲自排队', desc: '-3 行动点，但拿到一张紫色卡', eff: { apDelta: -3, card: 'purple' } },
        { label: '加价全收', desc: '花 $500,000 买断所有尺码', eff: { spend: 500000, card: 'blue' } },
      ],
    },
    {
      id: 'e03', emoji: '🤝', title: '朋友借钱',
      desc: '二十年交情，他说三个月就还。你们都知道这句话是什么意思。',
      options: [
        { label: '借五万…哦不，五十万', desc: '花 $500,000，获得绿色卡', eff: { spend: 500000, card: 'green' } },
        { label: '直接给五百万', desc: '花 $5,000,000，获得蓝色卡', eff: { spend: 5000000, card: 'blue' } },
        { label: '装作没看见', desc: '什么也没发生，但良心有点痛', eff: { nothing: true } },
      ],
    },
    {
      id: 'e04', emoji: '🧾', title: '税务顾问来电',
      desc: '"先生，您的账户结构有点……有创意。"',
      options: [
        { label: '老实缴了', desc: '花掉当前资产的 0.5%，换一张紫色卡', eff: { spendPct: 0.005, card: 'purple' } },
        { label: '请顶级律师团', desc: '花 $10,000,000，换一张蓝色卡', eff: { spend: 10000000, card: 'blue' } },
        { label: '先出国避避', desc: '花 $2,000,000，+4 行动点', eff: { spend: 2000000, ap: 4 } },
      ],
    },
    {
      id: 'e05', emoji: '💒', title: '前任的婚礼请柬',
      desc: '烫金的，很厚，很沉。请柬背面写着"座位号 88"。',
      options: [
        { label: '包下全城广告牌祝福', desc: '花 $20,000,000，紫色卡 +2 行动点', eff: { spend: 20000000, card: 'purple', ap: 2 } },
        { label: '随个大红包', desc: '花 $200,000，绿色卡', eff: { spend: 200000, card: 'green' } },
        { label: '当天安排满会议', desc: '+3 行动点，什么也没花', eff: { ap: 3 } },
      ],
    },
    {
      id: 'e06', emoji: '🚗', title: '车被刮了',
      desc: '停车场监控刚好坏了。划痕从车头拉到车尾。',
      options: [
        { label: '全车重喷', desc: '花 $200,000，绿色卡', eff: { spend: 200000, card: 'green' } },
        { label: '直接换新车', desc: '花 $2,000,000，蓝色卡', eff: { spend: 2000000, card: 'blue' } },
        { label: '把整个停车场买了', desc: '花 $20,000,000，紫色卡', eff: { spend: 20000000, card: 'purple' } },
      ],
    },
    {
      id: 'e07', emoji: '🏗️', title: '装修公司跑路了',
      desc: '设计师、工长、水电师傅，三个人的电话都是空号。',
      options: [
        { label: '追加预算重来', desc: '花 $5,000,000，蓝色卡', eff: { spend: 5000000, card: 'blue' } },
        { label: '全部推倒重装', desc: '花 $50,000,000，紫色卡', eff: { spend: 50000000, card: 'purple' } },
        { label: '自己住毛坯', desc: '+2 行动点，省了钱（你的敌人）', eff: { ap: 2 } },
      ],
    },
    {
      id: 'e08', emoji: '🔨', title: '拍卖会气氛到了',
      desc: '你举了一次牌，对面举了两次。全场都在看你。',
      options: [
        { label: '继续举！', desc: '花当前资产的 1%，紫色卡', eff: { spendPct: 0.01, card: 'purple' } },
        { label: '再加五倍', desc: '花当前资产的 3%，金色卡', eff: { spendPct: 0.03, card: 'gold' } },
        { label: '优雅收手', desc: '获得一张白板卡作为纪念', eff: { card: 'white' } },
      ],
    },
    {
      id: 'e09', emoji: '✈️', title: '私人飞机被临时征用',
      desc: '空管说航路上有"特殊情况"，你的机位被排在第三顺位。',
      options: [
        { label: '再包两架备用', desc: '花 $30,000,000，紫色卡', eff: { spend: 30000000, card: 'purple' } },
        { label: '买下整条航线', desc: '花 $300,000,000，金色卡', eff: { spend: 300000000, card: 'gold' } },
        { label: '坐民航吧', desc: '+2 行动点，假装体验生活', eff: { ap: 2 } },
      ],
    },
    {
      id: 'e10', emoji: '📊', title: '一条"内幕消息"',
      desc: '一个你信不过的人，说了一个你听得懂的机会。',
      options: [
        { label: '全仓杀入', desc: '花 $50,000,000 买入，蓝色卡', eff: { spend: 50000000, card: 'blue', forceStock: true } },
        { label: '小赌怡情', desc: '花 $5,000,000 买入，绿色卡', eff: { spend: 5000000, card: 'green', forceStock: true } },
        { label: '不信', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e11', emoji: '🍽️', title: '网红要来探店',
      desc: '"哥，来我这吃顿饭，我给你拍条视频，保你火。"',
      options: [
        { label: '包场请全店', desc: '花 $1,000,000，蓝色卡', eff: { spend: 1000000, card: 'blue' } },
        { label: '把店买下来', desc: '花 $30,000,000，紫色卡', eff: { spend: 30000000, card: 'purple' } },
        { label: '婉拒', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e12', emoji: '🏘️', title: '房东要涨租',
      desc: '你的商铺租约到期，房东说行情变了。',
      options: [
        { label: '把整栋买下来', desc: '花 $50,000,000，紫色卡', eff: { spend: 50000000, card: 'purple' } },
        { label: '认了，签新约', desc: '花 $5,000,000，绿色卡', eff: { spend: 5000000, card: 'green' } },
        { label: '搬走', desc: '+3 行动点', eff: { ap: 3 } },
      ],
    },
    {
      id: 'e13', emoji: '🎓', title: '老同学聚会',
      desc: '班长在群里发了接龙，默认你来买单。',
      options: [
        { label: '全场我买单', desc: '花 $300,000，绿色卡', eff: { spend: 300000, card: 'green' } },
        { label: '包下整个度假村', desc: '花 $15,000,000，紫色卡 +3 行动点', eff: { spend: 15000000, card: 'purple', ap: 3 } },
        { label: 'AA', desc: '什么也没发生，群里安静了', eff: { nothing: true } },
      ],
    },
    {
      id: 'e14', emoji: '💝', title: '慈善晚宴举牌',
      desc: '主持人念到你的名字，全场目光聚焦。',
      options: [
        { label: '捐 $10,000,000', desc: '紫色卡 + 2,000 积分', eff: { spend: 10000000, card: 'purple', points: 2000 } },
        { label: '捐 $500,000', desc: '绿色卡 + 300 积分', eff: { spend: 500000, card: 'green', points: 300 } },
        { label: '捐 $500,000,000', desc: '金色卡 + 20,000 积分', eff: { spend: 500000000, card: 'gold', points: 20000 } },
      ],
    },
    {
      id: 'e15', emoji: '🅿️', title: '车库漏水了',
      desc: '顶层管道老化，你的三台车泡在水里。',
      options: [
        { label: '重建整个车库', desc: '花 $8,000,000，蓝色卡', eff: { spend: 8000000, card: 'blue' } },
        { label: '买下隔壁车位', desc: '花 $800,000，绿色卡', eff: { spend: 800000, card: 'green' } },
        { label: '车不要了买新的', desc: '花 $60,000,000，紫色卡', eff: { spend: 60000000, card: 'purple' } },
      ],
    },
    {
      id: 'e16', emoji: '👨‍🍳', title: '米其林主厨上门',
      desc: '他愿意来你家做一桌，只收食材费和"出场费"。',
      options: [
        { label: '办一场私宴', desc: '花 $600,000，蓝色卡', eff: { spend: 600000, card: 'blue' } },
        { label: '请他做一年私厨', desc: '花 $12,000,000，紫色卡', eff: { spend: 12000000, card: 'purple' } },
        { label: '点外卖', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e17', emoji: '👔', title: '品牌方送来样衣',
      desc: '整季新款挂了满满一屋子，销售在旁边微笑等你开口。',
      options: [
        { label: '全系列买下', desc: '花 $3,000,000，蓝色卡', eff: { spend: 3000000, card: 'blue' } },
        { label: '只要一件', desc: '花 $8,000，白板卡', eff: { spend: 8000, card: 'white' } },
        { label: '把品牌买下来', desc: '花当前资产的 2%，金色卡', eff: { spendPct: 0.02, card: 'gold' } },
      ],
    },
    {
      id: 'e18', emoji: '🛥️', title: '游艇被撞了',
      desc: '码头风大，隔壁那艘新贵的船蹭了你的船尾。',
      options: [
        { label: '修', desc: '花 $8,000,000，蓝色卡', eff: { spend: 8000000, card: 'blue' } },
        { label: '换一艘更大的', desc: '花 $80,000,000，紫色卡', eff: { spend: 80000000, card: 'purple' } },
        { label: '把码头买下来', desc: '花 $800,000,000，金色卡', eff: { spend: 800000000, card: 'gold' } },
      ],
    },
    {
      id: 'e19', emoji: '🏫', title: '孩子的入学问题',
      desc: '国际学校说学位紧张，但"校友捐赠通道"一直开着。',
      options: [
        { label: '捐一栋楼', desc: '花 $100,000,000，金色卡', eff: { spend: 100000000, card: 'gold' } },
        { label: '交学费', desc: '花 $2,000,000，蓝色卡', eff: { spend: 2000000, card: 'blue' } },
        { label: '自己办一所', desc: '花 $1,000,000,000，金色卡 +10,000 积分', eff: { spend: 1000000000, card: 'gold', points: 10000 } },
      ],
    },
    {
      id: 'e20', emoji: '🕴️', title: '保镖团队要涨薪',
      desc: '队长递上一份新的报价单，比去年翻了一倍。',
      options: [
        { label: '加，都加上', desc: '花 $5,000,000，蓝色卡 +3 行动点', eff: { spend: 5000000, card: 'blue', ap: 3 } },
        { label: '换一队', desc: '花 $500,000，绿色卡', eff: { spend: 500000, card: 'green' } },
        { label: '自己雇一支安保公司', desc: '花 $80,000,000，紫色卡', eff: { spend: 80000000, card: 'purple' } },
      ],
    },
    {
      id: 'e21', emoji: '🩺', title: '私人医生的年度建议',
      desc: '"先生，您的各项指标都很出色，除了钱包。"',
      options: [
        { label: '全身深度体检', desc: '花 $1,500,000，蓝色卡 +2 行动点', eff: { spend: 1500000, card: 'blue', ap: 2 } },
        { label: '建个私人医疗中心', desc: '花 $200,000,000，金色卡', eff: { spend: 200000000, card: 'gold' } },
        { label: '我还年轻', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e22', emoji: '🔇', title: '邻居投诉噪音',
      desc: '你家的家庭影院低音炮，让整层楼的吊灯都在抖。',
      options: [
        { label: '把邻居的房子买下来', desc: '花 $30,000,000，紫色卡', eff: { spend: 30000000, card: 'purple' } },
        { label: '做全屋隔音', desc: '花 $2,000,000，绿色卡', eff: { spend: 2000000, card: 'green' } },
        { label: '诚意道歉', desc: '+2 行动点', eff: { ap: 2 } },
      ],
    },
    {
      id: 'e23', emoji: '🖼️', title: '拍卖行送来图录',
      desc: '三件拍品，都有"重要私人收藏"的 provenance。',
      options: [
        { label: '买一件', desc: '花 $6,000,000，蓝色卡', eff: { spend: 6000000, card: 'blue' } },
        { label: '三件全包', desc: '花 $60,000,000，紫色卡', eff: { spend: 60000000, card: 'purple' } },
        { label: '把拍卖行买下来', desc: '花当前资产的 1%，金色卡', eff: { spendPct: 0.01, card: 'gold' } },
      ],
    },
    {
      id: 'e24', emoji: '🏚️', title: '老宅片区拆迁',
      desc: '你小时候住的那条街，现在叫"城市更新项目一期"。',
      options: [
        { label: '买下整片街区', desc: '花 $200,000,000，金色卡', eff: { spend: 200000000, card: 'gold' } },
        { label: '拿补偿款走人', desc: '+3,000 积分', eff: { points: 3000 } },
        { label: '原地建一座纪念馆', desc: '花 $2,000,000,000，金色卡 +20,000 积分', eff: { spend: 2000000000, card: 'gold', points: 20000 } },
      ],
    },
    {
      id: 'e25', emoji: '🏝️', title: '私人岛屿被淹了',
      desc: '海平面上升了两厘米，你的沙滩少了一半。',
      options: [
        { label: '加高地基', desc: '花 $50,000,000，紫色卡', eff: { spend: 50000000, card: 'purple' } },
        { label: '再买一座更高的岛', desc: '花 $300,000,000，金色卡', eff: { spend: 300000000, card: 'gold' } },
        { label: '买艘船住上去', desc: '花 $150,000,000，紫色卡', eff: { spend: 150000000, card: 'purple' } },
      ],
    },
    {
      id: 'e26', emoji: '💡', title: '老朋友来谈创业',
      desc: 'BP 只有 12 页，但他讲得眼里有光。',
      options: [
        { label: '投了', desc: '花 $20,000,000，蓝色卡 + 1 个投资席位', eff: { spend: 20000000, card: 'blue', investSlot: 1 } },
        { label: '多给点', desc: '花 $200,000,000，紫色卡 + 1 个投资席位', eff: { spend: 200000000, card: 'purple', investSlot: 1 } },
        { label: '婉拒', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e27', emoji: '⌚', title: '手表走时不准',
      desc: '每天快 4 秒。对你来说，4 秒也能买一辆车。',
      options: [
        { label: '送原厂保养', desc: '花 $300,000，绿色卡', eff: { spend: 300000, card: 'green' } },
        { label: '买块新的', desc: '花 $3,000,000，蓝色卡', eff: { spend: 3000000, card: 'blue' } },
        { label: '买下整个表厂', desc: '花 $800,000,000，金色卡', eff: { spend: 800000000, card: 'gold' } },
      ],
    },
    {
      id: 'e28', emoji: '☄️', title: '有人说明年是世界末日',
      desc: '他发了三十页 PDF，还建了个群。',
      options: [
        { label: '建个末日地堡', desc: '花 $500,000,000，金色卡', eff: { spend: 500000000, card: 'gold' } },
        { label: '买下那座山', desc: '花 $5,000,000,000，金色卡 +30,000 积分', eff: { spend: 5000000000, card: 'gold', points: 30000 } },
        { label: '笑一笑', desc: '+2 行动点', eff: { ap: 2 } },
      ],
    },
    {
      id: 'e29', emoji: '🎤', title: '粉丝见面会',
      desc: '经纪人说：场地越大，粉丝越感动。',
      options: [
        { label: '包下体育场', desc: '花 $15,000,000，紫色卡', eff: { spend: 15000000, card: 'purple' } },
        { label: '线上直播就好', desc: '花 $200,000，绿色卡', eff: { spend: 200000, card: 'green' } },
        { label: '全球巡演', desc: '花 $800,000,000，金色卡', eff: { spend: 800000000, card: 'gold' } },
      ],
    },
    {
      id: 'e30', emoji: '🧵', title: '定制西装改了八次',
      desc: '老师傅的手在抖，但眼神很坚定。',
      options: [
        { label: '加钱，继续改', desc: '花 $400,000，绿色卡', eff: { spend: 400000, card: 'green' } },
        { label: '重新做十套', desc: '花 $4,000,000，蓝色卡', eff: { spend: 4000000, card: 'blue' } },
        { label: '算了，就这样', desc: '什么也没发生', eff: { nothing: true } },
      ],
    },
    {
      id: 'e31', emoji: '🍷', title: '酒庄庄主亲自来访',
      desc: '他带来了三瓶"不外卖"的年份。',
      options: [
        { label: '买下这个年份全部', desc: '花 $5,000,000，蓝色卡', eff: { spend: 5000000, card: 'blue' } },
        { label: '把酒庄买了', desc: '花 $120,000,000，紫色卡', eff: { spend: 120000000, card: 'purple' } },
        { label: '我不喝酒', desc: '+1 行动点', eff: { ap: 1 } },
      ],
    },
    {
      id: 'e32', emoji: '🐎', title: '有人问你买不买马',
      desc: '纯血马，血统可追溯到十八世纪。',
      options: [
        { label: '买一匹', desc: '花 $8,000,000，蓝色卡', eff: { spend: 8000000, card: 'blue' } },
        { label: '买个马场', desc: '花 $150,000,000，紫色卡', eff: { spend: 150000000, card: 'purple' } },
        { label: '买下整个赛事', desc: '花 $2,000,000,000，金色卡', eff: { spend: 2000000000, card: 'gold' } },
      ],
    },
    {
      id: 'e33', emoji: '🛰️', title: '有个卫星发射名额',
      desc: '"只要一点点钱，就能把你的名字送上天。"',
      options: [
        { label: '上一个', desc: '花 $60,000,000，紫色卡', eff: { spend: 60000000, card: 'purple' } },
        { label: '上一组星座', desc: '花 $900,000,000，金色卡', eff: { spend: 900000000, card: 'gold' } },
        { label: '我自己造火箭', desc: '花当前资产的 1.5%，红色卡', eff: { spendPct: 0.015, card: 'red' } },
      ],
    },
    {
      id: 'e34', emoji: '🧬', title: '抗衰老疗程推销',
      desc: '"生理年龄倒退十岁，只需要一个疗程。"',
      options: [
        { label: '来一个疗程', desc: '花 $30,000,000，紫色卡', eff: { spend: 30000000, card: 'purple' } },
        { label: '把这个诊所买了', desc: '花 $600,000,000，金色卡', eff: { spend: 600000000, card: 'gold' } },
        { label: '长生不老研究计划', desc: '花当前资产的 2%，红色卡', eff: { spendPct: 0.02, card: 'red' } },
      ],
    },
  ];

  RR.getEvent = function (id) {
    return RR.EVENTS.find((e) => e.id === id);
  };
})(window.RR);
