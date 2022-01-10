import fs from 'fs';
import path from 'path';
import { createTypesFromMetadata } from './create-types';
import { Command } from 'commander';
import { request } from 'undici';

export const run = async () => {
  const program = new Command()
    .requiredOption('-m, --metadata <path>', 'Metadata filepath or url', '')
    .requiredOption('-t, --target <path>', 'Target path to save types')
    .option('-a, --auth <string>', 'Basic auth username:password');

  program.parse(process.argv);

  const options = program.opts();

  const metadataPath = options.metadata;
  const targetpath = options.target;
  const credentials = options.auth;

  let xml: string;
  if (isUrl(metadataPath)) {
    try {
      const headers: { authorization?: string } = {};
      // TODO: add format check <user>:<pass>
      if (credentials) {
        headers.authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
      }
      const { statusCode, body } = await request(metadataPath, {
        method: 'GET',
        headers,
      });
      if (statusCode === 200) {
        xml = await body.text();
      } else {
        throw new Error(`Get metadata error: ${statusCode}`);
      }
    } catch (e) {
      throw new Error(`Get metadata error`);
    }
  } else if (fs.existsSync(metadataPath)) {
    xml = await fs.promises.readFile(metadataPath, { encoding: 'utf-8' });
  } else {
    throw new Error(`Invalid metadata path: ${metadataPath}`);
  }

  const source = createTypesFromMetadata(xml);

  if (targetpath) {
    if (!fs.existsSync(path.dirname(targetpath))) {
      throw new Error("Target directory doesn't exist");
    }
    fs.writeFileSync(targetpath, source, { encoding: 'utf-8' });
  } else {
    console.log(source);
  }
};

function isUrl(url: string): boolean {
  if (!url.startsWith('http')) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
