import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformMemoryProvider } from './context/PlatformMemoryContext';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Studio } from './pages/Studio';
import { ProductionWizard } from './pages/ProductionWizard';
import { ProjectList } from './pages/ProjectList';
import { TabMaterials } from './pages/TabMaterials';
import { History } from './pages/History';
import { TabDistribute } from './pages/TabDistribute';
import { Result } from './pages/Result';
import { EditorWorkbench } from './pages/EditorWorkbench';
import { QuickFilm } from './pages/QuickFilm';
import { AssetLibrary } from './pages/AssetLibrary';
import { TiktokMatrix } from './pages/TiktokMatrix';
import { SettingsAccounts } from './pages/SettingsAccounts';
import { PlatformFramework } from './pages/PlatformFramework';
import { PlatformMemory } from './pages/PlatformMemory';
import { PlatformLearningLab } from './pages/PlatformLearningLab';
import './index.css';

/** 简单 JWT 路由守卫：检查 localStorage 有 token 即放行 */
function RequireAuth() {
  const loc = useLocation();
  const token = localStorage.getItem('gobs_token');
  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }
  return <Outlet />;
}

function App() {
  return (
    <ThemeProvider>
      <PlatformMemoryProvider>
        <CreateFlowProvider>
          <MaterialsProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/studio/production" element={<ProductionWizard />} />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/materials" element={<TabMaterials />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/distribute" element={<TabDistribute />} />
                  <Route path="/result" element={<Result />} />
                  <Route path="/editor" element={<EditorWorkbench />} />
                  <Route path="/quickfilm" element={<QuickFilm />} />
                  <Route path="/asset-library" element={<AssetLibrary />} />
                  <Route path="/platform" element={<PlatformFramework />} />
                  <Route path="/platform/bind" element={<PlatformFramework />} />
                  <Route path="/platform/brain" element={<PlatformFramework />} />
                  <Route path="/platform/data" element={<PlatformFramework />} />
                  <Route path="/platform/actions" element={<PlatformFramework />} />
                  <Route path="/platform/memory" element={<PlatformMemory />} />
                  <Route path="/platform/learning-lab" element={<PlatformLearningLab />} />
                  <Route path="/tiktok-matrix" element={<TiktokMatrix />} />
                  <Route path="/settings/accounts" element={<SettingsAccounts />} />
                  <Route path="/geelark-batch" element={<Navigate to="/tiktok-matrix" replace />} />
                  <Route path="/geelark" element={<Navigate to="/tiktok-matrix" replace />} />
                </Route>
              </Route>
            </Routes>
            </BrowserRouter>
            <ToastContainer />
          </MaterialsProvider>
        </CreateFlowProvider>
      </PlatformMemoryProvider>
    </ThemeProvider>
  );
}

export default App;
