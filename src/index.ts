import { CloudAppData } from "./cloud-app-data";

interface AppDataSchema {
  type?: string;
  registers?: any
}

async function main() {
  const appdata = await CloudAppData.create<AppDataSchema>();

  const data = await appdata.load();

  console.log(data);
}

main().catch(console.error);