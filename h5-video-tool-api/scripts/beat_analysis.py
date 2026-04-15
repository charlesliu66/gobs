"""
BGM 节拍分析脚本
用法：python beat_analysis.py <audio_path>
输出：JSON（stdout），格式见下方 BeatResult

依赖：librosa, soundfile, numpy
若未安装 librosa，输出 {"error": "librosa_not_installed"}，TypeScript 层降级处理。
"""
import sys
import json
import os


def analyze(audio_path: str) -> dict:
    try:
        import librosa
        import numpy as np
    except ImportError:
        return {"error": "librosa_not_installed"}

    if not os.path.exists(audio_path):
        return {"error": f"file_not_found: {audio_path}"}

    try:
        y, sr = librosa.load(audio_path, sr=None, mono=True, duration=300)
    except Exception as e:
        return {"error": f"load_failed: {e}"}

    duration = librosa.get_duration(y=y, sr=sr)

    # BPM + 节拍时间点
    try:
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        bpm = float(tempo) if not hasattr(tempo, "__len__") else float(tempo[0])
    except Exception:
        bpm = 120.0
        beat_interval = 60.0 / bpm
        beat_times = [round(i * beat_interval, 3) for i in range(int(duration / beat_interval))]

    # 能量曲线（RMS 分帧，用于划分段落）
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    rms_times = librosa.frames_to_time(range(len(rms)), sr=sr, hop_length=hop)

    # 平滑能量
    import numpy as np
    window = max(1, int(sr / hop / 4))  # ~0.25s 平滑窗口
    rms_smooth = np.convolve(rms, np.ones(window) / window, mode="same")
    rms_norm = rms_smooth / (rms_smooth.max() + 1e-9)

    # 划分段落（基于相对能量阈值）
    sections = _detect_sections(rms_norm, rms_times, duration)

    beat_interval = 60.0 / bpm if bpm > 0 else 0.5

    return {
        "bpm": round(bpm, 1),
        "beatInterval": round(beat_interval, 4),
        "duration": round(duration, 2),
        "beatTimes": [round(t, 3) for t in beat_times[:200]],  # 最多 200 个节拍点
        "sections": sections,
    }


def _detect_sections(rms_norm, rms_times, duration: float) -> list:
    """简单能量段落检测：将音频按能量分为 intro / build / drop / outro 四段"""
    import numpy as np
    n = len(rms_norm)
    if n < 4:
        return [{"name": "main", "startSec": 0.0, "endSec": round(duration, 2), "energy": "mid"}]

    # 整体能量四分位
    q25 = float(np.percentile(rms_norm, 25))
    q75 = float(np.percentile(rms_norm, 75))

    def energy_label(e: float) -> str:
        if e < q25 + (q75 - q25) * 0.3:
            return "low"
        elif e > q25 + (q75 - q25) * 0.7:
            return "high"
        return "mid"

    # 把整段切成 N 个片段，逐段检测能量
    seg_count = min(16, max(4, int(duration / 5)))
    seg_dur = duration / seg_count
    raw_segs = []
    for i in range(seg_count):
        s = i * seg_dur
        e = (i + 1) * seg_dur
        mask = (rms_times >= s) & (rms_times < e)
        avg_e = float(np.mean(rms_norm[mask])) if mask.any() else 0.0
        raw_segs.append({"s": s, "e": e, "energy": avg_e, "label": energy_label(avg_e)})

    # 合并连续相同 label 的段
    sections = []
    cur = raw_segs[0].copy()
    for seg in raw_segs[1:]:
        if seg["label"] == cur["label"]:
            cur["e"] = seg["e"]
        else:
            sections.append(cur)
            cur = seg.copy()
    sections.append(cur)

    # 最终 label：如果只有 1 段，使用通用 label
    # 如果第一段 low、最后一段 low，标记为 intro/outro
    result = []
    total = len(sections)
    for idx, sec in enumerate(sections):
        if idx == 0 and sec["label"] == "low":
            name = "intro"
        elif idx == total - 1 and sec["label"] == "low":
            name = "outro"
        elif sec["label"] == "high":
            name = "drop"
        elif sec["label"] == "mid":
            name = "build"
        else:
            name = "bridge"
        result.append({
            "name": name,
            "startSec": round(sec["s"], 2),
            "endSec": round(sec["e"], 2),
            "energy": sec["label"],
        })
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: beat_analysis.py <audio_path>"}))
        sys.exit(1)
    result = analyze(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
