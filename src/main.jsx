import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, CircleHelp, FileCheck2, FileText, Fingerprint, Globe2, Layers3, Menu, Plus, Search, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import Crosshair from './components/Crosshair';
import GooeyNav from './components/GooeyNav';
import PixelCard from './components/PixelCard';
import Hyperspeed from './components/Hyperspeed';
import { configured, supabase } from './lib/supabase';
import AuthPage from './AuthPage';
import AskCopeit from './AskCopeit';
import './styles.css';
import './hero-hyperspeed.css';
import './home-redesign.css';

const mark = '/copeit-mark.png';
const NAV = [{ label: 'Platform', href: '#platform' }, { label: 'How it works', href: '#workflow' }, { label: 'Pricing', href: '#pricing' }, { label: 'About', href: '#about' }];
const HERO_HEAD_COLORS = ['#24bed0', '#4d88bf', '#5c72b2'];
const HERO_TAIL_COLORS = ['#d36e8d', '#866ab8', '#e19665'];
const DEMO_TENANT = { id: 'preview-workspace', name: 'Preview workspace' };
const DEMO_PRODUCTS = [{ id: 'example-product', name: 'Example electronics product', model: 'DEMO-01', category: 'Unscoped electronics', intended_use: 'Sample product profile for exploring the workspace.' }];
const DEMO_TASKS = [{ id: 'example-task-1', title: 'Confirm the product’s intended use', status: 'open', due_date: null }, { id: 'example-task-2', title: 'List the supplier evidence to collect', status: 'open', due_date: null }];
function readPreview(key, fallback) {
  try { const value = window.localStorage.getItem(key); const parsed = value ? JSON.parse(value) : fallback; return Array.isArray(parsed) ? parsed : fallback; }
  catch { return fallback; }
}
function savePreview(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

function Logo({ small = false }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-icon"><img src={mark} alt="" /></span><span>copeit<span className="brand-dot">.</span><small>AI</small></span></span>;
}

function App() {
  const route = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('recovery')) return 'auth';
    if (params.has('confirmed')) return 'workspace';
    if (window.location.hash === '#/demo') return 'demo';
    if (window.location.hash === '#/login') return 'auth';
    if (window.location.hash === '#/workspace') return 'workspace';
    return 'landing';
  };
  const [view, setView] = useState(route);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(configured);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }).catch(() => setLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      const params = new URLSearchParams(window.location.search);
      const recovering = params.has('recovery');
      if (event === 'SIGNED_IN' && !recovering) {
        if (params.has('confirmed')) window.history.replaceState({}, '', `${window.location.pathname}#/workspace`);
        if (window.location.hash === '#/login' || params.has('confirmed') || window.location.hash === '' || window.location.hash === '#top') {
          window.location.hash = '#/workspace';
        }
      }
      if (event === 'SIGNED_OUT' && window.location.hash === '#/workspace') window.location.hash = '#/login';
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (session && params.has('confirmed')) {
      window.history.replaceState({}, '', `${window.location.pathname}#/workspace`);
      setView('workspace');
      return;
    }
    if (session && view === 'auth' && !params.has('recovery')) window.location.hash = '#/workspace';
    if (!session && !loading && view === 'workspace') window.location.hash = '#/login';
  }, [session, view, loading]);
  useEffect(() => {
    const onHashChange = () => {
      setView(route());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [session]);
  const navigate = next => {
    if (new URLSearchParams(window.location.search).has('recovery')) window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    window.location.hash = next === 'demo' ? '#/demo' : next === 'auth' ? '#/login' : next === 'workspace' ? '#/workspace' : '#top';
    setView(next);
  };
  if (loading && view === 'workspace') return <div className="boot"><Logo /> <span>Preparing your workspace…</span></div>;
  if (view === 'workspace' && session) return <Workspace session={session} onExit={() => supabase.auth.signOut()} onPreview={() => navigate('demo')} />;
  if (view === 'workspace') return <AuthPage onBack={() => navigate('landing')} onPreview={() => navigate('demo')} Logo={Logo} mark={mark} />;
  if (view === 'demo') return <Workspace demo onExit={() => navigate('landing')} onSignIn={() => navigate(session ? 'workspace' : 'auth')} />;
  if (view === 'auth') return <AuthPage onBack={() => navigate('landing')} onPreview={() => navigate('demo')} Logo={Logo} mark={mark} />;
  return <Landing onStart={() => navigate('auth')} onPreview={() => navigate('demo')} />;
}

function Landing({ onStart, onPreview }) {
  const hero = useRef(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const handler = () => setScroll(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const elements = document.querySelectorAll('.intro-grid, .feature, .showcase-head, .dashboard-demo, .steps-heading, .step, .statement h2, .statement p, .pricing-head, .pixel-card, .footer-main');
    elements.forEach(element => element.classList.add('reveal-item'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <div className="site-shell">
    <header className="site-header"><a href="#top" aria-label="Copeit AI home"><Logo /></a><div className="desktop-nav"><GooeyNav items={NAV} /></div><div className="header-right"><button className="nav-preview" onClick={onPreview}>Preview workspace</button><button className="nav-cta" onClick={onStart}>Sign in <ArrowUpRight size={16} /></button><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav}>{mobileNav ? <X /> : <Menu />}</button></div></header>
    {mobileNav && <nav className="mobile-nav">{NAV.map(item => <a key={item.label} href={item.href} onClick={() => setMobileNav(false)}>{item.label}</a>)}<button onClick={onPreview}>Preview workspace <ArrowRight size={16}/></button><button onClick={onStart}>Sign in <ArrowRight size={16}/></button></nav>}
    <main id="top">
      <section className="hero" ref={hero}>
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> ONE PLACE FOR THE WORK BEHIND EVERY LAUNCH</div>
          <h1>Clarity for<br/><em>what’s next.</em></h1>
          <p>Bring product details, evidence, and next steps together. Copeit gives your team a clearer view of the work required to move into a new market.</p>
          <div className="hero-actions"><button className="button-primary" onClick={onPreview}>Explore the workspace <ArrowUpRight size={19}/></button><a className="text-link" href="#workflow">See how it works <ArrowDown size={16}/></a></div>
          <div className="hero-trust"><span className="hero-trust-icon"><ShieldCheck size={20}/></span><div><strong>Grounded in your records.</strong><br/>Keep people in charge of the final decision.</div></div>
        </div>
        <div className="hero-art" style={{ '--scroll-shift': `${-Math.min(scroll * 0.055, 42)}px` }}>
          <div className="hero-hyperspeed" aria-hidden="true"><Hyperspeed speed={0.62} boost={1.6} lanes={3} roadWidth={8} density={28} trailLength={0.8} lightSize={0.8} glow={0.45} headColors={HERO_HEAD_COLORS} tailColors={HERO_TAIL_COLORS} interactive /></div>
          <div className="hero-hyperspeed-wash" aria-hidden="true" />
          <div className="hero-art-top"><span className="live-indicator"/> YOUR LAUNCH, IN FOCUS <span>01 / 03</span></div>
          <div className="hero-art-inner"><img src={mark} alt="Copeit AI sculptural blue and coral mark" /></div>
          <div className="hero-art-bottom"><span><Layers3 size={16}/> Product context</span><span><FileCheck2 size={16}/> Evidence</span><span><CheckCircle2 size={16}/> Next steps</span></div>
          <Crosshair containerRef={hero} color="#7bd4e3" opacity={0.3} targetEffect="lock" thickness={1} smoothing={0.35} showCoordinates={false} gap={18} fade={0.8} clickPulse hideCursor={false} />
        </div>
      </section>
      <section className="metric-strip"><span>ONE WORKSPACE. EVERY MOVING PART.</span><div><span><strong>01</strong> Product context</span><span><strong>02</strong> Evidence trail</span><span><strong>03</strong> Human review</span></div></section>
      <section className="intro section-pad" id="platform"><div className="section-kicker"><span className="round-star">✳</span> THE PLATFORM</div><div className="intro-grid"><h2>From scattered files<br/>to a <em>shared picture.</em></h2><div className="intro-side"><p>Expansion gets complicated fast. Product versions change. Supplier files expire. Requirements need context. Copeit keeps the whole story in view so your team can focus on the next right action.</p><a href="#workflow" className="under-link">Explore the workflow <ArrowUpRight size={18}/></a></div></div><div className="feature-grid"><Feature number="01" icon={<Layers3/>} title="One connected view" text="See products, market cases, suppliers, and evidence in their proper context."/><Feature number="02" icon={<FileCheck2/>} title="Evidence you can trace" text="Keep versions, owners, dates, and review decisions beside every status."/><Feature number="03" icon={<ShieldCheck/>} title="Confidence with context" text="Spot gaps and uncertainty early, then bring the right person into the decision."/></div></section>
      <section className="showcase section-pad" id="workflow"><div className="showcase-head"><div><div className="section-kicker light"><span className="round-star">✳</span> THE WORKSPACE</div><h2>All the details.<br/><em>Finally in sync.</em></h2></div><p>A calm command center for the work behind every launch. Know what is ready for review, what needs attention, and where to go next.</p></div><div className="dashboard-demo"><div className="demo-sidebar"><Logo small/><div className="demo-nav"><span className="selected">◫ &nbsp; Overview</span><span>▤ &nbsp; Products</span><span>◈ &nbsp; Requirements</span><span>▣ &nbsp; Evidence</span><span>◌ &nbsp; Suppliers</span></div><div className="demo-sidebar-bottom">✳ &nbsp; Pilot workspace</div></div><div className="demo-content"><div className="demo-top"><span>Overview <span className="demo-crumb">/ Launch dashboard</span></span><span className="demo-avatar">AS</span></div><div className="demo-welcome"><div><span className="demo-kicker">MONDAY, 26 OCTOBER</span><h3>Good morning, team <span>✳</span></h3><p>Here’s where your EU launch stands today.</p></div><span className="demo-button">+ Add product</span></div><div className="demo-cards"><div className="demo-card"><span>ACTIVE PRODUCT</span><strong>Product profile</strong><p>Connect model details and versions to the right market case.</p><div className="demo-mini blue">INDIA <ArrowRight size={13}/> EUROPEAN UNION</div></div><div className="demo-card"><span>EVIDENCE VIEW</span><strong>Every file has a story</strong><p>Know who supplied it, what it supports, and when it needs another look.</p><div className="demo-bars"><i/><i/><i/></div></div><div className="demo-card attention"><span>NEXT ACTION</span><strong>Make gaps actionable</strong><p>Assign the work, keep decisions visible, and move ahead together.</p><div className="demo-mini orange">Review queue <ArrowUpRight size={13}/></div></div></div><div className="demo-list"><div><span className="mini-symbol">✓</span><span>Traceable product history</span><small>VERSIONED</small></div><div><span className="mini-symbol">↗</span><span>Evidence and owner in one place</span><small>CONNECTED</small></div></div></div></div><div className="showcase-foot"><span>MADE FOR THE REAL WORK OF EXPANSION</span><span>NOT A CERTIFICATE OR LEGAL CONCLUSION</span></div></section>
      <section className="steps section-pad"><div className="section-kicker"><span className="round-star">✳</span> HOW IT WORKS</div><div className="steps-heading"><h2>A better way to<br/><em>move forward.</em></h2><p>From your first product profile to a review-ready evidence story, each step makes the next one easier.</p></div><div className="steps-list"><Step n="01" title="Set your course" text="Create a workspace, add a product and version, and define the market you’re exploring." icon={<Globe2/>}/><Step n="02" title="Bring the evidence together" text="Organize product and supplier records with the context your team needs." icon={<FileText/>}/><Step n="03" title="See what needs attention" text="Turn missing information and review questions into clear, owned next steps." icon={<Search/>}/><Step n="04" title="Review with confidence" text="Keep human decisions and their exact scope connected to the source material." icon={<Fingerprint/>}/></div></section>
      <section className="statement"><div className="statement-orb"><img src={mark} alt=""/></div><span className="section-kicker light">A THOUGHTFUL APPROACH</span><h2>Technology should<br/>make the complex <em>clear.</em></h2><p>Copeit helps your team prepare and trace its work. People remain in charge of the decisions that matter.</p><button className="button-light" onClick={onStart}>Enter the workspace <ArrowUpRight size={18}/></button></section>
      <section className="pricing section-pad" id="pricing"><div className="section-kicker"><span className="round-star">✳</span> PRICING DIRECTION</div><div className="pricing-head"><h2>Start focused.<br/><em>Grow with clarity.</em></h2><p>Early planning packages for a controlled pilot. Scope and pricing will be validated with design partners.</p></div><div className="price-grid"><PixelCard><span className="plan-label">DESIGN PARTNER</span><h3>Pilot</h3><p>A focused start with one product category and one market route.</p><div className="price">₹30,000 <small>/ month</small></div><span className="price-term">Proposed 3-month pilot · planning estimate</span><button onClick={onStart}>Discuss pilot access <ArrowUpRight size={16}/></button><ul><li><Check size={16}/> Guided workspace setup</li><li><Check size={16}/> Product and task foundation</li><li><Check size={16}/> Scoped feedback loop</li></ul></PixelCard><PixelCard className="featured"><span className="plan-label">FOR GROWING TEAMS</span><h3>Growth</h3><p>For teams coordinating more products, evidence, and reviewers.</p><div className="price">Let’s talk</div><span className="price-term">Packaging depends on pilot findings</span><button onClick={onStart}>Start a conversation <ArrowUpRight size={16}/></button><ul><li><Check size={16}/> Broader workflow coverage</li><li><Check size={16}/> Team collaboration</li><li><Check size={16}/> Review and reporting needs</li></ul></PixelCard></div><p className="pricing-note"><CircleHelp size={15}/> Prices and package contents are proposals, not an offer or a live checkout.</p></section>
      <footer id="about"><div className="footer-main"><div><Logo/><h2>Make room for<br/><em>what’s next.</em></h2></div><div className="footer-links"><div><span>EXPLORE</span><a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#pricing">Pricing</a></div><div><span>WORKSPACE</span><button onClick={onStart}>Sign in</button><button onClick={onStart}>Create account</button></div></div></div><div className="footer-bottom"><span>© 2026 Copeit AI</span><span>Built for clarity. Grounded in evidence.</span><a href="#top">Back to top ↑</a></div></footer>
    </main>
  </div>;
}

function Feature({ number, icon, title, text }) { return <article className="feature"><div className="feature-top"><span>{number} / 03</span><span>{icon}</span></div><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={20} className="feature-arrow"/></article>; }
function Step({ n, title, text, icon }) { return <div className="step"><span>{n}</span><div className="step-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={22}/></div>; }

function Workspace({ session, demo = false, onExit, onPreview, onSignIn }) {
  const user = demo ? { id: 'preview-user', email: 'preview@copeit.local' } : session.user;
  const [tenant, setTenant] = useState(demo ? DEMO_TENANT : null);
  const [products, setProducts] = useState(demo ? readPreview('copeit-preview-products', DEMO_PRODUCTS) : []);
  const [tasks, setTasks] = useState(demo ? readPreview('copeit-preview-tasks', DEMO_TASKS) : []);
  const [section, setSection] = useState('Ask Copeit');
  const [busy, setBusy] = useState(!demo);
  const [error, setError] = useState('');
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [form, setForm] = useState('');
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newUse, setNewUse] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newDue, setNewDue] = useState('');
  const [working, setWorking] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  async function refresh(activeTenant = tenant) {
    if (!activeTenant) return;
    if (demo) {
      setProducts(readPreview('copeit-preview-products', DEMO_PRODUCTS));
      setTasks(readPreview('copeit-preview-tasks', DEMO_TASKS));
      return;
    }
    const [p, t] = await Promise.all([
      supabase.from('products').select('id,name,model,category,intended_use,created_at').eq('tenant_id', activeTenant.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('id,title,status,due_date,created_at,product_id').eq('tenant_id', activeTenant.id).order('created_at', { ascending: false })
    ]);
    if (p.error || t.error) setError(p.error?.message || t.error?.message);
    else { setProducts(p.data || []); setTasks(t.data || []); setError(''); }
  }
  useEffect(() => {
    if (demo) return;
    let live = true;
    (async () => {
      const { data, error: e } = await supabase.from('memberships').select('role,tenants(id,name,created_at)').eq('user_id', user.id).limit(1);
      if (!live) return;
      if (e) { setError(e.message); setBackendUnavailable(true); }
      const active = data?.[0]?.tenants || null;
      setTenant(active); setBusy(false);
      if (active) refresh(active);
    })();
    return () => { live = false; };
  }, [user.id, demo]);
  async function createWorkspace(event) {
    event.preventDefault(); setWorking(true); setError('');
    const { data, error: e } = await supabase.from('tenants').insert({ name: newName.trim(), owner_id: user.id }).select('id,name,created_at').single();
    if (e) { setError(e.message); setWorking(false); return; }
    setTenant(data); setNewName(''); setWorking(false);
  }
  async function createProduct(event) {
    event.preventDefault(); setWorking(true); setError('');
    if (demo) {
      const next = [{ id: crypto.randomUUID(), name: newName.trim(), model: newModel.trim(), intended_use: newUse.trim(), category: 'Unscoped electronics', created_at: new Date().toISOString() }, ...products];
      if (!savePreview('copeit-preview-products', next)) setError('Browser storage is unavailable; this preview change may not persist.');
      setProducts(next); setForm(''); setNewName(''); setNewModel(''); setNewUse(''); setWorking(false);
      return;
    }
    const { data, error: e } = await supabase.from('products').insert({ tenant_id: tenant.id, name: newName.trim(), model: newModel.trim(), intended_use: newUse.trim(), category: 'Unscoped electronics' }).select('id').single();
    if (e) setError(e.message);
    else {
      const { error: v } = await supabase.from('product_versions').insert({ tenant_id: tenant.id, product_id: data.id, label: 'v1', created_by: user.id, summary: 'Initial product profile' });
      if (v) setError(`Product saved, but its initial version needs attention: ${v.message}`);
      setForm(''); setNewName(''); setNewModel(''); setNewUse(''); await refresh();
    }
    setWorking(false);
  }
  async function createTask(event) {
    event.preventDefault(); setWorking(true); setError('');
    if (demo) {
      const next = [{ id: crypto.randomUUID(), title: newTask.trim(), due_date: newDue || null, status: 'open', created_at: new Date().toISOString() }, ...tasks];
      if (!savePreview('copeit-preview-tasks', next)) setError('Browser storage is unavailable; this preview change may not persist.');
      setTasks(next); setForm(''); setNewTask(''); setNewDue(''); setWorking(false);
      return;
    }
    const { error: e } = await supabase.from('tasks').insert({ tenant_id: tenant.id, title: newTask.trim(), due_date: newDue || null, created_by: user.id, status: 'open' });
    if (e) setError(e.message); else { setForm(''); setNewTask(''); setNewDue(''); await refresh(); }
    setWorking(false);
  }
  async function toggleTask(task) {
    if (demo) {
      const next = tasks.map(item => item.id === task.id ? { ...item, status: item.status === 'done' ? 'open' : 'done' } : item);
      if (!savePreview('copeit-preview-tasks', next)) setError('Browser storage is unavailable; this preview change may not persist.');
      setTasks(next);
      return;
    }
    const { error: e } = await supabase.from('tasks').update({ status: task.status === 'done' ? 'open' : 'done', completed_at: task.status === 'done' ? null : new Date().toISOString() }).eq('id', task.id);
    if (e) setError(e.message); else refresh();
  }
  const nav = [{ name: 'Ask Copeit', icon: <Sparkles size={18}/> }, { name: 'Overview', icon: <Layers3 size={18}/> }, { name: 'Products', icon: <FileText size={18}/> }, { name: 'Tasks', icon: <CheckCircle2 size={18}/> }, { name: 'Requirements', icon: <Globe2 size={18}/> }, { name: 'Evidence', icon: <FileCheck2 size={18}/> }, { name: 'Settings', icon: <ShieldCheck size={18}/> }];
  if (busy) return <div className="boot"><Logo/><span>Loading workspace…</span></div>;
  if (backendUnavailable) return <div className="setup-page"><div className="setup-top"><Logo/><button onClick={onExit}>Sign out</button></div><div className="setup-card"><div className="section-kicker">WORKSPACE CONNECTION</div><h1>The live workspace<br/><em>isn’t ready yet.</em></h1><p>Your Supabase sign-in is working, but the workspace database could not be loaded. You can still explore the full preview while the schema connection is completed.</p><div className="form-message error" role="alert">{error}</div><button className="button-primary" onClick={onPreview}>Open workspace preview <ArrowRight size={18}/></button></div></div>;
  if (!tenant) return <div className="setup-page"><div className="setup-top"><Logo/><button onClick={onExit}>Sign out</button></div><div className="setup-card"><div className="section-kicker">FIRST THINGS FIRST</div><h1>Let’s make this<br/><em>your space.</em></h1><p>Start with your company name. You can invite teammates and add products as the pilot takes shape.</p><form onSubmit={createWorkspace}><label htmlFor="company">Company or team name</label><input id="company" required maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Meridian Electronics"/><button className="button-primary" disabled={working}>Create workspace <ArrowRight size={18}/></button></form>{error && <div className="form-message error" role="alert">{error}</div>}<div className="setup-note"><ShieldCheck size={17}/> A workspace is private to its members.</div></div></div>;
  return <div className="app-layout"><aside className={`app-sidebar ${mobileNav ? 'is-open' : ''}`}><Logo small/><div className="workspace-identity"><span className="workspace-avatar">{tenant.name.slice(0,2).toUpperCase()}</span><span><strong>{tenant.name}</strong><small>Workspace</small></span><ChevronDown size={15}/></div><span className="side-caption">WORKSPACE</span><nav aria-label="Workspace">{nav.map(item => <button key={item.name} className={section === item.name ? 'current' : ''} onClick={() => { setSection(item.name); setMobileNav(false); }}>{item.icon}{item.name}{section === item.name && <span className="nav-current-dot"/>}</button>)}</nav><div className="sidebar-lower"><div className="pilot-tag"><Sparkles size={17}/><span><strong>Pilot foundation</strong><small>One route, one clear start.</small></span></div><button onClick={onExit} className="signout">{demo ? 'Leave preview' : 'Sign out'} <ArrowUpRight size={15}/></button></div></aside><div className="app-main"><header className="app-topbar"><div><button className="app-mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20}/></button><span>Workspace</span><span className="slash">/</span><strong>{section}</strong></div><div><span className="top-route">INDIA <ArrowRight size={13}/> EU EXPLORATION</span><span className="user-avatar">{user.email?.[0]?.toUpperCase()}</span></div></header><main className="app-content">{demo && <div className="preview-banner" role="status"><Sparkles size={17}/><span><strong>Workspace preview</strong> Sample products and tasks are saved only in this browser. Nothing here is sent to Supabase.</span><button onClick={onSignIn}>Sign in for live access <ArrowUpRight size={15}/></button></div>}{section === 'Ask Copeit' && <AskCopeit demo={demo} tenant={tenant} user={user} products={products} tasks={tasks} onSection={setSection} onAddProduct={() => setForm('product')} onAddTask={() => setForm('task')} />}{error && <div className="app-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{section === 'Overview' && <><div className="app-page-head"><div><span className="app-eyebrow">YOUR COMMAND CENTER <span>✳</span></span><h1>A clearer view of<br/><em>what’s next.</em></h1><p>Keep product context, open work, and review boundaries together.</p></div><button className="app-action" onClick={() => setForm('product')}><Plus size={18}/> Add product</button></div><div className="overview-stats"><div><span>PRODUCTS IN WORKSPACE</span><strong>{products.length.toString().padStart(2,'0')}</strong><small>Profiles created</small></div><div><span>OPEN ACTIONS</span><strong>{tasks.filter(t => t.status !== 'done').length.toString().padStart(2,'0')}</strong><small>Tasks to move forward</small></div><div><span>REQUIREMENT SCOPE</span><strong>—</strong><small>Awaiting expert-reviewed catalog</small></div></div><div className="overview-grid"><div className="surface-card"><div className="surface-head"><div><span>01 / PRODUCT JOURNEY</span><h2>Your products</h2></div><button onClick={() => setSection('Products')}>View all <ArrowUpRight size={16}/></button></div>{products.length ? products.slice(0,3).map(p => <div className="product-row" key={p.id}><div className="product-symbol"><Layers3 size={20}/></div><div><strong>{p.name}</strong><span>Model {p.model || 'Pending'} · Initial version</span></div><span className="status-pill">Profile created</span></div>) : <Empty icon={<Layers3 size={25}/>} title="Start with a product" text="Create a profile to give the rest of the journey a clear anchor." action="Add your first product" onClick={() => setForm('product')}/>}</div><div className="surface-card muted-card"><div className="surface-head"><div><span>02 / YOUR NEXT MOVES</span><h2>Open actions</h2></div><button onClick={() => setSection('Tasks')}>View all <ArrowUpRight size={16}/></button></div>{tasks.filter(t => t.status !== 'done').length ? tasks.filter(t => t.status !== 'done').slice(0,3).map(t => <div className="task-row" key={t.id}><span className="task-dot"/><div><strong>{t.title}</strong><span>{t.due_date ? `Due ${t.due_date}` : 'No due date'}</span></div><button onClick={() => toggleTask(t)} aria-label={`Complete ${t.title}`}><Check size={16}/></button></div>) : <Empty icon={<CheckCircle2 size={25}/>} title="A fresh start" text="Add an action so everyone knows what happens next." action="Create a task" onClick={() => setForm('task')}/>}</div></div><div className="scope-banner"><div><span>IMPORTANT CONTEXT</span><h3>Readiness is a workflow view.</h3><p>Copeit organizes preparation and human review. It does not certify a product or decide whether it can enter a market.</p></div><ShieldCheck size={32}/></div></>}{section === 'Products' && <><PageHead kicker="PRODUCT LIBRARY" title="Every product starts" italic="with context." text="Keep model details and product versions easy to find." action="Add product" onAction={() => setForm('product')}/><div className="list-surface">{products.length ? products.map(p => <div className="product-list-row" key={p.id}><div className="product-symbol"><Layers3 size={21}/></div><div><h3>{p.name}</h3><p>{p.model || 'Model pending'} · {p.category}</p><small>{p.intended_use || 'Intended use not supplied yet'}</small></div><span className="version-badge">v1 · Draft profile</span></div>) : <Empty icon={<Layers3/>} title="No products yet" text="Add a product profile to begin the workspace journey." action="Add product" onClick={() => setForm('product')}/>}</div></>}{section === 'Tasks' && <><PageHead kicker="ACTION BOARD" title="Turn the gaps" italic="into progress." text="Give each action a clear title and due date." action="New task" onAction={() => setForm('task')}/><div className="list-surface">{tasks.length ? tasks.map(t => <div className="task-list-row" key={t.id}><button className={`task-check ${t.status === 'done' ? 'done' : ''}`} onClick={() => toggleTask(t)} aria-label={`${t.status === 'done' ? 'Reopen' : 'Complete'} ${t.title}`}>{t.status === 'done' && <Check size={16}/>}</button><div><strong>{t.title}</strong><span>{t.status === 'done' ? 'Completed' : t.due_date ? `Due ${t.due_date}` : 'Open · no due date'}</span></div><span className={`status-pill ${t.status === 'done' ? 'green' : ''}`}>{t.status === 'done' ? 'Done' : 'Open'}</span></div>) : <Empty icon={<CheckCircle2/>} title="No tasks yet" text="Add the next action your team needs to take." action="New task" onClick={() => setForm('task')}/>}</div></>}{section === 'Requirements' && <><PageHead kicker="MARKET REQUIREMENTS" title="Source first." italic="Always." text="Requirement mapping begins after a qualified reviewer approves the pilot category and source set."/><div className="guard-card"><Globe2 size={34}/><h2>The catalog is being scoped.</h2><p>We won’t present generic electronics requirements as if they apply to your product. Choose one product category and have a qualified reviewer approve the source version before mappings appear here.</p><span>INDIA → EU EXPLORATION</span></div></>}{section === 'Evidence' && <><PageHead kicker="EVIDENCE LIBRARY" title="A home for" italic="the proof." text="Every document will carry its owner, version, source, and review state."/><div className="guard-card"><UploadCloud size={36}/><h2>Secure upload is coming next.</h2><p>Private storage, file scanning, versioning, and field confirmation must be in place before customer documents are accepted. The workspace currently stores no uploaded files.</p><span>NO FILES UPLOADED</span></div></>}{section === 'Settings' && <><PageHead kicker="WORKSPACE SETTINGS" title="Made for" italic="your team." text="The foundation for your pilot workspace."/><div className="settings-grid"><div className="surface-card"><span>WORKSPACE NAME</span><h3>{tenant.name}</h3><p>{demo ? 'This sample workspace is stored only in this browser.' : 'Created as a private tenant workspace.'}</p></div><div className="surface-card"><span>ACCOUNT</span><h3>{user.email}</h3><p>Email confirmation and recovery are handled by Supabase Auth.</p></div><div className="surface-card"><span>ACCESS</span><h3>{demo ? 'Preview mode' : 'Owner'}</h3><p>Invitation and role management will arrive with the tenant permission matrix.</p></div></div></>}</main></div>{form && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setForm(''); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setForm('')} aria-label="Close"><X size={20}/></button><div className="section-kicker">{form === 'product' ? 'NEW PRODUCT' : 'NEW ACTION'}</div><h2 id="modal-title">{form === 'product' ? 'Add a product' : 'Create a task'}</h2><p>{form === 'product' ? 'Start with a simple profile. Reviewed versions and evidence will build on this foundation.' : 'Make the next step visible to your team.'}</p><form onSubmit={form === 'product' ? createProduct : createTask}>{form === 'product' ? <><label htmlFor="product-name">Product name</label><input id="product-name" required maxLength={120} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Smart power adapter"/><label htmlFor="product-model">Model identifier</label><input id="product-model" required maxLength={80} value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="e.g. SPA-100"/><label htmlFor="product-use">Intended use</label><textarea id="product-use" maxLength={500} value={newUse} onChange={e => setNewUse(e.target.value)} placeholder="How and where is this product intended to be used?"/></> : <><label htmlFor="task-title">Task title</label><input id="task-title" required maxLength={180} value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="e.g. Confirm supplier test report"/><label htmlFor="task-due">Due date <small>(optional)</small></label><input id="task-due" type="date" value={newDue} onChange={e => setNewDue(e.target.value)}/></>}<button className="button-primary" disabled={working}>{working ? 'Saving…' : form === 'product' ? 'Create product' : 'Create task'} <ArrowRight size={17}/></button></form></div></div>}</div>;
}
function Empty({ icon, title, text, action, onClick }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action} <ArrowUpRight size={16}/></button></div>; }
function PageHead({ kicker, title, italic, text, action, onAction }) { return <div className="app-page-head"><div><span className="app-eyebrow">{kicker} <span>✳</span></span><h1>{title}<br/><em>{italic}</em></h1><p>{text}</p></div>{action && <button className="app-action" onClick={onAction}><Plus size={18}/>{action}</button>}</div>; }

createRoot(document.getElementById('root')).render(<App/>);
