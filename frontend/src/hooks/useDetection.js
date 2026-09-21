import { useState } from 'react';
import { detectImage, detectVideo } from '../services/api';

export const useDetection = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const detect = async (file, type = 'image') => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let res;
      if (type === 'image') {
        res = await detectImage(formData);
      } else if (type === 'video') {
        res = await detectVideo(formData);
      }
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setResult(null);
    setError(null);
  };

  return { loading, result, error, detect, reset };
};
