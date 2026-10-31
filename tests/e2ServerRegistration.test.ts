import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const SERVER_FILE=new URL('../src/server.ts',import.meta.url);
test('E2 entry preflight and Continuity ID recovery are registered as read tools',async()=>{
 const source=await readFile(SERVER_FILE,'utf8');
 assert.match(source,/registerE2PreflightReadOnlyTool\(\s*decorateRegistrationCatalogServer\(server, 'read'\)/);
 assert.match(source,/registerE2ContinuityReadTools\(\s*decorateRegistrationCatalogServer\(server, 'read'\)/);
 assert.match(source,/registerE2OwnerTools\(\s*decorateScopedWriteServer\(/);
 assert.ok(source.includes("import { registerE2OwnerTools, registerE2ContinuityReadTools }"));
 assert.ok(source.includes("import { registerE2PreflightReadOnlyTool }"));
});
