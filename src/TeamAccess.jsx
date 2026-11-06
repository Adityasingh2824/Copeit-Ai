import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import WorkspaceDataTools from './WorkspaceDataTools';

export default function TeamAccess({ tenant, workspaces, onBack, onJoined }) {
  const [members, setMembers] = useState([]); const [invitations, setInvitations] = useState([]); const [createdInvite, setCreatedInvite] = useState(null);
  const [email, setEmail] = useState(''); const [role, setRole] = useState('reviewer'); const [joinCode, setJoinCode] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  async function refresh() {
    const [memberResult, inviteResult] = await Promise.all([
      supabase.from('memberships').select('user_id,role,created_at').eq('tenant_id', tenant.id).order('created_at'),
      supabase.from('workspace_invitations').select('id,email,role,expires_at,accepted_at,revoked_at').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
    ]);
    if (memberResult.error || inviteResult.error) setNotice('Could not load team access. Reload to try again.');
    setMembers(memberResult.data || []); setInvitations(inviteResult.data || []);
  }
  useEffect(() => { refresh().catch(() => setNotice('Could not connect. Reload to try again.')); }, [tenant.id]);
  async function revoke(invitationId) {
    setBusy(true); setNotice('');
    try {
      const { error } = await supabase.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });
      if (error) throw error;
      setNotice('Invitation revoked. Its code can no longer be used.');
      await refresh();
    } catch { setNotice('Could not revoke the invitation. Please retry.'); }
    finally { setBusy(false); }
  }
  async function invite(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
    const { data, error } = await supabase.rpc('create_workspace_invitation', { p_tenant_id: tenant.id, p_email: email.trim().toLowerCase(), p_role: role });
    setBusy(false); if (error) return setNotice(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setCreatedInvite({ code: row.invite_code, email: email.trim().toLowerCase(), role, expiresAt: row.expires_at }); setNotice('Invitation created. Share the one-time code privately.'); setEmail(''); await refresh();
    } catch { setNotice('Could not create the invitation. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  async function copyInviteCode() {
    try { await navigator.clipboard.writeText(createdInvite.code); setNotice('Invitation code copied.'); }
    catch { setNotice('Copy is unavailable here. Select the displayed code and copy it manually.'); }
  }
  async function acceptInvitation(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
    const { data, error } = await supabase.rpc('accept_workspace_invitation', { p_invite_code: joinCode.trim() });
    setBusy(false);
    if (error) return setNotice('That invitation is invalid, expired, already used, or was sent to another email address.');
    const { data: joinedTenant, error: tenantError } = await supabase.from('tenants').select('id,name,created_at').eq('id', data).single();
    if (tenantError || !joinedTenant) return setNotice('Invitation accepted. Reload the page to open the workspace.');
    setJoinCode(''); setNotice(`You joined ${joinedTenant.name}.`); onJoined(joinedTenant);
    } catch { setNotice('Could not join the workspace. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <div className="billing-workspace"><header className="billing-workspace-header"><span className="app-eyebrow">WORKSPACE / ACCESS</span><button onClick={onBack}><ArrowLeft size={17}/>Back to workspace</button></header><main className="billing-workspace-main"><span className="app-eyebrow">TEAM ACCESS </span><h1>Keep access<br/><em>intentional.</em></h1><p className="billing-workspace-lede">Owners and administrators create seven-day, single-use invitation codes. Send the code only to the verified email address shown below.</p>{notice && <div className="form-message success" role="status">{notice}</div>}
    {workspaces.length > 1 && <section className="surface-card"><div className="surface-head"><div><span>YOUR WORKSPACES</span><h2>Switch workspace</h2></div></div><label>Active workspace <select value={tenant.id} disabled={busy} onChange={event => { const next = workspaces.find(item => item.id === event.target.value); if (next) onJoined(next); }}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section>}
    <section className="surface-card"><div className="surface-head"><div><span>INVITE A MEMBER</span><h2>Assign a role.</h2></div><Users size={24}/></div><form className="evidence-upload-form" onSubmit={invite}><label>Verified work email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="reviewer@company.com"/></label><label>Role<select value={role} onChange={event => setRole(event.target.value)}><option value="reviewer">Reviewer</option><option value="editor">Editor</option><option value="viewer">Viewer</option><option value="lead">Lead</option><option value="admin">Administrator</option></select></label><button className="button-primary" disabled={busy}>Create invitation</button></form></section>
    {createdInvite && <section className="invitation-code-card" aria-live="polite"><span>ONE-TIME INVITATION CODE</span><h2>Send this privately to {createdInvite.email}</h2><code>{createdInvite.code}</code><button className="button-primary" onClick={copyInviteCode}><Copy size={17}/>Copy invitation code</button><p>They sign in with this email, choose <strong>Join an existing workspace</strong>, paste this code, and then open Evidence to review the source. The code expires {new Date(createdInvite.expiresAt).toLocaleString()}.</p></section>}
    <section className="surface-card join-workspace-card"><div className="surface-head"><div><span>JOIN ANOTHER WORKSPACE</span><h2>Have a one-time code?</h2></div><KeyRound size={24}/></div><p>Use the code sent to your verified email. This is useful when you already belong to a different workspace.</p><form className="evidence-upload-form" onSubmit={acceptInvitation}><label htmlFor="workspace-invitation-code">Invitation code<input id="workspace-invitation-code" required minLength={20} value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Paste your one-time invitation code"/></label><button className="button-light" disabled={busy}><KeyRound size={17}/>Join workspace</button></form></section>
    <section className="list-surface"><div className="surface-head"><div><span>MEMBERS</span><h2>{members.length} active</h2></div><ShieldCheck size={24}/></div>{members.map(member => <div className="product-list-row" key={member.user_id}><div><h3>{member.role}</h3><small>Member ID: {member.user_id}</small></div><span className="status-pill green">active</span></div>)}</section>
    <section className="list-surface"><div className="surface-head"><div><span>INVITATIONS</span><h2>{invitations.length} issued</h2></div><Copy size={24}/></div>{invitations.map(invite => <div className="product-list-row" key={invite.id}><div><h3>{invite.email}</h3><small>{invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}</small></div><span className="status-pill">{invite.accepted_at ? 'accepted' : invite.revoked_at ? 'revoked' : new Date(invite.expires_at) <= new Date() ? 'expired' : 'pending'}</span>{!invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at) > new Date() && <button className="button-light" disabled={busy} onClick={() => revoke(invite.id)}>Revoke invitation</button>}</div>)}</section>
    <WorkspaceDataTools key={tenant.id} tenant={tenant}/>
  </main></div>;
}
