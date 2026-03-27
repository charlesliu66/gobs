/**
 * 通过 GET /api/kling/video-list（kelingapp.views.kling.video_list）拉列表，
 * 按 task_id 或「最新一条已成功且有 video_url」下载 MP4 到 output/
 *
 * 用法：
 *   npx tsx scripts/download-kling-from-video-list.ts
 *   npx tsx scripts/download-kling-from-video-list.ts <task_id>
 *
 * 环境：KLING_API_KEY、KLING_API_BASE_URL（如 https://clipai.ingarena.net）
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface VideoListRow {
  task_id?: string | number;
  task_status?: number | string;
  video_url?: string;
  watermark_url?: string;
  task_status_msg?: string;
  prompt?: string;
}

function readTaskId(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function extractRows(body: unknown): VideoListRow[] {
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  const code = o.code;
  if (code !== 0 && code !== '0') {
    const msg = (o.msg as string) || (o.message as string) || JSON.stringify(o);
    throw new Error(`video-list 业务错误: ${msg}`);
  }
  const wrap = o.data;
  if (!wrap || typeof wrap !== 'object') return [];
  const inner = wrap as Record<string, unknown>;
  const rows = inner.data;
  if (!Array.isArray(rows)) return [];
  return rows as VideoListRow[];
}

function isSucceed(status: unknown): boolean {
  if (status === 2) return true;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    return ['succeed', 'success', 'completed', 'done'].includes(s);
  }
  return false;
}

function pickUrl(row: VideoListRow): string | undefined {
  const u = row.video_url;
  if (typeof u === 'string' && u.trim()) return u.trim();
  const w = row.watermark_url;
  if (typeof w === 'string' && w.trim()) return w.trim();
  return undefined;
}

async function main() {
  const base = (process.env.KLING_API_BASE_URL || '').replace(/\/+$/, '');
  const token = process.env.KLING_API_KEY?.trim();
  if (!base || !token) {
    console.error('请配置 KLING_API_BASE_URL 与 KLING_API_KEY');
    process.exit(1);
  }

  const wantTaskId = process.argv[2]?.trim();
  const outDir =
    process.env.KLING_DOWNLOAD_DIR ||
    path.resolve(__dirname, '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const http = axios.create({
    baseURL: base,
    timeout: 60000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    validateStatus: (s) => s < 500,
  });

  const { data, status } = await http.get('/api/kling/video-list', {
    params: {
      page: 1,
      pageSize: 100,
      task_type: 6,
      order_by_desc: 1,
    },
  });

  if (status >= 400) {
    console.error('HTTP', status, data);
    process.exit(1);
  }

  const rows = extractRows(data);
  console.log('列表条数:', rows.length);

  let row: VideoListRow | undefined;

  if (wantTaskId) {
    row = rows.find((r) => readTaskId(r.task_id) === wantTaskId);
    if (!row) {
      console.error('未找到 task_id:', wantTaskId);
      process.exit(1);
    }
  } else {
    row = rows.find((r) => isSucceed(r.task_status) && pickUrl(r));
    if (!row) {
      console.error('列表中暂无「已成功且有 video_url」的任务，可指定 task_id 再试');
      if (rows[0]) {
        console.log('最近一条示例 task_id:', readTaskId(rows[0].task_id), 'status:', rows[0].task_status);
      }
      process.exit(1);
    }
  }

  const url = pickUrl(row);
  if (!url) {
    console.error('该记录无 video_url，task_status:', row.task_status, row.task_status_msg || '');
    process.exit(1);
  }

  const tid = readTaskId(row.task_id) || 'unknown';
  console.log('下载 task_id:', tid);
  console.log('URL:', url.slice(0, 120) + (url.length > 120 ? '...' : ''));

  const videoRes = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 300000,
  });

  const outFile = path.join(outDir, `kling-list-${tid}.mp4`);
  fs.writeFileSync(outFile, Buffer.from(videoRes.data));
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
