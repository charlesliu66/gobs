/**
 * /api/system/* — 系统信息接口（无需鉴权）
 * GET /api/system/version  → 返回当前运行版本（build-info.json）
 */
import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getAppEnvironmentName,
  readDeploymentState,
} from '../services/deploymentState.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BuildInfo {
  commitSha: string;
  branch: string;
  buildTime: string;
}

router.get('/version', async (_req, res) => {
  try {
    // build-info.json 与 index.js 同级（dist/ 或直接部署目录）
    const candidates = [
      path.resolve(__dirname, '..', 'build-info.json'),
      path.resolve(__dirname, 'build-info.json'),
      path.resolve(process.cwd(), 'build-info.json'),
    ];

    let info: BuildInfo | null = null;
    for (const p of candidates) {
      try {
        const raw = await readFile(p, 'utf-8');
        info = JSON.parse(raw) as BuildInfo;
        break;
      } catch {
        // 继续尝试下一个路径
      }
    }

    if (info) {
      res.json({
        success: true,
        ...info,
        commitShort: info.commitSha?.slice(0, 7) || 'unknown',
        environment: getAppEnvironmentName(),
      });
    } else {
      res.json({
        success: true,
        commitSha: 'unknown',
        commitShort: 'unknown',
        branch: 'unknown',
        buildTime: 'unknown',
        environment: getAppEnvironmentName(),
        note: 'build-info.json not found; run npm run build to generate',
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/deployment-state', async (_req, res) => {
  try {
    const state = await readDeploymentState();
    return res.json({
      success: true,
      environment: getAppEnvironmentName(),
      state,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
