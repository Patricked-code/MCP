import type { ProjectRuntimeProvisioningPlan } from './projectRuntime.js';

/**
 * F.2 (TB-W3-F-03), increment 3: the E3 consent of the PROJECT_RUNTIME
 * contract. Creation and activation are two consents, each an explicit value
 * naming the resource and its owning authorities. The ticket is bound to its
 * purpose, to the web session that rendered the consent and to the exact
 * target, so a consent rendered for one revision never applies to another.
 * The server decides before any GitHub call or write; consent is never
 * inferred. Pure and free of configuration.
 */
export const PROVISIONING_CONSENT_PURPOSE = 'provision-project-runtime';
export const CREATION_CONSENT = 'CREATE_PROJECT_RUNTIME';
export const ACTIVATION_CONSENT = 'ACTIVATE_PROJECT_RUNTIME';

export type ProvisioningConsentDecision = Readonly<{
  allowed: boolean;
  creation: boolean;
  activation: boolean;
  reasonCode: 'CONSENT_GRANTED' | 'CONSENT_CROSS_ORIGIN' | 'CONSENT_TICKET_INVALID' | 'CONSENT_MISSING';
}>;

export type ProvisioningConsentInput = {
  sameOrigin: boolean;
  ticketValid: boolean;
  creationConsent: unknown;
  activationConsent: unknown;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The binding of a consent ticket: the web session, the request and the
 * resolved target the consent page named. A registry change since the page
 * was rendered makes the ticket worthless for the new target.
 */
export function provisioningConsentBinding(
  session: string,
  request: { projectId: string; mappingId: string; revision: string },
  target: { repositoryId: string; serverPath: string; composeProject: string }
): string {
  return JSON.stringify([
    session, 'S1', request.projectId, request.mappingId, request.revision,
    target.repositoryId, target.serverPath, target.composeProject
  ]);
}

export function decideProvisioningConsent(input: ProvisioningConsentInput): ProvisioningConsentDecision {
  const refuse = (reasonCode: ProvisioningConsentDecision['reasonCode']): ProvisioningConsentDecision => (
    Object.freeze({ allowed: false, creation: false, activation: false, reasonCode })
  );
  if (!input.sameOrigin) return refuse('CONSENT_CROSS_ORIGIN');
  if (!input.ticketValid) return refuse('CONSENT_TICKET_INVALID');
  const creation = input.creationConsent === CREATION_CONSENT;
  const activation = input.activationConsent === ACTIVATION_CONSENT;
  if (!creation && !activation) return refuse('CONSENT_MISSING');
  return Object.freeze({ allowed: true, creation, activation, reasonCode: 'CONSENT_GRANTED' as const });
}

/**
 * The consent fields a plan asks for, all unchecked: the creation of an absent
 * runtime (activation stays optional), or the activation alone of a runtime
 * created earlier. A plan that asks for no consent renders nothing.
 */
export function renderProvisioningConsentFields(input: { ticket: string; plan: ProjectRuntimeProvisioningPlan }): string {
  const { plan } = input;
  const target = plan.target;
  if (plan.decision !== 'CONSENT_REQUIRED' || !target) return '';
  const creationRequired = plan.reasonCodes.includes('CREATION_CONSENT_REQUIRED');
  const resource = `le composant <code>${escapeHtml(target.mappingId)}</code> du projet <code>${escapeHtml(target.projectId)}</code> : dépôt <code>${escapeHtml(target.repositoryId)}</code> à la révision exacte <code>${escapeHtml(target.revision)}</code>, dans <code>${escapeHtml(target.serverPath)}</code> sur le serveur S1 (projet Compose <code>${escapeHtml(target.composeProject)}</code>)`;
  const authorities = 'Autorités : le mapping GitRegistry et la cible S1 de <code>.mcp/server-map.json</code>.';
  const activation = `Activer ce runtime : construire et démarrer le projet Compose <code>${escapeHtml(target.composeProject)}</code> sur S1, puis attendre sa santé. Un échec l’arrête sans ses volumes et met en quarantaine les fichiers créés par le job, sans rien supprimer.`;
  const fields = creationRequired
    ? [
      `<label><input type="checkbox" name="consent_creation" value="${CREATION_CONSENT}" required /> Créer ${resource}, après la vérification de son absence et de la révision. ${authorities}</label>`,
      `<label><input type="checkbox" name="consent_activation" value="${ACTIVATION_CONSENT}" /> Facultatif : ${activation}</label>`
    ]
    : [
      `<label><input type="checkbox" name="consent_activation" value="${ACTIVATION_CONSENT}" required /> ${activation} Runtime créé : ${resource}. ${authorities}</label>`
    ];
  return `<fieldset>
      <legend>Consentement explicite</legend>
      ${fields.join('\n      ')}
      <input type="hidden" name="consent_ticket" value="${escapeHtml(input.ticket)}" />
    </fieldset>`;
}
