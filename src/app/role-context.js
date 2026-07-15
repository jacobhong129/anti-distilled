export const WORK_ROLE_OPTIONS = [
  ["product", "产品 / 设计"],
  ["tech", "研发 / 技术"],
  ["growth", "运营 / 增长"],
  ["brand", "市场 / 品牌"],
  ["strategy", "管理 / 战略"],
  ["other", "其他"],
];

const ROLE_READINGS = {
  product: "你在产品和设计工作里最难交接的，少有工具和步骤，更多是对象变化后要不要改题、改边界。",
  tech: "你在研发工作里更像最后一道停止条件：常规流程能跑，异常和代价仍需要你来判断。",
  growth: "你在运营和增长工作里会同时看数字与场面，不容易把短期上涨直接当成长期正确。",
  brand: "你在市场和品牌工作里最难复制的是那一下取舍：什么该说、对谁说、什么时候宁可不说。",
  strategy: "你在管理和战略工作里留下的价值，是让规则遇到真实的人时还能继续成立。",
  other: "你的工作不必被一个岗位名框住。更值得看的，是哪些决定总有人回来找你确认。",
};

export function buildRoleContextReading(roleContext) {
  const roleId = roleContext?.roleId;
  return roleId && ROLE_READINGS[roleId] ? ROLE_READINGS[roleId] : "";
}

export function normalizeRoleContext(roleId) {
  if (!WORK_ROLE_OPTIONS.some(([value]) => value === roleId)) return null;
  return { roleId };
}
