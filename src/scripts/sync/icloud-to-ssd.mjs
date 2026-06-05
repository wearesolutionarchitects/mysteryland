import { loadEnv, runOrThrow } from '../lib/core.mjs';

loadEnv();

const username = process.env.ICLOUD_USERNAME || 'heiko@fanieng.com';
const directory = process.env.ICLOUD_DIRECTORY || '/Volumes/Sandisk/Fotos';
const recentDays = process.env.ICLOUD_RECENT_DAYS || '5';

runOrThrow('icloudpd', [
  '--username',
  username,
  '--directory',
  directory,
  '--folder-structure',
  '{:%Y/%m/%d}',
  '--recent',
  String(recentDays),
  '--set-exif-datetime',
]);
