import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('only a host adapter mounts the isolated capsule without replacing the existing pilot',()=>{
  const server=readFileSync(new URL('../../../src/server.ts',import.meta.url),'utf8')
  assert.doesNotMatch(server,/grt-repository-creation|resumeRepositoryCreation/)
  assert.match(server,/registerGrtResumeTool\(decorateRegistrationCatalogServer\(server, 'read'\)/)
  const adapter=readFileSync(new URL('../../../src/cug/grtResumeTool.ts',import.meta.url),'utf8')
  assert.match(adapter,/from .*grt-repository-creation\/src\/resume.mjs/)
  assert.match(server,/app\.use\(createGovernPilotRouter\(/)
})
test('the capsule has no dependency on the historical pilot or the live MCP transport',()=>{
  const capsule=readFileSync(new URL('../src/resume.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(capsule,/governPilot|\/gouvern\/deploy|fetch\(|child_process/)
})
