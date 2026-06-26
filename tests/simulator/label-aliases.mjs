export const LABEL_ALIASES = {
  "可教不好替": ["教得会替不了"],
  "边界感": ["有分寸型"],
  "有底线型": ["底线守门型"],
  "空话免疫": ["空话过敏型"],
  "AI 放大型": ["人机放大型"],
  "经验型": ["经验压舱型", "老练直觉"],
  "经验固化型": ["老经验卡住型"],
  "慢表达品味型": ["看得准说得慢"],
  "伪抗蒸型": ["嘴硬难蒸型"],
  "真人核心型": ["真人在场型"],
  "待开机型": ["还没开机型"],
  "方法型": ["方法成型型"],
  "会翻译型": ["讲得明白型"],
};

export function expandLabelTerms(labels = []) {
  const expanded = new Set();
  for (const label of labels) {
    expanded.add(label);
    for (const alias of LABEL_ALIASES[label] || []) expanded.add(alias);
  }
  return [...expanded];
}
