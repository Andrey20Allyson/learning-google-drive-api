import { AuthorizedDrive } from './drive';
import { Cache } from './local-storage/cache';
import { drive_v3, Common } from "googleapis";

const APP_DATA_FILE_NAME = 'app.data.json';
const CACHE_DIR = 'app-data';
const CACHE_FILE_NAME = 'app.cache.json';

const JSON_MIME_TYPE = 'application/json';

export interface CacheSchema {
  appDataId?: string;
}

export interface CloudAppDataOptions {
  drive: drive_v3.Drive;
  appDataId: string;
}

export class CloudAppData<S = any> {
  private static async createAppDataFile(drive: drive_v3.Drive) {
    const fileCreateResp = await drive.files.create({
      fields: 'id',
      requestBody: {
        name: APP_DATA_FILE_NAME
      }
    });

    const { id } = fileCreateResp.data;

    if (!id) throw new Error(`Response don't returned the id!`);

    return id;
  }

  private static async queryAppDataId(drive: drive_v3.Drive) {
    const filesListResp = await drive.files.list({
      fields: 'files(name, id)',
      q: `name='${APP_DATA_FILE_NAME}'`,
      spaces: 'appDataFolder',
      pageSize: 1,
    });
  
    const { files } = filesListResp.data;
  
    if (files === undefined) throw new Error(`Files can't be undefined!`);

    const file = files[0];
  
    if (file && file.id) return file.id;
  }

  private static async saveAppDataId(data: CacheSchema | undefined, id: string, cache?: Cache) {
    if (!cache) cache = await Cache.createWithDir(CACHE_DIR);

    if (!data) data = {};

    data.appDataId = id;

    await cache.saveJSON(CACHE_FILE_NAME, data);
  }

  private static async getAppDataId(drive: drive_v3.Drive) {
    const cache = await Cache.createWithDir(CACHE_DIR);

    let data = await cache.loadJSON<CacheSchema>(CACHE_FILE_NAME);

    if (data && data.appDataId) return data.appDataId;

    let appDataId = await this.queryAppDataId(drive) || await this.createAppDataFile(drive);

    await this.saveAppDataId(data, appDataId, cache);

    return appDataId;
  }

  static async create<S = any>() {
    const drive = await AuthorizedDrive.createV3Drive();

    const appDataFileId = await this.getAppDataId(drive);

    const cloudAppData = new this<S>({
      appDataId: appDataFileId,
      drive
    });

    return cloudAppData;
  }

  async load(): Promise<S> {
    const resp: Common.GaxiosResponse<any> = await this._drive.files.get({
      fileId: this._appDataId,
      alt: 'media'
    });

    return resp.data;
  }

  async save(data: S) {
    const resp = await this._drive.files.update({
      fileId: this._appDataId,
      media: {
        body: data,
        mimeType: JSON_MIME_TYPE
      }
    });
  }

  private _drive: drive_v3.Drive;
  private _appDataId: string; 

  private constructor(opts: CloudAppDataOptions) {
    this._appDataId = opts.appDataId;
    this._drive = opts.drive;
  }
}