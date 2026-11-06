#!/usr/bin/env node
/**
 * Verify an existing MCP Governed Deploy workflow_run before reobserving it.
 * GitHub Actions workflow_run conclusion alone is insufficient: deploy might
 * have been skipped by the existing CI gate. Only a successful, exact-SHA
 * "Deploy exact main SHA through MCP" job step constitutes deploy evidence.
 * This script reads GitHub Actions metadata; it never claims, writes or deploys.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { validateTrigger, REPOSITORY } from './mcp-global-continuation-observer.mjs';

const SHA=/^[a-f0-9]{40}$/;
export function verifyGovernedDeployRun({event,repository,githubSha,jobs}){
  const run=event?.workflow_run;
  const source={
    name:'workflow_run',repository,ref:'refs/heads/main',
    sha:run?.head_sha,sourceWorkflow:run?.name,
    sourceConclusion:run?.conclusion,sourceRunId:run?.id,
    sourceHeadSha:run?.head_sha,sourceHeadBranch:run?.head_branch,
    sourceRepository:run?.repository?.full_name
  };
  if(!validateTrigger(source).accepted || !SHA.test(githubSha??'')
    ||run.head_sha!==githubSha||run.status!=='completed'
    ||run.event!=='push'&&run.event!=='workflow_dispatch'){
    return {verified:false,reason:'INVALID_UPSTREAM_DEPLOY_EVENT'};
  }
  if(!jobs || !Array.isArray(jobs.jobs) || jobs.jobs.length>100){
    return {verified:false,reason:'UPSTREAM_DEPLOY_JOBS_NOT_OBSERVED'};
  }
  const valid=jobs.jobs.some(j=>
    j.name==='deploy' && j.head_sha===run.head_sha
    && j.status==='completed' && j.conclusion==='success'
    && Array.isArray(j.steps) && j.steps.some(s=>
      s.name==='Deploy exact main SHA through MCP'
      && s.status==='completed' && s.conclusion==='success'));
  if(!valid)return {verified:false,reason:'GOVERNED_DEPLOY_EXACT_STEP_NOT_ATTESTED'};
  return {verified:true,reason:'EXACT_SHA_GOVERNED_DEPLOY_STEP_SUCCESS',
    sourceRunId:run.id,sourceSha:run.head_sha,
    noRuntimeStateInferred:true};
}

export async function main(env=process.env, request=fetch){
  if(env.GITHUB_EVENT_NAME!=='workflow_run'||env.GITHUB_REPOSITORY!==REPOSITORY
    ||typeof env.GITHUB_EVENT_PATH!=='string'||!env.GITHUB_EVENT_PATH
    ||!SHA.test(env.GITHUB_SHA??'')){
    throw new Error('INVALID_POSTDEPLOY_CONTEXT');
  }
  const event=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8'));
  const id=event?.workflow_run?.id;
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('INVALID_DEPLOY_RUN_ID');
  const token=env.GITHUB_TOKEN;
  if(typeof token!=='string'||token.length<16)throw new Error('GITHUB_ACTIONS_READ_CREDENTIAL_MISSING');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let jobs;
  try{
    const response=await request('https://api.github.com/repos/'+REPOSITORY+'/actions/runs/'+id+'/jobs?per_page=100',{
      headers:{
        Accept:'application/vnd.github+json',
        Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28'
      },redirect:'error',signal:controller.signal
    });
    if(!response.ok)throw new Error('GITHUB_DEPLOY_JOBS_READ_FAILED');
    jobs=await response.json();
  }finally{clearTimeout(timeout);}
  const result=verifyGovernedDeployRun({
    event,repository:env.GITHUB_REPOSITORY,
    githubSha:env.GITHUB_SHA,jobs
  });
  if(!result.verified)throw new Error(result.reason);
  process.stdout.write(JSON.stringify(result)+'\n');
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{
    const reason=typeof error?.message==='string'&&/^[A-Z][A-Z0-9_]{3,89}$/.test(error.message)
      ?error.message:'POSTDEPLOY_PROOF_FAIL_CLOSED';
    process.stderr.write(reason+'\n');
    process.exitCode=1;
  });
}
