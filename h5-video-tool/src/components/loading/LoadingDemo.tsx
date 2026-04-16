/**
 * Loading 体验演示页 — 用于预览各场景 loading 效果
 *
 * 可通过按钮触发不同场景的 loading 状态，测试文案轮播、进度条、彩蛋交互。
 */
import { useState, useCallback } from 'react';
import { DungeonLoadingScreen, useLoadingOrchestrator } from './index';
import type { LoadingScene } from './types';

const SCENES: Array<{ id: LoadingScene; label: string; icon: string }> = [
  { id: 'dungeon-entrance', label: '地牢入口', icon: '🚪' },
  { id: 'tavern', label: '酒馆匹配', icon: '🍺' },
  { id: 'blacksmith', label: '铁匠装备', icon: '⚔️' },
  { id: 'settlement', label: '局后结算', icon: '📜' },
  { id: 'reconnect', label: '断线重连', icon: '🔌' },
];

export default function LoadingDemo() {
  const [selectedScene, setSelectedScene] = useState<LoadingScene>('dungeon-entrance');
  const [simulateDuration, setSimulateDuration] = useState(10);
  const [muted, setMuted] = useState(false);

  const [loadingState, actions] = useLoadingOrchestrator({
    userSegment: 'active',
    onCancel: (id) => {
      console.log(`[Demo] 取消任务: ${id}`);
      actions.resolve(id);
    },
    onRetry: (id) => {
      console.log(`[Demo] 重试任务: ${id}`);
      simulateLoading(selectedScene, simulateDuration);
    },
  });

  const simulateLoading = useCallback(
    (scene: LoadingScene, durationSec: number) => {
      const taskId = `demo-${Date.now()}`;
      actions.start(taskId, scene, true);

      const totalMs = durationSec * 1000;
      const phases = ['鉴权中…', '拉取配置…', '分配房间…', '加载资源…', '准备就绪'];
      const phaseInterval = totalMs / phases.length;

      phases.forEach((phase, i) => {
        setTimeout(() => {
          actions.progress(taskId, phase, ((i + 1) / phases.length) * 100);
        }, phaseInterval * i);
      });

      setTimeout(() => {
        if (Math.random() > 0.15) {
          actions.resolve(taskId);
        } else {
          actions.reject(taskId, 'TIMEOUT: 连接地牢服务器超时');
        }
      }, totalMs);
    },
    [actions],
  );

  const handleStart = () => {
    simulateLoading(selectedScene, simulateDuration);
  };

  return (
    <div className="min-h-screen bg-stone-950 p-6 text-stone-200">
      <h1 className="mb-6 text-xl font-bold text-amber-400">
        🏰 地牢 Loading 体验演示
      </h1>

      {/* 场景选择 */}
      <div className="mb-4">
        <label className="mb-2 block text-sm text-stone-400">选择场景</label>
        <div className="flex flex-wrap gap-2">
          {SCENES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScene(s.id)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                selectedScene === s.id
                  ? 'border-amber-500/50 bg-amber-900/30 text-amber-300'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:bg-stone-700/50'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 模拟时长 */}
      <div className="mb-4">
        <label className="mb-2 block text-sm text-stone-400">
          模拟等待时长: {simulateDuration}s
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={simulateDuration}
          onChange={(e) => setSimulateDuration(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="mt-1 flex justify-between text-xs text-stone-500">
          <span>1s (无感)</span>
          <span>3s (轻提示)</span>
          <span>8s (重点)</span>
          <span>15s (高风险)</span>
          <span>20s (异常)</span>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleStart}
          disabled={loadingState.active}
          className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          🚀 启动 Loading
        </button>
        <button
          onClick={() => setMuted(!muted)}
          className="rounded-lg border border-stone-600 bg-stone-800 px-4 py-2.5 text-sm text-stone-300"
        >
          {muted ? '🔇 已静音' : '🔊 有声'}
        </button>
      </div>

      {/* 状态面板 */}
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/50 p-4">
        <h2 className="mb-3 text-sm font-medium text-stone-400">当前状态</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-stone-500">active: </span>
            <span className={loadingState.active ? 'text-green-400' : 'text-red-400'}>
              {String(loadingState.active)}
            </span>
          </div>
          <div>
            <span className="text-stone-500">tier: </span>
            <span className="text-amber-300">{loadingState.tier}</span>
          </div>
          <div>
            <span className="text-stone-500">elapsed: </span>
            <span className="text-stone-300">{(loadingState.elapsedMs / 1000).toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-stone-500">phase: </span>
            <span className="text-stone-300">{loadingState.phase ?? '-'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-stone-500">copy: </span>
            <span className="text-stone-300">{loadingState.currentCopy || '-'}</span>
          </div>
        </div>
      </div>

      {/* 使用提示 */}
      <div className="mt-6 rounded-xl border border-stone-700/30 bg-stone-900/30 p-4 text-xs text-stone-500">
        <p className="mb-1">💡 操作提示：</p>
        <ul className="list-inside list-disc space-y-1">
          <li>地牢入口场景：点击画面中央可敲门（5次触发彩蛋）</li>
          <li>所有场景：点击左右两侧可点亮火把</li>
          <li>等待超过 8s 后会出现「求命签」按钮</li>
          <li>15% 概率模拟加载失败（触发错误态）</li>
        </ul>
      </div>

      {/* Loading 全屏遮罩 */}
      <DungeonLoadingScreen
        state={loadingState}
        onCancel={actions.cancel}
        onRetry={() => simulateLoading(selectedScene, simulateDuration)}
        onBack={() => actions.resolve(loadingState.task?.id ?? '')}
        muted={muted}
      />
    </div>
  );
}
