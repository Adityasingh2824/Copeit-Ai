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
import EvidenceLibrary from './EvidenceLibrary';
import { DiscoveryHome } from './EvidenceDiscovery';
import GoogleEvidenceDiscovery from './GoogleEvidenceDiscovery';
import WorkspaceOnboarding from './WorkspaceOnboarding';
import TeamAccess from './TeamAccess';
import ProfileMenu from './ProfileMenu';
import TrustPage, { trustPageKeys } from './TrustPages';
import { ErrorBoundary, initObservability } from './observability';
import { DecisionWorkspace, ReadinessDashboard, RequirementsWorkspace } from './ProductWorkflow';
import './styles.css';
import './hero-hyperspeed.css';
import './home-redesign.css';
import './global-launch.css';
import './workflow-motion.css';

const mark = '/copeit-mark.png';
const NAV = [{ label: 'Platform', href: '#platform' }, { label: 'Trade routes', href: '#routes' }, { label: 'How it works', href: '#workflow' }, { label: 'Pricing', href: '#pricing' }];
const HERO_HEAD_COLORS = ['#24bed0', '#4d88bf', '#5c72b2'];
const HERO_TAIL_COLORS = ['#d36e8d', '#866ab8', '#e19665'];
const DEMO_TENANT = { id: 'preview-workspace', name: 'Preview workspace' };
const DEMO_PRODUCTS = [{ id: 'example-product', name: 'Example electronics product', model: 'DEMO-01', category: 'Unscoped electronics', intended_use: 'Sample product profile for exploring the workspace.' }];
const DEMO_TASKS = [{ id: 'example-task-1', title: 'Confirm the product’s intended use', status: 'open', due_date: null }, { id: 'example-task-2', title: 'List the supplier evidence to collect', status: 'open', due_date: null }];
const DEMO_PROFILES = { 'example-product': { context: { targetMarkets: 'Germany, France', intendedUser: 'Consumer', powerSource: 'Battery powered', batteryChemistry: 'Lithium-ion', batteryCapacity: '10,000 mAh / 37 Wh', charging: 'USB-C', radio: 'None known', euImporter: 'Importer details pending' } } };
const PLANS = [
  { name: 'Pilot', label: 'DESIGN PARTNER', monthly: 299, description: 'Prove one focused route and product workflow with your team.', monthlyTerm: 'Proposed 3-month pilot', annualTerm: 'Proposed 12-month pilot program', features: ['Guided onboarding', 'One pilot product category', 'Product profiles and tasks', 'Feedback with the Copeit team'] },
  { name: 'Starter', label: 'SMALL TEAMS', monthly: 499, description: 'A proposed next step for a repeatable preparation process.', monthlyTerm: 'Indicative package · scope to confirm', annualTerm: 'Annual scope to confirm', features: ['Product workspace foundation', 'Structured action tracking', 'Planned source review flow', 'Pilot-defined support scope'] },
  { name: 'Growth', label: 'EXPANDING TEAMS', monthly: 1999, description: 'Designed for more product lines and coordinated reviews.', monthlyTerm: 'Indicative package · scope to confirm', annualTerm: 'Annual scope to confirm', features: ['Expanded product workflows', 'Planned team collaboration', 'Planned evidence review', 'Reporting scope to define'] },
  { name: 'Enterprise', label: 'COMPLEX PROGRAMS', monthly: 4999, startingAt: true, description: 'For multi-team programs that need a tailored rollout.', monthlyTerm: 'Indicative starting point · custom scope', annualTerm: 'Indicative annual starting point · custom scope', features: ['Tailored rollout plan', 'Proposed governance controls', 'Market coverage by review', 'Commercial terms to agree'] }
];
const formatUsd = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
const formatUsdPrecise = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
const annualUsd = plan => plan.monthly * 12 * 0.8;
const annualSavingsUsd = plan => plan.monthly * 12 * 0.2;

