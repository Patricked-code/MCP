import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const WORKFLOW = new URL('../.github/workflows/mcp-deploy.yml', import.meta.url);
const POLICY = new URL('../.mcp/autodeploy-policy.json', import.meta.url);

async function workflowSource(): Promise<string> {
  return readFile(WORKFLOW, 'utf8');
}

async function policy(): Promise<{ schemaVersion?: unknown; pushEnabled?: unknown }> {
  return JSON.parse(await readFile(POLICY, 'utf8')) as { schemaVersion?: unknown; pushEnabled?: unknown };
}

test('la politique post-bootstrap est versionnée et active le push gouverné', async () => {
  assert.deepEqual(await policy(), { schemaVersion: 1, pushEnabled: true });
});

test('le workflow possède uniquement les permissions minimales OIDC + lecture', async () => {
  const source = (await workflowSource()).split('  reconcile-documentation:')[0]!;

  assert.match(source, /permissions:\s*\n\s+contents:\s*read\s*\n\s+actions:\s*read\s*\n\s+id-token:\s*write/);
  assert.doesNotMatch(source, /contents:\s*write|packages:\s*write|actions:\s*write|pull-requests:\s*write|issues:\s*write/);
  assert.match(source, /actions\/checkout@v4/);
  assert.match(source, /persist-credentials:\s*false/);
});

test('AF-19 exige une preuve CI success du SHA exact avant tout autodeploy push', async () => {
  const source = await workflowSource();

  assert.match(source, /actions:\s*read/);
  assert.match(source, /MCP CI/);
  assert.match(source, /GITHUB_SHA/);
  assert.match(source, /head_sha/);
  assert.match(source, /conclusion/);
  assert.match(source, /success/);
  assert.match(source, /for attempt in \$\(seq 1 60\)/);
  assert.match(source, /sleep 10/);
  assert.match(source, /enabled=false/);
  assert.doesNotMatch(source, /workflow_run:/);
});

test('workflow_dispatch est toujours disponible et push main est gouverné par la politique versionnée', async () => {
  const source = await workflowSource();

  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(source, /\.mcp\/autodeploy-policy\.json/);
  assert.match(source, /GITHUB_EVENT_NAME/);
  assert.match(source, /workflow_dispatch/);
  assert.match(source, /pushEnabled/);
  assert.match(source, /if:\s*steps\.gate\.outputs\.enabled == 'true'/);
});

test('le workflow demande un OIDC GitHub frais avec audience fixe sans secret SSH', async () => {
  const source = (await workflowSource()).split('  reconcile-documentation:')[0]!;

  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(source, /https:\/\/mcp\.wealthtechinnovations\.com\/deploy\/github\/s1/);
  assert.match(source, /get_oidc\(\)/);
  assert.match(source, /::add-mask::/);
  assert.doesNotMatch(source, /secrets\.|ssh\s|scp\s|id_rsa|private[_ -]?key/i);
});

test('le démarrage lie exactement GITHUB_SHA et GITHUB_RUN_ID au job attendu', async () => {
  const source = await workflowSource();

  assert.match(source, /GITHUB_SHA/);
  assert.match(source, /GITHUB_RUN_ID/);
  assert.match(source, /\/deploy\/github\/s1\/start/);
  assert.match(source, /requestedSha/);
  assert.match(source, /mcp-s1-/);
  assert.match(source, /slice\(0,\s*12\)/);
  assert.doesNotMatch(source, /git rev-parse HEAD|github\.event\.after/);
});

test('le polling redemande un OIDC à chaque tentative et est strictement borné', async () => {
  const source = await workflowSource();

  assert.match(source, /for attempt in \$\(seq 1 60\)/);
  assert.match(source, /sleep 10/);
  const loopIndex = source.indexOf('for attempt in $(seq 1 60)');
  assert.ok(loopIndex >= 0);
  const loop = source.slice(loopIndex);
  assert.match(loop, /OIDC_TOKEN="\$\(get_oidc\)"/);
  assert.match(loop, /\/deploy\/github\/s1\/status\//);
});

test('le succès exige attestation exacte du SHA et tous les contrôles runtime', async () => {
  const source = await workflowSource();

  assert.match(source, /runtimeRevision/);
  assert.match(source, /healthOk/);
  assert.match(source, /oauthOk/);
  assert.match(source, /mcpAuthOk/);
  assert.match(source, /rollbackStatus/);
  assert.match(source, /attested/);
  assert.match(source, /GITHUB_SHA/);
  assert.match(source, /process\.exit\(1\)/);
});

test('le workflow est borné globalement et ne journalise pas les réponses OIDC', async () => {
  const source = await workflowSource();

  assert.match(source, /timeout-minutes:\s*15/);
  assert.match(source, /--max-time\s+10/);
  assert.doesNotMatch(source, /set -x|echo\s+\$OIDC_TOKEN|printenv/);
});


test('GWC-15 self-review: push gate propagates its authorizing CI run into the bounded start request', async () => {
  const source = await workflowSource();

  assert.match(source, /ci_run_id/i);
  assert.match(source, /push_ci_gate/);
  assert.match(source, /ciHeadSha|ci_head_sha/);
  assert.match(source, /ciConclusion|ci_conclusion/);
  assert.match(source, /workflow_dispatch_manual/);
  assert.match(source, /steps\.gate\.outputs\./);
  assert.match(source, /\/deploy\/github\/s1\/start/);
});

test('G1 job inherits only the attested projection and has no OIDC or workflow write rights', async () => {
  const [deploy, g1] = (await workflowSource()).split('  reconcile-documentation:');
  assert.match(deploy!, /succeeded\)[\s\S]*&g1=1/);
  assert.match(g1!, /needs: \[deploy, reobserve-documentation\]/);
  assert.match(g1!, /continue-on-error: true/);
  assert.match(g1!, /permission-contents: write/);
  assert.match(g1!, /permission-pull-requests: write/);
  assert.doesNotMatch(g1!, /id-token: write|actions: write|merge_pull_request/);
});

