import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = '/tmp/mcp-autodeploy-governance';
const canonical = `\`\`\`canonical-state\n{\n  "repository": "Patricked-code/MCP",\n  "branch": "main",\n  "s1Root": "/opt/apps/wealthtech-mcp-ssh-bridge",\n  "fetchRemote": "git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",\n  "pushRemote": "disabled://mcp-s1-read-only",\n  "container": "wealthtech_mcp_ssh_bridge"\n}\n\`\`\``;

async function output(path, content) {
  const target = join(OUT, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

await mkdir(OUT, { recursive: true });

await output('SUIVI.md', `# SUIVI.md — Point de reprise courant\n\n## État canonique structurel\n\n${canonical}\n\nDate : 2026-08-09\n\n## Source de vérité GitHub\n\n- dépôt actif : \`Patricked-code/MCP\` ;\n- branche canonique : \`main\` ;\n- \`main\` vérifié au début du lot : \`cd80665837c1bbf692728d9fbb2c614bb1cb7734\` — merge de la PR #38 Live State V1 ;\n- branche de travail : \`mcp/governed-autodeploy-v1-20260809\` ;\n- aucune écriture directe sur \`main\` ;\n- aucune preuve S1/runtime courante n'est inventée lorsque le connecteur privé n'est pas invocable.\n\n## Tâche active\n\n\`TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS\`\n\nObjectif : terminer la chaîne gouvernée GitHub → S1 → Docker avec inventaire documentaire exact, cohérence sémantique CI, authentification GitHub OIDC, déploiement exact-SHA, rollback runtime et attestation.\n\n## État vérifié sur la branche\n\n- inventaire Git Markdown : **189 chemins exacts**, classifiés et verrouillés dans \`docs/governance/markdown-inventory.json\` ;\n- historique S1 conservé : 209 Markdown observés lors de l'audit antérieur = 183 Git à cette date + 26 runtime-only ; ce nombre historique n'est pas utilisé comme constante du Git courant ;\n- \`docs:check\` contrôle désormais inventaire exact + cinq autorités \`canonical-state\` ;\n- GitHub OIDC : politique fixe dépôt/IDs/ref/workflow/événement/SHA, RS256/JWKS GitHub, bornes fail-closed ;\n- orchestrateur S1 : \`flock\`, remotes read-only, fetch exact, fast-forward only, image candidate, health/OAuth/MCP, attestation et rollback runtime ;\n- routes HTTP : OIDC-only, séparées des sessions web et du bearer MCP ordinaire ;\n- workflow \`.github/workflows/mcp-deploy.yml\` : permissions \`contents: read\` + \`id-token: write\`, exact \`GITHUB_SHA\`, tokens OIDC frais et polling borné ;\n- politique bootstrap : \`.mcp/autodeploy-policy.json\` avec \`pushEnabled=false\` tant que le premier bootstrap S1 n'est pas attesté ;\n- dernière CI de branche avant cette consolidation : verte sur le bloc complet jusqu'au workflow, y compris syntaxe shell \`bash -n\`.\n\n## État S1 / Docker\n\n- état courant S1 : **requires_revalidation** ;\n- état courant Docker : **requires_revalidation** ;\n- le connecteur privé S1 n'est pas invocable dans la session d'implémentation courante ;\n- aucun déploiement automatique n'est donc déclaré comme réalisé ;\n- \`FULLY_ALIGNED\` reste interdit sans preuve live.\n\n## Prochaine action unique\n\n1. auditer le diff complet et les garde-fous ;\n2. ouvrir une PR Draft unique vers \`main\` ;\n3. exiger CI verte sur le head exact et absence de revue bloquante ;\n4. fusionner uniquement le head vérifié ;\n5. vérifier CI post-merge et constater que le workflow push est bien **gated/skipped** tant que \`pushEnabled=false\` ;\n6. lorsque S1 redevient invocable : préflight live, sync fast-forward gouvernée, build/restart bootstrap de l'endpoint OIDC, health/OAuth/OCI ;\n7. lancer \`workflow_dispatch\` sur le SHA exact et obtenir une attestation réussie ;\n8. seulement après cette preuve, faire une PR de suivi qui passe \`pushEnabled=true\`, puis valider un merge inoffensif déclenchant automatiquement GitHub → S1 → Docker.\n\n## Critère de clôture\n\nLe chantier n'est terminé que si une preuve fraîche établit :\n\n\`GitHub main SHA = S1 HEAD = requested deploy SHA = Docker OCI revision = deployment attestation SHA\`\n\navec health, OAuth et contrôle d'accès MCP réussis.\n`);

for (const [path, appendix] of [
  ['TASKS.md', `\n## TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS\n\nObjectif : automatiser de façon gouvernée et attestée la chaîne GitHub \`main\` → S1 → Docker après validation CI.\n\nÉtat GitHub de la branche : gouvernance documentaire, OIDC, orchestrateur S1, routes OIDC-only et workflow exact-SHA implémentés par TDD. La fusion et le bootstrap S1 restent à faire.\n\nGarde-fous : aucun push direct main ; S1 read-only vers GitHub ; exact SHA ; fast-forward only ; rollback runtime ; attestation ; \`pushEnabled=false\` jusqu'au bootstrap live.\n`],
  ['TODO.md', `\n## Governed Autodeploy V1 — reste à faire\n\n- [x] Verrouiller l'inventaire Markdown Git exact et la cohérence canonique CI.\n- [x] Implémenter la vérification GitHub OIDC fail-closed.\n- [x] Implémenter l'orchestrateur S1 exact-SHA et rollback runtime.\n- [x] Implémenter les routes HTTP OIDC-only.\n- [x] Implémenter le workflow GitHub Actions exact-SHA avec bootstrap gate désactivé.\n- [ ] Auditer le diff complet, ouvrir la PR, obtenir CI/revue verte et fusionner le head exact.\n- [ ] Réattester S1 en lecture live.\n- [ ] Bootstrap unique : sync, typecheck/build, rebuild/restart MCP et attestation de l'endpoint.\n- [ ] Exécuter \`workflow_dispatch\` de bout en bout sur le SHA exact.\n- [ ] Activer \`pushEnabled=true\` par PR après preuve.\n- [ ] Prouver un déploiement automatique post-merge et clôturer les six objectifs.\n`],
  ['DECISIONS_LOG.md', `\n## 2026-08-09 — Governed Autodeploy V1 exact-SHA et bootstrap fail-closed\n\nDécision : GitHub Actions n'obtient aucun secret SSH longue durée. Le workflow s'authentifie au MCP par GitHub OIDC éphémère, lié au dépôt, IDs, branche \`main\`, workflow, événement et SHA exact. S1 conserve une identité GitHub de lecture uniquement et un push URL neutralisé.\n\nLe déploiement S1 est un job détaché sérialisé par \`flock\`, refuse toute dérive de branche/working tree/remotes, exige \`FETCH_HEAD == requested SHA\`, n'autorise que le fast-forward, construit une image candidate avec provenance OCI et restaure l'image précédente si un contrôle runtime échoue. Git n'est pas rollbacké par réécriture d'historique.\n\nPour résoudre le bootstrap sans créer une seconde voie automatique, \`.mcp/autodeploy-policy.json\` est versionné avec \`pushEnabled=false\`. Après merge, l'endpoint est déployé une seule fois par les outils MCP gouvernés existants. Un \`workflow_dispatch\` exact-SHA valide ensuite la chaîne. Seule une PR ultérieure peut activer \`pushEnabled=true\`.\n`],
  ['CHANGELOG.md', `\n## 2026-08-09 — Governed Autodeploy V1 — branche de livraison\n\n- Gouvernance documentaire : baseline exacte de 189 Markdown Git, classification déterministe et contrôle sémantique des autorités actives.\n- Authentification GitHub Actions → MCP par OIDC RS256/JWKS GitHub avec politique fixe et SHA exact.\n- Orchestrateur S1 sérialisé : préflight, fetch read-only, fast-forward only, build candidat, health/OAuth/MCP, provenance OCI, attestation atomique et rollback runtime.\n- Routes OIDC-only dédiées au start/statut de déploiement, hors session web et bearer MCP ordinaire.\n- Workflow \`mcp-deploy.yml\` à permissions minimales, tokens OIDC frais, exact \`GITHUB_SHA\` et polling borné.\n- Bootstrap automatique désactivé par défaut via politique versionnée tant que S1 n'a pas été réattesté et le premier \`workflow_dispatch\` n'a pas réussi.\n- Aucun déploiement S1/Docker n'est déclaré par ce changement GitHub seul.\n`],
  ['ACTIVITY_LOG.md', `\n## 2026-08-09 — TASK-20260809-003 — Governed Autodeploy V1 construit sur branche isolée\n\n- Base : \`main@cd80665837c1bbf692728d9fbb2c614bb1cb7734\` après merge de la PR #38.\n- Branche : \`mcp/governed-autodeploy-v1-20260809\`.\n- Gouvernance documentaire : inventaire Git calculé par GitHub Actions, 189 chemins exacts ; 26 runtime-only restent une observation S1 historique à réattester.\n- TDD : cycles RED/GREEN vérifiés pour inventaire/canonical-state, GitHub OIDC, orchestrateur S1, routes HTTP, câblage serveur et workflow.\n- CI de branche : typecheck, build, docs, gouvernance, scan secrets, safety tests et diff-check verts avant consolidation ; le shell réel de déploiement est contrôlé par \`bash -n\`.\n- Production : non modifiée ; S1/runtime restent \`requires_revalidation\` dans cette session.\n`]
]) {
  const current = await readFile(path, 'utf8');
  if (!current.includes(appendix.trim().slice(0, 40))) {
    await output(path, `${current.trimEnd()}${appendix}`);
  } else {
    await output(path, current);
  }
}

const production = JSON.parse(await readFile('PRODUCTION_STATE.json', 'utf8'));
production.githubCommitFull = 'cd80665837c1bbf692728d9fbb2c614bb1cb7734';
production.serverStateFreshness = 'requires_revalidation';
production.runtimeStateFreshness = 'requires_revalidation';
production.governedAutodeployV1 = {
  task: 'TASK-20260809-003',
  branch: 'mcp/governed-autodeploy-v1-20260809',
  baseMainCommit: 'cd80665837c1bbf692728d9fbb2c614bb1cb7734',
  documentationTrackedMarkdownCount: 189,
  oidcBoundaryImplemented: true,
  s1OrchestratorImplemented: true,
  oidcOnlyRoutesImplemented: true,
  workflowImplemented: true,
  workflowPushEnabled: false,
  merged: false,
  deployed: false,
  runtimeAttested: false,
  currentS1Verification: 'requires_revalidation',
  currentRuntimeVerification: 'requires_revalidation'
};
if (production.liveStateV1 && typeof production.liveStateV1 === 'object') {
  production.liveStateV1.merged = true;
  production.liveStateV1.mergeCommit = 'cd80665837c1bbf692728d9fbb2c614bb1cb7734';
  production.liveStateV1.deployed = false;
  production.liveStateV1.runtimeAttested = false;
}
await output('PRODUCTION_STATE.json', JSON.stringify(production, null, 2));

console.log('Governance candidates generated.');
