import { LocalStorage } from '.';

export const CACHE_ROOT = '.cache/';

export class Cache extends LocalStorage {
  static async create() {
    const cache = new this();

    cache.init({
      root: CACHE_ROOT
    });

    return cache;
  }

  static async createWithDir(dir: string) {
    const cache = new this();

    await cache.init({
      root: CACHE_ROOT,
      dir
    });

    return cache;
  }
}