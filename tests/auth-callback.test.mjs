import assert from 'node:assert/strict';
import test from 'node:test';
import { authCallbackError } from '../src/auth-callback.js';

test('expired email links explain how to recover from fragment or query errors', () => {
  for (const [search, hash] of [['', '#error=access_denied&error_code=otp_expired'], ['?error_code=otp_expired', '']]) {
    assert.match(authCallbackError(search, hash), /expired.*Request a new/);
  }
});

test('callback errors do not echo untrusted provider descriptions', () => {
  assert.doesNotMatch(authCallbackError('', '#error=access_denied&error_description=SECRET'), /SECRET/);
  assert.equal(authCallbackError('?confirmed=1', '#access_token=example'), null);
  assert.equal(authCallbackError('', '#/workspace'), null);
});
