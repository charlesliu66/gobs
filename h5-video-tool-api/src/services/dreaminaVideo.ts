/**
 * 即梦 Dreamina 视频生成：通过本机已安装的 dreamina CLI + skill 目录下的 Python wrapper。
 * 需：1) dreamina 在 PATH 且已 dreamina login；2) PYTHON 可运行；3) DREAMINA_SCRIPTS_DIR 或默认指向 QAS .cursor/skills/dreamina-cli-skill/scripts
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import fsSync from 'fs';
import { randomBytes } from 'crypto';

const DREAMINA_TEXT2VIDEO = 'dreamina-text2video';
const DREAMINA_IMAGE2VIDEO = 'dreamina-image2video';
/** 全能参考：multimodal2video（多图/多视频/多音频 + @ 文案） */
export const DREAMINA_MULTIMODAL = 'dreamina-multimodal';

export function isDreaminaModel(model?: string | null): boolean {
  const m = model?.trim().toLowerCase() ?? '';
  return m === DREAMINA_TEXT2VIDEO || m === DREAMINA_IMAGE2VIDEO || m === DREAMINA_MULTIMODAL;
}

export function isDreaminaMultimodalModel(model?: string | null): boolean {
  return model?.trim().toLowerCase() === DREAMINA_MULTIMODAL;
}

export function getDreaminaModelIds(): string[] {
  return [DREAMINA_MULTIMODAL, DREAMINA_TEXT2VIDEO, DREAMINA_IMAGE2VIDEO];
}

export function isDreaminaEnabled(): boolean {
  if (process.env.DREAMINA_ENABLED === '0' || process.env.DREAMINA_ENABLED === 'false') return false;
  if (process.env.DREAMINA_ENABLED === '1' || process.env.DREAMINA_ENABLED === 'true') return true;
  try {
    return fsSync.existsSync(getDreaminaScriptsDir());
  } catch {
    return false;
  }
}

export function getDreaminaScriptsDir(): string {
  const env = process.env.DREAMINA_SCRIPTS_DIR?.trim();
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), '..', '.cursor', 'skills', 'dreamina-cli-skill', 'scripts');
}

