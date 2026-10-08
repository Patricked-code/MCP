/**
 * F.2 (TB-W3-F-03): the image inputs of a Dockerfile a provisioned project
 * builds (owner decision on PR #261, options 1 + 3). A runtime runs the bytes
 * its admitted revision determines, so every image a build pulls is pinned by
 * digest, as a service image already is: `FROM`, `--from=` of `COPY`/`ADD`,
 * `from=` of a `RUN --mount`, and the `# syntax=` frontend. A stage the file
 * defined earlier, `scratch` and a named build context (kept inside the
 * project by the Compose policy) are local and admitted.
 *
 * The scan fails closed rather than parse as BuildKit does: it reads the file
 * as joined lines under both escape characters and as physical lines, so a
 * keyword split by a continuation or a comment is still seen. A line that only
 * looks like an instruction (a heredoc line starting with `from`) is refused
 * too: a false refusal is fixed by the project, a missed pull is not. Pure.
 */
export type DockerfileFindingCode = 'DOCKERFILE_INVALID' | 'DOCKERFILE_IMAGE_UNPINNED' | 'DOCKERFILE_FRONTEND_UNPINNED';

export type DockerfileFinding = Readonly<{ code: DockerfileFindingCode; key: string | null }>;

export const DOCKERFILE_MAX_BYTES = 100_000;
const DIGEST = /@sha256:[0-9a-f]{64}$/;
const SYNTAX = /^\s*#\s*syntax\s*=\s*(\S*)/i;
const FROM_FLAG = /(?:^|[\s,"'=])(?:--)?from=["']?([^\s,"']*)/gi;

function joined(lines: readonly string[], escape: string): string[] {
  const logical: string[] = [];
  let current: string | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (current !== null && /^\s*#/.test(line)) continue;
    const trimmed = line.replace(/\s+$/, '');
    const continued = trimmed.endsWith(escape);
    const body = continued ? trimmed.slice(0, -1) : line;
    current = current === null ? body : `${current}${body}`;
    if (!continued) {
      logical.push(current);
      current = null;
    }
  }
  if (current !== null) logical.push(current);
  return logical;
}

export function evaluateDockerfile(source: string, contexts: readonly string[] = []): readonly DockerfileFinding[] {
  const findings: DockerfileFinding[] = [];
  const add = (code: DockerfileFindingCode, key: string | null) => {
    const bounded = key === null ? null : key.slice(0, 200);
    if (!findings.some((entry) => entry.code === code && entry.key === bounded)) findings.push(Object.freeze({ code, key: bounded }));
  };
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > DOCKERFILE_MAX_BYTES || source.includes('\u0000')) {
    return Object.freeze([Object.freeze({ code: 'DOCKERFILE_INVALID' as const, key: null })]);
  }
  const lines = source.split('\n');
  for (const line of lines) {
    const syntax = SYNTAX.exec(line);
    if (syntax && !DIGEST.test(syntax[1] ?? '')) add('DOCKERFILE_FRONTEND_UNPINNED', syntax[1] || null);
  }
  const named = new Set(contexts);
  const local = (image: string, stages: ReadonlySet<string>) => !image.includes('$') && (
    image.toLowerCase() === 'scratch' || stages.has(image.toLowerCase()) || named.has(image) || DIGEST.test(image)
  );
  let froms = 0;
  for (const view of [joined(lines, '\\'), joined(lines, '`'), lines]) {
    const stages = new Set<string>();
    let viewFroms = 0;
    for (const line of view) {
      if (/^\s*#/.test(line)) continue;
      const tokens = line.trim().split(/\s+/);
      if (tokens[0]?.toUpperCase() === 'FROM') {
        viewFroms += 1;
        const rest = tokens.slice(1).filter((token) => !token.startsWith('--'));
        const image = rest[0] ?? '';
        if (!local(image, stages)) add('DOCKERFILE_IMAGE_UNPINNED', image || null);
        if (rest[1]?.toUpperCase() === 'AS' && rest[2]) stages.add(rest[2].toLowerCase());
      }
      for (const match of line.matchAll(FROM_FLAG)) {
        const value = match[1] ?? '';
        if (!/^\d+$/.test(value) && !local(value, stages)) add('DOCKERFILE_IMAGE_UNPINNED', value || null);
      }
    }
    froms = Math.max(froms, viewFroms);
  }
  if (froms === 0) add('DOCKERFILE_INVALID', null);
  return Object.freeze(findings);
}
