import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreateFlowProvider } from './context/CreateFlowContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Studio } from './pages/Studio';
import { TabMaterials } from './pages/TabMaterials';
import { History } from './pages/History';
import { TabDistribute } from './pages/TabDistribute';
import { Result } from './pages/Result';
import './index.css';

function App() {
  return (
    <CreateFlowProvider>
      <MaterialsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/materials" element={<TabMaterials />} />
              <Route path="/history" element={<History />} />
              <Route path="/distribute" element={<TabDistribute />} />
              <Route path="/result" element={<Result />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MaterialsProvider>
    </CreateFlowProvider>
  );
}

export default App;