/** Windows：未配置 PYTHON_EXE 时扫描常见安装目录，避免 PATH 不含 `python` 导致 spawn ENOENT */
function defaultWindowsPythonExe(): string | null {
  const local = process.env.LOCALAPPDATA;
  if (!local) return null;
  const base = path.join(local, 'Programs', 'Python');
  if (!fsSync.existsSync(base)) return null;
  try {
    const dirs = fsSync
      .readdirSync(base)
      .filter((d) => /^Python3\d+$/i.test(d))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const d of dirs) {
      const exe = path.join(base, d, 'python.exe');
      if (fsSync.existsSync(exe)) return exe;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * spawn 用的 Python：`PYTHON_EXE` 优先；Windows 再试本机 Python313/312… 安装路径，最后回退 `py -3`（Launcher）。
 */
function getPythonSpawn(): { file: string; argvPrefix: string[] } {
  const env = process.env.PYTHON_EXE?.trim();
  if (env) {
    const abs = path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
    return fsSync.existsSync(abs) ? { file: abs, argvPrefix: [] } : { file: env, argvPrefix: [] };
  }
  if (process.platform === 'win32') {
    const w = defaultWindowsPythonExe();
    if (w) return { file: w, argvPrefix: [] };
    return { file: 'py', argvPrefix: ['-3'] };
  }
  return { file: 'python3', argvPrefix: [] };
}

/**
 * Wrapper 支持 `--dreamina-bin`。
 * - 优先 `DREAMINA_BIN`（绝对路径或相对 cwd）
 * - Windows：若未配置，依次尝试 `%USERPROFILE%\bin\`（官方 curl 安装器默认）、`%USERPROFILE%\.local\bin\`（Git Bash 常见）
 */
function getDreaminaExecutableForWrapper(): string | null {
  const raw = process.env.DREAMINA_BIN?.trim();
  if (raw) {
    const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    return fsSync.existsSync(abs) ? abs : raw;
  }
  if (process.platform === 'win32') {
    const home = process.env.USERPROFILE || process.env.HOME;
    if (home) {
      const winDirs = [
        ['bin'],
        ['.local', 'bin'],
      ] as const;
      for (const parts of winDirs) {
        for (const name of ['dreamina.exe', 'dreamina']) {
          const c = path.join(home, ...parts, name);
          if (fsSync.existsSync(c)) return c;
        }
      }
    }
  }
  return null;
}

function dreaminaBinArgs(): string[] {
  const exe = getDreaminaExecutableForWrapper();
  return exe ? ['--dreamina-bin', exe] : [];
}

function augmentDreaminaSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const exe = getDreaminaExecutableForWrapper();
  if (exe) {
    const binDir = path.dirname(exe);
    if (binDir && fsSync.existsSync(binDir)) {
      env.PATH = `${binDir}${path.delimiter}${env.PATH ?? ''}`;
    }
  }
  const extra = process.env.DREAMINA_PATH_PREFIX?.trim();
  if (extra) {
    env.PATH = `${extra}${path.delimiter}${env.PATH ?? ''}`;
  }
  return env;
}

const DREAMINA_NOT_FOUND_HINT =
  '未找到 dreamina 命令。请安装官方 CLI（见 dreamina-cli-skill README），或在 h5-video-tool-api/.env 设置 DREAMINA_BIN=可执行文件绝对路径（Windows 可指向 Git Bash 安装后的 ~/.local/bin/dreamina），然后重启 API。';

function dreaminaFailureMessage(raw: string | undefined): string {
  const msg = raw?.trim() || '即梦调用失败';
  if (/Dreamina executable not found|not found:\s*dreamina/i.test(msg)) {
    return `${msg}\n${DREAMINA_NOT_FOUND_HINT}`;
  }
  return msg;
}

function pollSec(): number {
  const n = parseInt(process.env.DREAMINA_POLL_SEC || '600', 10);
  return Number.isFinite(n) && n >= 30 ? Math.min(n, 3600) : 600;
}

/**
 * dreamina-cli-skill 仅接受 seedance2.0、seedance2.0fast（见 dreamina_wrapper COMMAND_SPECS）。
 * 旧版 UI / 误填的 seedance2.0_vip 会报 Unsupported value，映射为全模态 seedance2.0。
 */
function normalizeDreaminaSeedanceVersion(mv: string | undefined | null): string | undefined {
  const v = mv?.trim();
  if (!v) return undefined;
  if (v === 'seedance2.0_vip') return 'seedance2.0';
  return v;
}

/** text2video：ratio 映射为 CLI 支持的枚举 */
function aspectToDreaminaRatio(aspect?: string): string {
  const a = (aspect || '16:9').trim();
  const map: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '21:9': '21:9',
  };
  return map[a] ?? '16:9';
}

function clampDuration(sec: number | undefined): number {
  const d = sec != null && Number.isFinite(sec) ? Math.round(sec) : 5;
  return Math.min(15, Math.max(4, d));
}

/**
 * 即梦 CLI（Go）在 Windows 下对反斜杠绝对路径上传素材时易报
 * upload phase, no file upload；传给子进程时使用正斜杠。
 */
function toDreaminaCliPath(absPath: string): string {
  const resolved = path.resolve(absPath);
  if (process.platform === 'win32') {
    return resolved.replace(/\\/g, '/');
  }
  return resolved;
}

/**
 * 多模态/图生参考图落盘目录（默认项目 uploads/dreamina-mm，避免仅用 Temp 时权限或杀软拦截）。
 * 可通过环境变量 DREAMINA_MEDIA_STAGING_DIR 覆盖。
 */
function getDreaminaStagingDir(): string {
  const env = process.env.DREAMINA_MEDIA_STAGING_DIR?.trim();
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), 'uploads', 'dreamina-mm');
}

interface WrapperJson {
  ok?: boolean;
  error?: string;
  details?: string[];
  data?: Record<string, unknown>;
}

function parseWrapperStdout(stdout: string): WrapperJson {
  const t = stdout.trim();
  const start = Math.min(
    t.indexOf('{') >= 0 ? t.indexOf('{') : Infinity,
    t.indexOf('[') >= 0 ? t.indexOf('[') : Infinity,
  );
  if (!Number.isFinite(start) || start === Infinity) {
    throw new Error('即梦 wrapper 未输出 JSON');
  }
  const jsonText = t.slice(start);
  return JSON.parse(jsonText) as WrapperJson;
}

