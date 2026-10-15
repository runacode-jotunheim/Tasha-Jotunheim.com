// Ранги программы Йотунхейм (см. server/REFERRAL.md, раздел 5).
// «Друг» = приглашённый, у которого сумма зачтённых (через 14 дней) оплат >= minFriendSum.
const RANKS = [
  { name: 'Мини-Йотун',    pct: 3, friendJC: 1000 },
  { name: 'Йотун',         pct: 3,  friends: { n: 5,  min: 7000 },  own: { sum: 24000, artifacts: 3 },                bonusJC: 500, friendJC: 1250 },
  { name: 'Старший Йотун', pct: 5,  friends: { n: 10, min: 7000 },  own: { sum: 50000 },                                 bonusJC: 1000, friendJC: 1500 },
  { name: 'Ёрмунганд',     pct: 5,  friends: { n: 15, min: 10000 }, own: { sum: 75000 },                                 bonusJC: 1500, friendJC: 1750 },
  { name: 'Хель',          pct: 7,  friends: { n: 20, min: 15000 }, own: { sum: 100000 },                                bonusJC: 2000, friendJC: 2000 },
  { name: 'Локи',          pct: 7,  friends: { n: 25, min: 15000 }, own: { sum: 150000, plus: { n: 3,  min: 10000 } }, bonusJC: 3000, friendJC: 2250 },
  { name: 'Имир',          pct: 10, friends: { n: 30, min: 20000 }, own: { sum: 250000, plus: { n: 5,  min: 15000 } }, bonusJC: 3500, friendJC: 2500 },
  { name: 'Бергельмир',    pct: 15, friends: { n: 40, min: 25000 }, own: { sum: 300000, plus: { n: 15, min: 20000 } }, bonusJC: 5000, friendJC: 3000 },
];

// stats: { ownSum, ownArtifacts, friendSums: [сумма зачтённых покупок каждого друга] }
function friendsAtLeast(stats, min) {
  return stats.friendSums.filter((s) => s >= min).length;
}

function meets(rank, stats) {
  if (!rank.friends) return true;
  if (friendsAtLeast(stats, rank.friends.min) >= rank.friends.n) return true;
  const own = rank.own;
  if (stats.ownSum < own.sum) return false;
  if (own.artifacts && stats.ownArtifacts < own.artifacts) return false;
  if (own.plus && friendsAtLeast(stats, own.plus.min) < own.plus.n) return false;
  return true;
}

function computeRank(stats) {
  let r = 0;
  for (let i = 1; i < RANKS.length; i++) if (meets(RANKS[i], stats)) r = i;
  return r;
}

// Что осталось до следующего ранга — для полосы прогресса в ЛК.
function progressTo(next, stats) {
  const rk = RANKS[next];
  if (!rk) return null;
  const viaFriends = Math.max(0, rk.friends.n - friendsAtLeast(stats, rk.friends.min));
  const own = {
    sumLeft: Math.max(0, rk.own.sum - stats.ownSum),
    artifactsLeft: rk.own.artifacts ? Math.max(0, rk.own.artifacts - stats.ownArtifacts) : 0,
    friendsLeft: rk.own.plus ? Math.max(0, rk.own.plus.n - friendsAtLeast(stats, rk.own.plus.min)) : 0,
    friendsMin: rk.own.plus ? rk.own.plus.min : 0,
  };
  return { rank: next, name: rk.name, friendsLeft: viaFriends, friendsMin: rk.friends.min, own };
}

module.exports = { RANKS, computeRank, progressTo, meets };
