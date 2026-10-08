import assert from 'node:assert/strict';
import test from 'node:test';

const { evaluateDockerfile } = await import('../src/provisioning/dockerfilePolicy.js');
const { evaluateComposeSafety } = await import('../src/provisioning/composePolicy.js');

const PIN = `node@sha256:${'a'.repeat(64)}`;
const codes = (text: string, contexts: string[] = []) => evaluateDockerfile(text, contexts).map((finding) => finding.code);

test('a Dockerfile admits only images pinned by digest, its own stages, scratch and named contexts', () => {
  assert.deepEqual(codes(`FROM ${PIN} AS build\nRUN npm ci\nFROM scratch\nCOPY --from=build /app /app\nCOPY --from=0 /x /x\n`), []);
  assert.deepEqual(codes(`FROM --platform=$BUILDPLATFORM ${PIN}\n`), []);
  assert.deepEqual(codes('FROM base\n', ['base']), []);
  for (const text of [
    'FROM node:20\n',
    'from node\n',
    'ARG BASE=node\nFROM ${BASE}\n',
    `FROM ${PIN}\nCOPY --from=alpine /x /x\n`,
    `FROM ${PIN}\nRUN --mount=type=bind,from=alpine,target=/x true\n`,
    `FROM ${PIN}\nRUN --mount="type=cache,from=busybox" true\n`,
    // A keyword split by a continuation is still an instruction.
    'FR\\\nOM node\n',
    'FROM \\\n# comment\n node\n',
    `# escape=\`\nFROM \`\n node\n`,
    // Referring to a stage defined later is a pull.
    `FROM later\nFROM ${PIN} AS later\n`
  ]) {
    assert.ok(codes(text).includes('DOCKERFILE_IMAGE_UNPINNED'), text);
  }
});

test('the frontend is pinned too, and an unreadable Dockerfile fails closed', () => {
  assert.deepEqual(codes(`# syntax=docker/dockerfile:1@sha256:${'b'.repeat(64)}\nFROM ${PIN}\n`), []);
  assert.ok(codes(`# syntax=docker/dockerfile:1\nFROM ${PIN}\n`).includes('DOCKERFILE_FRONTEND_UNPINNED'));
  assert.ok(codes(`#syntax = docker/dockerfile:1\nFROM ${PIN}\n`).includes('DOCKERFILE_FRONTEND_UNPINNED'));
  assert.deepEqual(codes('\u0000'), ['DOCKERFILE_INVALID']);
  assert.deepEqual(codes('x'.repeat(100_001)), ['DOCKERFILE_INVALID']);
  assert.deepEqual(codes('RUN true\n'), ['DOCKERFILE_INVALID']);
});

test('the compose policy names each build Dockerfile and refuses pulls and BuildKit arguments', () => {
  const dir = '/opt/apps/portal-api';
  const service = (build: Record<string, unknown>) => ({
    name: 'p', services: { api: { build: { context: dir, dockerfile: 'Dockerfile', ...build }, mem_limit: '1', cpus: 1, pids_limit: 1 } }
  });
  const safety = evaluateComposeSafety(service({}), dir) as any;
  assert.deepEqual(safety.dockerfiles, [{ service: 'api', path: 'Dockerfile', inline: null, contexts: [] }]);
  const nested = evaluateComposeSafety(service({ context: `${dir}/app`, dockerfile: 'Dockerfile.dev', additional_contexts: { base: `${dir}/base` } }), dir) as any;
  assert.deepEqual(nested.dockerfiles, [{ service: 'api', path: 'app/Dockerfile.dev', inline: null, contexts: ['base'] }]);
  const inline = evaluateComposeSafety(service({ dockerfile: undefined, dockerfile_inline: 'FROM x\n' }), dir) as any;
  assert.deepEqual(inline.dockerfiles, [{ service: 'api', path: null, inline: 'FROM x\n', contexts: [] }]);
  assert.ok((evaluateComposeSafety(service({ pull: true }), dir) as any).findings.some((f: any) => f.code === 'COMPOSE_BUILD_PULL'));
  assert.ok((evaluateComposeSafety(service({ args: { BUILDKIT_SYNTAX: 'x' } }), dir) as any).findings.some((f: any) => f.code === 'COMPOSE_BUILD_ARG_RESERVED'));
});
