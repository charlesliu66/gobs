const STOP_WORDS = new Set([
  '的', '在', '和', '与', '持', '拿', '着', '了', '是', '有', '要', '秒', '分',
  '一个', '可以', '进行', '这个', '那个', '什么', '怎么', '如何',
]);

export function extractKeywords(text: string): string[] {
  const nums = text.match(/\d+[秒分]?/g) || [];
  const words = text
    .replace(/\d+[秒分]?/g, '')
    .split(/[\s，。、；：！？]+/)
    .filter(Boolean);
  const filtered = [
    ...nums,
    ...words.filter((w) => w.length >= 2 && !STOP_WORDS.has(w)),
  ];
  return [...new Set(filtered)];
}
