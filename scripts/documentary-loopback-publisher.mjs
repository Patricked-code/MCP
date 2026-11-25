// REC-06: admission of the existing Loopback candidate from the same trusted
// Governed Deploy run. This step never writes to GitHub, creates a PR or
// grants publication authority. Later GW60/61 execution must recheck it.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { observeLoopbackCheckpoint } from './documentary-hierarchy.mjs';
import { parseNameStatus } from './mcp-documentary-closure.mjs';
import { decodeLoopbackSource, prepareLoopbackPublicationCandidate } from './documentary-loopback.mjs';

const REPO='Patricked-code/MCP', WORKFLOW='.github/workflows/mcp-deploy.yml';
const SHA=/^[a-f0-9]{40}$/, DIGEST=/^[a-f0-9]{64}$/, ID=/^[1-9][0-9]{0,14}$/;
const MAX_REPORT=32*1024*1024, MAX_GIT=8*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Error(code);};

export function verifyTrustedLoopbackRun(env,run) {
  const sha=env.GITHUB_SHA, id=env.GITHUB_RUN_ID, attempt=env.GITHUB_RUN_ATTEMPT;
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=='refs/heads/main'||
    env.GITHUB_WORKFLOW_REF!==REPO+'/'+WORKFLOW+'@refs/heads/main'||env.GITHUB_WORKFLOW_SHA!==sha||
    !SHA.test(sha??'')||!ID.test(id??'')||!ID.test(attempt??'')||
    !['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))
    fail('LOOPBACK_RUN_CONTEXT_UNVERIFIED');
  if(!run||run.id!==Number(id)||run.run_attempt!==Number(attempt)||run.head_sha!==sha||
    run.head_branch!=='main'||run.path!==WORKFLOW||run.event!==env.GITHUB_EVENT_NAME||
    run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
    run.status!=='in_progress')fail('LOOPBACK_RUN_PROVENANCE_UNVERIFIED');
  return {headSha:sha,runId:id,runAttempt:attempt,expectedJobId:'mcp-s1-'+id+'-'+sha.slice(0,12)};
}

export function decodeBoundLoopbackReport(bytes,expectedDigest) {
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_REPORT||
    !DIGEST.test(expectedDigest??'')||hash(bytes)!==expectedDigest)
    fail('LOOPBACK_REPORT_BYTES_UNVERIFIED');
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{fail('LOOPBACK_REPORT_JSON_UNVERIFIED');}
}

export function inspectLoopbackPublication({env,run,reportBytes,currentMainSha,checkoutSha,
  raw,checkpointChanges,now=Date.now()}) {
  const binding=verifyTrustedLoopbackRun(env,run);
  if(checkoutSha!==binding.headSha||currentMainSha!==binding.headSha)
    fail('LOOPBACK_RUN_HEAD_UNVERIFIED');
  const report=decodeBoundLoopbackReport(reportBytes,env.LOOPBACK_REPORT_DIGEST);
  const result=prepareLoopbackPublicationCandidate({raw,headSha:binding.headSha,currentMainSha,
    checkpointChanges,report,expectedJobId:binding.expectedJobId,now});
  return {schemaVersion:1,...binding,reportDigest:env.LOOPBACK_REPORT_DIGEST,
    status:result.status,reason:result.reason,
    candidateContentDigest:result.candidate?.candidateContentDigest??null,
    eventId:result.candidate?.eventId??null,mutationPerformed:false,
    automaticPublicationAuthorized:false,closureAttested:false};
}

function git(args, encoding='utf8') {
  return execFileSync('git',args,{encoding,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'},
    maxBuffer:MAX_GIT,timeout:60000,stdio:['ignore','pipe','ignore']});
}

function readSameJobReport(env) {
  if(!env.RUNNER_TEMP)fail('LOOPBACK_REPORT_PATH_UNVERIFIED');
  const root=realpathSync(env.RUNNER_TEMP),file=join(root,'mcp-documentary-closure.json');
  const stat=lstatSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>MAX_REPORT||realpathSync(file)!==file)
    fail('LOOPBACK_REPORT_PATH_UNVERIFIED');
  const bytes=readFileSync(file);
  if(bytes.length!==stat.size)fail('LOOPBACK_REPORT_BYTES_UNVERIFIED');
  return bytes;
}

async function readApi(path,token) {
  const response=await fetch('https://api.github.com/repos/'+REPO+path,{method:'GET',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)fail('LOOPBACK_GITHUB_READ_UNVERIFIED');
  return response.json();
}

async function readMain(token) {
  const ref=await readApi('/git/ref/heads/main',token);
  if(ref?.ref!=='refs/heads/main'||ref.object?.type!=='commit'||!SHA.test(ref.object.sha??''))
    fail('LOOPBACK_RUN_HEAD_UNVERIFIED');
  return ref.object.sha;
}

export async function main(env=process.env) {
  let result;
  try{
    const token=env.LOOPBACK_READ_TOKEN,id=env.GITHUB_RUN_ID;
    if(!token||!ID.test(id??''))fail('LOOPBACK_RUN_CONTEXT_UNVERIFIED');
    const run=await readApi('/actions/runs/'+id,token);
    const binding=verifyTrustedLoopbackRun(env,run),checkoutSha=git(['rev-parse','HEAD']).trim();
    const currentMainSha=await readMain(token);
    if(checkoutSha!==binding.headSha||currentMainSha!==binding.headSha)fail('LOOPBACK_RUN_HEAD_UNVERIFIED');
    const raw=decodeLoopbackSource(git(['show',binding.headSha+':SUIVI.md'],null));
    const old=observeLoopbackCheckpoint(raw);
    if(old.status!=='PRESENT'||!SHA.test(old.declared.observedMainSha??''))
      fail('LOOPBACK_CHECKPOINT_UNVERIFIED');
    git(['merge-base','--is-ancestor',old.declared.observedMainSha,binding.headSha]);
    const checkpointChanges=parseNameStatus(git(['diff','--no-ext-diff','--name-status','-z','-M',
      old.declared.observedMainSha,binding.headSha,'--']));
    result=inspectLoopbackPublication({env,run,reportBytes:readSameJobReport(env),
      currentMainSha,checkoutSha,raw,checkpointChanges});
    if(await readMain(token)!==binding.headSha)fail('LOOPBACK_RUN_HEAD_UNVERIFIED');
  }catch(error){
    const code=typeof error?.message==='string'&&/^LOOPBACK_[A-Z0-9_]{2,90}$/.test(error.message)
      ?error.message:'LOOPBACK_ADMISSION_UNVERIFIED';
    result={schemaVersion:1,status:'BLOCKED_OR_UNVERIFIED',reason:code,
      mutationPerformed:false,automaticPublicationAuthorized:false,closureAttested:false};
  }
  if(!env.GITHUB_STEP_SUMMARY||!env.GITHUB_OUTPUT)fail('LOOPBACK_RUN_CONTEXT_UNVERIFIED');
  appendFileSync(env.GITHUB_STEP_SUMMARY,'\n### Loopback publication admission: '+result.status+'\n\n'
    +'Reason: '+(result.reason??'exact candidate independently verified')+'\n\n'
    +(result.reportDigest?'Report SHA-256: '+result.reportDigest+'\n\n':'')
    +(result.candidateContentDigest?'Candidate SHA-256: '+result.candidateContentDigest+'\n\n':'')
    +'Read-only; no publication, merge or exhaustive closure authorized.\n');
  appendFileSync(env.GITHUB_OUTPUT,'loopback-admission='+result.status+'\n');
  return result;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
