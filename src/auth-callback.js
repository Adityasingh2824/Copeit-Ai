export function authCallbackError(search, hash) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const code = fragment.get('error_code') || query.get('error_code');
  const error = fragment.get('error') || query.get('error');
  if (!code && !error) return null;
  return code === 'otp_expired'
    ? 'This email link has expired or has already been used. Request a new confirmation or password reset email.'
    : 'This email link could not be verified. Request a new confirmation or password reset email.';
}
