import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google, Auth, Common } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive';

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const CACHE_DIR = path.join(process.cwd(), '.cache');
const APP_CACHE_PATH = path.join(CACHE_DIR, 'app.cache.json');
const DATA_ID_FIELD = 'dataId'

async function loadSavedCredentialsIfExist(): Promise<Auth.OAuth2Client | null> {
  try {
    const content = await fs.readFile(TOKEN_PATH, { encoding: 'utf-8' });
    const credentials = JSON.parse(content);
    const authClient: any = google.auth.fromJSON(credentials);
    return authClient;
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client: Auth.OAuth2Client) {
  const content = await fs.readFile(CREDENTIALS_PATH, { encoding: 'utf-8' });
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  console.log('Getting saved credentials...');

  let client = await loadSavedCredentialsIfExist();

  if (client) return client;

  console.log('Save dont exists!');
  
  console.log('Getting user auth...');
  
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) await saveCredentials(client);

  return client;
}

async function setAppDataIdCache(id: string) {
  try {
    await fs.access(CACHE_DIR)
  } catch (e) {
    await fs.mkdir(CACHE_DIR);
  }

  let data: any;

  try {
    data = JSON.parse(await fs.readFile(APP_CACHE_PATH, { encoding: 'utf-8' }));
  } catch {
    data = {};
  }

  data[DATA_ID_FIELD] = id;

  await fs.writeFile(APP_CACHE_PATH, JSON.stringify(data, undefined, '  '));
}

async function getCachedAppDataIdIfExits(): Promise<string | undefined> {
  try {
    const data = JSON.parse(await fs.readFile(APP_CACHE_PATH, { encoding: 'utf-8' }));

    return data[DATA_ID_FIELD];
  } catch {
    return;
  }
}

async function queryAppDataIdFromDrive(drive: drive_v3.Drive) {
  const filesListResp = await drive.files.list({
    fields: 'files(name, id)',
    q: `name='app.data.json'`,
    spaces: 'appDataFolder',
    pageSize: 1,
  });

  const { files } = filesListResp.data;

  if (!files) throw new Error('Can\'t find "app.data.json" file!');

  const { id } = files[0];

  if (!id) throw new Error('Dont recived id');

  return id;
}

async function getAppDataId(drive: drive_v3.Drive): Promise<string> {
  let id = await getCachedAppDataIdIfExits();

  if (id) return id;

  id = await queryAppDataIdFromDrive(drive);

  await setAppDataIdCache(id);

  return id;
}

async function main(authClient: Auth.OAuth2Client) {
  const drive = google.drive({
    version: 'v3',
    auth: authClient
  });

  const id = await getAppDataId(drive);

  // const data = {
  //   type: 'static',
  //   registries: [
  //     { title: 'oi', content: 'mensagem de oi' }
  //   ]
  // };

  // const resp = await drive.files.update({
  //   fileId: id,
  //   media: {
  //     body: JSON.stringify(data),
  //     mimeType: 'application/json'
  //   }
  // });

  // console.log(resp.status);

  const resp: Common.GaxiosResponse<any> = await drive.files.get({
    fileId: id,
    alt: 'media'
  })

  console.log(resp.data.type);
}

authorize().then(main).catch(console.error);