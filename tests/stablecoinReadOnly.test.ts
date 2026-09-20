import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/tools/writeScoped.ts', import.meta.url),
  'utf8'
);

function schemaBlock(name: string): string {
  const marker = `const ${name} = z.enum([`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} missing`);
  const end = source.indexOf(']);', start);
  assert.notEqual(end, -1, `${name} not terminated`);
  return source.slice(start, end + 3);
}

test('Stablecoin is exposed to read-only status but not mutable S2 project tools', () => {
  const statusSchema = schemaBlock('StatusProjectKeySchema');
  const mutableSchema = schemaBlock('MutableProjectKeySchema');

  assert.match(statusSchema, /'stablecoin_frontend'/);
  assert.doesNotMatch(mutableSchema, /'stablecoin_frontend'/);

  assert.match(source, /project: StatusProjectKeySchema[\s\S]*?git_status_project_s2/);
  assert.match(source, /git_pull_project_s2[\s\S]*?project: MutableProjectKeySchema/);
  assert.match(source, /deploy_project_s2[\s\S]*?project: MutableProjectKeySchema/);
});

test('Stablecoin status path is bounded to the documented Passenger checkout', () => {
  assert.match(
    source,
    /stablecoin_frontend:[\s\S]*?\/var\/www\/vhosts\/chainsolutions\.fr\/stablecoin\.chainsolutions\.fr\/stablecoin/
  );
  assert.match(source, /read-only|lecture seule/i);
});
