import type { CommandResult } from '../ssh/client.js';

export function asText(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

export function commandResultToText(result: CommandResult): string {
  const output = result.stdout || '(vide)';
  const errors = result.stderr || '(vide)';
  return `Serveur: ${result.server}\nCommande: ${result.command}\nCode: ${result.code ?? 'unknown'}\n\nSortie standard:\n${output}\n\nSortie erreur:\n${errors}`;
}
