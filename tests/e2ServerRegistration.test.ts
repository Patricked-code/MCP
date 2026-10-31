import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const SERVER=new URL('../src/server.ts',import.meta.url);
const READ_ONLY=new URL('../src/tools/readOnly.ts',import.meta.url);
test('E2 preflight, Continuity ID list and recovery are wired once through read-only registration',async()=>{
 const server=await readFile(SERVER,'utf8');
 const readers=await readFile(READ_ONLY,'utf8');
 assert.match(server,/registerReadOnlyTools\(decorateRegistrationCatalogServer\(server, 'read'\)\)/);
 assert.match(readers,/registerE2PreflightReadOnlyTool\(server\)/);
 assert.match(readers,/registerE2ContinuityReadTools\(server\)/);
 assert.ok(readers.includes("import { registerE2PreflightReadOnlyTool }"));
 assert.ok(readers.includes("import { registerE2ContinuityReadTools }"));
 assert.doesNotMatch(server,/registerE2ContinuityReadTools\(/);
 assert.doesNotMatch(server,/registerE2PreflightReadOnlyTool\(/);
});
