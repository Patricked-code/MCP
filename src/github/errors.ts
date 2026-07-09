export class GitHubToolError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;

  constructor(code: string, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'GitHubToolError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