test('G1 retries only the post-attestation proof and keeps UNVERIFIED on bounded exhaustion', async () => {
  const [deploy] = (await workflowSource()).split('  reconcile-documentation:');
  const followUp = deploy!.slice(deploy!.indexOf('Deployment attested for exact SHA'));
  assert.match(followUp, /G1_EVIDENCE='\{"status":"UNVERIFIED","reasonCodes":\["G1_POST_DEPLOY_PROOF_PENDING"\]\}'/);
  assert.match(followUp, /G1_DEADLINE=\$\(\(SECONDS \+ 180\)\)/);
  assert.match(followUp, /for g1_attempt in \$\(seq 1 16\)/);
  assert.match(followUp, /status\/\$\{JOB_ID\}\?sha=\$\{GITHUB_SHA\}&g1=1/);
  assert.doesNotMatch(followUp, /\/deploy\/github\/s1\/start/);
  assert.match(followUp, /g1-evidence=%s[\s\S]*exit 0/);
});

test('G1 renders bounded reason codes for UNVERIFIED without opening an unverified PR', async () => {
  const [deploy, g1] = (await workflowSource()).split('  reconcile-documentation:');
  assert.match(deploy!, /G1_CANDIDATE[\s\S]*UNVERIFIED/);
  assert.match(g1!, /G1 proof blocked/);
  assert.match(g1!, /No GitHub write performed/);
  assert.match(g1!, /throw Error\("G1 proof unavailable/);
  assert.match(g1!, /G1_EVIDENCE/);
  assert.doesNotMatch(g1!, /id-token: write|actions: write|merge_pull_request/);
});

test('G1 reobserves only a prior attested job, preserves unverified proof on mismatches, and never starts a deploy', async () => {
  const source=await workflowSource();
  const job=source.split('  reobserve-documentation:')[1]!.split('  reconcile-documentation:')[0]!;
  assert.match(job,/needs: deploy/);
  assert.match(job,/needs\.deploy\.result == 'success'/);
  assert.match(job,/G1_DEADLINE=\$\(\(SECONDS \+ 240\)\)/);
  assert.match(job,/for g1_attempt in \$\(seq 1 12\)/);
  assert.doesNotMatch(job,/\/deploy\/github\/s1\/start|--request POST|contents: write|pull-requests: write|secrets\./);
  const shell=job.split('        run: |\n')[1]!.split('\n').filter(l=>l.startsWith('          ')||l==='').map(l=>l.slice(10)).join('\n');
  const syntax=spawnSync('bash',['-n'],{input:shell,encoding:'utf8',timeout:5000});
  assert.equal(syntax.status,0,syntax.stderr);
  const dir=await mkdtemp(join(tmpdir(),'mcp-g1-reobserve-'));
  try {
    const sha='a'.repeat(40);
    const initial={status:'UNVERIFIED',reasonCodes:['G1_DOCUMENTATION_CONTRADICTIONS']};
    const attested={jobId:'mcp-s1-12-'+sha.slice(0,12),requestedSha:sha,status:'succeeded',phase:'attested',
      runtimeRevision:sha,rollbackStatus:'not_needed',healthOk:true,oauthOk:true,mcpAuthOk:true};
    const mocks=[
      'sleep() { :; }',
      'curl() {',
      '  case "$'+'{!#}" in',
      '    https://oidc.test/*) printf "%s" "$TEST_OIDC" ;;',
      '    *"&g1=1") printf "%s" "$TEST_G1" ;;',
      '    *) printf "unexpected endpoint" >&2; return 1 ;;',
      '  esac',
      '}'
    ].join('\n');
    for(const [i,g1,revision,expected] of [
      [0,{status:'DRIFT',sha},sha,{status:'DRIFT',sha}],
      [1,{status:'ALIGNED'},sha,{status:'ALIGNED'}],
      [2,{status:'DRIFT',sha},'b'.repeat(40),initial],
      [3,{status:'DRIFT',sha:'b'.repeat(40)},sha,initial]
    ] as const) {
      const output=join(dir,String(i));
      const result=spawnSync('bash',['-s'],{input:mocks+'\n'+shell,encoding:'utf8',timeout:10000,
        env:{...process.env,GITHUB_SHA:sha,GITHUB_RUN_ID:'12',GITHUB_OUTPUT:output,INITIAL_G1:JSON.stringify(initial),
          MCP_BASE_URL:'https://mcp.test',ACTIONS_ID_TOKEN_REQUEST_URL:'https://oidc.test/token',
          ACTIONS_ID_TOKEN_REQUEST_TOKEN:'mock',TEST_OIDC:JSON.stringify({value:'a'.repeat(32)}),
          TEST_G1:JSON.stringify({...attested,runtimeRevision:revision,g1})}});
      assert.equal(result.error,undefined);
      assert.equal(result.status,0,result.stderr);
      assert.equal(await readFile(output,'utf8'),'g1-evidence='+JSON.stringify(expected)+'\n');
      assert.doesNotMatch(result.stderr,/unexpected endpoint/);
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});
