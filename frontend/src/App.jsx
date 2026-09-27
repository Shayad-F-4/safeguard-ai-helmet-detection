import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DemoBanner from './components/DemoBanner';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import ImageDetection from './pages/ImageDetection';
import VideoDetection from './pages/VideoDetection';
import DetectionResults from './pages/DetectionResults';
import Alerts from './pages/Alerts';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Cameras from './pages/Cameras';
import AIModel from './pages/AIModel';
import Settings from './pages/Settings';

const App = () => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DemoBanner />
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
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
        </main>
      </div>
    </div>
  );
};

export default App;
