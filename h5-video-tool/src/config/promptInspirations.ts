export type PromptInspirationCategory = {
  id: string;
  nameZh: string;
  nameEn: string;
  prompts: string[];
};

export const PROMPT_INSPIRATIONS: PromptInspirationCategory[] = [
  {
    id: 'game_character',
    nameZh: '角色登场',
    nameEn: 'Character Reveal',
    prompts: [
      '一位身披暗金铠甲的战士在废墟中拔剑，碎石飞溅，逆光剪影，电影级特写',
      '法师悬浮于魔法阵上方，周身环绕蓝色符文光环，缓缓睁眼，镜头低角度推进',
    ],
  },
  {
    id: 'game_scene',
    nameZh: '场景氛围',
    nameEn: 'Game Scene',
    prompts: [
      '黑暗地牢深处，火把照亮石壁上的古老壁画，镜头缓慢推进，空气中有尘埃和雾气',
      '未来都市天际线，飞行器穿梭于霓虹高楼之间，俯拍视角，赛博朋克色彩',
    ],
  },
  {
    id: 'action',
    nameZh: '动作爆点',
    nameEn: 'Action Beat',
    prompts: [
      '角色从高处跃下，在空中旋转挥刀，慢动作特写，火花四溅，落地冲击波扩散',
      '两名战士对峙后同时冲锋，武器碰撞瞬间时间冻结，能量裂纹向四周蔓延',
    ],
  },
];
