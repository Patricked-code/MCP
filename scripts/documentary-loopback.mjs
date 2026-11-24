// Loopback is a derived, exact-content candidate in the existing closure
// report, not a store, a new workflow, or authorization to edit a repository.
// The trusted checkout provides the old checkpoint ancestry and exact diff.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { observeLoopbackCheckpoint } from './documentary-hierarchy.mjs';

const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const hash=body=>createHash('sha256').update(body).digest('hex');
const PATH='SUIVI.md';
const MAX=4*1024*1024;
const fail=(reason,status='BLOCKED_OR_UNVERIFIED')=>({
  schemaVersion:1,path:PATH,status,reason,mutationPerformed:false,
  automaticPublicationAuthorized:false,closureAttested:false
});
const pathOk=p=>typeof p==='string'&&p.length>0&&p.length<=1024&&!p.startsWith('/')&&
  !/[\x00-\x1f\x7f\\]/.test(p)&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const changeOk=c=>c&&pathOk(c.path)&&(c.previousPath===null||pathOk(c.previousPath))&&
  /^(?:[ADMTUXB]|[RC](?:100|[0-9]{1,2}))$/.test(c.code);
const isSelfMaintenance=c=>c.code==='M'&&c.previousPath===null&&
  [PATH,'PRODUCTION_STATE.json'].includes(c.path);
