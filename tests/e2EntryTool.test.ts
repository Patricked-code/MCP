import assert from 'node:assert/strict';
import test from 'node:test';
import { registerE2PreflightReadOnlyTool } from '../src/tools/e2Entry.js';
test('E2 read-only preflight registration exists',()=>{
 assert.equal(typeof registerE2PreflightReadOnlyTool,'function');
});
