import React, { useRef, useState } from 'react';
import { FileSearch, FileSpreadsheet, FolderOpen, LockKeyhole, Mail, ShieldCheck, X } from 'lucide-react';
import { discoverGoogleEvidence, discoveryConfigured, revokeGoogleAccess } from './google-picker';
import './evidence-discovery.css';

const config = { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, apiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY, projectNumber: import.meta.env.VITE_GOOGLE_PROJECT_NUMBER };

function Candidate({ item }) {
  const sourceLabel = item.source === 'gmail' ? 'Gmail attachment' : 'Google Drive';
  return <article className="google-file discovery-candidate">
    <span className={`ed-file-icon ${item.source === 'gmail' ? 'coral' : 'blue'}`}>{item.source === 'gmail' ? <Mail size={19}/> : <FolderOpen size={19}/>}</span>
    <div className="ed-file-copy"><strong>{item.title}</strong><small>{sourceLabel} · {item.matches.join(', ') || 'possible match'}</small>{item.source === 'gmail' && <small>{item.emailSubject} · {item.emailFrom}</small>}{item.source === 'drive' && item.modifiedTime && <small>Modified {new Date(item.modifiedTime).toLocaleDateString()}</small>}</div>
    <span className="discovery-score">{item.score}% match</span>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">Open</a>}
  </article>;
}

export default function GoogleEvidenceDiscovery({ onNavigate }) {
  const [results, setResults] = useState({ drive: [], gmail: [], warnings: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const token = useRef(null);
  async function discover() {
    setBusy(true); setError('');
    try {
      const found = await discoverGoogleEvidence(config);
      token.current = found.token; setResults({ drive: found.drive, gmail: found.gmail, warnings: found.warnings }); setConnected(true);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  function clear() { revokeGoogleAccess(token.current); token.current = null; setConnected(false); setResults({ drive: [], gmail: [], warnings: [] }); setError(''); }
  const total = results.drive.length + results.gmail.length;
  return <div className="discovery-workspace"><header className="ed-head"><div><span className="ed-eyebrow">EVIDENCE DISCOVERY </span><h1>Let Copeit find<br/><em>what matters.</em></h1><p>Connect once, then Copeit searches likely product evidence across your Google Drive and Gmail attachments.</p></div><div className="ed-demo-stamp"><LockKeyhole size={17}/><span><strong>TEMPORARY READ-ONLY ACCESS</strong><small>Private browser session</small></span></div></header>
    <section className="ed-connections"><div className="ed-section-head"><div><span>GOOGLE WORKSPACE DISCOVERY</span><h2>Search your evidence, automatically.</h2><p>Copeit checks file names, document metadata, email subjects and attachment names for likely preparation evidence. It does not automatically upload, approve, or index anything.</p></div><ShieldCheck size={22}/></div><div className="ed-provider-grid"><article className="ed-provider"><div className="ed-provider-icon ed-d"><FolderOpen size={19}/></div><div><strong>Google Drive</strong><small>Search file names and metadata</small></div></article><article className="ed-provider"><div className="ed-provider-icon ed-s"><FileSpreadsheet size={19}/></div><div><strong>Google Sheets</strong><small>Find likely evidence registers</small></div></article><article className="ed-provider"><div className="ed-provider-icon"><Mail size={19}/></div><div><strong>Gmail</strong><small>Find relevant attachment metadata</small></div></article></div><div className="google-actions"><button type="button" className="app-action" onClick={discover} disabled={busy || !discoveryConfigured(config)}>{busy ? 'Searching Google Workspace…' : 'Connect & find evidence'}</button>{connected && <button type="button" onClick={clear}><X size={15}/> Clear this private session</button>}</div>{!discoveryConfigured(config) && <p className="google-note" role="status">Google connection setup is incomplete. An administrator must configure the Google Cloud project before this can run.</p>}{error && <p className="app-alert" role="alert">{error}</p>}<p className="google-note">Google asks for read-only permission before discovery. For this test version, access tokens and discovery results stay only in this browser. Copeit does not download attachment bodies, store files, or send Drive/Gmail data to Gemini, Supabase, or the RAG.</p></section>
    <section className="ed-panel"><div className="ed-section-head"><div><span>DISCOVERY QUEUE</span><h2>{connected ? `${total} candidates found` : 'Nothing scanned yet.'}</h2><p>{connected ? 'These are possible evidence matches, not verified documents or compliance conclusions.' : 'Connect Google Workspace to search the most recent 100 Drive files and 50 email threads with attachments.'}</p></div><FileSearch size={22}/></div>{results.warnings.length > 0 && <p className="google-note">{results.warnings.join(' ')}</p>}<div className="ed-file-list">{results.drive.map(item => <Candidate item={item} key={`${item.source}-${item.id}`}/>)}{results.gmail.map(item => <Candidate item={item} key={`${item.source}-${item.id}`}/>)}</div>{connected && total === 0 && <p className="google-note">No strong matches were found. Try adding a product model, supplier name, or evidence terms to the product profile before a later product-aware discovery run.</p>}</section><div className="ed-next"><div><span>NEXT STEP</span><strong>Review candidate evidence before it becomes a source.</strong></div><div><button onClick={() => onNavigate('Products')}>Products</button><button onClick={() => onNavigate('Evidence')}>Evidence register</button></div></div></div>;
}
