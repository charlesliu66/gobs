import './loadEnv.js';
import { validateEnvAndDirs } from './config/env.js';
validateEnvAndDirs();
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { jwtAuthMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import driveRoutes from './routes/drive.js';
import promptRoutes from './routes/prompt.js';
import videoRoutes from './routes/video.js';
import storyboardRoutes from './routes/storyboard.js';
import remixRouter from './routes/remix.js';
import editorExportRouter from './routes/editorExport.js';
import editorAssetsRouter from './routes/editorAssets.js';
import editorAgentRouter from './routes/editorAgent.js';
import editorAnalyzeRouter from './routes/editorAnalyze.js';
import editorMusicRouter from './routes/editorMusic.js';
import editorProjectsRouter from './routes/editorProjects.js';
import studioRouter from './routes/studio.js';
import productionPersistRouter from './routes/productionPersist.js';
import characterLibraryRouter from './routes/characterLibrary.js';
import localUploadRouter from './routes/localUpload.js';
import batchJobsRouter from './routes/batchJobs.js';
import characterImageRouter from './routes/characterImage.js';
import quickfilmRouter, { draftsRouter } from './routes/quickfilm.js';
import assetsRouter from './routes/assets.js';
import assetLibraryRouter from './routes/assetLibrary.js';
import googleDriveRouter from './routes/googleDrive.js';
import gobsAuthRouter from './routes/gobsAuth.js';
import riskSentimentRouter from './routes/riskSentiment.js';
import adminUsageRouter from './routes/adminUsage.js';
import adminSystemRouter from './routes/adminSystem.js';
import { geelarkRouter } from './routes/geelark.js';
import { shotReviewRouter } from './routes/shotReview.js';
import campaignKnowledgeRouter from './routes/campaignKnowledge.js';
import campaignCreativeRouter from './routes/campaignCreative.js';
import campaignDistributionRouter from './routes/campaignDistribution.js';
import { startBatchJobsPoller } from './services/batchJobsQueue.js';
import { runWithRequestContext } from './services/requestContext.js';
import { resetInterruptedJobs } from './services/assetIngestService.js';
import { recoverMultishotJobsOnBoot } from './routes/videoMultishot.js';
import { startRecoveryScanner } from './services/dreaminaRecovery.js';
import systemRouter from './routes/system.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── 请求日志中间件（设 LOG_REQUESTS=0 关闭逐请求日志）─────────────────────
const _logRequests = process.env.LOG_REQUESTS !== '0';
app.use((req, res, next) => {
  if (!_logRequests) { next(); return; }
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    console.log(`[${ts}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// JWT 鉴权中间件（/api/auth/login、/api/health、/api/gobs-auth/* 豁免）
app.use(jwtAuthMiddleware);
app.use((req, _res, next) => {
  runWithRequestContext({ account: req.user?.username }, () => next());
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'h5-video-tool-api' });
});
app.use('/api/system', systemRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/gobs-auth', gobsAuthRouter);
app.use('/api/drive', driveRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/storyboard', storyboardRoutes);
app.use('/api/remix', remixRouter);
app.use('/api/editor', editorAssetsRouter);
app.use('/api/editor', editorAnalyzeRouter);
app.use('/api/editor', editorAgentRouter);
app.use('/api/editor', editorMusicRouter);
app.use('/api/editor', editorExportRouter);
app.use('/api/editor', editorProjectsRouter);
app.use('/api/studio', studioRouter);
app.use('/api/studio', shotReviewRouter);
app.use('/api/production', productionPersistRouter);
app.use('/api/character-library', characterLibraryRouter);
app.use('/api/upload', localUploadRouter);
app.use('/api/batch-jobs', batchJobsRouter);
app.use('/api/character', characterImageRouter);
app.use('/api/quickfilm', quickfilmRouter);
app.use('/api/quickfilm/drafts', draftsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/asset-library', assetLibraryRouter);
app.use('/api/campaign-knowledge', campaignKnowledgeRouter);
app.use('/api/campaign-creative', campaignCreativeRouter);
app.use('/api/campaign-distribution', campaignDistributionRouter);
app.use('/api/drive', googleDriveRouter);
app.use('/api/risk-sentiment', riskSentimentRouter);
app.use('/api/geelark', geelarkRouter);
app.use('/api/admin', adminUsageRouter);
app.use('/api/admin', adminSystemRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API 未捕获异常]', err);
  res.status(500).json({ success: false, error: err instanceof Error ? err.message : '服务器内部错误' });
});

app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`API server running at http://127.0.0.1:${PORT}`);
  startBatchJobsPoller();
  resetInterruptedJobs();
  void recoverMultishotJobsOnBoot();
  startRecoveryScanner();
});
