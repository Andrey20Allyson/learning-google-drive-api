import { LocalStorage } from '.';

export const CONFIG_ROOT = 'config/';

export class ConfigNotFoundError extends Error {
  constructor(configPath: string) {
    super(`Can't find configuration in ${configPath}!`)
  }
}

export class UndefinedConfigError extends Error {
  constructor(key: string) {
    super(`${key} hasin't defined in config!`)
  }
}

export class Config extends LocalStorage {
  static async create() {
    const cache = new this();

    await cache.init({
      root: CONFIG_ROOT,
    });

    return cache;
  }

  static async createWithDir(dir: string) {
    const cache = new this();

    await cache.init({
      root: CONFIG_ROOT,
      dir
    });

    return cache;
  }
}