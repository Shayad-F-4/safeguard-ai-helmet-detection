import { Routes, Route, lazy, Suspense } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DemoBanner from './components/DemoBanner';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'));
const ImageDetection = lazy(() => import('./pages/ImageDetection'));
const VideoDetection = lazy(() => import('./pages/VideoDetection'));
const DetectionResults = lazy(() => import('./pages/DetectionResults'));
const Alerts = lazy(() => import('./pages/Alerts'));
const History = lazy(() => import('./pages/History'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const Cameras = lazy(() => import('./pages/Cameras'));
const AIModel = lazy(() => import('./pages/AIModel'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
  </div>
);

const App = () => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DemoBanner />
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveMonitoring />} />
              <Route path="/image" element={<ImageDetection />} />
              <Route path="/video" element={<VideoDetection />} />
              <Route path="/results" element={<DetectionResults />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/history" element={<History />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/cameras" element={<Cameras />} />
              <Route path="/model" element={<AIModel />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
