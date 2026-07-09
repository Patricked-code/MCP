import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage'
]);

const forbiddenPathPatterns = [
  { label: 'env file', pattern: /(^|\/)\.env$/i },
  { label: 'private key file', pattern: /\.(?:pem|key|p12|pfx)$/i },
  { label: 'database dump', pattern: /\.(?:dump|sql)$/i },
  { label: 'ssh private key', pattern: /(^|\/)id_(?:rsa|ed25519|ecdsa|dsa)$/i },
  { label: 'secrets directory', pattern: /(^|\/)secrets\//i },
  { label: 'keys directory', pattern: /(^|\/)keys\//i }
];

const forbiddenContentPatterns = [
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { label: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----[\s\S]{80,}-----END (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----/i }
];

function toPortablePath(path) {
  return path.split(sep).join('/');
}

function walk(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
    } else if (entry.isFile()) {
      output.push(fullPath);
    }
  }
  return output;
}

function isTextCandidate(path) {
  return /\.(?:ts|js|mjs|json|md|yml|yaml|txt|sh|env|example)$/i.test(path)
    || /(^|\/)(Dockerfile|package-lock\.json|package\.json|tsconfig\.json)$/i.test(path);
}

let failed = false;
for (const file of walk(process.cwd())) {
  const relativePath = toPortablePath(relative(process.cwd(), file));
  for (const forbidden of forbiddenPathPatterns) {
    if (forbidden.pattern.test(relativePath)) {
      console.error(`Fichier sensible présent dans le workspace local (${forbidden.label}): ${relativePath}`);
      failed = true;
    }
  }

  if (isTextCandidate(relativePath) && statSync(file).size <= 1_000_000) {
    const content = readFileSync(file, 'utf8');
    for (const forbidden of forbiddenContentPatterns) {
      if (forbidden.pattern.test(content)) {
        console.error(`Signal sensible détecté (${forbidden.label}) dans ${relativePath}`);
        failed = true;
      }
    }
  }
}

globalThis.process.exitCode = failed ? 1 : 0;
if (!failed) console.log('Contrôle fichiers et signaux sensibles terminé.');
