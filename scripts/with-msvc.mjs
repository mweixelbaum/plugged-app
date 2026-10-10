// Startet einen Befehl unter Windows mit geladener MSVC-Umgebung (vcvars64.bat).
//
// Rust/cc-rs wählen sonst automatisch die neueste Visual-Studio-Installation – auch wenn
// dort die x64-Bibliotheken fehlen (z. B. VS 18 ohne "Desktopentwicklung mit C++").
// Hier wird gezielt eine Installation gesucht, in der msvcrt.lib wirklich existiert.
// Für Android-Builds werden zusätzlich ANDROID_HOME / NDK_HOME / JAVA_HOME ergänzt.
// Auf Linux/macOS wird der Befehl unverändert ausgeführt.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/with-msvc.mjs <command> [args...]');
  process.exit(1);
}

const env = { ...process.env };

function dirs(path) {
  try {
    return readdirSync(path, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

function findVcvars() {
  const roots = [
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft Visual Studio'),
    join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft Visual Studio'),
  ];
  const found = [];
  for (const root of roots) {
    for (const version of dirs(root)) {
      for (const edition of dirs(join(root, version))) {
        const vs = join(root, version, edition);
        const vcvars = join(vs, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
        if (!existsSync(vcvars)) continue;
        const msvc = join(vs, 'VC', 'Tools', 'MSVC');
        const complete = dirs(msvc).some((v) => existsSync(join(msvc, v, 'lib', 'x64', 'msvcrt.lib')));
        if (complete) found.push({ version, vcvars });
      }
    }
  }
  // Neueste vollständige Installation bevorzugen ("18" > "2022" wird numerisch falsch sortiert,
  // daher Jahreszahlen auf die interne Versionsnummer abbilden).
  const rank = (v) => ({ 2017: 15, 2019: 16, 2022: 17 })[v] ?? Number(v);
  found.sort((a, b) => rank(b.version) - rank(a.version));
  return found[0]?.vcvars;
}

function loadMsvcEnv() {
  if (env.VCINSTALLDIR) return; // bereits in einer Developer-Shell
  const vcvars = findVcvars();
  if (!vcvars) {
    console.error(
      'Keine vollständige MSVC-Installation gefunden.\n' +
        'Installiere die "Visual Studio Build Tools" mit "Desktopentwicklung mit C++" (inkl. Windows SDK).',
    );
    process.exit(1);
  }
  console.log(`[with-msvc] ${vcvars}`);
  const out = spawnSync('cmd.exe', ['/d', '/s', '/c', `"call "${vcvars}" >nul 2>nul && set"`], {
    encoding: 'utf8',
    windowsVerbatimArguments: true,
  });
  if (out.status !== 0) {
    console.error('vcvars64.bat konnte nicht geladen werden.');
    process.exit(1);
  }
  for (const line of out.stdout.split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
}

function setAndroidEnv() {
  const sdk = env.ANDROID_HOME || join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
  if (!env.ANDROID_HOME && existsSync(sdk)) env.ANDROID_HOME = sdk;
  if (!env.NDK_HOME) {
    const ndks = dirs(join(sdk, 'ndk')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (ndks.length) env.NDK_HOME = join(sdk, 'ndk', ndks.at(-1));
  }
  // Gradle unterstützt neue JDKs oft noch nicht – das JDK von Android Studio passt immer.
  const jbr = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'jbr');
  if (existsSync(join(jbr, 'bin', 'java.exe'))) env.JAVA_HOME = jbr;
  console.log(`[with-msvc] ANDROID_HOME=${env.ANDROID_HOME}\n[with-msvc] NDK_HOME=${env.NDK_HOME}\n[with-msvc] JAVA_HOME=${env.JAVA_HOME}`);
}

if (process.platform === 'win32') {
  loadMsvcEnv();
  if (args.includes('android')) setAndroidEnv();
}

const res = spawnSync(args[0], args.slice(1), { stdio: 'inherit', env, shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
