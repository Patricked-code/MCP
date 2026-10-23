import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadGovernPilotArchive } from '../src/github/governPilotArchiveSource.js';

const request={repositoryId:'github:chainsolutions-wealthtech/Governed-Repository-Template',revision:'eb74f16b6c8bbe63658666095f6c97fb32aaa303',destination:'/tmp/pilot.tar.gz',maxBytes:10000};
const good={ok:true as const,sha256:'a'.repeat(64),bytes:12};
test('Pilot GitHub auth RED: preserve working legacy credential when App not configured',async()=>{
 let legacy=0,app=0;
 const result=await downloadGovernPilotArchive(request,null,{
  legacy:async()=>{legacy++;return good},
  mint:async()=>{app++;return 'token'},
  download:async()=>{app++;return good}
 });
 assert.deepEqual(result,good);assert.equal(legacy,1);assert.equal(app,0);
});
test('Pilot GitHub auth RED: App installation token scoped to exact repository, no legacy fallback',async()=>{
 let legacy=0;
 const result=await downloadGovernPilotArchive(request,{appId:'123456',installationId:145098929,privateKeyFile:'/app/secrets/github-app.pem'},{
  legacy:async()=>{legacy++;return good},
  mint:async input=>{assert.deepEqual(input,{appId:'123456',installationId:145098929,repository:'chainsolutions-wealthtech/Governed-Repository-Template'});return 'short-lived-token'},
  download:async input=>{assert.equal(input.token,'short-lived-token');return good}
 });
 assert.deepEqual(result,good);assert.equal(legacy,0);
});
test('Pilot GitHub auth RED: revoked installation cannot fallback to PAT',async()=>{
 let legacy=0,downloads=0;
 const result=await downloadGovernPilotArchive(request,{appId:'123456',installationId:145098929,privateKeyFile:'/app/secrets/github-app.pem'},{
  legacy:async()=>{legacy++;return good},
  mint:async()=>{throw Error('GITHUB_APP_INSTALLATION_TOKEN_REFUSED')},
  download:async()=>{downloads++;return good}
 });
 assert.deepEqual(result,{ok:false,reasonCode:'PILOT_APP_TOKEN_UNAVAILABLE'});
 assert.equal(legacy,0);assert.equal(downloads,0);
});
test('Pilot GitHub auth RED: reject target unrelated to configured pilot before issuing token',async()=>{
 let calls=0;
 const x=await downloadGovernPilotArchive({...request,repositoryId:'github:Patricked-code/MCP'},{appId:'123456',installationId:145098929,privateKeyFile:'/app/secrets/github-app.pem'},{
  legacy:async()=>{calls++;return good},mint:async()=>{calls++;return 't'},download:async()=>{calls++;return good}
 });
 assert.deepEqual(x,{ok:false,reasonCode:'PILOT_GITHUB_TARGET_INVALID'});assert.equal(calls,0);
});
