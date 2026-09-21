import { useState, useCallback } from 'react';
import { getAlerts, updateAlert } from '../services/api';
import { useAppContext } from '../context/AppContext';

export const useAlerts = (initialParams = {}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refreshAlerts } = useAppContext();

  const refresh = useCallback(async (params = initialParams) => {
    setLoading(true);
    try {
      const res = await getAlerts(params);
      // API returns paginated response: { items: [...], total, page, ... }
      setAlerts(res.data?.items || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  const acknowledge = async (id) => {
    try {
      await updateAlert(id, { status: 'acknowledged' });
      await refresh();
      refreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const resolve = async (id) => {
    try {
      await updateAlert(id, { status: 'resolved' });
      await refresh();
      refreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return { alerts, loading, acknowledge, resolve, refresh };
};
