import { describe, it, expect } from 'vitest';
import { isMfaRequired, getAxiosErrorData, getApiErrorMessage } from './types';
import type { LoginResponse, MfaRequiredResponse } from './types';

describe('isMfaRequired', () => {
  it('returns true for MFA required response', () => {
    const response: MfaRequiredResponse = {
      mfa_required: true,
      mfa_token: 'mfa-token-123',
      mfa_methods: ['totp', 'webauthn'],
    };
    expect(isMfaRequired(response)).toBe(true);
  });

  it('returns false for login success response', () => {
    const response: LoginResponse = {
      access: 'access-token',
      refresh: 'refresh-token',
    };
    expect(isMfaRequired(response)).toBe(false);
  });
});

describe('getAxiosErrorData', () => {
  it('extracts data from Axios-like error', () => {
    const err = { response: { data: { detail: 'Not found' } } };
    expect(getAxiosErrorData(err)).toEqual({ detail: 'Not found' });
  });

  it('returns undefined for non-object error', () => {
    expect(getAxiosErrorData('string error')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(getAxiosErrorData(null)).toBeUndefined();
  });

  it('returns undefined when response has no data', () => {
    const err = { response: {} };
    expect(getAxiosErrorData(err)).toBeUndefined();
  });

  it('returns undefined when response.data is not an object', () => {
    const err = { response: { data: 'string data' } };
    expect(getAxiosErrorData(err)).toBeUndefined();
  });

  it('returns undefined when response is not an object', () => {
    const err = { response: 'not-an-object' };
    expect(getAxiosErrorData(err)).toBeUndefined();
  });
});

describe('getApiErrorMessage', () => {
  it('extracts detail from Axios error', () => {
    const err = { response: { data: { detail: 'Invalid credentials' } } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Invalid credentials');
  });

  it('extracts error field from Axios error', () => {
    const err = { response: { data: { error: 'Server error' } } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Server error');
  });

  it('uses Error.message for standard errors', () => {
    const err = new Error('Something broke');
    expect(getApiErrorMessage(err, 'fallback')).toBe('Something broke');
  });

  it('returns fallback for unknown error types', () => {
    expect(getApiErrorMessage(42, 'fallback')).toBe('fallback');
  });

  it('returns fallback for null', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
