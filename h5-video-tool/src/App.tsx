import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformMemoryProvider } from './context/PlatformMemoryContext';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { AppErrorBoundary } from './components/ErrorFallback';
import './index.css';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Studio = lazy(() => import('./pages/Studio').then(m => ({ default: m.Studio })));
const ProductionWizard = lazy(() => import('./pages/ProductionWizard').then(m => ({ default: m.ProductionWizard })));
const ProjectList = lazy(() => import('./pages/ProjectList').then(m => ({ default: m.ProjectList })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const TabDistribute = lazy(() => import('./pages/TabDistribute').then(m => ({ default: m.TabDistribute })));
const Result = lazy(() => import('./pages/Result').then(m => ({ default: m.Result })));
const EditorWorkbench = lazy(() => import('./pages/EditorWorkbench').then(m => ({ default: m.EditorWorkbench })));
const QuickFilm = lazy(() => import('./pages/QuickFilm').then(m => ({ default: m.QuickFilm })));
const AssetLibrary = lazy(() => import('./pages/AssetLibrary').then(m => ({ default: m.AssetLibrary })));
const AssetLibraryPage = lazy(() => import('./pages/AssetLibraryPage').then(m => ({ default: m.AssetLibraryPage })));
const Gallery = lazy(() => import('./pages/Gallery').then(m => ({ default: m.Gallery })));
const RiskMasterPanel = lazy(() => import('./pages/RiskSentimentEmbed').then(m => ({ default: m.RiskMasterPanel })));
const SettingsAccounts = lazy(() => import('./pages/SettingsAccounts').then(m => ({ default: m.SettingsAccounts })));
const SettingsUsageMonitor = lazy(() => import('./pages/SettingsUsageMonitor').then(m => ({ default: m.SettingsUsageMonitor })));
const PlatformFramework = lazy(() => import('./pages/PlatformFramework').then(m => ({ default: m.PlatformFramework })));
const PlatformMemory = lazy(() => import('./pages/PlatformMemory').then(m => ({ default: m.PlatformMemory })));
const PlatformLearningLab = lazy(() => import('./pages/PlatformLearningLab').then(m => ({ default: m.PlatformLearningLab })));
const PlatformOpsCenter = lazy(() => import('./pages/PlatformOpsCenter').then(m => ({ default: m.PlatformOpsCenter })));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** 简单 JWT 路由守卫：检查 localStorage 有 token 即放行 */
function RequireAuth() {
  const loc = useLocation();
  const token = localStorage.getItem('gobs_token');
  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }
  // v0.60 前登录的老用户没有 FAT，首次进入受保护页面时补拉一次。
  void import('./api/client').then((m) => m.ensureFileAccessToken());
  return <Outlet />;
}

function App() {
  return (
    <ThemeProvider>
      <PlatformMemoryProvider>
        <CreateFlowProvider>
          <MaterialsProvider>
            <BrowserRouter>
            <AppErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/studio/production" element={<ProductionWizard />} />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/materials" element={<Navigate to="/asset-library" replace />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/distribute" element={<TabDistribute />} />
                  <Route path="/result" element={<Result />} />
                  <Route path="/editor" element={<EditorWorkbench />} />
                  <Route path="/quickfilm" element={<QuickFilm />} />
                  <Route path="/asset-library" element={<AssetLibraryPage />} />
                  <Route path="/asset-library/legacy" element={<AssetLibrary />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/platform" element={<PlatformFramework />} />
                  <Route path="/platform/bind" element={<PlatformFramework />} />
                  <Route path="/platform/brain" element={<PlatformFramework />} />
                  <Route path="/platform/data" element={<PlatformFramework />} />
                  <Route path="/platform/actions" element={<PlatformFramework />} />
                  <Route path="/platform/memory" element={<PlatformMemory />} />
                  <Route path="/platform/learning-lab" element={<PlatformLearningLab />} />
                  <Route path="/platform/ops" element={<PlatformOpsCenter />} />
                  <Route path="/tiktok-matrix" element={<RiskMasterPanel />} />
                  <Route path="/settings/accounts" element={<SettingsAccounts />} />
                  <Route path="/settings/usage" element={<SettingsUsageMonitor />} />
                  <Route path="/geelark-batch" element={<Navigate to="/tiktok-matrix" replace />} />
                  <Route path="/geelark" element={<Navigate to="/tiktok-matrix" replace />} />
                </Route>
              </Route>
            </Routes>
            </Suspense>
            </AppErrorBoundary>
            </BrowserRouter>
            <ToastContainer />
          </MaterialsProvider>
        </CreateFlowProvider>
      </PlatformMemoryProvider>
    </ThemeProvider>
  );
}

export default App;
