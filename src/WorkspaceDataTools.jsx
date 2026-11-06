import { useState } from 'react';
import { supabase } from './lib/supabase';
import { exportWorkspace } from './workspace-export';

export default function WorkspaceDataTools({ tenant }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function download() {
    setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('Sign in again before exporting your workspace.');
      const exported = await exportWorkspace(supabase, tenant);
      const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `copeit-workspace-${tenant.id}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Export downloaded. It contains the workspace records your account can access, excluding source files and browser chat history.');
    } catch (error) { setNotice(error.message || 'Export failed. Please try again.'); }
    finally { setBusy(false); }
  }
  const deletionRequest = `mailto:adityasingh852005@gmail.com?subject=${encodeURIComponent('Copeit data deletion request')}&body=${encodeURIComponent(`Workspace: ${tenant.name}\nWorkspace ID: ${tenant.id}\n\nPlease describe whether you want your account or workspace data deleted. Send this request from your registered account email. Do not include your password.`)}`;
  return <section className="surface-card"><div className="surface-head"><div><span>YOUR DATA</span><h2>Export and deletion</h2></div></div>
    <p>Download the workspace records visible to your account as JSON. Uploaded source files and this browser's chat history are excluded.</p>
    <button className="button-primary" disabled={busy} onClick={download}>{busy ? 'Preparing export…' : 'Download workspace records'}</button>
    <p>To request account or workspace deletion, contact support from your registered email. We verify your identity and authority before making changes. Opening this email does not delete anything.</p>
    <a className="button-light" href={deletionRequest}>Request data deletion</a>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
