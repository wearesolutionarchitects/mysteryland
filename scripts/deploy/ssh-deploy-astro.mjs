import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const options = {
  distPath: resolve(process.env.DEPLOY_DIST || 'dist'),
  host: requiredEnv('DEPLOY_HOST'),
  user: requiredEnv('DEPLOY_USER'),
  port: process.env.DEPLOY_PORT || '22',
  sshKeyPath: process.env.DEPLOY_SSH_KEY_PATH,
  targetPath: process.env.DEPLOY_TARGET_PATH || '/var/www/vhosts/fanieng.com/mysteryland.biz/httpdocs',
  releaseRoot: process.env.DEPLOY_RELEASE_ROOT || '/var/www/vhosts/fanieng.com/mysteryland.biz/releases',
  preserveEntries: (process.env.DEPLOY_PRESERVE_ENTRIES || '.well-known').split(',').map((entry) => entry.trim()).filter(Boolean),
  keepReleases: Number.parseInt(process.env.DEPLOY_KEEP_RELEASES || '8', 10),
};

if (!existsSync(join(options.distPath, 'index.html'))) throw new Error('Missing Astro build output in dist');
if (!options.targetPath.startsWith('/') || !options.releaseRoot.startsWith('/')) throw new Error('Deploy paths must be absolute');
if (!Number.isInteger(options.keepReleases) || options.keepReleases < 1 || options.keepReleases > 30) {
  throw new Error('DEPLOY_KEEP_RELEASES must be between 1 and 30');
}

const releaseName = `astro-${new Date().toISOString().replaceAll(/[-:TZ.]/g, '').slice(0, 14)}-${process.env.GITHUB_SHA?.slice(0, 7) || 'local'}`;
const archivePath = resolve('.deploy', `${releaseName}.tar.gz`);
const remoteArchivePath = `/tmp/${releaseName}.tar.gz`;
const sshTarget = `${options.user}@${options.host}`;
const identityArgs = options.sshKeyPath ? ['-i', options.sshKeyPath] : [];

mkdirSync(resolve('.deploy'), { recursive: true });
run('tar', ['--no-xattrs', '-czf', archivePath, '-C', options.distPath, '.'], { ...process.env, COPYFILE_DISABLE: '1' });
run('scp', ['-P', options.port, ...identityArgs, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', archivePath, `${sshTarget}:${remoteArchivePath}`]);
run('ssh', ['-p', options.port, ...identityArgs, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', sshTarget, remoteCommand()]);
rmSync(archivePath, { force: true });
console.log(`Deployed ${releaseName} to ${options.targetPath}`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function remoteCommand() {
  const preserveList = options.preserveEntries.map(quote).join(' ');
  return [
    'set -eu',
    `target=${quote(options.targetPath)}`,
    `release_root=${quote(options.releaseRoot)}`,
    `release=${quote(join(options.releaseRoot, releaseName))}`,
    `archive=${quote(remoteArchivePath)}`,
    'mkdir -p "$target" "$release_root" "$release"',
    'tar -xzf "$archive" -C "$release"',
    'rm -f "$archive"',
    'for entry in "$target"/* "$target"/.[!.]* "$target"/..?*; do',
    '  [ -e "$entry" ] || continue',
    '  name=$(basename "$entry")',
    '  keep=false',
    `  for preserved in ${preserveList}; do [ "$name" = "$preserved" ] && keep=true && break; done`,
    '  [ "$keep" = true ] || rm -rf "$entry"',
    'done',
    'cp -a "$release"/. "$target"/',
    `printf '%s\\n' ${quote(releaseName)} > "$target/.release"`,
    `ls -1dt "$release_root"/astro-* 2>/dev/null | tail -n +${options.keepReleases + 1} | xargs -r rm -rf`,
  ].join('\n');
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}
