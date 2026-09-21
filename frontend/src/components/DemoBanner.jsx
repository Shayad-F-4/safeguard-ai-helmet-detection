import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X } from 'lucide-react';

/**
 * DemoBanner — renders an amber banner when the backend is running in demo/mock mode.
 * Reads `isDemo` from AppContext. Has a session-level dismiss button.
 */
const DemoBanner = () => {
  const { isDemo } = useAppContext();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500/15 border-b border-amber-500/40 text-amber-400 text-sm py-2 px-4 shrink-0">
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="font-semibold">⚠ DEMO MODE</span>
        <span className="text-amber-300/80">—</span>
        <span className="text-amber-300/90">
          Running with Mock Detector. Real ML model not loaded. Results are simulated for demonstration.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss demo banner"
        className="shrink-0 p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DemoBanner;
