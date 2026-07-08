import type { OnboardingQuestion } from './types.js';

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 'actor.identity',
    title: 'Qui se connecte ?',
    body: 'Le MCP doit identifier le type d’acteur avant de proposer des droits ou des actions.',
    defaultChoice: 'A',
    choices: [
      { key: 'A', label: 'Humain / propriétaire', recommended: true },
      { key: 'B', label: 'Agent IA : ChatGPT, Claude, Codex' },
      { key: 'C', label: 'Service automatique MCP / ConfigCloud' }
    ]
  },
  {
    id: 'actor.role',
    title: 'Quel rôle donner ?',
    body: 'Le rôle détermine les actions MCP autorisées.',
    defaultChoice: 'B',
    choices: [
      { key: 'A', label: 'Lecture seule' },
      { key: 'B', label: 'Gestion projet avec écriture contrôlée', recommended: true },
      { key: 'C', label: 'SuperAdmin MCP', blockedWithoutSuperAdmin: true }
    ]
  },
  {
    id: 'github.account.action',
    title: 'Que faire avec ce compte GitHub ?',
    body: 'Le MCP peut seulement enregistrer le compte ou aller jusqu’au mapping complet.',
    defaultChoice: 'C',
    choices: [
      { key: 'A', label: 'Enregistrer seulement' },
      { key: 'B', label: 'Lier aux repos visibles' },
      { key: 'C', label: 'Lier repos + serveurs + agents', recommended: true }
    ]
  },
  {
    id: 'repos.action',
    title: 'Que faire avec les repos visibles ?',
    body: 'Le MCP doit choisir entre inventaire, documentation et mapping serveur.',
    defaultChoice: 'C',
    choices: [
      { key: 'A', label: 'Inventaire seulement' },
      { key: 'B', label: 'Vérifier et documenter' },
      { key: 'C', label: 'Vérifier, documenter et créer les mappings serveur', recommended: true }
    ]
  },
  {
    id: 'repo.incomplete',
    title: 'Si le repo est incomplet ?',
    body: 'Un repo incomplet ne doit jamais être modifié directement sur la branche officielle.',
    defaultChoice: 'B',
    choices: [
      { key: 'A', label: 'Ne rien faire' },
      { key: 'B', label: 'Créer une branche de proposition', recommended: true },
      { key: 'C', label: 'Corriger directement', blockedWithoutSuperAdmin: true }
    ]
  },
  {
    id: 'server.unlinked',
    title: 'Si un dossier serveur n’a pas de repo lié ?',
    body: 'Le MCP doit proposer un lien plutôt que créer automatiquement sans validation.',
    defaultChoice: 'B',
    choices: [
      { key: 'A', label: 'Ignorer' },
      { key: 'B', label: 'Proposer un repo existant', recommended: true },
      { key: 'C', label: 'Créer un nouveau repo GitHub' }
    ]
  },
  {
    id: 'write.policy',
    title: 'Qui peut écrire ?',
    body: 'La politique par défaut limite les écritures aux branches MCP.',
    defaultChoice: 'B',
    choices: [
      { key: 'A', label: 'Personne sans validation humaine' },
      { key: 'B', label: 'Agents autorisés sur branche MCP uniquement', recommended: true },
      { key: 'C', label: 'Agents autorisés sur branche officielle', blockedWithoutSuperAdmin: true }
    ]
  },
  {
    id: 'documentation.agent',
    title: 'Quel agent doit documenter le projet ?',
    body: 'ChatGPT supervise, Claude rédige long, Codex modifie techniquement.',
    defaultChoice: 'A',
    choices: [
      { key: 'A', label: 'ChatGPT', recommended: true },
      { key: 'B', label: 'Claude' },
      { key: 'C', label: 'Codex / agent technique' }
    ]
  }
];

export function getDefaultOnboardingQuestions(): OnboardingQuestion[] {
  return onboardingQuestions;
}
