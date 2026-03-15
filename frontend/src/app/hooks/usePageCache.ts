import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

export function usePageCache<T>(
  key: string,
  fetchData: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const location = useLocation();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const loadData = async (useCache = true) => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      
      // 检查缓存
      if (useCache) {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          if (isMountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
          }
          fetchingRef.current = false;
          return;
        }
      }

      // 获取新数据
      setLoading(true);
      const result = await fetchData();
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        
        // 更新缓存
        cache.set(key, {
          data: result,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  };

  const refresh = async () => {
    await loadData(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadData(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [key, ...dependencies]);

  return { data, loading, error, refresh };
}

// 清除特定页面的缓存
export function clearPageCache(key: string) {
  cache.delete(key);
}

// 清除所有缓存
export function clearAllCache() {
  cache.clear();
}