async function runWrapper(script: string, args: string[]): Promise<WrapperJson> {
  const scriptsDir = getDreaminaScriptsDir();
  const scriptPath = path.join(scriptsDir, script);
  if (!fsSync.existsSync(scriptPath)) {
    throw new Error(
      `未找到即梦脚本：${scriptPath}。请设置 DREAMINA_SCRIPTS_DIR，或将 dreamina-cli-skill 置于 QAS/.cursor/skills/。`,
    );
  }
  const { file: py, argvPrefix } = getPythonSpawn();
  const fullArgs = [...argvPrefix, scriptPath, ...dreaminaBinArgs(), ...args];
  const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
    (resolve, reject) => {
      const chunksOut: Buffer[] = [];
      const chunksErr: Buffer[] = [];
      const proc = spawn(py, fullArgs, {
        cwd: scriptsDir,
        env: augmentDreaminaSpawnEnv(),
        windowsHide: true,
      });
      proc.stdout?.on('data', (d) => chunksOut.push(d as Buffer));
      proc.stderr?.on('data', (d) => chunksErr.push(d as Buffer));
      proc.on('error', reject);
      proc.on('close', (c) => {
        resolve({
          stdout: Buffer.concat(chunksOut).toString('utf8'),
          stderr: Buffer.concat(chunksErr).toString('utf8'),
          code: c,
        });
      });
    },
  );
  if (code !== 0 && !stdout.trim()) {
    throw new Error(dreaminaFailureMessage(stderr.trim() || `即梦脚本退出码 ${code ?? 'unknown'}`));
  }
  try {
    return parseWrapperStdout(stdout);
  } catch {
    throw new Error(
      `即梦输出无法解析为 JSON。stdout=${stdout.slice(0, 500)} stderr=${stderr.slice(0, 300)}`,
    );
  }
}

function findMp4PathInObject(obj: unknown, depth = 0): string | null {
  if (depth > 8 || obj == null) return null;
  if (typeof obj === 'string') {
    const s = obj.trim();
    if (/\.mp4$/i.test(s) && (s.includes('/') || s.includes('\\'))) return s;
    return null;
  }
  if (typeof obj !== 'object') return null;
  for (const v of Object.values(obj)) {
    const found = findMp4PathInObject(v, depth + 1);
    if (found) return found;
  }
  return null;
}

