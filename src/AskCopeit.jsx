import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bot, CheckCircle2, CornerDownLeft, FileText, Layers3, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const prompts = [
  { label: 'What products are in this workspace?', icon: Layers3 },
  { label: 'What needs attention next?', icon: CheckCircle2 },
  { label: 'What evidence should we collect?', icon: FileText },
];

function answer(question, products, tasks) {
  const q = question.toLowerCase();
  const refs = [];
  if (/requirement|regulat|ce\b|eu\b|india\b|compliance|law|directive|standard|passport|certif|market access|import rule|export rule/.test(q)) {
    return { body: 'I cannot give a product-specific market requirement or certification conclusion yet. India-to-EU and EU-to-India are the proposed v1 pilot directions, but the applicable source catalogs and qualified reviewers are still being scoped. Add the product context, then have a qualified reviewer approve the relevant sources and versions.', refs };
  }
  if (/product|model|catalog|profile/.test(q)) {
    if (!products.length) return { body: 'There are no product profiles yet. Add a product first so I can answer using its recorded details.', refs };
    const selected = products.slice(0, 5);
    selected.forEach(item => refs.push({ type: 'product', id: item.id, label: item.name }));
    return { body: `I found ${products.length} product ${products.length === 1 ? 'profile' : 'profiles'} in this workspace:\n${selected.map(item => `• ${item.name} — model ${item.model || 'not recorded'}; ${item.category || 'category not scoped'}`).join('\n')}${products.length > 5 ? `\n…and ${products.length - 5} more.` : ''}\n\nThese are workspace records, not a compliance assessment.`, refs };
  }
  if (/task|action|attention|next|due|progress|block/.test(q)) {
    const open = tasks.filter(item => item.status !== 'done');
    if (!open.length) return { body: 'No open actions are recorded right now. Create a task to make the next step visible to your team.', refs };
    const selected = open.slice(0, 5);
    selected.forEach(item => refs.push({ type: 'task', id: item.id, label: item.title }));
    return { body: `There ${open.length === 1 ? 'is' : 'are'} ${open.length} open ${open.length === 1 ? 'action' : 'actions'}. Here ${selected.length === 1 ? 'is the next one' : 'are the first ones'}:\n${selected.map(item => `• ${item.title}${item.due_date ? ` — due ${item.due_date}` : ''}`).join('\n')}`, refs };
  }
  if (/evidence|document|file|report|test|supplier|certificate/.test(q)) {
    return { body: 'No approved evidence library or uploaded source documents are connected yet. A useful next step is to record the exact product model, supplier, document owner, version, date, and what the file is meant to support. Please have a qualified reviewer confirm the document list for your product category.', refs };
  }
  return { body: 'I can help you find recorded products and open actions, or explain what evidence context is missing. Ask about a product or your next task. For regulatory answers, I need approved sources and a qualified review before I can cite a conclusion.', refs };
}

const demoKey = 'copeit-preview-chat';
const maxSavedMessages = 60;
// AI access is deliberately opt-in. Keeping this exact value check prevents an
// accidental environment typo from switching a staging workspace to live AI.
const geminiEnabled = Boolean(supabase) && import.meta.env.VITE_ASK_COPEIT_MODE === 'gemini';

function storageFor(demo) {
  return demo ? window.localStorage : window.sessionStorage;
}

function conversationKey(demo, tenantId, userId) {
  return demo ? demoKey : `cope-chat:${tenantId}:${userId}`;
}

