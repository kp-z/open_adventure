import localforage from 'localforage';

// 配置 IndexedDB
const storage = localforage.createInstance({
  name: 'open-adventure',
  storeName: 'app-data',
  description: 'Open Adventure 应用数据',
});

// 用户偏好设置
export const preferences = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await storage.getItem(key);
    } catch (error) {
      console.error('读取偏好设置失败', key, error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await storage.setItem(key, value);
    } catch (error) {
      console.error('保存偏好设置失败', key, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (error) {
      console.error('删除偏好设置失败', key, error);
    }
  },
};

// 缓存管理
interface CacheItem<T> {
  data: T;
  expires: number;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await storage.getItem<CacheItem<T>>(key);
      if (item && item.expires > Date.now()) {
        return item.data;
      }
      // 缓存过期，删除
      await storage.removeItem(key);
      return null;
    } catch (error) {
      console.error('读取缓存失败', key, error);
      return null;
    }
  },

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await storage.setItem(key, {
        data,
        expires: Date.now() + ttl * 1000,
      });
    } catch (error) {
      console.error('保存缓存失败', key, error);
    }
  },

  async clear(): Promise<void> {
    try {
      await storage.clear();
      console.log('✅ IndexedDB 缓存已清除');
    } catch (error) {
      console.error('清除缓存失败', error);
    }
  },
};

// 导出 storage 实例供高级用法
export default storage;
