import type { ActorIdentity, OnboardingChoice, OnboardingQuestion, RightsReport } from './types.js';

function choice(
  id: 'A' | 'B' | 'C',
  label: string,
  value: string,
  isDefault: boolean,
  allowed = true,
  reason?: string
): OnboardingChoice {
  return { id, label, value, isDefault, allowed, reason };
}

export function buildOnboardingQuestions(actor: ActorIdentity, rights: RightsReport): OnboardingQuestion[] {
  const aiDefault = actor.actorType === 'chatgpt' || actor.actorType === 'claude' || actor.actorType === 'codex';
  const superAdminAllowed = actor.actorType === 'human_owner' && !actor.requiresHumanApproval;
  const directFixAllowed = rights.isWriteSafe && !rights.requiresHumanApproval;

  return [
    {
      id: 'actor_identity',
      title: 'Question 1 - Qui se connecte ?',
      prompt: 'Identifier si la session est humaine, agent IA ou service automatique.',
      defaultChoiceId: aiDefault ? 'B' : 'A',
      choices: [
        choice('A', 'Humain / proprietaire', 'human_owner', !aiDefault),
        choice('B', 'Agent IA : ChatGPT, Claude, Codex', 'ai_agent', aiDefault),
        choice('C', 'Service automatique MCP', 'automation_service', false)
      ]
    },
    {
      id: 'role_grant',
      title: 'Question 2 - Quel role donner ?',
      prompt: 'Limiter les droits MCP accordes a cette session.',
      defaultChoiceId: 'B',
      choices: [
        choice('A', 'Lecture seule', 'read_only', false),
        choice('B', 'Gestion projet avec ecriture controlee', 'scoped_project_write', true),
        choice('C', 'SuperAdmin MCP', 'superadmin_mcp', false, superAdminAllowed, 'Requires master MCP token validation.')
      ]
    },
    {
      id: 'github_account_action',
      title: 'Question 3 - Que faire avec ce compte GitHub ?',
      prompt: 'Choisir comment le compte GitHub doit etre enregistre dans la gouvernance MCP.',
      defaultChoiceId: 'C',
      choices: [
        choice('A', 'Enregistrer seulement', 'record_only', false),
        choice('B', 'Lier aux repos visibles', 'link_visible_repos', false),
        choice('C', 'Lier repos + serveurs + agents', 'link_repos_servers_agents', true)
      ]
    },
    {
      id: 'visible_repos_action',
      title: 'Question 4 - Que faire avec les repos visibles ?',
      prompt: 'Definir le niveau d inspection applique aux repositories accessibles.',
      defaultChoiceId: 'C',
      choices: [
        choice('A', 'Inventaire seulement', 'inventory_only', false),
        choice('B', 'Verifier et documenter', 'verify_and_document', false),
        choice('C', 'Verifier, documenter et creer les mappings serveur', 'verify_document_map_servers', true)
      ]
    },
    {
      id: 'incomplete_repo_action',
      title: 'Question 5 - Si le repo est incomplet ?',
      prompt: 'Choisir la strategie de correction des fichiers MCP manquants.',
      defaultChoiceId: 'B',
      choices: [
        choice('A', 'Ne rien faire', 'do_nothing', false),
        choice('B', 'Creer une branche de proposition', 'create_proposal_branch', true),
        choice('C', 'Corriger directement', 'direct_fix', false, directFixAllowed, 'Direct fix is blocked unless explicit safe write validation exists; never write to main.')
      ]
    },
    {
      id: 'unmapped_server_folder',
      title: 'Question 6 - Si un dossier serveur n a pas de repo lie ?',
      prompt: 'Definir la strategie de rapprochement serveur <-> GitHub.',
      defaultChoiceId: 'B',
      choices: [
        choice('A', 'Ignorer', 'ignore', false),
        choice('B', 'Proposer un repo existant', 'suggest_existing_repo', true),
        choice('C', 'Creer un nouveau repo GitHub', 'create_new_repo', false, rights.isOrgAdmin, 'Requires organization administration rights.')
      ]
    },
    {
      id: 'writer_policy',
      title: 'Question 7 - Qui peut ecrire ?',
      prompt: 'Encadrer les droits d ecriture des agents.',
      defaultChoiceId: 'B',
      choices: [
        choice('A', 'Personne sans validation humaine', 'human_approval_only', false),
        choice('B', 'Agents autorises sur branche MCP uniquement', 'mcp_branch_only', true),
        choice('C', 'Agents autorises sur branche officielle', 'official_branch', false, false, 'Official branch writes are blocked by MCP governance.')
      ]
    },
    {
      id: 'documentation_agent',
      title: 'Question 8 - Quel agent doit documenter le projet ?',
      prompt: 'Choisir l agent principal de documentation selon la nature du travail.',
      defaultChoiceId: 'A',
      choices: [
        choice('A', 'ChatGPT', 'chatgpt_architecture', true),
        choice('B', 'Claude', 'claude_longform', false),
        choice('C', 'Codex / agent technique', 'codex_code_tests', false)
      ]
    }
  ];
}

export function validateQuestionAnswer(
  questions: OnboardingQuestion[],
  questionId: string,
  choiceId: string
): { accepted: boolean; reason?: string; normalizedChoiceId?: 'A' | 'B' | 'C' } {
  const question = questions.find((candidate) => candidate.id === questionId);
  if (!question) {
    return { accepted: false, reason: 'Unknown onboarding question.' };
  }

  const normalized = choiceId.toUpperCase();
  if (normalized !== 'A' && normalized !== 'B' && normalized !== 'C') {
    return { accepted: false, reason: 'Choice must be A, B, or C.' };
  }

  const selected = question.choices.find((candidate) => candidate.id === normalized);
  if (!selected) {
    return { accepted: false, reason: 'Choice does not exist for this question.' };
  }
  if (!selected.allowed) {
    return { accepted: false, reason: selected.reason ?? 'Choice is blocked by MCP governance.' };
  }
  return { accepted: true, normalizedChoiceId: normalized };
}
