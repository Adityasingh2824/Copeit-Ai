import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bot, CheckCircle2, CornerDownLeft, FileText, Layers3, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';

const prompts = [
  { label: 'What products are in this workspace?', icon: Layers3 },
  { label: 'What needs attention next?', icon: CheckCircle2 },
  { label: 'What evidence should we collect?', icon: FileText },
];

function answer(question, products, tasks) {
  const q = question.toLowerCase();
  const refs = [];
  if (/requirement|regulat|ce\b|eu\b|compliance|law|directive|standard|passport|certif/.test(q)) {
    return { body: 'I cannot give a product-specific EU requirement or certification conclusion yet. The pilot category and approved source catalog are still being scoped. Add the product context, then ask a qualified reviewer to approve the applicable sources and their versions.', refs };
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
const geminiEnabled = import.meta.env.VITE_ASK_COPEIT_MODE === 'gemini';

export default function AskCopeit({ demo, tenant, user, products, tasks, onSection, onAddProduct, onAddTask }) {
  const [messages, setMessages] = useState(() => {
    if (!demo) return [];
    try { const saved = JSON.parse(localStorage.getItem(demoKey) || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => {
    if (demo || !tenant?.id) return;
    let active = true;
    supabase.from('chat_messages').select('id,role,body,source_refs,created_at').eq('tenant_id', tenant.id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(100).then(({ data, error: issue }) => {
      if (!active) return;
      if (issue) setError(`Chat history could not load: ${issue.message}`);
      else setMessages(data || []);
    });
    return () => { active = false; };
  }, [demo, tenant?.id, user.id]);

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
      if (demo) {
        try { localStorage.setItem(demoKey, JSON.stringify(next)); } catch { setError('This browser could not save the preview conversation.'); }
      } else {
        const { error: issue } = await supabase.from('chat_messages').insert([
          { tenant_id: tenant.id, user_id: user.id, role: 'user', body: question, source_refs: [] },
          { tenant_id: tenant.id, user_id: user.id, role: 'assistant', body: reply.body, source_refs: reply.refs },
        ]);
        if (issue) setError(`Your answer is visible now but could not be saved: ${issue.message}`);
      }
    } catch (issue) {
      setDraft(question);
      setError(issue.message || 'Could not answer this question. Please try again.');
    } finally { setSending(false); }
  }

  return <div className="ask-page">
    <div className="ask-header"><div><span className="app-eyebrow">YOUR WORKSPACE GUIDE <span>✳</span></span><h1>Ask Copeit<span>.</span></h1><p>Find what your team has recorded. See the next action. Keep every answer in context.</p></div><div className="ask-status"><span className="status-light"/> WORKSPACE RECORDS ONLY</div></div>
    <div className="ask-layout"><section className="ask-chat" aria-label="Ask Copeit conversation">
      <div className="ask-chat-top"><span className="ask-agent-icon"><Sparkles size={19}/></span><div><strong>Copeit workspace guide</strong><small>Product context &amp; action lookup</small></div><span className="ask-chat-live">{demo ? 'PREVIEW' : 'PRIVATE CHAT'}</span></div>
      <div className="ask-messages" aria-live="polite">{messages.length === 0 ? <div className="ask-empty"><div className="ask-empty-orb"><img src="/copeit-mark.png" alt=""/></div><span className="ask-mini-label">A GOOD PLACE TO START</span><h2>Clarity begins<br/>with a question.</h2><p>Ask about your recorded products or open tasks. I’ll show the source records behind each answer.</p><div className="ask-suggestions">{prompts.map(({ label, icon: Icon }) => <button key={label} onClick={() => send(label)}><Icon size={16}/>{label}<ArrowUpRight size={15}/></button>)}</div></div> : messages.map(message => <div key={message.id} className={`ask-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`}><div className="ask-message-avatar">{message.role === 'user' ? user.email?.[0]?.toUpperCase() : <Sparkles size={16}/>}</div><div className="ask-message-content"><span>{message.role === 'user' ? 'You' : 'Copeit guide'}</span><p>{message.body}</p>{message.role === 'assistant' && !!message.source_refs?.length && <div className="ask-sources"><small>WORKSPACE RECORDS</small>{message.source_refs.map(ref => <button key={ref.id} onClick={() => onSection(ref.type === 'product' ? 'Products' : 'Tasks')}><FileText size={13}/>{ref.label}<ArrowUpRight size={13}/></button>)}</div>}</div></div>)}{sending && <div className="ask-thinking" role="status"><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/>{!demo && geminiEnabled ? 'Gemini is reviewing your workspace…' : 'Finding your workspace records…'}</div>}<div ref={endRef}/></div>
      {error && <div className="ask-error" role="alert">{error}</div>}
      <div className="ask-composer"><form onSubmit={event => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="ask-input">Ask Copeit</label><textarea id="ask-input" rows="2" maxLength="1200" placeholder="Ask about a product, open action, or evidence context…" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }}/><button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><ArrowRight size={20}/></button></form><div className="ask-composer-note"><span><ShieldCheck size={13}/> No regulatory conclusions without approved sources</span><span>ENTER TO SEND <CornerDownLeft size={12}/></span></div></div>
    </section><aside className="ask-rail"><div className="ask-rail-card accent"><span>YOUR CONTEXT</span><h2>One clear view.</h2><p>Answers use the product and task records currently visible in this workspace.</p><div className="ask-rail-count"><span><Layers3 size={17}/> Products</span><strong>{products.length.toString().padStart(2, '0')}</strong></div><div className="ask-rail-count"><span><CheckCircle2 size={17}/> Open actions</span><strong>{tasks.filter(item => item.status !== 'done').length.toString().padStart(2, '0')}</strong></div></div><div className="ask-rail-card"><span>KEEP BUILDING</span><button onClick={onAddProduct}><Plus size={16}/> Add a product <ArrowUpRight size={15}/></button><button onClick={onAddTask}><Plus size={16}/> Create a task <ArrowUpRight size={15}/></button></div><div className="ask-rail-note"><Bot size={18}/><p>{!demo && geminiEnabled ? 'Gemini answers from your private workspace records. Regulatory analysis still requires approved sources and human review.' : 'This guide searches your workspace records. Gemini analysis is not connected in this environment yet.'}</p></div></aside></div>
  </div>;
}
