import fs from 'fs/promises';
import path from 'path';

export type Writable = string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView>;

export type JSONTypes = string | number | boolean | null | undefined

export interface BaseJSON {
  [k: string]: JSONTypes | BaseJSON | JSONTypes[] | BaseJSON[];
}

export interface LocalStorageInitOptions {
  root: string;
  dir?: string;
  emitErrors?: boolean;
}

export const IS_FILE_PATH_REGEX = /^[.]{0,1}[\\/]{0,1}[\w.]*$/;
export const TAB = '\x09';

export abstract class LocalStorage {
  private _root: string;
  private _dir: string;
  private _emitErrors: boolean;
  private _rootInitialized: boolean;
  private _dirInitialized: boolean;

  protected constructor() {
    this._root = '';
    this._dir = '';
    this._emitErrors = false;
    this._rootInitialized = false;
    this._dirInitialized = false;
  }

  protected async init(opts: LocalStorageInitOptions) {
    await this.setRoot(opts.root);
    this._rootInitialized = true;

    await this.setDir(opts.dir ?? '.');
    this._dirInitialized = true;

    if (opts.emitErrors) this._emitErrors = opts.emitErrors;

    return this;
  }

  get root() {
    return this._root;
  }

  get dir() {
    return this._dir;
  }

  isInitialized() {
    return this._dirInitialized;
  }

  joinDirWith(file: string) {
    if (!this._dirInitialized) throw new Error(`Storage hasin't initialized!`);

    if (!LocalStorage.isFile(file)) throw new Error(`${file} dont is a file name!`);

    return path.join(this.dir, file);
  }

  joinRootWith(...paths: string[]) {
    if (!this._rootInitialized) throw new Error('Root dir hasin\'t initialized!');

    return path.join(this._root, ...paths);
  }

  onLoadError(err: unknown, file: string) {
    throw err;
  }

  onSaveError(err: unknown, file: string, data: any) {
    throw err;
  }

  async setRoot(root: string) {
    const newRoot = path.join(process.cwd(), root);

    try {
      await fs.access(newRoot);
    } catch {
      await fs.mkdir(newRoot);
    }

    this._root = newRoot;
  }

  async setDir(dir: string) {
    const newDir = this.joinRootWith(dir);

    try {
      await fs.access(newDir);
    } catch {
      await fs.mkdir(newDir);
    }

    this._dir = newDir;
  }

  async load(file: string): Promise<string | undefined> {
    const filePath = this.joinDirWith(file);
    
    try {
      return await fs.readFile(filePath, { encoding: 'utf-8' });
    } catch (e) {
      if (this._emitErrors) this.onLoadError(e, file);
      return;
    }
  }

  async loadJSON<T = BaseJSON>(file: string): Promise<T | undefined> {
    const data = await this.load(file);

    if (!data) return;

    return JSON.parse(data);
  }

  async save(file: string, data: Writable) {
    await fs.writeFile(this.joinDirWith(file), data, { encoding: 'utf-8' });
  }

  async saveJSON<T = any>(file: string, json: T) {
    let data = '';
    
    try {
      data = JSON.stringify(json, undefined, TAB)
    } catch (e) {
      if (this._emitErrors) this.onSaveError(e, file, json);
      return;
    }

    await this.save(file, data);
  }

  static isFile(value: string) {
    return IS_FILE_PATH_REGEX.test(value);
  }
}