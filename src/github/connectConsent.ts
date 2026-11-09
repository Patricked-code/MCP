/**
 * E3 (TB-W3-E3-01): the explicit consent of the GitHub connect forms of /github
 * and /git, the mutations reachable from a completion step. Replacing the
 * container credential (and recording the connection in GitRegistry) and
 * adding the mappings of discovered repositories are two consents, each naming
 * its resource and owning authority. The server decides from a same-origin
 * submission and a valid consent ticket before any GitHub call or write;
 * consent is never inferred. Pure and free of configuration.
 */
export const CREDENTIAL_CONSENT = 'REPLACE_GITHUB_CREDENTIAL';
export const DISCOVERY_CONSENT = 'ADD_DISCOVERED_MAPPINGS';

export type ConnectConsentDecision = Readonly<{
  allowed: boolean;
  /** True only with its own explicit consent: discovery creates unknown mappings. */
  discover: boolean;
  reasonCode: 'CONSENT_GRANTED' | 'CONSENT_CROSS_ORIGIN' | 'CONSENT_TICKET_INVALID' | 'CONSENT_MISSING';
}>;

export type ConnectConsentInput = {
  sameOrigin: boolean;
  ticketValid: boolean;
  credentialConsent: unknown;
  discoveryConsent: unknown;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function decideConnectConsent(input: ConnectConsentInput): ConnectConsentDecision {
  const refuse = (reasonCode: ConnectConsentDecision['reasonCode']): ConnectConsentDecision => (
    Object.freeze({ allowed: false, discover: false, reasonCode })
  );
  if (!input.sameOrigin) return refuse('CONSENT_CROSS_ORIGIN');
  if (!input.ticketValid) return refuse('CONSENT_TICKET_INVALID');
  if (input.credentialConsent !== CREDENTIAL_CONSENT) return refuse('CONSENT_MISSING');
  return Object.freeze({
    allowed: true,
    discover: input.discoveryConsent === DISCOVERY_CONSENT,
    reasonCode: 'CONSENT_GRANTED' as const
  });
}

/** The consent fields of a connect form, both unchecked: nothing is consented by default. */
export function renderConnectConsentFields(input: { ticket: string; org: string | null }): string {
  const org = escapeHtml(input.org || 'l’organisation configurée');
  return `<fieldset>
      <legend>Consentement explicite</legend>
      <label><input type="checkbox" name="consent_credential" value="${CREDENTIAL_CONSENT}" required /> Remplacer l’identifiant GitHub stocké dans le fichier secret du conteneur MCP et enregistrer cette connexion dans GitRegistry.</label>
      <label><input type="checkbox" name="consent_discovery" value="${DISCOVERY_CONSENT}" /> Facultatif : ajouter à GitRegistry un mapping pour chaque dépôt visible de ${org} encore inconnu (sans clone, suppression ni déploiement).</label>
      <input type="hidden" name="consent_ticket" value="${escapeHtml(input.ticket)}" />
    </fieldset>`;
}
