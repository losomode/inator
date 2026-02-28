import { describe, it, expect } from 'vitest';
import { getApiFieldErrors, getFulfilErrorMessage, isNotFoundError } from './types';

describe('getApiFieldErrors', () => {
  it('returns empty for non-axios error', () => {
    expect(getApiFieldErrors(new Error('fail'))).toEqual({});
  });

  it('parses simple field errors', () => {
    const err = { response: { data: { name: 'required', quantity: ['must be > 0'] } } };
    expect(getApiFieldErrors(err)).toEqual({ name: 'required', quantity: 'must be > 0' });
  });

  it('parses nested line_items errors', () => {
    const err = { response: { data: { line_items: [{ item: ['invalid'] }] } } };
    expect(getApiFieldErrors(err)).toEqual({ 'line_items[0].item': 'invalid' });
  });

  it('skips detail and error keys', () => {
    const err = { response: { data: { detail: 'ignored', error: 'ignored', name: 'bad' } } };
    expect(getApiFieldErrors(err)).toEqual({ name: 'bad' });
  });

  it('returns empty for null response data', () => {
    expect(getApiFieldErrors({ response: { data: null } })).toEqual({});
  });
});

describe('getFulfilErrorMessage', () => {
  it('returns detail from response', () => {
    expect(getFulfilErrorMessage({ response: { data: { detail: 'bad input' } } }, 'nope')).toBe(
      'bad input',
    );
  });

  it('returns error from response', () => {
    expect(getFulfilErrorMessage({ response: { data: { error: 'oops' } } }, 'nope')).toBe('oops');
  });

  it('returns first field error', () => {
    expect(getFulfilErrorMessage({ response: { data: { name: 'required' } } }, 'nope')).toBe(
      'name: required',
    );
  });

  it('returns first array field error', () => {
    expect(getFulfilErrorMessage({ response: { data: { qty: ['too low'] } } }, 'nope')).toBe(
      'qty: too low',
    );
  });

  it('returns Error message', () => {
    expect(getFulfilErrorMessage(new Error('boom'), 'nope')).toBe('boom');
  });

  it('returns fallback for unknown error', () => {
    expect(getFulfilErrorMessage(42, 'fallback')).toBe('fallback');
  });

  it('formats field name underscores as spaces', () => {
    expect(getFulfilErrorMessage({ response: { data: { po_number: 'required' } } }, 'x')).toBe(
      'po number: required',
    );
  });
});

describe('isNotFoundError', () => {
  it('returns true for 404', () => {
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
  });

  it('returns false for 400', () => {
    expect(isNotFoundError({ response: { status: 400 } })).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isNotFoundError('error')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNotFoundError(null)).toBe(false);
  });
});
