import { env } from '../config/env.js';
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonRequestOptions,
  type GitHubJsonResponse
} from './connection.js';

export type CreateGithubOrganizationRepositoryInput = {
  organization: string;
  name: string;
  description?: string;
};

export type GithubRepositoryCreationResult = {
  status: 'CREATED' | 'ALREADY_EXISTS';
  organization: string;
  name: string;
  fullName: string;
  private: true;
  htmlUrl: string | null;
};

export type GithubRepositoryAdminDependencies = {
  configuredOrg: string;
  request(
    endpoint: string,
    options?: GitHubJsonRequestOptions
  ): Promise<GitHubJsonResponse>;
};

const ORGANIZATION_PATTERN = /^[A-Za-z0-9_.-]{1,120}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

function normalizeOrganization(value: string): string {
  const organization = value.trim();
  if (!ORGANIZATION_PATTERN.test(organization)) {
    throw new Error('GITHUB_REPOSITORY_ORG_INVALID');
  }
  return organization;
}

function normalizeRepositoryName(value: string): string {
  const name = value.trim();
  if (!REPOSITORY_PATTERN.test(name) || name === '.' || name === '..') {
    throw new Error('GITHUB_REPOSITORY_NAME_INVALID');
  }
  return name;
}

function normalizeDescription(value: string | undefined): string {
  const description = value?.trim() ?? '';
  if (description.length > 350) {
    throw new Error('GITHUB_REPOSITORY_DESCRIPTION_INVALID');
  }
  return description;
}

function safeRepository(
  json: unknown,
  organization: string,
  expectedName: string
): GithubRepositoryCreationResult | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const root = json as Record<string, unknown>;
  const owner = root.owner && typeof root.owner === 'object' && !Array.isArray(root.owner)
    ? root.owner as Record<string, unknown>
    : null;
  const ownerLogin = typeof owner?.login === 'string' ? owner.login : null;
  const name = typeof root.name === 'string' ? root.name : null;
  const fullName = typeof root.full_name === 'string' ? root.full_name : null;

  if (
    ownerLogin !== organization
    || name !== expectedName
    || fullName !== `${organization}/${expectedName}`
  ) {
    return null;
  }

  if (root.private !== true) {
    throw new Error('GITHUB_REPOSITORY_VISIBILITY_MISMATCH');
  }

  const htmlUrl = typeof root.html_url === 'string'
    && root.html_url.startsWith('https://github.com/')
    ? root.html_url
    : null;

  return {
    status: 'ALREADY_EXISTS',
    organization,
    name,
    fullName,
    private: true,
    htmlUrl
  };
}

function defaultDependencies(): GithubRepositoryAdminDependencies {
  return {
    configuredOrg: env.GITHUB_ORG,
    request: githubJsonRequestWithServerCredential
  };
}

function requestFailure(prefix: string, status: number | null): Error {
  return new Error(`${prefix}:${status ?? 'NETWORK'}`);
}

export async function createGithubOrganizationRepository(
  input: CreateGithubOrganizationRepositoryInput,
  dependencies: GithubRepositoryAdminDependencies = defaultDependencies()
): Promise<GithubRepositoryCreationResult> {
  const organization = normalizeOrganization(input.organization);
  const name = normalizeRepositoryName(input.name);
  const description = normalizeDescription(input.description);
  const configuredOrg = normalizeOrganization(dependencies.configuredOrg);

  if (organization !== configuredOrg) {
    throw new Error('GITHUB_REPOSITORY_ORG_NOT_ALLOWED');
  }

  const repositoryEndpoint = `/repos/${encodeURIComponent(organization)}/${encodeURIComponent(name)}`;
  const existing = await dependencies.request(repositoryEndpoint);

  if (existing.ok) {
    const repository = safeRepository(existing.json, organization, name);
    if (!repository) throw new Error('GITHUB_REPOSITORY_RESPONSE_INVALID');
    return repository;
  }

  if (existing.status !== 404) {
    throw requestFailure('GITHUB_REPOSITORY_PROBE_FAILED', existing.status);
  }

  const created = await dependencies.request(
    `/orgs/${encodeURIComponent(organization)}/repos`,
    {
      method: 'POST',
      jsonBody: {
        name,
        description,
        private: true,
        auto_init: false
      }
    }
  );

  if (created.ok && created.status === 201) {
    const repository = safeRepository(created.json, organization, name);
    if (!repository) throw new Error('GITHUB_REPOSITORY_RESPONSE_INVALID');
    return { ...repository, status: 'CREATED' };
  }

  if (created.status === 422) {
    const raced = await dependencies.request(repositoryEndpoint);
    if (raced.ok) {
      const repository = safeRepository(raced.json, organization, name);
      if (!repository) throw new Error('GITHUB_REPOSITORY_RESPONSE_INVALID');
      return repository;
    }
  }

  throw requestFailure('GITHUB_REPOSITORY_CREATE_FAILED', created.status);
}