function BillingCycleSwitch({ cycle, onChange }) {
  return <div className="billing-cycle-switch" role="group" aria-label="Pricing period">
    <button type="button" className={cycle === 'monthly' ? 'active' : ''} aria-pressed={cycle === 'monthly'} onClick={() => onChange('monthly')}>Monthly</button>
    <button type="button" className={cycle === 'annual' ? 'active' : ''} aria-pressed={cycle === 'annual'} onClick={() => onChange('annual')}>Annual <span>Save 20%</span></button>
  </div>;
}
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
    if (window.location.hash === '#/demo/discovery') return 'discovery';
    if (window.location.hash === '#/demo') return 'demo';
    if (window.location.hash === '#/login') return 'auth';
    if (window.location.hash === '#/workspace') return 'workspace';
    const trustPage = window.location.hash.replace(/^#\//, '');
    if (trustPageKeys.includes(trustPage)) return `trust:${trustPage}`;
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
  useEffect(() => {
    if (view !== 'landing') return;
    const hash = window.location.hash;
    if (!hash || hash.startsWith('#/')) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (target) target.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);
  const navigate = next => {
    if (new URLSearchParams(window.location.search).has('recovery')) window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    window.location.hash = next === 'discovery' ? '#/demo/discovery' : next === 'demo' ? '#/demo' : next === 'auth' ? '#/login' : next === 'workspace' ? '#/workspace' : '#top';
    setView(next);
  };
  if (loading && view === 'workspace') return <div className="boot"><Logo /> <span>Preparing your workspace…</span></div>;
  if (view === 'workspace' && session) return <Workspace session={session} onExit={() => supabase.auth.signOut()} onPreview={() => navigate('demo')} onHome={() => navigate('landing')} />;
  if (view === 'workspace') return <AuthPage onBack={() => navigate('landing')} onPreview={() => navigate('demo')} Logo={Logo} mark={mark} />;
  if (view === 'discovery') return <Workspace demo initialSection="Evidence Discovery" onExit={() => navigate('landing')} onSignIn={() => navigate(session ? 'workspace' : 'auth')} onHome={() => navigate('landing')} />;
  if (view === 'demo') return <Workspace demo onExit={() => navigate('landing')} onSignIn={() => navigate(session ? 'workspace' : 'auth')} onHome={() => navigate('landing')} />;
  if (view === 'auth') return <AuthPage onBack={() => navigate('landing')} onPreview={() => navigate('demo')} Logo={Logo} mark={mark} />;
  if (view.startsWith('trust:')) return <TrustPage pageKey={view.slice('trust:'.length)} onBack={() => navigate('landing')} Logo={Logo}/>;
  return <Landing onDiscovery={() => navigate('discovery')} session={session} onStart={() => navigate('auth')} onPreview={() => navigate('demo')} onWorkspace={() => navigate('workspace')} onSignOut={() => supabase?.auth.signOut()} />;
}

function Landing({ session, onStart, onPreview, onWorkspace, onSignOut, onDiscovery }) {
  const hero = useRef(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
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
    const elements = document.querySelectorAll('.intro-grid, .feature, .routes-heading, .route-card, .routes-next, .showcase-head, .dashboard-demo, .steps-heading, .step, .statement h2, .statement p, .pricing-head, .pixel-card, .billing-panel, .footer-main');
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
    <header className="site-header"><a href="#top" aria-label="Copeit AI home"><Logo /></a><div className="desktop-nav"><GooeyNav items={NAV} /></div><div className="header-right"><button className="nav-preview" onClick={onPreview}>Preview workspace</button><ProfileMenu user={session?.user} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onWorkspace={onWorkspace} onSignIn={onStart} onSignOut={onSignOut}/><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav}>{mobileNav ? <X /> : <Menu />}</button></div></header>
    {mobileNav && <nav className="mobile-nav">{NAV.map(item => <a key={item.label} href={item.href} onClick={() => setMobileNav(false)}>{item.label}</a>)}<button onClick={onPreview}>Preview workspace <ArrowRight size={16}/></button><button onClick={onStart}>Sign in <ArrowRight size={16}/></button></nav>}
    <main id="top">
      <section className="hero" ref={hero}>
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> THE WORKSPACE FOR CROSS-BORDER PRODUCT TEAMS</div>
          <h1>New markets.<br/><em>Clearer moves.</em></h1>
          <p>Built for exporters everywhere. Bring product context, evidence, and next steps into one place as your team prepares for a new market. Our first pilot focuses on trade between India and the European Union.</p>
          <div className="hero-actions"><button className="button-primary" onClick={onPreview}>Explore the workspace <ArrowUpRight size={19}/></button><a className="text-link" href="#workflow">See how it works <ArrowDown size={16}/></a></div>
          <div className="hero-trust"><span className="hero-trust-icon"><Globe2 size={20}/></span><div><strong>Built with a global horizon.</strong><br/>Starting with India ↔ EU pilot routes.</div></div>
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
      <section className="metric-strip"><span>FROM YOUR FIRST ROUTE TO WHAT COMES NEXT</span><div><span><strong>01</strong> Product context</span><span><strong>02</strong> Evidence trail</span><span><strong>03</strong> Human review</span></div></section>
      <section className="intro section-pad" id="platform"><div className="section-kicker"><span className="round-star">✳</span> THE PLATFORM</div><div className="intro-grid"><h2>From scattered files<br/>to a <em>shared picture.</em></h2><div className="intro-side"><p>Expansion gets complicated fast. Product versions change. Supplier files expire. Requirements need context. Copeit brings the moving parts into one workspace, with people responsible for the final decisions.</p><a href="#workflow" className="under-link">Explore the workflow <ArrowUpRight size={18}/></a></div></div><div className="feature-grid"><Feature number="01" icon={<Layers3/>} title="One connected view" text="Start with a product profile, keep versions together, and turn questions into tasks."/><Feature number="02" icon={<FileCheck2/>} title="Evidence you can trace" text="A planned review flow will connect each file to its version, owner, and decision."/><Feature number="03" icon={<ShieldCheck/>} title="Confidence with context" text="Spot gaps early and bring the right person into a decision before a claim is made."/></div></section>
      <DiscoveryHome onExplore={onDiscovery}/>
      <section className="routes section-pad" id="routes"><div className="routes-heading"><div><div className="section-kicker"><span className="round-star">✳</span> A GLOBAL HORIZON</div><h2>Wherever you build.<br/><em>Wherever you go.</em></h2></div><p>Copeit is being designed for exporters around the world. We are starting with two directions between India and the EU, then extending the same source-led workflow to more markets as each route is reviewed.</p></div><div className="route-grid"><article className="route-card"><div className="route-card-top"><span>V1 PILOT DIRECTION</span><Globe2 size={22}/></div><div className="route-pair"><span>India</span><ArrowRight size={27}/><span>European Union</span></div><p>Prepare an India-origin electronics product for an EU market with product context, tasks, and a future reviewed source catalog.</p><span className="route-status"><i/> Pilot scope being validated</span></article><article className="route-card"><div className="route-card-top"><span>V1 PILOT DIRECTION</span><Globe2 size={22}/></div><div className="route-pair"><span>European Union</span><ArrowRight size={27}/><span>India</span></div><p>Bring the same structured preparation workflow to EU-origin products entering India, subject to Indian source and expert review.</p><span className="route-status"><i/> Pilot scope being validated</span></article></div><div className="routes-next"><div><span>THE ROAD AHEAD</span><strong>More origins. More destinations. One clearer way to work.</strong></div><p>Additional corridors will be introduced only after their sources, reviewers, and requirements are ready. As the platform grows, new source-reviewed routes can be added without losing the product context you started with.</p><button onClick={onStart}>Join the pilot <ArrowUpRight size={17}/></button></div></section>
      <section className="showcase section-pad" id="workflow"><div className="showcase-head"><div><div className="section-kicker light"><span className="round-star">✳</span> THE WORKSPACE</div><h2>All the details.<br/><em>Finally in sync.</em></h2></div><p>A calm command center for the work behind every launch. Create a product profile, see open actions, and keep decisions connected to the right version.</p></div><div className="dashboard-demo"><div className="demo-sidebar"><Logo small/><div className="demo-nav"><span className="selected">◫ &nbsp; Overview</span><span>▤ &nbsp; Products</span><span>◈ &nbsp; Requirements</span><span>▣ &nbsp; Evidence</span><span>◌ &nbsp; Suppliers</span></div><div className="demo-sidebar-bottom">✳ &nbsp; Pilot workspace</div></div><div className="demo-content"><div className="demo-top"><span>Overview <span className="demo-crumb">/ Launch dashboard</span></span><span className="demo-avatar">AS</span></div><div className="demo-welcome"><div><span className="demo-kicker">YOUR WORKSPACE</span><h3>A clearer view, together <span>✳</span></h3><p>See the next action for your market preparation.</p></div><span className="demo-button">+ Add product</span></div><div className="demo-cards"><div className="demo-card"><span>PRODUCT PROFILE</span><strong>Start with context</strong><p>Record the model and intended use before mapping a route.</p><div className="demo-mini blue">INDIA <ArrowRight size={13}/> EUROPEAN UNION</div></div><div className="demo-card"><span>SOURCE REVIEW</span><strong>Know what supports a claim</strong><p>Reviewed sources and evidence handling are part of the pilot roadmap.</p><div className="demo-bars"><i/><i/><i/></div></div><div className="demo-card attention"><span>NEXT ACTION</span><strong>Make gaps actionable</strong><p>Track the questions and tasks that need a human answer.</p><div className="demo-mini orange">Open tasks <ArrowUpRight size={13}/></div></div></div><div className="demo-list"><div><span className="mini-symbol">✓</span><span>Product context in one place</span><small>WORKSPACE</small></div><div><span className="mini-symbol">↗</span><span>Human review before a conclusion</span><small>PLANNED</small></div></div></div></div><div className="showcase-foot"><span>AN ILLUSTRATIVE WORKSPACE VIEW</span><span>REGULATORY CONCLUSIONS REQUIRE EXPERT REVIEW</span></div></section>
      <section className="steps section-pad"><div className="section-kicker"><span className="round-star">✳</span> HOW IT WORKS</div><div className="steps-heading"><h2>A better way to<br/><em>move forward.</em></h2><p>From your first product profile to a review-ready evidence story, each step makes the next one easier.</p></div><div className="steps-list"><Step n="01" title="Set your course" text="Create a workspace, add a product and version, and define the market you’re exploring." icon={<Globe2/>}/><Step n="02" title="Bring the evidence together" text="Organize product and supplier records with the context your team needs." icon={<FileText/>}/><Step n="03" title="See what needs attention" text="Turn missing information and review questions into clear, owned next steps." icon={<Search/>}/><Step n="04" title="Review with confidence" text="Keep human decisions and their exact scope connected to the source material." icon={<Fingerprint/>}/></div></section>
      <section className="statement"><div className="statement-orb"><img src={mark} alt=""/></div><span className="section-kicker light">A THOUGHTFUL APPROACH</span><h2>Technology should<br/>make the complex <em>clear.</em></h2><p>From India to the EU, from the EU to India, and eventually across more markets, people stay in charge of the decisions that matter.</p><button className="button-light" onClick={onPreview}>Explore the workspace <ArrowUpRight size={18}/></button></section>
      <section className="pricing section-pad" id="pricing">
        <div className="section-kicker"><span className="round-star">✳</span> PLANS FOR EVERY STAGE</div>
        <div className="pricing-head"><h2>Begin with a pilot.<br/><em>Build from there.</em></h2><p>Four indicative packages from our product plan. Explore monthly and annual estimates while we validate scope with early teams.</p></div>
        <div className="pricing-controls">
          <div className="pricing-status"><span className="pricing-status-dot"/> EARLY ACCESS PRICING PREVIEW <span>USD estimates · no live checkout</span></div>
          <BillingCycleSwitch cycle={billingCycle} onChange={setBillingCycle}/>
        </div>
        <div className="pricing-period-intro"><strong>{billingCycle === 'annual' ? 'Annual plans' : 'Monthly plans'}</strong><span>{billingCycle === 'annual' ? 'Pay for 12 months at 20% less than the monthly total.' : 'Pay month by month at the indicative monthly rate.'}</span></div>
        <div className="price-grid price-grid-four" aria-live="polite">
          {PLANS.map(plan => <PixelCard key={plan.name} className={plan.name === 'Growth' ? 'featured' : ''}>
            <span className="plan-label">{plan.label}</span><h3>{plan.name}</h3><p>{plan.description}</p>
            <div className="price">{plan.startingAt && <span className="price-from">From </span>}{billingCycle === 'annual' ? formatUsdPrecise(annualUsd(plan)) : formatUsd(plan.monthly)} <small>/ {billingCycle === 'annual' ? 'year' : 'month'}</small></div>
            <span className="price-term">{billingCycle === 'annual' ? plan.annualTerm : plan.monthlyTerm}</span>
            {billingCycle === 'annual' && <span className="annual-saving">{formatUsdPrecise(annualSavingsUsd(plan))} saved yearly · {formatUsdPrecise(plan.monthly * 0.8)}/mo equivalent</span>}
            <ul>{plan.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
            <button onClick={onPreview}>Preview workspace <ArrowUpRight size={16}/></button>
          </PixelCard>)}
        </div>
        <div className="billing-panel"><div><span className="section-kicker">HOW BILLING WILL WORK</span><h3>Simple terms, agreed before you pay.</h3><p>Monthly or annual billing, included usage, seats, market coverage, taxes, invoice currency, and cancellation terms will be confirmed in a written order. Dodo Payments is the intended billing provider. Paid checkout and subscriptions are not active yet.</p></div><div className="billing-points"><div><span>01</span><strong>Choose a scope</strong><small>Start with a route and product workflow.</small></div><div><span>02</span><strong>Review terms</strong><small>Confirm limits, currency, taxes, and support.</small></div><div><span>03</span><strong>Activate access</strong><small>Paid access begins after billing is launched.</small></div></div></div>
        <p className="pricing-note"><CircleHelp size={15}/> Prices are indicative USD packages. Annual estimates are exactly 20% below 12 monthly payments. Final commercial terms may differ; no payment is taken here.</p>
      </section>
      <footer id="about"><div className="footer-main"><div><Logo/><h2>Make room for<br/><em>what’s next.</em></h2><p className="footer-description">A global vision for exporters, beginning with India and the European Union.</p></div><div className="footer-links"><div><span>EXPLORE</span><a href="#platform">Platform</a><a href="#routes">Trade routes</a><a href="#workflow">How it works</a><a href="#pricing">Pricing</a></div><div><span>WORKSPACE</span><button onClick={onPreview}>Preview workspace</button><button onClick={onStart}>Create account</button></div><div><span>TRUST</span><a href="#/privacy">Privacy</a><a href="#/terms">Terms</a><a href="#/cookies">Cookies</a><a href="#/acceptable_use">Acceptable use</a><a href="#/ai_limitations">AI limitations</a><a href="#/deletion">Data deletion</a><a href="#/support">Support</a><a href="#/security">Security</a></div></div></div><div className="footer-bottom"><span>© 2026 Copeit AI</span><span>Built for clarity. Grounded in evidence.</span><a href="#top">Back to top ↑</a></div></footer>
    </main>
  </div>;
}

function Feature({ number, icon, title, text }) {
  const stories = {
    '01': { label: 'PRODUCT CONTEXT', icon: '◫', title: 'Power bank', subtitle: 'India → European Union', lines: ['Model · PB-200', 'Battery · Lithium-ion', 'Use · Portable charging'], badge: 'PROFILE CREATED' },
    '02': { label: 'SOURCE REVIEW', icon: '▤', title: 'Official source', subtitle: 'Version & origin recorded', lines: ['01  Added to register', '02  Independent review', '03  Decision recorded'], badge: 'REVIEWED' },
    '03': { label: 'NEXT ACTION', icon: '✳', title: 'Review open questions', subtitle: 'Give your team a clear next step', lines: ['Product details', 'Evidence to check', 'Human review'], badge: 'READY FOR REVIEW' },
  };
  const story = stories[number];
  return <article className={`feature feature-story feature-story-${number}`}><div className="feature-top"><span>{number} / 03</span><span>{icon}</span></div><div className="story-stage" aria-label={`${story.label}: ${story.title}. ${story.lines.join(', ')}.`}><div className="story-grid"/><div className="story-orbit story-orbit-one"/><div className="story-orbit story-orbit-two"/><div className="story-window"><div className="story-window-top"><span><i/><i/><i/></span><b>{story.label}</b><span>•••</span></div><div className="story-window-body"><div className="story-symbol">{story.icon}</div><div className="story-window-title"><strong>{story.title}</strong><small>{story.subtitle}</small></div><div className="story-lines">{story.lines.map((line, i) => <div key={line} style={{'--story-index': i}}><span>{line}</span><i>✓</i></div>)}</div></div><div className="story-window-footer"><span><i/> {story.badge}</span><b>↗</b></div></div><div className="story-float story-float-a">✳</div><div className="story-float story-float-b">✓</div><div className="story-timeline"><span>ILLUSTRATIVE WORKFLOW</span><div><i/></div><span>0{number.slice(-1)}</span></div></div><div className="story-copy"><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={20} className="feature-arrow"/></article>;
}
function Step({ n, title, text, icon }) { return <div className="step"><span>{n}</span><div className="step-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={22}/></div>; }

function Workspace({ session, demo = false, initialSection = 'Readiness', onExit, onPreview, onSignIn, onHome }) {
  const user = demo ? { id: 'preview-user', email: 'preview@copeit.local' } : session.user;
  const [tenant, setTenant] = useState(demo ? DEMO_TENANT : null);
  const [products, setProducts] = useState(demo ? readPreview('copeit-preview-products', DEMO_PRODUCTS) : []);
  const [tasks, setTasks] = useState(demo ? readPreview('copeit-preview-tasks', DEMO_TASKS) : []);
  const [profiles, setProfiles] = useState(demo ? readPreview('copeit-preview-product-profiles', DEMO_PROFILES) : {});
  const [sources, setSources] = useState([]);
  const [section, setSection] = useState(initialSection);
  const [activeProductId, setActiveProductId] = useState(null);
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
  const [billingCycle, setBillingCycle] = useState('monthly');
  useEffect(() => {
    if (section === 'Overview') setSection('Readiness');
  }, [section]);
  async function refresh(activeTenant = tenant) {
    if (!activeTenant) return;
    if (demo) {
      setProducts(readPreview('copeit-preview-products', DEMO_PRODUCTS));
      setTasks(readPreview('copeit-preview-tasks', DEMO_TASKS));
      setProfiles(readPreview('copeit-preview-product-profiles', DEMO_PROFILES));
      return;
    }
    const [p, t, s, profileResult] = await Promise.all([
      supabase.from('products').select('id,name,model,category,intended_use,created_at').eq('tenant_id', activeTenant.id).order('created_at', { ascending: false }),
      supabase.from('work_items').select('id,title,status,due_date,created_at,product_id,completed_at').eq('tenant_id', activeTenant.id).order('created_at', { ascending: false }),
      supabase.from('sources').select('id,title,source_type,created_by,created_at,publisher_name,canonical_url,source_published_at,retrieval_eligible,document_versions(id,version_label,extraction_status,source_reviews(status,rationale,reviewed_at))').eq('tenant_id', activeTenant.id).order('created_at', { ascending: false }),
      supabase.from('product_profiles').select('product_id,context,updated_at').eq('tenant_id', activeTenant.id)
    ]);
    if (p.error || t.error || s.error || profileResult.error) setError(p.error?.message || t.error?.message || s.error?.message || profileResult.error?.message);
    else {
      setProducts(p.data || []); setTasks(t.data || []); setSources(s.data || []);
      if (!profileResult.error) setProfiles(Object.fromEntries((profileResult.data || []).map(profile => [profile.product_id, profile])));
      setError('');
    }
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
    const { data, error: e } = await supabase.rpc('create_workspace', { p_name: newName.trim() });
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
    const { data, error: e } = await supabase.from('products').insert({ tenant_id: tenant.id, created_by: user.id, name: newName.trim(), model: newModel.trim(), intended_use: newUse.trim(), category: 'Unscoped electronics' }).select('id').single();
    if (e) setError(e.message);
    else {
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
    const { error: e } = await supabase.from('work_items').insert({ tenant_id: tenant.id, title: newTask.trim(), due_date: newDue || null, created_by: user.id, status: 'open' });
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
    const { error: e } = await supabase.from('work_items').update({ status: task.status === 'done' ? 'open' : 'done', completed_at: task.status === 'done' ? null : new Date().toISOString() }).eq('id', task.id);
    if (e) setError(e.message); else refresh();
  }
  async function saveProductContext(productId, context) {
    setWorking(true); setError('');
    if (demo) {
      const next = { ...profiles, [productId]: { context } };
      if (!savePreview('copeit-preview-product-profiles', next)) setError('Browser storage is unavailable; this preview change may not persist.');
      setProfiles(next); setWorking(false); return;
    }
    const { data, error: e } = await supabase.from('product_profiles').upsert({ product_id: productId, tenant_id: tenant.id, context, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'product_id' }).select('product_id,context,updated_at').single();
    if (e) setError(e.message); else setProfiles(previous => ({ ...previous, [productId]: data }));
    setWorking(false);
  }
  const nav = [{ name: 'Readiness', icon: <Layers3 size={18}/> }, { name: 'Products', icon: <FileText size={18}/> }, { name: 'Requirements', icon: <Globe2 size={18}/> }, { name: 'Evidence', icon: <FileCheck2 size={18}/> }, { name: 'Evidence Discovery', icon: <Search size={18}/> }, { name: 'Decision', icon: <ShieldCheck size={18}/> }, { name: 'Ask Cope', icon: <Sparkles size={18}/> }, { name: 'Tasks', icon: <CheckCircle2 size={18}/> }, { name: 'Billing', icon: <CircleHelp size={18}/> }, { name: 'Settings', icon: <ShieldCheck size={18}/> }];
  if (section === 'Billing' && tenant && !busy && !backendUnavailable) return <div className="billing-workspace">
    <header className="billing-workspace-header"><button className="brand-home" onClick={onHome} aria-label="Go to Copeit AI home"><Logo small/></button><button onClick={() => setSection('Readiness')}><ArrowRight size={17}/> Back to workspace</button></header>
    <main className="billing-workspace-main">
      <span className="app-eyebrow">WORKSPACE / BILLING <span>✳</span></span>
      <h1>Plans with<br/><em>clear expectations.</em></h1>
      <p className="billing-workspace-lede">Copeit is in early access. The four packages below are indicative and are being validated with pilot teams. Your workspace has no active paid subscription through Copeit.</p>
      <div className="billing-workspace-state"><div><span>CURRENT BILLING STATUS</span><strong>No active subscription</strong><small>No payments or invoices are processed in this workspace.</small></div><ShieldCheck size={28}/></div>
      <div className="billing-workspace-cycle"><div><strong>{billingCycle === 'annual' ? 'Annual estimates' : 'Monthly estimates'}</strong><span>{billingCycle === 'annual' ? '20% off the monthly total for 12 months.' : 'Indicative month-to-month pricing in US dollars.'}</span></div><BillingCycleSwitch cycle={billingCycle} onChange={setBillingCycle}/></div>
      <div className="billing-workspace-plans" aria-live="polite">
        {PLANS.map(plan => <div key={plan.name}><span>{plan.name}</span><strong>{plan.startingAt ? 'From ' : ''}{billingCycle === 'annual' ? formatUsdPrecise(annualUsd(plan)) : formatUsd(plan.monthly)} / {billingCycle === 'annual' ? 'year' : 'month'}</strong><small>{billingCycle === 'annual' ? plan.annualTerm : plan.monthlyTerm}</small>{billingCycle === 'annual' && <small className="billing-workspace-saving">Save {formatUsdPrecise(annualSavingsUsd(plan))} per year</small>}</div>)}
      </div>
      <div className="billing-workspace-bottom"><p>These are indicative USD package prices. Annual pricing is exactly 20% below 12 monthly payments. Final prices, taxes, usage, cancellation terms, and support will be set in a written order. Dodo Payments is the intended billing provider when paid access launches.</p><a href="/#pricing">See plan details <ArrowUpRight size={17}/></a></div>
    </main>
  </div>;
  if (busy) return <div className="boot"><Logo/><span>Loading workspace…</span></div>;
  if (backendUnavailable) return <div className="setup-page"><div className="setup-top"><button className="brand-home" onClick={onHome} aria-label="Go to Copeit AI home"><Logo/></button><button onClick={onExit}>Sign out</button></div><div className="setup-card"><div className="section-kicker">WORKSPACE CONNECTION</div><h1>The live workspace<br/><em>isn’t ready yet.</em></h1><p>Your Supabase sign-in is working, but the workspace database could not be loaded. You can still explore the full preview while the schema connection is completed.</p><div className="form-message error" role="alert">{error}</div><button className="button-primary" onClick={onPreview}>Open workspace preview <ArrowRight size={18}/></button></div></div>;
  if (!tenant) return <WorkspaceOnboarding Logo={Logo} onHome={onHome} onExit={onExit} onCreated={created => { setTenant(created); setBusy(false); refresh(created); }}/>;
  if (section === 'Evidence') return <EvidenceLibrary demo={demo} tenant={tenant} user={user} sources={sources} onBack={() => setSection('Readiness')} onRefresh={refresh} onManageTeam={() => setSection('Settings')}/>;
  if (section === 'Settings') return <TeamAccess tenant={tenant} onBack={() => setSection('Readiness')} onJoined={joinedTenant => { setTenant(joinedTenant); setSection('Readiness'); refresh(joinedTenant); }}/>;
  const navigateWorkflow = next => { setSection(next); setMobileNav(false); };
  const workflowLayoutProps = { error, section, nav, tenant, user, demo, mobileNav, onToggleNav: () => setMobileNav(value => !value), onNavigate: navigateWorkflow, onHome, onExit, onSignIn };
  if (section === 'Evidence Discovery') return <WorkflowLayout {...workflowLayoutProps}><GoogleEvidenceDiscovery onNavigate={navigateWorkflow}/></WorkflowLayout>;
  if (section === 'Readiness') return <WorkflowLayout {...workflowLayoutProps}><ReadinessDashboard products={products} profiles={profiles} sources={sources} tasks={tasks} onNavigate={navigateWorkflow} onAddProduct={() => navigateWorkflow('Products')}/></WorkflowLayout>;
  if (section === 'Requirements') return <WorkflowLayout {...workflowLayoutProps}><RequirementsWorkspace products={products} profiles={profiles} activeProductId={activeProductId} onSelectProduct={setActiveProductId} onSave={saveProductContext} saving={working}/></WorkflowLayout>;
  if (section === 'Decision') return <WorkflowLayout {...workflowLayoutProps}><DecisionWorkspace products={products} profiles={profiles} sources={sources} tasks={tasks} onNavigate={navigateWorkflow}/></WorkflowLayout>;
  return <div className="app-layout"><aside className={`app-sidebar ${mobileNav ? 'is-open' : ''}`}><button className="brand-home" onClick={onHome} aria-label="Go to Copeit AI home"><Logo small/></button><div className="workspace-identity"><span className="workspace-avatar">{tenant.name.slice(0,2).toUpperCase()}</span><span><strong>{tenant.name}</strong><small>Workspace</small></span><ChevronDown size={15}/></div><span className="side-caption">WORKSPACE</span><nav aria-label="Workspace">{nav.map(item => <button key={item.name} className={section === item.name ? 'current' : ''} onClick={() => { setSection(item.name); setMobileNav(false); }}>{item.icon}{item.name}{section === item.name && <span className="nav-current-dot"/>}</button>)}</nav><div className="sidebar-lower"><div className="pilot-tag"><Sparkles size={17}/><span><strong>Pilot foundation</strong><small>One route, one clear start.</small></span></div><button onClick={onExit} className="signout">{demo ? 'Leave preview' : 'Sign out'} <ArrowUpRight size={15}/></button></div></aside><div className="app-main"><header className="app-topbar"><div><button className="app-mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20}/></button><span>Workspace</span><span className="slash">/</span><strong>{section}</strong></div><div className="topbar-actions"><span className="top-route">INDIA <ArrowRight size={13}/> EU EXPLORATION</span><ProfileMenu compact user={demo ? null : user} onHome={onHome} onWorkspace={() => setSection('Overview')} onSignIn={onSignIn} onSignOut={onExit}/></div></header><main className="app-content">{demo && <div className="preview-banner" role="status"><Sparkles size={17}/><span><strong>Workspace preview</strong> Sample products and tasks are saved only in this browser. Nothing here is sent to Supabase.</span><button onClick={onSignIn}>Sign in for live access <ArrowUpRight size={15}/></button></div>}{section === 'Ask Cope' && <AskCopeit demo={demo} tenant={tenant} user={user} products={products} tasks={tasks} onSection={setSection} onAddProduct={() => setForm('product')} onAddTask={() => setForm('task')} />}{error && <div className="app-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{section === 'Overview' && <><div className="app-page-head"><div><span className="app-eyebrow">YOUR COMMAND CENTER <span>✳</span></span><h1>A clearer view of<br/><em>what’s next.</em></h1><p>Keep product context, open work, and review boundaries together.</p></div><button className="app-action" onClick={() => setForm('product')}><Plus size={18}/> Add product</button></div><div className="overview-stats"><div><span>PRODUCTS IN WORKSPACE</span><strong>{products.length.toString().padStart(2,'0')}</strong><small>Profiles created</small></div><div><span>OPEN ACTIONS</span><strong>{tasks.filter(t => t.status !== 'done').length.toString().padStart(2,'0')}</strong><small>Tasks to move forward</small></div><div><span>REQUIREMENT SCOPE</span><strong>—</strong><small>Awaiting expert-reviewed catalog</small></div></div><div className="overview-grid"><div className="surface-card"><div className="surface-head"><div><span>01 / PRODUCT JOURNEY</span><h2>Your products</h2></div><button onClick={() => setSection('Products')}>View all <ArrowUpRight size={16}/></button></div>{products.length ? products.slice(0,3).map(p => <div className="product-row" key={p.id}><div className="product-symbol"><Layers3 size={20}/></div><div><strong>{p.name}</strong><span>Model {p.model || 'Pending'} · Initial version</span></div><span className="status-pill">Profile created</span></div>) : <Empty icon={<Layers3 size={25}/>} title="Start with a product" text="Create a profile to give the rest of the journey a clear anchor." action="Add your first product" onClick={() => setForm('product')}/>}</div><div className="surface-card muted-card"><div className="surface-head"><div><span>02 / YOUR NEXT MOVES</span><h2>Open actions</h2></div><button onClick={() => setSection('Tasks')}>View all <ArrowUpRight size={16}/></button></div>{tasks.filter(t => t.status !== 'done').length ? tasks.filter(t => t.status !== 'done').slice(0,3).map(t => <div className="task-row" key={t.id}><span className="task-dot"/><div><strong>{t.title}</strong><span>{t.due_date ? `Due ${t.due_date}` : 'No due date'}</span></div><button onClick={() => toggleTask(t)} aria-label={`Complete ${t.title}`}><Check size={16}/></button></div>) : <Empty icon={<CheckCircle2 size={25}/>} title="A fresh start" text="Add an action so everyone knows what happens next." action="Create a task" onClick={() => setForm('task')}/>}</div></div><div className="scope-banner"><div><span>IMPORTANT CONTEXT</span><h3>Readiness is a workflow view.</h3><p>Copeit organizes preparation and human review. It does not certify a product or decide whether it can enter a market.</p></div><ShieldCheck size={32}/></div></>}{section === 'Products' && <><PageHead kicker="PRODUCT LIBRARY" title="Every product starts" italic="with context." text="Keep model details and product versions easy to find." action="Add product" onAction={() => setForm('product')}/><div className="list-surface">{products.length ? products.map(p => <div className="product-list-row" key={p.id}><div className="product-symbol"><Layers3 size={21}/></div><div><h3>{p.name}</h3><p>{p.model || 'Model pending'} · {p.category}</p><small>{p.intended_use || 'Intended use not supplied yet'}</small></div><span className="version-badge">v1 · Draft profile</span></div>) : <Empty icon={<Layers3/>} title="No products yet" text="Add a product profile to begin the workspace journey." action="Add product" onClick={() => setForm('product')}/>}</div></>}{section === 'Tasks' && <><PageHead kicker="ACTION BOARD" title="Turn the gaps" italic="into progress." text="Give each action a clear title and due date." action="New task" onAction={() => setForm('task')}/><div className="list-surface">{tasks.length ? tasks.map(t => <div className="task-list-row" key={t.id}><button className={`task-check ${t.status === 'done' ? 'done' : ''}`} onClick={() => toggleTask(t)} aria-label={`${t.status === 'done' ? 'Reopen' : 'Complete'} ${t.title}`}>{t.status === 'done' && <Check size={16}/>}</button><div><strong>{t.title}</strong><span>{t.status === 'done' ? 'Completed' : t.due_date ? `Due ${t.due_date}` : 'Open · no due date'}</span></div><span className={`status-pill ${t.status === 'done' ? 'green' : ''}`}>{t.status === 'done' ? 'Done' : 'Open'}</span></div>) : <Empty icon={<CheckCircle2/>} title="No tasks yet" text="Add the next action your team needs to take." action="New task" onClick={() => setForm('task')}/>}</div></>}{section === 'Requirements' && <><PageHead kicker="MARKET REQUIREMENTS" title="Source first." italic="Always." text="Requirement mapping begins after a qualified reviewer approves the pilot category and source set."/><div className="guard-card"><Globe2 size={34}/><h2>The catalog is being scoped.</h2><p>We won’t present generic electronics requirements as if they apply to your product. Choose one product category and have a qualified reviewer approve the source version before mappings appear here.</p><span>INDIA → EU EXPLORATION</span></div></>}</main></div>{form && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setForm(''); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setForm('')} aria-label="Close"><X size={20}/></button><div className="section-kicker">{form === 'product' ? 'NEW PRODUCT' : 'NEW ACTION'}</div><h2 id="modal-title">{form === 'product' ? 'Add a product' : 'Create a task'}</h2><p>{form === 'product' ? 'Start with a simple profile. Reviewed versions and evidence will build on this foundation.' : 'Make the next step visible to your team.'}</p><form onSubmit={form === 'product' ? createProduct : createTask}>{form === 'product' ? <><label htmlFor="product-name">Product name</label><input id="product-name" required maxLength={120} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Smart power adapter"/><label htmlFor="product-model">Model identifier</label><input id="product-model" required maxLength={80} value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="e.g. SPA-100"/><label htmlFor="product-use">Intended use</label><textarea id="product-use" maxLength={500} value={newUse} onChange={e => setNewUse(e.target.value)} placeholder="How and where is this product intended to be used?"/></> : <><label htmlFor="task-title">Task title</label><input id="task-title" required maxLength={180} value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="e.g. Confirm supplier test report"/><label htmlFor="task-due">Due date <small>(optional)</small></label><input id="task-due" type="date" value={newDue} onChange={e => setNewDue(e.target.value)}/></>}<button className="button-primary" disabled={working}>{working ? 'Saving…' : form === 'product' ? 'Create product' : 'Create task'} <ArrowRight size={17}/></button></form></div></div>}</div>;
}
function Empty({ icon, title, text, action, onClick }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action} <ArrowUpRight size={16}/></button></div>; }
function PageHead({ kicker, title, italic, text, action, onAction }) { return <div className="app-page-head"><div><span className="app-eyebrow">{kicker} <span>✳</span></span><h1>{title}<br/><em>{italic}</em></h1><p>{text}</p></div>{action && <button className="app-action" onClick={onAction}><Plus size={18}/>{action}</button>}</div>; }

function WorkflowLayout({ section, nav, tenant, user, demo, mobileNav, onToggleNav, onNavigate, onHome, onExit, onSignIn, error, children }) {
  return <div className="app-layout"><aside className={`app-sidebar ${mobileNav ? 'is-open' : ''}`}><button className="brand-home" onClick={onHome} aria-label="Go to Copeit AI home"><Logo small/></button><div className="workspace-identity"><span className="workspace-avatar">{tenant.name.slice(0, 2).toUpperCase()}</span><span><strong>{tenant.name}</strong><small>Workspace</small></span><ChevronDown size={15}/></div><span className="side-caption">WORKSPACE</span><nav aria-label="Workspace">{nav.map(item => <button key={item.name} className={section === item.name ? 'current' : ''} onClick={() => onNavigate(item.name)}>{item.icon}{item.name}{section === item.name && <span className="nav-current-dot"/>}</button>)}</nav><div className="sidebar-lower"><div className="pilot-tag"><Sparkles size={17}/><span><strong>Pilot foundation</strong><small>Evidence before conclusions.</small></span></div><button onClick={onExit} className="signout">{demo ? 'Leave preview' : 'Sign out'} <ArrowUpRight size={15}/></button></div></aside><div className="app-main"><header className="app-topbar"><div><button className="app-mobile-menu" onClick={onToggleNav} aria-label="Toggle menu"><Menu size={20}/></button><span>Workspace</span><span className="slash">/</span><strong>{section}</strong></div><div className="topbar-actions"><span className="top-route">INDIA <ArrowRight size={13}/> EU EXPLORATION</span><ProfileMenu compact user={demo ? null : user} onHome={onHome} onWorkspace={() => onNavigate('Readiness')} onSignIn={onSignIn} onSignOut={onExit}/></div></header><main className="app-content">{demo && <div className="preview-banner" role="status"><Sparkles size={17}/><span><strong>Workspace preview</strong> Sample records stay in this browser.</span><button onClick={onSignIn}>Sign in for live access <ArrowUpRight size={15}/></button></div>}{error && <div className="app-alert" role="alert">{error}</div>}{children}</main></div></div>;
}

initObservability();
createRoot(document.getElementById('root')).render(<ErrorBoundary fallback={<main className="trust-page"><article className="trust-content"><h1>Something went wrong.</h1><p>Please refresh the page. If the issue continues, do not include sensitive information in a report.</p></article></main>}><App/></ErrorBoundary>);
