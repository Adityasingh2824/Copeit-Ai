import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { configured, supabase } from './lib/supabase';
import Turnstile from './Turnstile';

const redirectBase = `${window.location.origin}${window.location.pathname}`;

function friendlyError(error) {
  if (!error) return '';
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) return 'Email or password is incorrect. Re-enter the password or use “Forgot password?” to set a new one.';
  if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) return 'Your email is not confirmed yet. Resend the confirmation email, then open its link.';
  if (error.code === 'email_address_not_authorized') return 'Email delivery is not configured for this address yet. Contact the workspace owner.';
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit' || /rate limit/i.test(error.message)) return 'Too many attempts. Please wait a few minutes and try again.';
  return error.message;
}

export default function AuthPage({ onBack, onPreview, Logo, mark }) {
  const [mode, setMode] = useState(new URLSearchParams(window.location.search).has('recovery') ? 'new-password' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaConfigured = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const needsCaptcha = captchaConfigured && mode !== 'new-password';

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setMode('new-password');
    });
    if (new URLSearchParams(window.location.search).has('recovery')) {
      supabase.auth.getSession().then(({ data }) => {
        if (!active || data.session) return;
        window.history.replaceState({}, '', window.location.pathname + '#/login');
        setMode('reset');
        setNotice({ error: true, text: 'This password reset link is invalid or expired. Request a new link.' });
      });
    }
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  function changeMode(next) {
    if (next !== 'new-password' && new URLSearchParams(window.location.search).has('recovery')) {
      window.history.replaceState({}, '', window.location.pathname + '#/login');
    }
    setMode(next);
    setNotice(null);
    setPassword('');
  }

  async function resendConfirmation() {
    if (!configured || !email.trim()) {
      setNotice({ error: true, text: 'Enter your email address first.' });
      return;
    }
    if (needsCaptcha && !captchaToken) {
      setNotice({ error: true, text: 'Complete the bot-protection check before requesting another email.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${redirectBase}?confirmed=1`, ...(captchaToken ? { captchaToken } : {}) },
      });
      setNotice(error
        ? { error: true, text: friendlyError(error), action: error.code === 'email_already_confirmed' ? 'reset' : undefined }
        : { text: 'Confirmation email sent again. Check your inbox and spam folder.' });
    } catch {
      setNotice({ error: true, text: 'Could not request another confirmation email. Try again shortly.' });
    } finally {
      if (needsCaptcha) setCaptchaReset(value => value + 1);
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setNotice(null);
    if (!configured) {
      setNotice({ error: true, text: 'Authentication is not configured for this build.' });
      return;
    }
    if (needsCaptcha && !captchaToken) {
      setNotice({ error: true, text: 'Complete the bot-protection check before continuing.' });
      return;
    }
    setBusy(true);
    try {
      let result;
      if (mode === 'signup' || mode === 'new-password') {
        if (password.length < 12) {
          setNotice({ error: true, text: 'Use at least 12 characters for a password.' });
          return;
        }
      }
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${redirectBase}?confirmed=1`, ...(captchaToken ? { captchaToken } : {}) },
        });
        if (!result.error) {
          if (result.data.session) {
            setNotice({ text: 'Account created. Opening your workspace…' });
            window.location.hash = '#/workspace';
          } else {
            setNotice({ text: 'Check your inbox for a confirmation email. If this email is already registered, sign in or reset its password.', action: 'resend' });
          }
        }
      } else if (mode === 'reset') {
        result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${redirectBase}?recovery=1`, ...(captchaToken ? { captchaToken } : {}) });
        if (!result.error) setNotice({ text: 'If an account exists for that email, a password reset link is on its way.' });
      } else if (mode === 'new-password') {
        result = await supabase.auth.updateUser({ password });
        if (!result.error) {
          window.history.replaceState({}, '', `${window.location.pathname}#/workspace`);
          window.location.reload();
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: captchaToken ? { captchaToken } : undefined });
        if (!result.error && result.data.session) window.location.hash = '#/workspace';
      }
      if (result?.error) setNotice({
        error: true,
        text: friendlyError(result.error),
        action: result.error.code === 'invalid_credentials' ? 'reset' : result.error.code === 'email_not_confirmed' ? 'resend' : undefined,
      });
    } catch {
      setNotice({ error: true, text: 'Could not reach Supabase Auth. Check your connection and try again.' });
    } finally {
      if (needsCaptcha) setCaptchaReset(value => value + 1);
      setBusy(false);
    }
  }

  const title = { signin: 'Welcome back.', signup: 'Your next market starts here.', reset: 'Reset your password.', 'new-password': 'Choose a new password.' }[mode];
  const description = { signin: 'Pick up your product journey where you left off.', signup: 'Create an account, verify your email, then create a private workspace or join your team.', reset: 'We will send a secure link to your email.', 'new-password': 'Use at least 12 characters for your new password.' }[mode];
  return <div className="auth-page auth-refined">
    <div className="auth-art">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17}/> Back to home</button>
      <div className="auth-art-content">
        <span className="section-kicker light">A CLEARER WAY FORWARD</span>
        <h1>Less searching.<br/><em>More certainty.</em></h1>
        <p>One thoughtful place for product context, evidence, and the conversations that move work forward.</p>
        <img src={mark} alt=""/>
      </div>
      <div className="auth-art-foot"><ShieldCheck size={17}/> Private workspaces · Human reviewed decisions</div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel-top"><Logo/><button className="auth-mobile-back" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18}/></button></div>
      <div className="auth-form-wrap">
        <span className="auth-orbit"><Sparkles size={23}/></span>
        <div className="auth-kicker">COPEIT / YOUR WORKSPACE</div>
        <h2>{title}</h2><p>{description}</p>
        {mode !== 'reset' && mode !== 'new-password' && <div className="auth-tabs" role="tablist" aria-label="Account action"><button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'selected' : ''} onClick={() => changeMode('signin')}>Sign in</button><button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'selected' : ''} onClick={() => changeMode('signup')}>Create account</button></div>}
        <form onSubmit={submit}>
          {mode !== 'new-password' && <><label htmlFor="auth-email">Work email</label><input id="auth-email" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)}/></>}
          {mode !== 'reset' && <><div className="label-row"><label htmlFor="auth-password">{mode === 'new-password' ? 'New password' : 'Password'}</label>{mode === 'signin' && <button type="button" onClick={() => changeMode('reset')}>Forgot password?</button>}</div><div className="auth-password-field"><input id="auth-password" type={showPassword ? 'text' : 'password'} required minLength={mode === 'signin' ? 6 : 12} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={mode === 'signin' ? 'Your password' : 'At least 12 characters'} value={password} onChange={event => setPassword(event.target.value)}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></>}
          {needsCaptcha && <Turnstile onToken={setCaptchaToken} resetKey={`${mode}-${captchaReset}`}/>}
          {notice && <div className={`form-message ${notice.error ? 'error' : 'success'}`} role={notice.error ? 'alert' : 'status'}>{notice.error ? <LockKeyhole size={16}/> : <CheckCircle2 size={16}/>}<span>{notice.text}</span></div>}
          {notice?.action === 'reset' && <button type="button" className="auth-text-action" onClick={() => changeMode('reset')}>Reset this password</button>}
          {notice?.action === 'resend' && <button type="button" className="auth-text-action" disabled={busy} onClick={resendConfirmation}>Resend confirmation email</button>}
          <button className="button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : mode === 'new-password' ? 'Save new password' : 'Sign in'}<ArrowRight size={17}/></button>
        </form>
        {(mode === 'reset' || mode === 'new-password') && <button className="auth-text-action" onClick={() => changeMode('signin')}>Back to sign in</button>}
        <div className="auth-footnote"><LockKeyhole size={14}/> Secured by Supabase Auth. New accounts require email confirmation.</div>
        <button className="auth-preview" onClick={onPreview}>Explore the preview workspace <ArrowRight size={15}/></button>
      </div>
    </div>
  </div>;
}
