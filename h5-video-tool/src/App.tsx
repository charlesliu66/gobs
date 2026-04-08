import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { ThemeProvider } from './context/ThemeContext';
import { GobsAuthProvider } from './context/GobsAuthContext';
import { AuthGate } from './components/AuthGate';
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
import './index.css';

function App() {
  return (
    <GobsAuthProvider>
      <ThemeProvider>
        <CreateFlowProvider>
          <MaterialsProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<AuthGate />}>
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
      </ThemeProvider>
    </GobsAuthProvider>
  );
}

export default App;
