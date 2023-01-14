import { authenticate, LocalAuthOptions } from '@google-cloud/local-auth';
import { google, Auth, Common } from 'googleapis';

import { Cache } from '../local-storage/cache';
import { Config, UndefinedConfigError, ConfigNotFoundError } from '../local-storage/config';

export interface DriveAuthConfigJSON {
  scopes?: string[];
  keyfilePath?: string;
}

export interface CredentialsKeyJSON {
  client_id?: string,
  project_id?: string,
  auth_uri?: string,
  token_uri?: string,
  auth_provider_x509_cert_url?: string,
  client_secret?: string,
  redirect_uris?: string[]
}

export interface CredentialsJSON {
  web?: CredentialsKeyJSON;
  installed?: CredentialsKeyJSON;
}

export class AuthorizedDrive {
  static configPath = 'drive.config.json';
  private constructor() {};

  static async getAuthOptions(config?: Config): Promise<LocalAuthOptions> {
    if (!config) config = await Config.create();

    const data = await config.loadJSON<DriveAuthConfigJSON>(this.configPath);

    if (!data) throw new ConfigNotFoundError(config.joinDirWith(this.configPath));

    const { keyfilePath, scopes } = data;

    if (!keyfilePath) throw new UndefinedConfigError('keyfilePath');
    if (!scopes) throw new UndefinedConfigError('scopes');
    
    return {
      keyfilePath: config.joinDirWith(keyfilePath),
      scopes
    };
  }

  static async getCredentialsKey(config?: Config) {
    if (!config) config = await Config.create();

    const credentials = await config.loadJSON<CredentialsJSON>('credentials.json');

    if (!credentials) throw new Error(`Can't find credentials!`);

    const key = credentials.web || credentials.installed;

    if (!key) throw new Error();

    return key;
  }

  static async saveAuth(auth: Auth.OAuth2Client, key: CredentialsKeyJSON, cache?: Cache) {
    if (!cache) cache = await Cache.create();

    const { credentials } = auth;

    if (!credentials) return;
    
    await cache.saveJSON('token.json', {
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: credentials.refresh_token
    });
  }

  static async makeNewAuth(cache?: Cache) {
    if (!cache) cache = await Cache.create();

    const config = await Config.create();

    const key = await this.getCredentialsKey(config);

    const options = await this.getAuthOptions(config);

    const auth = await authenticate(options);

    await this.saveAuth(auth, key, cache);

    return auth;
  }

  static async authorize(): Promise<Auth.OAuth2Client> {
    const cache = await Cache.createWithDir('drive-auth');

    const cachedToken = await cache.loadJSON('token.json');

    if (cachedToken) {
      const auth: any = google.auth.fromJSON(cachedToken);
      
      return auth;
    } else {
      const auth = this.makeNewAuth(cache);

      return auth;
    }
  }

  static async createV2Drive() {
    const auth = await this.authorize();

    const drive = google.drive({
      version: 'v2',
      auth
    });

    return drive
  }

  static async createV3Drive() {
    const auth = await this.authorize();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    return drive;
  }
}