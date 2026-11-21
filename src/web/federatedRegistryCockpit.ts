import { consoleDocument } from './consoleUi.js';
import type {
  FederatedProjectedEntity, FederatedProjectedLink, FederatedProjection
} from '../registryFederation/projection.js';

/** Operator-only, server-rendered, read-only registry projection (no client JS). */
export type FederatedCockpitScope = 'global' | 'repository' | 'project' | 'workstream';
export type FederatedCockpitFilter = Readonly<{
  scope: FederatedCockpitScope;
  id: string;
  queueAvailable: boolean;
}>;

const escape = (value: string | number | null | undefined): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function relate(entities: readonly FederatedProjectedEntity[],
  links: readonly FederatedProjectedLink[], filter: FederatedCockpitFilter): FederatedProjectedEntity[] {
  if (filter.scope === 'global') return [...entities];
  const id = filter.id.trim();
  const repositoryId = id.replace(/^github:/i, '').toLowerCase();
  if (!id) return [];
  const keys = new Set(entities.filter(e => {
    if (filter.scope === 'project') return e.identity.kind === 'PROJECT' && e.identity.sourceId === id;
    if (filter.scope === 'workstream') return e.identity.kind === 'WORKSTREAM' && e.identity.sourceId === id;
    return e.identity.kind === 'REPOSITORY' &&
      e.identity.sourceId.replace(/^github:/i, '').toLowerCase() === repositoryId;
  }).map(x => x.key));
  if (filter.scope === 'repository') {
    for (const task of entities) {
      if (task.identity.kind === 'TASK' && task.identity.authorityScope.replace(/^github:/i, '').toLowerCase() === repositoryId) keys.add(task.key);
    }
  }
  // Restrict relation traversal to this filter's declared semantics.
  // Repository selection must never expand through its parent project into
  // another repository's tasks or checkpoints.
  for (const link of links) {
    if (filter.scope === 'repository') {
      if (link.relation === 'MAPS_TO' && keys.has(link.toKey)) keys.add(link.fromKey);
    } else if (filter.scope === 'project') {
      if (link.relation === 'MAPS_TO' && keys.has(link.fromKey)) keys.add(link.toKey);
      if (link.relation === 'BELONGS_TO' && keys.has(link.toKey)) keys.add(link.fromKey);
    } else if (filter.scope === 'workstream') {
      if (link.relation === 'BELONGS_TO' && keys.has(link.toKey)) keys.add(link.fromKey);
      if (link.relation === 'CONTAINS' && keys.has(link.fromKey)) keys.add(link.toKey);
    }
  }
  return entities.filter(x => keys.has(x.key));
}

function verifiedState(entity: FederatedProjectedEntity): string {
  return entity.evidence.verification === 'VERIFIED' ? 'Vérifié' :
    entity.evidence.verification === 'DECLARED' ? 'Déclaré' :
    entity.evidence.verification === 'CONFLICT' ? 'Conflit' : 'Non vérifié';
}

function renderProject(entity: FederatedProjectedEntity,
  links: readonly FederatedProjectedLink[], index: ReadonlyMap<string, FederatedProjectedEntity>): string {
  const mappings = links.filter(x => x.fromKey === entity.key && x.relation === 'MAPS_TO');
  const tasks = links.filter(x => x.toKey === entity.key && x.relation === 'BELONGS_TO');
  const uid = entity.identifiers.filter(x => x.namespace === 'PROJECT_UID')
    .map(x => `<code>${escape(x.value)}</code> (${escape(x.evidence.verification)})`).join(', ');
  const references = mappings.map(x => {
    const target = index.get(x.toKey);
    return `<li><code>${escape(target?.identity.sourceId ?? 'NON_RÉSOLU')}</code> —
      ${escape(x.verification)} ; source ${escape(x.authority)}</li>`;
  }).join('');
  return `<section class="wt-card" aria-label="Fiche projet">
    <h2>${escape(entity.label || entity.identity.sourceId)}</h2>
    <p>ID projet : <code>${escape(entity.identity.sourceId)}</code></p>
    <p>UID : ${uid || 'Non renseigné'}</p>
    <p>Statut du rattachement : <strong>${escape(verifiedState(entity))}</strong></p>
    <p>Composants / dépôts : ${mappings.length}</p>
    <ul>${references || '<li>Aucun dépôt vérifié par cette projection</li>'}</ul>
    <p>Tâches liées : ${tasks.length}, dont ${tasks.filter(x => x.verification === 'CONFLICT').length} rattachements conflictuels.</p>
    <ul>${tasks.map(x => '<li><code>' + escape(index.get(x.fromKey)?.identity.sourceId ?? 'NON RÉSOLU') + '</code> — ' + escape(x.verification) + ' ; autorité ' + escape(x.authority) + '</li>').join('') || '<li>Aucune tâche rattachée</li>'}</ul>
    <p>Documentation, chantiers, mémoire, checkpoints et dépendances non encore indexés :
      <strong>couverture partielle</strong>.</p>
    <p class="wt-meta">Autorité : ${escape(entity.identity.authority)} ;
      observé ${escape(entity.evidence.observedAt)} ;
      preuve ${escape(entity.evidence.evidenceRef || 'absente')}</p>
  </section>`;
}