function readConversation(demo, tenantId, userId) {
  try {
    const value = storageFor(demo).getItem(conversationKey(demo, tenantId, userId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.slice(-maxSavedMessages) : [];
  } catch { return []; }
}

export default function AskCopeit({ demo, tenant, user, products, tasks, onSection, onAddProduct, onAddTask }) {
  const [messages, setMessages] = useState(() => readConversation(demo, tenant?.id, user?.id));
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => { setMessages(readConversation(demo, tenant?.id, user?.id)); }, [demo, tenant?.id, user?.id]);
  useEffect(() => {
    try { storageFor(demo).setItem(conversationKey(demo, tenant?.id, user?.id), JSON.stringify(messages.slice(-maxSavedMessages))); } catch { /* Conversation remains available for this view only. */ }
  }, [messages, demo, tenant?.id, user?.id]);

  function clearConversation() {
    try { storageFor(demo).removeItem(conversationKey(demo, tenant?.id, user?.id)); } catch { /* State reset still works. */ }
    setMessages([]); setError('');
  }

  async function send(text = draft) {
    const question = text.trim();
    if (!question || sending) return;
    setDraft(''); setError(''); setSending(true);
    try {
      let reply = answer(question, products, tasks);
      if (!demo && geminiEnabled) {
        const { data, error: issue } = await supabase.functions.invoke('ask-copeit', { body: { tenantId: tenant.id, question } });
        if (issue || !data?.answer) throw new Error(data?.error || issue?.message || 'The AI guide is unavailable.');
        reply = { body: data.answer, refs: data.refs || [] };
      }
      const created = new Date().toISOString();
      const next = [...messages, { id: crypto.randomUUID(), role: 'user', body: question, created_at: created }, { id: crypto.randomUUID(), role: 'assistant', body: reply.body, source_refs: reply.refs, created_at: created }];
      setMessages(next);
      if (demo) { try { localStorage.setItem(demoKey, JSON.stringify(next.slice(-maxSavedMessages))); } catch { setError('This browser could not save the preview conversation.'); } }
    } catch (issue) {
      setDraft(question);
      setError(issue.message || 'Could not answer this question. Please try again.');
    } finally { setSending(false); }
  }

  return <div className="ask-page">
    <div className="ask-header"><div><span className="app-eyebrow">MEET COPE <span>✳</span></span><h1>Ask Cope<span>.</span></h1><p>Find what your team has recorded. See the next action. Keep every answer in context.</p></div><div className="ask-status"><span className="status-light"/> WORKSPACE RECORDS ONLY</div></div>
    <div className="ask-layout"><section className="ask-chat" aria-label="Ask Cope conversation">
      <div className="ask-chat-top"><span className="ask-agent-icon"><Sparkles size={19}/></span><div><strong>Cope</strong><small>Product context &amp; action lookup</small></div><span className="ask-chat-live">{demo ? 'PREVIEW' : 'PRIVATE CHAT'}</span>{messages.length > 0 && <button className="ask-clear" type="button" onClick={clearConversation}><Trash2 size={14}/>Clear</button>}</div>
      <div className="ask-messages" aria-live="polite">{messages.length === 0 ? <div className="ask-empty"><div className="ask-empty-orb"><img src="/copeit-mark.png" alt=""/></div><span className="ask-mini-label">A GOOD PLACE TO START</span><h2>Clarity begins<br/>with a question.</h2><p>Ask about your recorded products or open tasks. I’ll show the source records behind each answer.</p><div className="ask-suggestions">{prompts.map(({ label, icon: Icon }) => <button key={label} onClick={() => send(label)}><Icon size={16}/>{label}<ArrowUpRight size={15}/></button>)}</div></div> : messages.map(message => <div key={message.id} className={`ask-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`}><div className="ask-message-avatar">{message.role === 'user' ? user.email?.[0]?.toUpperCase() : <Sparkles size={16}/>}</div><div className="ask-message-content"><span>{message.role === 'user' ? 'You' : 'Cope'}</span><p>{message.body}</p>{message.role === 'assistant' && !!message.source_refs?.length && <div className="ask-sources"><small>{message.source_refs.some(ref => ref.type === 'source') ? 'APPROVED SOURCE CITATIONS' : 'WORKSPACE RECORDS'}</small>{message.source_refs.map(ref => <button key={ref.id} onClick={() => onSection(ref.type === 'source' ? 'Evidence' : ref.type === 'product' ? 'Products' : 'Tasks')}><FileText size={13}/>{ref.label}{ref.section ? ` · ${ref.section}` : ''}<ArrowUpRight size={13}/></button>)}</div>}</div></div>)}{sending && <div className="ask-thinking" role="status"><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/>Cope is loading…</div>}<div ref={endRef}/></div>
      {error && <div className="ask-error" role="alert">{error}</div>}
      <div className="ask-composer"><form onSubmit={event => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="ask-input">Ask Cope</label><textarea id="ask-input" rows="2" maxLength="1200" placeholder="Ask about a product, open action, or evidence context…" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }}/><button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><ArrowRight size={20}/></button></form><div className="ask-composer-note"><span><ShieldCheck size={13}/> No regulatory conclusions without approved sources</span><span>ENTER TO SEND <CornerDownLeft size={12}/></span></div></div>
    </section><aside className="ask-rail"><div className="ask-rail-card accent"><span>YOUR CONTEXT</span><h2>One clear view.</h2><p>{!demo && geminiEnabled ? 'Approved source citations appear only when this workspace has server-side pilot access.' : 'Answers use the product and task records currently visible in this workspace.'}</p><div className="ask-rail-count"><span><Layers3 size={17}/> Products</span><strong>{products.length.toString().padStart(2, '0')}</strong></div><div className="ask-rail-count"><span><CheckCircle2 size={17}/> Open actions</span><strong>{tasks.filter(item => item.status !== 'done').length.toString().padStart(2, '0')}</strong></div></div><div className="ask-rail-card"><span>KEEP BUILDING</span><button onClick={onAddProduct}><Plus size={16}/> Add a product <ArrowUpRight size={15}/></button><button onClick={onAddTask}><Plus size={16}/> Create a task <ArrowUpRight size={15}/></button></div><div className="ask-rail-note"><Bot size={18}/><p>{!demo && geminiEnabled ? 'Cope answers only from approved, current workspace evidence when server-side pilot access is enabled. It abstains when evidence is insufficient.' : 'Cope searches your workspace records. Source-grounded pilot AI is not connected in this environment yet.'}</p></div></aside></div>
  </div>;
}
