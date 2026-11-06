import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function WorkspaceOnboarding({ onCreated, onExit, onHome, Logo }) {
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('create');
  const [canProvision, setCanProvision] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    supabase.rpc('can_provision_workspace').then(({ data, error }) => {
      if (!active) return;
      setCanProvision(!error && data === true);
      if (error) setNotice('Could not check workspace access. Reload to try again.');
      else if (data !== true) { setMode('join'); setNotice('Verify your email before creating a workspace, or join by invitation.'); }
    }).catch(() => {
      if (active) setNotice('Could not connect. Reload to try again.');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function createWorkspace(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.rpc('create_workspace', { p_name: name.trim() });
      if (error) throw error;
      onCreated(data);
    } catch (error) {
      setNotice(/email_confirmation_required/.test(error.message) ? 'Confirm your email before creating a workspace.' : /workspace_limit_reached/.test(error.message) ? 'You already own a workspace. Reload to open it.' : 'Could not create your workspace. Please try again or contact support.');
    } finally { setBusy(false); }
  }
  async function acceptInvitation(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    let data, error;
    try { ({ data, error } = await supabase.rpc('accept_workspace_invitation', { p_invite_code: inviteCode.trim() })); }
    catch { setBusy(false); return setNotice('Could not connect. Please try again.'); }
    setBusy(false);
    if (error) return setNotice('That invitation is invalid, expired, or was sent to another email address.');
    const { data: tenant } = await supabase.from('tenants').select('id,name,created_at').eq('id', data).single();
    if (!tenant) return setNotice('Invitation accepted. Reload this page to enter the workspace.');
    onCreated(tenant);
  }

  return <div className="setup-page"><div className="setup-top"><button className="brand-home" onClick={onHome} aria-label="Go to Copeit AI home"><Logo/></button><button onClick={onExit}>Sign out</button></div><div className="setup-card"><div className="section-kicker">YOUR EXPORT WORKSPACE</div><h1>A clear start.<br/><em>A shared way forward.</em></h1><p>Create your team's workspace to organize product facts, evidence and next actions for India → EU electronics preparation.</p>
    <p>Create a private workspace with your verified email, or join by invitation using a code from your team.</p>
    {checking && <p role="status">Checking workspace access…</p>}
    {canProvision && <div className="auth-tabs" role="group" aria-label="Workspace setup"><button disabled={busy} className={mode === 'create' ? 'selected' : ''} onClick={() => { setMode('create'); setNotice(''); }}>Create workspace</button><button disabled={busy} className={mode === 'join' ? 'selected' : ''} onClick={() => { setMode('join'); setNotice(''); }}>Join a team</button></div>}
    {!checking && (mode === 'create' ? <form onSubmit={createWorkspace}><label htmlFor="workspace-name">Workspace name</label><input id="workspace-name" required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Aster Electronics"/><button className="button-primary" disabled={busy || !canProvision}>{busy ? 'Creating…' : 'Create your workspace'}</button></form> : <form onSubmit={acceptInvitation}><label htmlFor="invite-code">Invitation code</label><input id="invite-code" required minLength={20} value={inviteCode} onChange={event => setInviteCode(event.target.value)} placeholder="Code from your workspace owner"/><button className="button-primary secondary" disabled={busy}><KeyRound size={17}/>{busy ? 'Joining…' : 'Join workspace'}</button></form>)}
    {notice && <div className="form-message error" role="alert">{notice}</div>}<div className="setup-note"><ShieldCheck size={17}/>Your workspace is private. Only members you invite can access it.</div></div></div>;
}
