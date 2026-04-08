import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { GeelarkLayout } from './components/GeelarkLayout';
import { AuthGuard } from './components/AuthGuard';
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
import { GeelarkBatch } from './pages/GeelarkBatch';
import { GeelarkDevices } from './pages/GeelarkDevices';
import { GeelarkTasks } from './pages/GeelarkTasks';
import { GeelarkSettings } from './pages/GeelarkSettings';
import { EditorWorkbench } from './pages/EditorWorkbench';
import { QuickFilm } from './pages/QuickFilm';
import { AssetLibrary } from './pages/AssetLibrary';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <CreateFlowProvider>
        <MaterialsProvider>
          <BrowserRouter>
            <Routes>
              {/* 公开路由：登录页 */}
              <Route path="/login" element={<Login />} />

              {/* 受保护路由：Layout 侧边栏页 */}
              <Route element={<AuthGuard />}>
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
                </Route>
              </Route>

              {/* 受保护路由：Geelark 布局页 */}
              <Route element={<AuthGuard />}>
                <Route element={<GeelarkLayout />}>
                  <Route path="/geelark-batch" element={<GeelarkBatch />} />
                  <Route path="/geelark-devices" element={<GeelarkDevices />} />
                  <Route path="/geelark-tasks" element={<GeelarkTasks />} />
                  <Route path="/geelark-settings" element={<GeelarkSettings />} />
                </Route>
              </Route>

              <Route path="/geelark" element={<Navigate to="/geelark-batch" replace />} />
            </Routes>
          </BrowserRouter>
          <ToastContainer />
        </MaterialsProvider>
      </CreateFlowProvider>
    </ThemeProvider>
  );
}

export default App;
