import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('the capsule is not mounted in or imported by the existing MCP server',()=>{
  const server=readFileSync(new URL('../../../src/server.ts',import.meta.url),'utf8')
  assert.doesNotMatch(server,/grt-repository-creation|resumeRepositoryCreation/)
  assert.match(server,/app\.use\(createGovernPilotRouter\(/)
})
test('the capsule has no dependency on the historical pilot or the live MCP transport',()=>{
  const capsule=readFileSync(new URL('../src/resume.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(capsule,/governPilot|\/gouvern\/deploy|fetch\(|child_process/)
})