async function readVideoAsDataUrlFromDreaminaData(data: Record<string, unknown> | undefined): Promise<string | null> {
  if (!data) return null;
  const p = findMp4PathInObject(data);
  if (!p) return null;
  try {
    const buf = await fs.readFile(path.resolve(p));
    return `data:video/mp4;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function queryResultDownload(submitId: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `dreamina_dl_${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  const wrap = await runWrapper('query_result.py', ['--submit-id', submitId, '--download-dir', dir]);
  if (!wrap.ok) {
    throw new Error(dreaminaFailureMessage(wrap.error || '即梦 query_result 失败'));
  }
  const files = await fs.readdir(dir);
  const mp4 = files.find((f) => f.toLowerCase().endsWith('.mp4'));
  if (!mp4) {
    throw new Error('即梦任务已完成但未在下载目录找到 MP4，可稍后重试或增大 DREAMINA_POLL_SEC');
  }
  const buf = await fs.readFile(path.join(dir, mp4));
  return `data:video/mp4;base64,${buf.toString('base64')}`;
}

/** 仅提交、不阻塞等待成片（H5 轮询 GET /dreamina/task/:id） */
const DREAMINA_SUBMIT_POLL = '0';

export interface DreaminaQueueInfo {
  queue_idx?: number;
  queue_length?: number;
  queue_status?: string;
  priority?: number;
}

export type DreaminaPollPhase = 'querying' | 'success' | 'failed';

export interface DreaminaTaskStatusResult {
  submitId: string;
  phase: DreaminaPollPhase;
  genStatus?: string;
  queueInfo?: DreaminaQueueInfo;
  failReason?: string;
  /** gen_status=success 且已下载时返回 */
  videoUrl?: string;
}

/**
 * 轮询即梦任务：排队中返回 queue_info；成功则下载成片为 data URL。
 */
export async function pollDreaminaTask(submitId: string): Promise<DreaminaTaskStatusResult> {
  const sid = submitId.trim();
  if (!sid) {
    return { submitId: sid, phase: 'failed', failReason: '缺少 submit_id' };
  }
  const wrap = await runWrapper('query_result.py', ['--submit-id', sid]);
  if (!wrap.ok) {
    return {
      submitId: sid,
      phase: 'failed',
      failReason: dreaminaFailureMessage(wrap.error || '即梦 query_result 失败'),
    };
  }
  const data = wrap.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return { submitId: sid, phase: 'failed', failReason: '即梦未返回任务数据' };
  }
  const genStatus = String(data.gen_status ?? data.genStatus ?? '').toLowerCase();
  const qiRaw = data.queue_info ?? data.queueInfo;
  let queueInfo: DreaminaQueueInfo | undefined;
  if (qiRaw && typeof qiRaw === 'object') {
    const q = qiRaw as Record<string, unknown>;
    queueInfo = {
      queue_idx: typeof q.queue_idx === 'number' ? q.queue_idx : undefined,
      queue_length: typeof q.queue_length === 'number' ? q.queue_length : undefined,
      queue_status: typeof q.queue_status === 'string' ? q.queue_status : undefined,
      priority: typeof q.priority === 'number' ? q.priority : undefined,
    };
  }

  if (genStatus === 'fail' || genStatus === 'failed') {
    return {
      submitId: sid,
      phase: 'failed',
      genStatus,
      failReason: String(data.fail_reason ?? data.failReason ?? '生成失败'),
      queueInfo,
    };
  }

  if (genStatus === 'success') {
    let videoUrl = await readVideoAsDataUrlFromDreaminaData(data);
    if (!videoUrl) {
      try {
        videoUrl = await queryResultDownload(sid);
      } catch (e) {
        return {
          submitId: sid,
          phase: 'failed',
          genStatus,
          failReason: e instanceof Error ? e.message : '下载成片失败',
        };
      }
    }
    return {
      submitId: sid,
      phase: 'success',
      genStatus,
      videoUrl,
    };
  }

  return {
    submitId: sid,
    phase: 'querying',
    genStatus: genStatus || undefined,
    queueInfo,
  };
}

function extractSubmitId(data: Record<string, unknown> | undefined): string {
  return String(data?.submit_id ?? data?.submitId ?? '').trim();
}

/**
 * 全能参考：仅提交任务，立即返回 submit_id（不等待排队/成片）。
 */
export async function submitDreaminaMultimodalVideo(options: {
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  images: MultimodalMediaItem[];
  videos: MultimodalMediaItem[];
  audios: MultimodalMediaItem[];
  /** 覆盖 DREAMINA_MULTIMODAL_MODEL，传给 CLI --model-version */
  modelVersion?: string;
}): Promise<{ submitId: string; taskId: string }> {
  const prompt = options.prompt.trim();
  if (!prompt) throw new Error('请提供 prompt（可用 @图片1 @视频1 等引用素材）');

  const images = options.images ?? [];
  const videos = options.videos ?? [];
  const audios = options.audios ?? [];

  if (images.length > 9) throw new Error('参考图最多 9 张（即梦 CLI 限制）');
  if (videos.length > 3) throw new Error('参考视频最多 3 个');
  if (audios.length > 3) throw new Error('参考音频最多 3 个');
  if (images.length + videos.length + audios.length > 12) {
    throw new Error('参考素材总数请勿超过 12 个');
  }
  if (images.length === 0 && videos.length === 0) {
    throw new Error('全能参考至少需要 1 张图片或 1 段视频');
  }

  const ratio = aspectToDreaminaRatio(options.aspectRatio);
  const duration = clampDuration(options.duration);
  const mv =
    normalizeDreaminaSeedanceVersion(options.modelVersion) ||
    normalizeDreaminaSeedanceVersion(process.env.DREAMINA_MULTIMODAL_MODEL) ||
    'seedance2.0fast';

  const tmp: string[] = [];
  try {
    const staging = getDreaminaStagingDir();
    await fs.mkdir(staging, { recursive: true });
    const write = async (item: MultimodalMediaItem, kind: 'image' | 'video' | 'audio') => {
      const b64 = stripDataUrlBase64(item.base64);
      if (!b64) throw new Error('素材 base64 为空');
      const ext = extForMime(item.mimeType, kind);
      const p = path.join(
        staging,
        `dreamina_mm_${kind}_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`,
      );
      await fs.writeFile(p, Buffer.from(b64, 'base64'));
      tmp.push(p);
      return toDreaminaCliPath(p);
    };

    const imagePaths: string[] = [];
    for (const im of images) imagePaths.push(await write(im, 'image'));
    const videoPaths: string[] = [];
    for (const v of videos) videoPaths.push(await write(v, 'video'));
    const audioPaths: string[] = [];
    for (const a of audios) audioPaths.push(await write(a, 'audio'));

    const args: string[] = [
      '--prompt',
      prompt,
      '--duration',
      String(duration),
      '--ratio',
      ratio,
      '--video-resolution',
      '720p',
      '--model-version',
      mv,
      '--poll',
      DREAMINA_SUBMIT_POLL,
    ];
    for (const p of imagePaths) args.push('--image', p);
    for (const p of videoPaths) args.push('--video', p);
    for (const p of audioPaths) args.push('--audio', p);

    const wrap = await runWrapper('multimodal2video.py', args);
    if (!wrap.ok) {
      throw new Error(dreaminaFailureMessage(wrap.error || '即梦 multimodal2video 失败'));
    }
    const data = wrap.data as Record<string, unknown> | undefined;
    const submitId = extractSubmitId(data);
    if (!submitId) throw new Error('即梦未返回 submit_id');

    return { submitId, taskId: `dreamina-${submitId}` };
  } finally {
    await Promise.all(tmp.map((p) => fs.unlink(p).catch(() => {})));
  }
}

/**
 * 文生 / 图生：仅提交任务，立即返回 submit_id。
 */
export async function submitDreaminaVideo(options: DreaminaVideoOptions): Promise<{ submitId: string; taskId: string }> {
  const m = options.model.trim().toLowerCase();
  if (m === DREAMINA_MULTIMODAL) {
    throw new Error('全能参考应走 submitDreaminaMultimodalVideo');
  }
  const prompt = options.prompt.trim();
  if (!prompt) throw new Error('请提供分镜/提示文案');

  if (m === DREAMINA_IMAGE2VIDEO) {
    const raw = options.imageBase64?.replace(/^data:image\/\w+;base64,/, '');
    if (!raw?.trim()) {
      throw new Error('即梦图生视频需要参考图：请选择含图片的素材或分镜图');
    }
    const ext =
      options.imageMimeType?.includes('png') ? 'png' : options.imageMimeType?.includes('webp') ? 'webp' : 'png';
    const staging = getDreaminaStagingDir();
    await fs.mkdir(staging, { recursive: true });
    const tmp = path.join(staging, `dreamina_i2v_${Date.now()}.${ext}`);
    await fs.writeFile(tmp, Buffer.from(raw, 'base64'));
    try {
      const mv =
        normalizeDreaminaSeedanceVersion(options.modelVersion) ||
        normalizeDreaminaSeedanceVersion(process.env.DREAMINA_IMAGE2VIDEO_MODEL) ||
        '';
      const i2vArgs = ['--image', toDreaminaCliPath(tmp), '--prompt', prompt];
      if (mv) i2vArgs.push('--model-version', mv);
      i2vArgs.push('--poll', DREAMINA_SUBMIT_POLL);
      const wrap = await runWrapper('image2video.py', i2vArgs);
      if (!wrap.ok) {
        throw new Error(dreaminaFailureMessage(wrap.error || '即梦 image2video 失败'));
      }
      const data = wrap.data as Record<string, unknown> | undefined;
      const submitId = extractSubmitId(data);
      if (!submitId) throw new Error('即梦未返回 submit_id');
      return { submitId, taskId: `dreamina-${submitId}` };
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  }

  const ratio = aspectToDreaminaRatio(options.aspectRatio);
  const duration = clampDuration(options.duration);
  const mv =
    normalizeDreaminaSeedanceVersion(options.modelVersion) ||
    normalizeDreaminaSeedanceVersion(process.env.DREAMINA_TEXT2VIDEO_MODEL) ||
    'seedance2.0';

  const wrap = await runWrapper('text2video.py', [
    '--prompt',
    prompt,
    '--duration',
    String(duration),
    '--ratio',
    ratio,
    '--video-resolution',
    '720p',
    '--model-version',
    mv,
    '--poll',
    DREAMINA_SUBMIT_POLL,
  ]);

  if (!wrap.ok) {
    throw new Error(dreaminaFailureMessage(wrap.error || '即梦 text2video 失败'));
  }
  const data = wrap.data as Record<string, unknown> | undefined;
  const submitId = extractSubmitId(data);
  if (!submitId) throw new Error('即梦未返回 submit_id');

  return { submitId, taskId: `dreamina-${submitId}` };
}

export interface DreaminaVideoOptions {
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
  /** 覆盖各 DREAMINA_*_MODEL 环境变量，传给 CLI --model-version */
  modelVersion?: string;
}

/**
 * 文生视频或图生视频，返回 data URL（mp4 base64）与 submit_id 作 taskId。
 */
export async function generateDreaminaVideo(options: DreaminaVideoOptions): Promise<{ videoUrl: string; taskId: string }> {
  const m = options.model.trim().toLowerCase();
  if (m === DREAMINA_MULTIMODAL) {
    throw new Error('全能参考应走 generateDreaminaMultimodalVideo');
  }
  const poll = String(pollSec());
  const prompt = options.prompt.trim();
  if (!prompt) throw new Error('请提供分镜/提示文案');

  if (m === DREAMINA_IMAGE2VIDEO) {
    const raw = options.imageBase64?.replace(/^data:image\/\w+;base64,/, '');
    if (!raw?.trim()) {
      throw new Error('即梦图生视频需要参考图：请选择含图片的素材或分镜图');
    }
    const ext =
      options.imageMimeType?.includes('png') ? 'png' : options.imageMimeType?.includes('webp') ? 'webp' : 'png';
    const staging = getDreaminaStagingDir();
    await fs.mkdir(staging, { recursive: true });
    const tmp = path.join(staging, `dreamina_i2v_${Date.now()}.${ext}`);
    await fs.writeFile(tmp, Buffer.from(raw, 'base64'));
    try {
      const mv =
        normalizeDreaminaSeedanceVersion(options.modelVersion) ||
        normalizeDreaminaSeedanceVersion(process.env.DREAMINA_IMAGE2VIDEO_MODEL) ||
        '';
      const i2vArgs = ['--image', toDreaminaCliPath(tmp), '--prompt', prompt];
      if (mv) {
        i2vArgs.push('--model-version', mv);
      }
      i2vArgs.push('--poll', poll);
      const wrap = await runWrapper('image2video.py', i2vArgs);
      if (!wrap.ok) {
        throw new Error(dreaminaFailureMessage(wrap.error || '即梦 image2video 失败'));
      }
      const data = wrap.data as Record<string, unknown> | undefined;
      const submitId = String(data?.submit_id ?? data?.submitId ?? '').trim();
      if (!submitId) throw new Error('即梦未返回 submit_id');

      let videoUrl = await readVideoAsDataUrlFromDreaminaData(data);
      if (!videoUrl) videoUrl = await queryResultDownload(submitId);

      return { videoUrl, taskId: `dreamina-${submitId}` };
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  }

  // dreamina-text2video
  const ratio = aspectToDreaminaRatio(options.aspectRatio);
  const duration = clampDuration(options.duration);
  const mv =
    normalizeDreaminaSeedanceVersion(options.modelVersion) ||
    normalizeDreaminaSeedanceVersion(process.env.DREAMINA_TEXT2VIDEO_MODEL) ||
    'seedance2.0';

  const wrap = await runWrapper('text2video.py', [
    '--prompt',
    prompt,
    '--duration',
    String(duration),
    '--ratio',
    ratio,
    '--video-resolution',
    '720p',
    '--model-version',
    mv,
    '--poll',
    poll,
  ]);

  if (!wrap.ok) {
    throw new Error(dreaminaFailureMessage(wrap.error || '即梦 text2video 失败'));
  }
  const data = wrap.data as Record<string, unknown> | undefined;
  const submitId = String(data?.submit_id ?? data?.submitId ?? '').trim();
  if (!submitId) throw new Error('即梦未返回 submit_id');

  let videoUrl = await readVideoAsDataUrlFromDreaminaData(data);
  if (!videoUrl) videoUrl = await queryResultDownload(submitId);

  return { videoUrl, taskId: `dreamina-${submitId}` };
}

function extForMime(mime?: string, kind: 'image' | 'video' | 'audio' = 'image'): string {
  const m = (mime || '').toLowerCase();
  if (kind === 'image') {
    if (m.includes('png')) return 'png';
    if (m.includes('webp')) return 'webp';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    return 'png';
  }
  if (kind === 'video') {
    if (m.includes('webm')) return 'webm';
    if (m.includes('quicktime') || m.includes('mov')) return 'mov';
    return 'mp4';
  }
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'wav';
}

function stripDataUrlBase64(raw: string): string {
  return raw.replace(/^data:[^;]+;base64,/, '').trim();
}

export interface MultimodalMediaItem {
  base64: string;
  mimeType?: string;
}

/** CLI 限制：图 ≤9、视频 ≤3、音频 ≤3；合计建议 ≤12 个素材 */
export async function generateDreaminaMultimodalVideo(options: {
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  images: MultimodalMediaItem[];
  videos: MultimodalMediaItem[];
  audios: MultimodalMediaItem[];
  /** 覆盖 DREAMINA_MULTIMODAL_MODEL */
  modelVersion?: string;
}): Promise<{ videoUrl: string; taskId: string }> {
  const prompt = options.prompt.trim();
  if (!prompt) throw new Error('请提供 prompt（可用 @图片1 @视频1 等引用素材）');

  const images = options.images ?? [];
  const videos = options.videos ?? [];
  const audios = options.audios ?? [];

  if (images.length > 9) throw new Error('参考图最多 9 张（即梦 CLI 限制）');
  if (videos.length > 3) throw new Error('参考视频最多 3 个');
  if (audios.length > 3) throw new Error('参考音频最多 3 个');
  if (images.length + videos.length + audios.length > 12) {
    throw new Error('参考素材总数请勿超过 12 个');
  }
  if (images.length === 0 && videos.length === 0) {
    throw new Error('全能参考至少需要 1 张图片或 1 段视频');
  }

  const ratio = aspectToDreaminaRatio(options.aspectRatio);
  const duration = clampDuration(options.duration);
  const mv =
    normalizeDreaminaSeedanceVersion(options.modelVersion) ||
    normalizeDreaminaSeedanceVersion(process.env.DREAMINA_MULTIMODAL_MODEL) ||
    'seedance2.0fast';
  const poll = String(pollSec());

  const tmp: string[] = [];
  try {
    const staging = getDreaminaStagingDir();
    await fs.mkdir(staging, { recursive: true });
    const write = async (item: MultimodalMediaItem, kind: 'image' | 'video' | 'audio') => {
      const b64 = stripDataUrlBase64(item.base64);
      if (!b64) throw new Error('素材 base64 为空');
      const ext = extForMime(item.mimeType, kind);
      const p = path.join(
        staging,
        `dreamina_mm_${kind}_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`,
      );
      await fs.writeFile(p, Buffer.from(b64, 'base64'));
      tmp.push(p);
      return toDreaminaCliPath(p);
    };

    const imagePaths: string[] = [];
    for (const im of images) imagePaths.push(await write(im, 'image'));
    const videoPaths: string[] = [];
    for (const v of videos) videoPaths.push(await write(v, 'video'));
    const audioPaths: string[] = [];
    for (const a of audios) audioPaths.push(await write(a, 'audio'));

    const args: string[] = ['--prompt', prompt, '--duration', String(duration), '--ratio', ratio, '--video-resolution', '720p', '--model-version', mv, '--poll', poll];
    for (const p of imagePaths) {
      args.push('--image', p);
    }
    for (const p of videoPaths) {
      args.push('--video', p);
    }
    for (const p of audioPaths) {
      args.push('--audio', p);
    }

    const wrap = await runWrapper('multimodal2video.py', args);
    if (!wrap.ok) {
      throw new Error(dreaminaFailureMessage(wrap.error || '即梦 multimodal2video 失败'));
    }
    const data = wrap.data as Record<string, unknown> | undefined;
    const submitId = String(data?.submit_id ?? data?.submitId ?? '').trim();
    if (!submitId) throw new Error('即梦未返回 submit_id');

    let videoUrl = await readVideoAsDataUrlFromDreaminaData(data);
    if (!videoUrl) videoUrl = await queryResultDownload(submitId);

    return { videoUrl, taskId: `dreamina-${submitId}` };
  } finally {
    await Promise.all(tmp.map((p) => fs.unlink(p).catch(() => {})));
  }
}
