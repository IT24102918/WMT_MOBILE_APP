import { useState, useCallback } from 'react';
import { requestJson } from '../config/api';

export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      return await requestJson(path, options);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const get    = (path)         => request(path);
  const post   = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) });
  const put    = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) });
  const del    = (path)         => request(path, { method: 'DELETE' });

  return { get, post, put, del, loading, error };
};
