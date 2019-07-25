// tslint:disable:no-console
// tslint:disable:max-classes-per-file
import assert from 'assert';
import { execSync, spawn, SpawnOptions } from 'child_process';
import { debug } from 'debug';
import extend from 'extend';
import fs from 'fs';
import path from 'path';
import {
  BACKUP_LOCK_FILE,
  BACKUPS_DIR,
  DOCKER_DIR,
  DOWNLOAD_URL,
  MIN,
  NODE_DIR,
  NODE_FILE,
  NODE_LOCK_FILE,
  TNetworkType,
  VERSION_RISE,
} from './constants';
import {
  AddressInUseError,
  DBConnectionError,
  NativeModulesError,
  NoRiseDistFileError,
} from './exceptions';
import { IForeground, IVerbose } from './options';

export const log = debug('rise-cli');

export function getDownloadURL(file: string, version = VERSION_RISE) {
  return DOWNLOAD_URL + version + '/download/' + file;
}

export function isDevEnv() {
  return process.env.DEV;
}

export function getDockerDir(relativeToCLI = false): string {
  const root = relativeToCLI ? __dirname : process.cwd();
  return path.resolve(root, DOCKER_DIR);
}

export function getNodeDir(relativeToCLI = false): string {
  const root = relativeToCLI ? __dirname : process.cwd();
  return path.resolve(root, NODE_DIR);
}

/**
 * TODO unify with extractSourceFile
 * @param silent
 * @param relativeToCLI
 */
export async function checkSourceDir(relativeToCLI = false) {
  const dirPath = relativeToCLI ? path.resolve(__dirname, NODE_DIR) : NODE_DIR;
  if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
    await extractSourceFile();
  }
}

export function checkLaunchpadExists(): boolean {
  const file = getLaunchpadFilePath();
  if (!fs.existsSync(file)) {
    log(`Missing: ${file}`);
    console.log(`ERROR: can't find launchpad executable in ${NODE_DIR}.`);
    console.log('You can download the latest version using:');
    console.log('  ./rise node download');
    return false;
  }
  return true;
}

export function checkDockerDirExists(): boolean {
  if (!fs.existsSync(DOCKER_DIR) || !fs.lstatSync(DOCKER_DIR).isDirectory()) {
    console.log(`Error: directory '${DOCKER_DIR}' doesn't exist.`);
    console.log('You can download the latest version using:');
    console.log('  ./rise docker download');
    return false;
  }
  return true;
}

export async function extractSourceFile(
  relativeToCLI = false,
  streamOutput = false
) {
  const filePath = getSourceFilePath(relativeToCLI);
  if (!fs.existsSync(filePath)) {
    console.log(`ERROR: File ${DOCKER_DIR}/${NODE_FILE} missing`);
    console.log('You can download the latest version using:');
    console.log('  ./rise node download');
    throw new NoRiseDistFileError();
  }

  console.log(`Extracting ${DOCKER_DIR}/${NODE_FILE}`);
  await execCmd(
    'tar',
    ['-zxf', NODE_FILE],
    `Couldn't extract ${getSourceFilePath(relativeToCLI)}`,
    {
      cwd: getDockerDir(relativeToCLI),
    },
    streamOutput
  );
}

/**
 * Returns the path to the lerna CLI file.
 */
export function getLaunchpadFilePath(): string {
  return path.resolve(
    process.cwd(),
    NODE_DIR,
    'node_modules',
    '.bin',
    'rise-launchpad'
  );
}

/**
 * Returns the path to the rise-node.tar.gz file.
 */
export function getSourceFilePath(relativeToCLI = false): string {
  const root = relativeToCLI ? __dirname : process.cwd();
  return path.resolve(root, DOCKER_DIR, NODE_FILE);
}

/**
 * Gets the PID from a PID lock file.
 *
 * Performs garbage collection if the process isn't running any more.
 *
 * @param filePath
 */