const headingMatches=raw=>[...raw.matchAll(/^(#{1,6})[ \t]+POINT DE REPRISE COURANT[ \t]*(?=\r?$)/gim)];

export function deriveLoopbackCandidate({raw,headSha,checkpointChanges,report,expectedJobId,now=Date.now()}) {
  if(typeof raw!=='string'||Buffer.byteLength(raw)>MAX||!SHA.test(headSha??'')||
    !Array.isArray(checkpointChanges)||checkpointChanges.length>20000||
    !checkpointChanges.every(changeOk))return fail('LOOPBACK_INPUT_UNVERIFIED');
  const old=observeLoopbackCheckpoint(raw);
  if(old.status!=='PRESENT')return fail('LOOPBACK_CURRENT_CHECKPOINT_UNVERIFIED');
  // Exact active heading only. A quoted duplicate is conservatively blocked
  // for editing, even if the read-only parser correctly ignores it.
  const headings=headingMatches(raw);
  if(headings.length!==1)return fail('LOOPBACK_HEADING_EDIT_AMBIGUOUS');
  if(report?.headSha!==headSha||report.g1Status!=='ALIGNED')
    return fail('LOOPBACK_WAIT_FOR_G1_REATTESTATION','PENDING');
  const live=report.liveAuthorities,runtime=live?.runtimeObservation;
  const age=now-Date.parse(runtime?.observedAt??'');
  if(live?.bound!==true||live.headSha!==headSha||
    !Array.isArray(live.checks)||live.checks.length!==6||live.matchedCount!==6||
    live.checks.some(x=>x.status!=='MATCHED')||
    !Array.isArray(live.differences)||live.differences.length!==0||
    runtime?.status!=='OBSERVED'||runtime.sha!==headSha||runtime.stableRead!==true||
    !Array.isArray(runtime.conflicts)||runtime.conflicts.length!==0||
    !DIGEST.test(runtime.evidenceDigest??'')||!Number.isSafeInteger(runtime.stateVersion)||runtime.stateVersion<1||
    typeof expectedJobId!=='string'||!new RegExp('^mcp-s1-[0-9]{1,30}-'+headSha.slice(0,12)+'$').test(expectedJobId)||
    runtime.jobId!==expectedJobId||!Number.isFinite(age)||age< -5000||age>900000)
    return fail('LOOPBACK_DEPLOY_EVIDENCE_UNVERIFIED');
  if(!['DOCUMENTARY_CLOSURE_PENDING','DOCUMENTARY_CLOSURE_BLOCKED'].includes(report.status)||
    !Array.isArray(report.reasons)||report.reasons.length<1||report.reasons.length>40||
    report.reasons.some(x=>typeof x!=='string'||!/^[A-Z0-9_]{2,100}$/.test(x)))
    return fail('LOOPBACK_REPORT_VERDICT_UNVERIFIED');
  const oldSha=old.declared.observedMainSha;
  if(oldSha===headSha||checkpointChanges.every(isSelfMaintenance))
    return fail('LOOPBACK_NO_NEW_SUBSTANTIVE_CHANGE','NO_CHANGE');
  if(Date.parse(runtime.observedAt)<Date.parse(old.declared.observedAt))
    return fail('LOOPBACK_OBSERVATION_PRECEDES_CHECKPOINT');
  if(checkpointChanges.some(c=>[PATH,'PRODUCTION_STATE.json'].includes(c.path)&&c.code!=='M'||
    [PATH,'PRODUCTION_STATE.json'].includes(c.previousPath)))
    return fail('LOOPBACK_CANONICAL_PATH_CHANGE_UNVERIFIED');
  const declaration={...old.declared,observedAt:runtime.observedAt,observedMainSha:headSha};
  const oldHeading=headings[0][0];
  const historicalHeading=headings[0][1]+' POINT DE REPRISE HISTORIQUE — '+old.declared.observedAt;
  const fence=String.fromCharCode(96).repeat(3);
  const run=expectedJobId.split('-')[2];
  const section=[
    '## POINT DE REPRISE COURANT','',
    '**Navigation automatique proposée — observation de déploiement exacte.**',
    'Le checkpoint précédent et son contenu sont conservés comme historique. Cette observation ne remplace ni les autorités opérationnelles ni les continuités locales.','',
    '- Continuité de navigation conservée : '+declaration.continuityId+'.',
    '- Issue de preuve existante : #'+declaration.proofIssue+'.',
    '- SHA observé : '+headSha+' ; Live State v'+runtime.stateVersion+' ; observation '+runtime.observedAt+'.',
    '- Governed Deploy : run '+run+' ; job '+expectedJobId+' ; six comparaisons d’autorités concordantes ; G1 ALIGNED.',
    '- Empreinte de l’observation runtime : '+runtime.evidenceDigest+'.',
    '- Verdict documentaire au moment de l’observation : '+report.status+'. **La certification exhaustive n’est pas acquise.**',
    '- Obligations ouvertes : '+report.reasons.join(', ')+'.',
    '- NEXT_ACTION : REOBSERVE_GITHUB_S1_RUNTIME_AND_CONTINUITY ; lire les preuves de l’issue existante et le plan commun, ne pas inférer de mandat ou de Task runtime.','',
    fence+'loopback-checkpoint',JSON.stringify(declaration,null,2),fence,'',
    'Le prochain agent revalide les preuves et les propriétaires avant toute intervention. Cette section ne déclare aucun travail DONE.',''
  ].join('\n');
  const candidate=raw.slice(0,headings[0].index)+historicalHeading+
    raw.slice(headings[0].index+oldHeading.length)+(raw.endsWith('\n')?'\n':'\n\n')+section;
  const next=observeLoopbackCheckpoint(candidate);
  if(next.status!=='PRESENT'||JSON.stringify(next.declared)!==JSON.stringify(declaration))
    return fail('LOOPBACK_CANDIDATE_CHECKPOINT_INVALID');
  return {
    schemaVersion:1,path:PATH,status:'CANDIDATE_READY',reason:null,
    baseSha:headSha,previousCheckpointSha:oldSha,baseContentDigest:hash(raw),
    candidateContentDigest:hash(candidate),
    eventId:hash(JSON.stringify([PATH,oldSha,headSha,expectedJobId])),
    expectedJobId,observationDigest:runtime.evidenceDigest,
    patch:{oldHeading,historicalHeading,appendSection:section},
    nextCheckpoint:declaration,mutationPerformed:false,automaticPublicationAuthorized:false,
    closureAttested:false
  };
}

// Pure byte reconstruction only. A future publisher must independently
// derive the candidate from trusted proof, recheck main and collisions,
// and use the existing governed commit/PR/CI/merge mechanisms.
export function materializeLoopbackCandidate(raw,candidate,expectedHeadSha) {
  if(typeof raw!=='string'||Buffer.byteLength(raw)>MAX||candidate?.status!=='CANDIDATE_READY'||
    candidate.path!==PATH||candidate.baseSha!==expectedHeadSha||!SHA.test(expectedHeadSha??'')||
    !DIGEST.test(candidate.baseContentDigest??'')||hash(raw)!==candidate.baseContentDigest||
    typeof candidate.patch?.appendSection!=='string'||candidate.patch.appendSection.length>16000||
    typeof candidate.patch?.historicalHeading!=='string'||candidate.patch.historicalHeading.length>160)
    throw Error('LOOPBACK_CANDIDATE_BASE_MISMATCH');
  const headings=headingMatches(raw),old=observeLoopbackCheckpoint(raw);
  if(old.status!=='PRESENT'||headings.length!==1||headings[0][0]!==candidate.patch.oldHeading||
    old.declared.observedMainSha!==candidate.previousCheckpointSha||
    candidate.patch.historicalHeading!==headings[0][1]+' POINT DE REPRISE HISTORIQUE — '+old.declared.observedAt)
    throw Error('LOOPBACK_CANDIDATE_BASE_MISMATCH');
  const body=raw.slice(0,headings[0].index)+candidate.patch.historicalHeading+
    raw.slice(headings[0].index+headings[0][0].length)+(raw.endsWith('\n')?'\n':'\n\n')+candidate.patch.appendSection;
  const next=observeLoopbackCheckpoint(body);
  if(hash(body)!==candidate.candidateContentDigest||next.status!=='PRESENT'||
    next.declared.observedMainSha!==expectedHeadSha||
    JSON.stringify(next.declared)!==JSON.stringify(candidate.nextCheckpoint)||
    next.declared.continuityId!==old.declared.continuityId||next.declared.proofIssue!==old.declared.proofIssue)
    throw Error('LOOPBACK_CANDIDATE_CONTENT_MISMATCH');
  return body;
}

/**
 * Pure publication preflight, not an authorization or a GitHub writer.
 * The caller must authenticate the report's provenance, independently obtain
 * raw bytes, the checkpoint diff and current main, and enforce ownership,
 * freshness, branch/PR/CI rules and compare-and-swap at the mutation boundary.
 */
export function prepareLoopbackPublicationCandidate({raw,headSha,currentMainSha,
  checkpointChanges,report,expectedJobId,now=Date.now()}) {
  if(!SHA.test(headSha??'')||currentMainSha!==headSha)
    throw Error('LOOPBACK_PUBLICATION_BASE_UNVERIFIED');
  const reportAge=now-Date.parse(report?.observedAt??'');
  if(report?.schemaVersion!==1||report.repository!=='Patricked-code/MCP'||
    report.headSha!==headSha||report.technicalDeploymentIndependent!==true||
    report.mutationPerformed!==false||report.closureAttested!==false||
    !Number.isFinite(reportAge)||reportAge< -5000||reportAge>900000)
    throw Error('LOOPBACK_PUBLICATION_REPORT_UNVERIFIED');
  const derived=deriveLoopbackCandidate({raw,headSha,checkpointChanges,report,expectedJobId,now});
  // Never trust a candidate's self-reported digest or patch alone. Independently
  // derive all fields from the trusted observations and compare the full object.
  if(!isDeepStrictEqual(report.loopbackCandidate,derived))
    throw Error('LOOPBACK_PUBLICATION_CANDIDATE_MISMATCH');
  return {
    status:derived.status,reason:derived.reason,candidate:derived,
    content:derived.status==='CANDIDATE_READY'
      ? materializeLoopbackCandidate(raw,derived,headSha):null,
    mutationPerformed:false,automaticPublicationAuthorized:false,closureAttested:false
  };
}
