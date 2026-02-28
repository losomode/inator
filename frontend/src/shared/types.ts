/** User profile from Authinator /api/auth/me/ */
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  customer: {
    id: number;
    name: string;
  } | null;
}

/** Successful login response with JWT tokens. */
export interface LoginResponse {
  access: string;
  refresh: string;
}

/** Response when MFA verification is needed. */
export interface MfaRequiredResponse {
  mfa_required: true;
  mfa_token: string;
  mfa_methods: string[];
}

/** Navigation item for sidebar rendering. */
export interface NavItem {
  path: string;
  label: string;
  adminOnly?: boolean;
}

/** Login can succeed immediately or require MFA. */
export type LoginResult = LoginResponse | MfaRequiredResponse;

/** Type guard to check if login requires MFA. */
export function isMfaRequired(result: LoginResult): result is MfaRequiredResponse {
  return 'mfa_required' in result && result.mfa_required === true;
}

/** Safely extract response data from an unknown Axios error. */
export function getAxiosErrorData(err: unknown): Record<string, unknown> | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as Record<string, unknown>).response === 'object'
  ) {
    const resp = (err as { response: { data?: unknown } }).response;
    if (typeof resp.data === 'object' && resp.data !== null) {
      return resp.data as Record<string, unknown>;
    }
  }
  return undefined;
}

/** Extract error message from an unknown catch value (typically an Axios error). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = getAxiosErrorData(err);
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.error === 'string') return data.error;
  if (err instanceof Error) return err.message;
  return fallback;
}
