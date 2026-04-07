import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { GeelarkLayout } from './components/GeelarkLayout';
import { Home } from './pages/Home';
import { Studio } from './pages/Studio';
import { ProductionWizard } from './pages/ProductionWizard';
import { TabMaterials } from './pages/TabMaterials';
import { History } from './pages/History';
import { TabDistribute } from './pages/TabDistribute';
import { Result } from './pages/Result';
import { GeelarkBatch } from './pages/GeelarkBatch';
import { GeelarkDevices } from './pages/GeelarkDevices';
import { GeelarkTasks } from './pages/GeelarkTasks';
import { GeelarkSettings } from './pages/GeelarkSettings';
import { EditorWorkbench } from './pages/EditorWorkbench';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <CreateFlowProvider>
        <MaterialsProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/production" element={<ProductionWizard />} />
              <Route path="/materials" element={<TabMaterials />} />
              <Route path="/history" element={<History />} />
              <Route path="/distribute" element={<TabDistribute />} />
              <Route path="/result" element={<Result />} />
              <Route path="/editor" element={<EditorWorkbench />} />
            </Route>
            <Route element={<GeelarkLayout />}>
              <Route path="/geelark-batch" element={<GeelarkBatch />} />
              <Route path="/geelark-devices" element={<GeelarkDevices />} />
              <Route path="/geelark-tasks" element={<GeelarkTasks />} />
              <Route path="/geelark-settings" element={<GeelarkSettings />} />
            </Route>
            <Route path="/geelark" element={<Navigate to="/geelark-batch" replace />} />
          </Routes>
          </BrowserRouter>
        </MaterialsProvider>
      </CreateFlowProvider>
    </ThemeProvider>
  );
}

export default App;
