const catastrophicCommandPatterns = [
  /\brm\s+-[^\n;&|]*[rf][^\n;&|]*\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\bwipefs\b/i,
  /\bdocker\s+volume\s+(rm|prune)\b/i,
  /\bdocker\s+(compose|system)\b[^\n]*(--volumes|-v)\b/i,
  /\bdrop\s+(database|table)\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+all\b/i,
  /\brevoke\s+all\b/i,
  /\balter\s+user\b/i
];

const forbiddenSqlKeywords = /\b(insert|update|delete|drop|truncate|alter|grant|revoke|create|replace|merge|call|execute|load|outfile|infile)\b/i;
const forbiddenSqlSyntax = /(;|--|\/\*|\*\/|#)/;

const forbiddenArgCharacters = /[;&|`$()<>]/;
const forbiddenArgWords = /\b(rm|mv|scp|ssh|sudo|su|curl|wget|bash|sh|python|perl|nc|mkfs|dd)\b/i;

const allowedScriptArgPatterns = [
  /^--since=\d{4}-\d{2}-\d{2}$/,
  /^--until=\d{4}-\d{2}-\d{2}$/,
  /^--seuil=\d+(?:\.\d+)?$/,
  /^--indice=[A-Z]+$/,
  /^--pays=[A-Za-zÀ-ÿ '\-]+$/,
  /^--fond=\d+$/,
  /^--execute$/,
  /^--dry-run$/,
  /^(backup|state|rollback)$/,
  /^\d+$/
];

export function assertNoCatastrophicCommand(command: string): void {
  for (const pattern of catastrophicCommandPatterns) {
    if (pattern.test(command)) {
      throw new Error('Commande bloquée par la politique de sécurité MCP.');
    }
  }
}

export function assertScopedWriteToolsEnabled(enabled: boolean): void {
  if (!enabled) {
    throw new Error('Outils d’écriture désactivés. Activer ENABLE_WRITE_TOOLS=true côté serveur après validation explicite.');
  }
}

export function assertWriteFlag(allowWrite: boolean, operation: string): void {
  if (!allowWrite) {
    throw new Error(`Écriture refusée pour ${operation}. Relancer l’outil avec allow_write=true après validation explicite.`);
  }
}

export function assertSelectOnlyQuery(query: string): void {
  const trimmed = query.trim();
  if (!/^select\s/i.test(trimmed)) {
    throw new Error('SQL refusé: seules les requêtes SELECT sont autorisées.');
  }
  if (forbiddenSqlSyntax.test(trimmed)) {
    throw new Error('SQL refusé: séparateurs, commentaires et requêtes multiples interdits.');
  }
  if (forbiddenSqlKeywords.test(trimmed)) {
    throw new Error('SQL refusé: mot-clé d’écriture ou d’administration détecté.');
  }
}

export function assertSafeScriptArgs(args: string[]): void {
  for (const arg of args) {
    if (arg.length === 0 || arg.length > 120) {
      throw new Error(`Argument refusé: longueur invalide (${arg}).`);
    }
    if (forbiddenArgCharacters.test(arg) || forbiddenArgWords.test(arg)) {
      throw new Error(`Argument refusé: caractère ou mot dangereux détecté (${arg}).`);
    }
    if (!allowedScriptArgPatterns.some((pattern) => pattern.test(arg))) {
      throw new Error(`Argument refusé par la liste blanche: ${arg}`);
    }
  }
}

export function scriptArgsRequireWriteApproval(args: string[]): boolean {
  return args.some((arg) => arg === '--execute' || arg === 'rollback' || arg === 'backup');
}
