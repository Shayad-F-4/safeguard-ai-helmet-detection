import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkHealth, getAlerts } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isDemo, setIsDemo] = useState(true);
  const [settings, setSettings] = useState({});
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [systemStatus, setSystemStatus] = useState('connecting');

  const fetchHealth = async () => {
    try {
      const res = await checkHealth();
      // API returns is_demo (snake_case), not isDemo
      setIsDemo(res.data.is_demo ?? true);
      setSystemStatus('online');
    } catch (err) {
      setSystemStatus('offline');
    }
  };

  const refreshAlerts = async () => {
    try {
      const res = await getAlerts({ status: 'active', per_page: 1 });
      setActiveAlerts(res.data.counts?.active || res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    refreshAlerts();
    const interval = setInterval(() => {
      fetchHealth();
      refreshAlerts();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ isDemo, settings, setSettings, activeAlerts, systemStatus, refreshAlerts }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
