import type { ScenePlanItem, StoryArcLayer, StoryCharacter } from '../productionTypes';

export function StoryAssetFieldsFromOutline({
  story,
  patchStory,
}: {
  story: StoryArcLayer;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">角色（来自剧本）</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                characters: [
                  ...s.characters,
                  {
                    name: `角色${s.characters.length + 1}`,
                    goal: '',
                    conflict: '',
                    role: 'supporting',
                  } satisfies StoryCharacter,
                ],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加角色
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {story.characters.map((c, ci) => (
            <div
              key={`${c.name}-${ci}`}
              className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  value={c.name}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, name: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="min-w-[8rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm font-medium"
                  placeholder="姓名"
                />
                <select
                  value={c.role ?? 'other'}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, role: e.target.value as StoryCharacter['role'] } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
                >
                  <option value="protagonist">主角</option>
                  <option value="supporting">配角</option>
                  <option value="antagonist">对立/反派</option>
                  <option value="other">其他</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      characters: s.characters.filter((_, i) => i !== ci),
                    }))
                  }
                  className="text-xs text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
              <label className="block text-[10px] text-[var(--color-text-muted)]">
                动机 / 目标
                <input
                  value={c.goal}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, goal: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-[10px] text-[var(--color-text-muted)]">
                冲突
                <textarea
                  value={c.conflict}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, conflict: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  rows={2}
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-[10px] text-[var(--color-text-muted)]">
                弧光（可选）
                <input
                  value={c.arc ?? ''}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, arc: e.target.value || undefined } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">拍摄地点 / 空间</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                scenePlan: [
                  ...s.scenePlan,
                  { id: `loc-${Date.now()}`, name: '', purpose: '' } satisfies ScenePlanItem,
                ],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加地点
          </button>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          「地点名称」须为可实拍的空间（如村庄、家中），勿用物件名或抽象节拍名。
        </p>
        <div className="mt-3 space-y-3">
          {story.scenePlan.map((sc, si) => (
            <div
              key={sc.id}
              className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
            >
              <div className="flex flex-wrap gap-2">
                <label className="text-[10px] text-[var(--color-text-muted)]">
                  ID（与分镜 sceneRef 对应）
                  <input
                    value={sc.id}
                    onChange={(e) =>
                      patchStory((s) => {
                        const scenePlan = s.scenePlan.map((x, i) =>
                          i === si ? { ...x, id: e.target.value } : x,
                        );
                        return { ...s, scenePlan };
                      })
                    }
                    className="mt-0.5 block w-full min-w-[6rem] rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      scenePlan: s.scenePlan.filter((_, i) => i !== si),
                    }))
                  }
                  className="ml-auto self-end text-xs text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
              <label className="mt-2 block text-xs text-[var(--color-text-muted)]">
                地点名称
                <input
                  value={sc.name}
                  onChange={(e) =>
                    patchStory((s) => {
                      const scenePlan = s.scenePlan.map((x, i) =>
                        i === si ? { ...x, name: e.target.value } : x,
                      );
                      return { ...s, scenePlan };
                    })
                  }
                  className="mt-1 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-xs text-[var(--color-text-muted)]">
                叙事作用
                <textarea
                  value={sc.purpose}
                  onChange={(e) =>
                    patchStory((s) => {
                      const scenePlan = s.scenePlan.map((x, i) =>
                        i === si ? { ...x, purpose: e.target.value } : x,
                      );
                      return { ...s, scenePlan };
                    })
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">重要道具</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                importantProps: [...(s.importantProps ?? []), { name: '', notes: '' }],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加道具
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {(story.importantProps ?? []).map((p, pi) => (
            <div key={pi} className="flex flex-wrap items-start gap-2 rounded-lg bg-[var(--color-surface)] p-2">
              <input
                value={p.name}
                onChange={(e) =>
                  patchStory((s) => {
                    const importantProps = [...(s.importantProps ?? [])];
                    importantProps[pi] = { ...importantProps[pi], name: e.target.value };
                    return { ...s, importantProps };
                  })
                }
                placeholder="道具名"
                className="min-w-[6rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm"
              />
              <input
                value={p.notes ?? ''}
                onChange={(e) =>
                  patchStory((s) => {
                    const importantProps = [...(s.importantProps ?? [])];
                    importantProps[pi] = { ...importantProps[pi], notes: e.target.value };
                    return { ...s, importantProps };
                  })
                }
                placeholder="说明（多次出现的关键物件）"
                className="min-w-[8rem] flex-[2] rounded border border-[var(--color-border)] px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  patchStory((s) => ({
                    ...s,
                    importantProps: (s.importantProps ?? []).filter((_, i) => i !== pi),
                  }))
                }
                className="text-xs text-red-400 hover:underline"
              >
                删
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