export function renderFederatedRegistryCockpit(
  projection: FederatedProjection, filter: FederatedCockpitFilter
): string {
  const allowed: readonly FederatedCockpitScope[] = ['global', 'repository', 'project', 'workstream'];
  if (!allowed.includes(filter.scope) || filter.id.length > 240) throw Error('FEDERATION_COCKPIT_FILTER_INVALID');
  const chosen = relate(projection.entities, projection.links, filter);
  const index = new Map(projection.entities.map(x => [x.key, x]));
  const projects = chosen.filter(x => x.identity.kind === 'PROJECT');
  const repositories = chosen.filter(x => x.identity.kind === 'REPOSITORY');
  const tasks = chosen.filter(x => x.identity.kind === 'TASK');
  const chosenKeys = new Set(chosen.map(x => x.key));
  const relevantLinks = projection.links.filter(x => chosenKeys.has(x.fromKey) && chosenKeys.has(x.toKey));
  const conflicting = chosen.filter(x => x.evidence.verification === 'CONFLICT');
  const conflictingLinks = relevantLinks.filter(x => x.verification === 'CONFLICT');
  const options = allowed.map(s => `<option value="${escape(s)}"${s === filter.scope ? ' selected' : ''}>${
    escape({global:'Tous les registres',repository:'Dépôt',project:'Projet',workstream:'Chantier'}[s])
  }</option>`).join('');
  const rows = chosen.slice(0, 200).map(e => `<tr>
    <td>${escape(e.identity.kind)}</td>
    <td><code>${escape(e.identity.sourceId)}</code></td>
    <td>${escape(e.taskStatus ?? '—')}</td>
    <td>${escape(e.taskStatusClaims.join(', ') || '—')}</td>
    <td>${escape(e.evidence.verification)}</td>
    <td>${escape(e.identity.authority)}</td>
    <td>${escape(e.evidence.observedAt)}</td>
    <td>${escape(e.evidence.evidenceRef ?? 'Preuve non renseignée')}</td>
  </tr>`).join('');
  const body = `
    <h1>Registres fédérés — Cockpit</h1>
    <p class="wt-copy">Vue de lecture calculée à partir des autorités existantes. Aucune nouvelle
      Task Queue ni autorisation d'exécution n'est créée par cette page.</p>
    <section class="wt-notice" role="status"><strong>Couverture partielle.</strong>
      Les dépôts non admis et les identifiants non vérifiés ne deviennent pas des projets autorisés.
      ${filter.queueAvailable ? 'File MCP lisible.' : 'File de tâches MCP indisponible ou désactivée.'}
      Les données présentées ne valent pas attestation de déploiement.</section>
    <form method="get" action="/registry-cockpit" aria-label="Filtres de registre">
      <label for="scope">Périmètre</label>
      <select id="scope" name="scope">${options}</select>
      <label for="id">ID exact du dépôt, projet ou chantier (vide pour global)</label>
      <input id="id" name="id" maxlength="240" value="${escape(filter.id)}" autocomplete="off">
      <button type="submit">Filtrer la projection</button>
      <a href="/registry-cockpit">Réinitialiser</a>
    </form>
    <div class="wt-grid" aria-label="Couverture">
      <section class="wt-card"><h2>Projets</h2><p>${projects.length} dans la vue</p></section>
      <section class="wt-card"><h2>Dépôts</h2><p>${repositories.length} dans la vue</p></section>
      <section class="wt-card"><h2>Tâches</h2><p>${tasks.length} (tous statuts historiques)</p></section>
      <section class="wt-card"><h2>Conflits</h2><p>${conflicting.length + conflictingLinks.length} (entités : ${conflicting.length}, liens : ${conflictingLinks.length})</p></section>
    </div>
    <h2>Fiches projets (données actuellement disponibles)</h2>
    <div class="wt-grid">${projects.slice(0, 30).map(p => renderProject(p, relevantLinks, index)).join('')
      || '<p>Aucun projet relié pour ce filtre : ne pas inférer une absence globale.</p>'}</div>
    <h2>Relations dans le périmètre (statuts de vérification)</h2>
    <div class="wt-table"><table><thead><tr><th>Depuis</th><th>Lien</th><th>Vers</th><th>Vérification</th></tr></thead>
    <tbody>${relevantLinks.slice(0, 200).map(x => '<tr><td>' + escape(index.get(x.fromKey)?.identity.sourceId ?? 'NON RÉSOLU') + '</td><td>' + escape(x.relation) + '</td><td>' + escape(index.get(x.toKey)?.identity.sourceId ?? 'NON RÉSOLU') + '</td><td>' + escape(x.verification) + '</td></tr>').join('') || '<tr><td colspan="4">Aucune relation</td></tr>'}</tbody></table></div>
    <h2>Entités et tâches, y compris états terminaux</h2>
    <div class="wt-table"><table><caption>Observation : ${escape(projection.observedAt)}.
      Maximum 200 lignes affichées sur ${chosen.length}; pagination étendue non encore raccordée.</caption>
      <thead><tr><th>Type</th><th>Identifiant historique</th><th>Statut tâche</th>
      <th>États observés</th><th>Vérification</th><th>Autorité</th><th>Observation</th><th>Référence de preuve</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8">Aucune entité dans ce périmètre vérifié</td></tr>'}</tbody>
    </table></div>`;
  return consoleDocument('Cockpit des registres — WealthTech MCP', body);
}
