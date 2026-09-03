/* 挑战任务 / 称号达成检测 */
window.RR = window.RR || {};

(function (RR) {
  'use strict';

  RR.checkMissions = function (S) {
    const done = [];
    RR.MISSIONS.forEach((m) => {
      if (S.doneMissions.indexOf(m.id) >= 0) return;
      const [cur, goal] = m.p(S);
      if (cur >= goal) {
        S.doneMissions.push(m.id);
        done.push({ id: m.id, name: m.name, desc: m.desc, luck: m.luck });
      }
    });
    return done;
  };

  RR.checkTitles = function (S) {
    const got = [];
    RR.TITLES.forEach((t) => {
      if (S.doneTitles.indexOf(t.id) >= 0) return;
      const [cur, goal] = t.p(S);
      if (cur >= goal) {
        S.doneTitles.push(t.id);
        const b = RR.bonuses(S);
        const pts = Math.round((t.reward.points || 0) * (1 + b.missionPoint));
        if (pts) S.points += pts;
        if (t.reward.slot) S.bonusSlots = (S.bonusSlots || 0) + t.reward.slot;
        got.push({ id: t.id, name: t.name, desc: t.desc, points: pts, slot: t.reward.slot || 0 });
        RR.log(S, '🏅 获得称号【' + t.name + '】');
      }
    });
    return got;
  };

  RR.checkAll = function (S) {
    return { missions: RR.checkMissions(S), titles: RR.checkTitles(S) };
  };
})(window.RR);