export function getPID(filePath: string): number | false {
  try {
    const pid = fs.readFileSync(filePath, { encoding: 'utf8' }).split('\n')[0];
    let exists: string;
    try {
      exists = execSync(`ps -p ${pid} -o pid=`).toString('utf8');
    } catch {
      // empty
    }
    if (!exists) {
      fs.unlinkSync(NODE_LOCK_FILE);
      return false;
    }
    return parseInt(pid, 10);
  } catch {
    // empty
  }
  return false;
}

/**
 * Returns the PID of currently running node.
 */
export function getNodePID(): number | false {
  return getPID(NODE_LOCK_FILE);
}

export function getBackupPID(): number | false {
  return getPID(BACKUP_LOCK_FILE);
}

/**
 * Checks if Postgres tools are intalled and runnable.
 */
export function hasLocalPostgres(): boolean {
  const toCheck = ['dropdb', 'vacuumdb', 'createdb', 'pg_dump', 'psql'];
  try {
    for (const file of toCheck) {
      execSync(`which ${file}`);
    }
  } catch {
    return false;
  }
  return true;
}

// TODO only a partial config, ideally import from /packages/core
export interface INodeConfig {
  db: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

export function getConfigPath(
  networkType: TNetworkType,
  relativeToCLI = false
): string {
  return path.resolve(
    getNodeDir(relativeToCLI),
    'packages',
    'rise',
    'etc',
    networkType,
    'config.json'
  );
}

/**
 * Returns a merged config (user's + network's).
 */
export function mergeConfig(
  networkType: TNetworkType,
  configPath?: string | null,
  relativeToCLI = false
): INodeConfig {
  const root = relativeToCLI ? __dirname : process.cwd();
  if (!fs.existsSync(path.resolve(root, NODE_DIR))) {
    throw new Error(`${NODE_DIR} missing`);
  }
  const parentConfigPath = getConfigPath(networkType, relativeToCLI);
  if (!fs.existsSync(parentConfigPath)) {
    throw new Error(`Parent config ${parentConfigPath} doesn't exist`);
  }
  const parentConfig = JSON.parse(
    fs.readFileSync(parentConfigPath, { encoding: 'utf8' })
  );
  // return only the parent config
  if (!configPath) {
    return parentConfig;
  }
  // merge the passed config
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config ${configPath} doesn't exist`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
  return extend(true, parentConfig, config);
}

export function getBackupsDir(): string {
  return path.resolve(process.cwd(), BACKUPS_DIR);
}

export function setBackupLock() {
  fs.writeFileSync(BACKUP_LOCK_FILE, process.pid);
}

export function removeBackupLock() {
  fs.unlinkSync(BACKUP_LOCK_FILE);
}

// tslint:disable-next-line:cognitive-complexity
export function execCmd(
  file: string,
  params: string[],
  errorMsg?: string | null,
  options?: SpawnOptions,
  streamOutput = false,
  timeout?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const cmd = file + ' ' + params.join(' ');
      let output = '';
      let errors = '';
      // run the command
      const proc = spawn(file, params, {
        shell: true,
        ...options,
      });
      log(`$ ${cmd}`);
      // timeout
      const timer = timeout
        ? setTimeout(() => {
            if (!proc.killed) {
              console.log(`Timeout (${2 * MIN} secs)`);
              proc.kill();
            }
          }, timeout)
        : null;
      const appendOutput = (data: Buffer) => {
        if (streamOutput) {
          process.stdout.write(data);
        }
        output += data.toString('utf8');
      };
      proc.stdout.on('data', appendOutput);
      proc.stderr.on('data', appendOutput);
      proc.on('error', (error: Error) => {
        reject(error);
      });
      proc.stderr.on('data', (data: Buffer) => {
        errors += data.toString('utf8');
      });
      errorMsg = errorMsg || `Command '${cmd}' failed`;
      proc.on('close', (code) => {
        if (code) {
          errors = errors.replace(/\n+$/, '');
          if (timeout) {
            clearTimeout(timer);
          }
          log(`cmd-error: ${errors}`);
          log(`cmd-exit-code: ${code}`);
          if (errors) {
            log(errors);
          }
          console.log('ERROR: ' + errorMsg);
          reject(new Error(errorMsg));
        } else {
          resolve(output);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Returns a function resolving once "Blockchain ready" was printed.
 *
 * Detects errors and passed to reject():
 * - NativeModulesError
 * - DBConnectionError
 */
export function createParseNodeOutput(
  { foreground, verbose }: IForeground & IVerbose,
  setReady: () => void,
  resolve: (val?: any) => void,
  reject: (err?: Error) => void
): (data: Buffer) => void {
  return (data: Buffer) => {
    // output
    if (foreground || verbose) {
      process.stdout.write(data);
    } else {
      log(data);
    }
    // check if the output reached the desired line
    if (data.includes('Blockchain ready')) {
      console.log('Blockchain ready');
      setReady();
      // keep streaming the output if in the foreground
      if (!foreground) {
        resolve();
      }
    }
    // handle native modules errors
    if (
      data.includes('Error: dlopen') ||
      data.includes('Error: Could not locate the bindings file') ||
      data.includes('invalid ELF header')
    ) {
      log('NativeModulesError');
      reject(new NativeModulesError());
      return;
    }
    // handle address in use error
    if (data.includes('EADDRINUSE')) {
      log('AddressInUseError');
      reject(new AddressInUseError());
      return;
    }
    const sqlError = /Sequelize(\w*)Error/;
    if (sqlError.test(data.toString('utf8'))) {
      log('DBConnectionError');
      reject(new DBConnectionError());
      return;
    }
  };
}

export function getCoreRiseDir(): string {
  return path.resolve(process.cwd(), NODE_DIR, 'packages', 'rise');
}

export function getDBEnvVars(
  network: TNetworkType,
  config: string | null,
  relativeToCLI = false
): IDBEnvVars {
  const mergedConfig = mergeConfig(network, config, relativeToCLI);
  const { host, port, database, user, password } = mergedConfig.db;
  assert(host);
  assert(port);
  assert(database);
  assert(password);

  return {
    PGDATABASE: database,
    PGHOST: host,
    PGPASSWORD: password,
    PGPORT: port.toString(),
    PGUSER: user,
  };
}

export interface IDBEnvVars {
  PGDATABASE: string;
  PGHOST: string;
  PGPASSWORD: string;
  PGPORT: string;
  PGUSER: string;
}

export function dbConnectionInfo(vars: IDBEnvVars): string {
  return [
    `Host: ${vars.PGHOST}`,
    `Port: ${vars.PGPORT}`,
    `User: ${vars.PGUSER}`,
    `DB: ${vars.PGDATABASE}`,
  ].join('\n');
}

export function printUsingConfig(network: TNetworkType, config: string | null) {
  if (config) {
    console.log(
      `Config: using "${config}" and inheriting from network "${network}".`
    );
  } else {
    console.log(`Config: default config for network "${network}".`);
  }
}

export async function getBlockHeight(
  network: TNetworkType,
  config?: string,
  streamOutput = false
): Promise<number | null> {
  const envVars = getDBEnvVars(network, config);
  // TODO check output
  const output = await execCmd(
    'psql',
    [
      '-d',
      envVars.PGDATABASE,
      '-t',
      '-c',
      '"select height from blocks order by height desc limit 1;"',
    ],
    "Couldn't get the block height",
    {
      env: { ...process.env, ...envVars },
    },
    streamOutput
  );
  const blockHeight = parseInt(output, 10);
  log(`block height: ${blockHeight}`);
  return blockHeight || null;
}

export function unlinkLockFile() {
  if (!isDevEnv() && fs.existsSync(NODE_LOCK_FILE)) {
    fs.unlinkSync(NODE_LOCK_FILE);
  }
}
