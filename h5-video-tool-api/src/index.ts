import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import driveRoutes from './routes/drive.js';
import promptRoutes from './routes/prompt.js';
import videoRoutes from './routes/video.js';
import storyboardRoutes from './routes/storyboard.js';
import geelarkRouter from './routes/geelark.js';
import sjRouter from './routes/sj.js';
import remixRouter from './routes/remix.js';
import editorExportRouter from './routes/editorExport.js';
import editorAssetsRouter from './routes/editorAssets.js';
import editorAgentRouter from './routes/editorAgent.js';
import editorAnalyzeRouter from './routes/editorAnalyze.js';
import editorMusicRouter from './routes/editorMusic.js';
import studioRouter from './routes/studio.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'h5-video-tool-api' });
});
app.use('/api/drive', driveRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/storyboard', storyboardRoutes);
app.use('/api/geelark', geelarkRouter);
app.use('/api/sj', sjRouter);
app.use('/api/remix', remixRouter);
app.use('/api/editor', editorAssetsRouter);
app.use('/api/editor', editorAnalyzeRouter);
app.use('/api/editor', editorAgentRouter);
app.use('/api/editor', editorMusicRouter);
app.use('/api/editor', editorExportRouter);
app.use('/api/studio', studioRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API 未捕获异常]', err);
  res.status(500).json({ error: err instanceof Error ? err.message : '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
