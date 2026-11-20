import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {resolveDocumentaryAgentResume} from '../src/governance/documentaryAgentResume.js';
const registry=JSON.parse(await readFile('.mcp/agents.json','utf8'));
const id='MCP-AGENT-AUTO-INTAKE-BUS-001',repo='Patricked-code/MCP';
test('cold resume returns original documentary identity only, never a session or permission',()=>{
 const a=resolveDocumentaryAgentResume(registry,id,repo);
 assert.equal(a.status,'FOUND_DOCUMENTARY_ONLY');assert.equal(a.agentId,id);
 assert.equal(a.governedSessionId,null);assert.equal(a.runtimeAuthorized,false);
 assert.equal(a.mayClaimTask,false);assert.equal(a.mayDeploy,false);
 assert.deepEqual(resolveDocumentaryAgentResume(registry,'AUTO/BUS',repo),a);
});
test('unknown, wrong repo, duplicate fail closed',()=>{
 assert.equal(resolveDocumentaryAgentResume(registry,'NONEXISTENT',repo).status,'NOT_FOUND');
 assert.equal(resolveDocumentaryAgentResume(registry,id,'other/repo').status,'UNVERIFIED');
 const x=registry.agents.find((a:{agentId?:string})=>a.agentId===id);
 assert.equal(resolveDocumentaryAgentResume({agents:[...registry.agents,{...x}]},id,repo).status,'AMBIGUOUS');
});
test('runtime identity substitution is not accepted',()=>{
 const x=registry.agents.find((a:{agentId?:string})=>a.agentId===id);
 for(const patch of [{clientBinding:'ACTIVE'},{identityScope:'RUNTIME'},{permissionAuthority:'SELF_AUTHORIZED'}]){
 const copy={agents:registry.agents.map((a:{agentId?:string})=>a.agentId===id?{...a,...patch}:a)};
 assert.equal(resolveDocumentaryAgentResume(copy,id,repo).status,'UNVERIFIED');
 }
});
