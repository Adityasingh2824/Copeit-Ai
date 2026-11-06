import { CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, FileText, Globe2, Layers3, ShieldAlert, ShieldCheck, UserRoundCheck } from 'lucide-react';
import './product-workflow.css';
import './mvp-polish.css';

const defaultContext = {
  productCategory: '',
  intendedUse: '',
  targetMarkets: '',
  intendedUser: '',
  powerSource: 'unknown',
  operatingVoltage: '',
  connectivity: '',
  containsBattery: 'unknown',
  batteryChemistry: '',
  batteryCapacity: '',
  charging: '',
  radio: 'unknown',
  euImporter: 'unknown' };

const sourceStatus = source => source.document_versions?.[0]?.source_reviews?.[0]?.status || 'pending';

function contextFor(profiles, productId) {
  return { ...defaultContext, ...(profiles[productId]?.context || {}) };
}

function workflowState({ products, activeProductId, profiles, sources, tasks }) {
  const product = products.find(item => item.id === activeProductId) || products[0];
  const context = product ? contextFor(profiles, product.id) : defaultContext;
  const approved = sources.filter(source => sourceStatus(source) === 'approved').length;
  const hasFacts = Boolean((context.intendedUse || product?.intended_use) && context.productCategory && context.targetMarkets && context.intendedUser && context.powerSource !== 'unknown' && context.operatingVoltage && context.containsBattery !== 'unknown' && context.radio !== 'unknown' && context.connectivity && context.euImporter !== 'unknown' && ![context.containsBattery, context.radio, context.euImporter].includes('Needs review'));
  const hasExpertTask = tasks.some(task => /review|lab|consultant|expert/i.test(task.title));
  const checks = [
    { id: 'facts', label: 'Record product facts', detail: 'Use, destination markets, power source and importer context.', complete: hasFacts, section: 'Requirements' },
    { id: 'evidence', label: 'Add trusted evidence', detail: 'Add official sources or permitted evidence to quarantine.', complete: sources.length > 0, section: 'Evidence' },
    { id: 'review', label: 'Approve source evidence', detail: 'An independent reviewer must approve a source before retrieval.', complete: approved > 0, section: 'Evidence' },
    { id: 'expert', label: 'Assign qualified review', detail: 'Create a lab, consultant or internal reviewer action when needed.', complete: hasExpertTask, section: 'Tasks' },
  ];
  return { product, context, approved, checks, readiness: product ? Math.round((checks.filter(check => check.complete).length / checks.length) * 100) : 0 };
}

export function ReadinessDashboard({ products, activeProductId, profiles, sources, tasks, onNavigate, onAddProduct }) {
  const state = workflowState({ products, activeProductId, profiles, sources, tasks });
  if (!state.product) return <section className="workflow-empty"><Layers3 size={30}/><span>PRODUCT PREPARATION</span><h2>Start with the product.</h2><p>Add one product, then collect its facts, evidence and reviewer actions in one workflow.</p><button className="app-action" onClick={onAddProduct}>Add product <ChevronRight size={17}/></button></section>;
  return <section className="workflow-page">
    <header className="workflow-hero"><div><span className="app-eyebrow">PRODUCT PREPARATION </span><h1>{state.product.name}<br/><em>preparation workspace.</em></h1><p>Organise facts, evidence and people before requesting a qualified market review.</p></div><div className="workflow-disclaimer"><ShieldCheck size={20}/><span><strong>Evidence preparation only</strong>Not a compliance, certification or market-entry decision.</span></div></header>
    <PreparationJourney onNavigate={onNavigate}/>
    <div className="readiness-layout">
      <article className="readiness-card"><div className="readiness-card-top"><span>PREPARATION READINESS</span><strong>{state.readiness}%</strong></div><div className="readiness-meter"><i style={{ width: `${state.readiness}%` }}/></div><p>{state.checks.filter(check => check.complete).length} of {state.checks.length} preparation milestones recorded.</p><button onClick={() => onNavigate('Requirements')}>Review product facts <ChevronRight size={15}/></button></article>
      <article className="product-context-card"><span>PRODUCT SNAPSHOT</span><h2>{state.product.model || 'Model pending'}</h2><dl><div><dt>Target markets</dt><dd>{state.context.targetMarkets || 'Not recorded'}</dd></div><div><dt>Power source</dt><dd>{state.context.powerSource === 'unknown' ? 'Not recorded' : state.context.powerSource}</dd></div><div><dt>EU importer</dt><dd>{state.context.euImporter === 'unknown' ? 'Not recorded' : state.context.euImporter}</dd></div></dl></article>
      <article className="evidence-count-card"><FileCheck2 size={21}/><span>EVIDENCE STATUS</span><div><strong>{state.approved}</strong><small>approved source{state.approved === 1 ? '' : 's'}</small></div><div><strong>{sources.length}</strong><small>source record{sources.length === 1 ? '' : 's'}</small></div><button onClick={() => onNavigate('Evidence')}>Open evidence <ChevronRight size={15}/></button></article>
    </div>
    <section className="workflow-panel"><div className="workflow-panel-head"><div><span>YOUR NEXT MOVES</span><h2>Preparation checklist</h2></div><ClipboardCheck size={23}/></div>{state.checks.map(check => <button className={`workflow-check ${check.complete ? 'complete' : ''}`} key={check.id} onClick={() => onNavigate(check.section)}><span>{check.complete ? <CheckCircle2 size={19}/> : <ShieldAlert size={19}/>}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div><ChevronRight size={18}/></button>)}</section>
  </section>;
}

function PreparationJourney({ onNavigate }) {
  const steps = [['01', 'Define the product', 'Model, intended use and destination markets.', 'Requirements'], ['02', 'Collect the evidence', 'Keep sources, versions and approvals together.', 'Evidence'], ['03', 'Move work forward', 'Track gaps and assign the next review action.', 'Tasks']];
  return <section className="preparation-journey" aria-label="Your preparation journey">{steps.map(([number, title, detail, section]) => <button key={number} onClick={() => onNavigate(section)}><span className="journey-number">{number}</span><strong>{title}</strong><small>{detail}</small><span className="journey-open">Open {section === 'Requirements' ? 'product context' : section.toLowerCase()} <ChevronRight size={14}/></span></button>)}</section>;
}

export function RequirementsWorkspace({ products, profiles, activeProductId, onSelectProduct, onSave, saving }) {
  const product = products.find(item => item.id === activeProductId) || products[0];
  const context = product ? contextFor(profiles, product.id) : defaultContext;
  if (!product) return <section className="workflow-empty"><Globe2 size={30}/><span>PRODUCT CONTEXT</span><h2>Add a product first.</h2><p>Copeit needs product facts before it can route you to the right source families.</p></section>;
  const missing = [
    ['Product category', context.productCategory],
    ['Intended use', context.intendedUse || product.intended_use],
    ['Destination', context.targetMarkets],
    ['Intended user', context.intendedUser],
    ['Power source', context.powerSource],
    ['Operating voltage', context.operatingVoltage],
    ['Battery presence', context.containsBattery],
    ['Radio / wireless capability', context.radio],
    ['Network connectivity', context.connectivity],
    ['EU importer status', context.euImporter],
  ].filter(([, value]) => !value || value === 'unknown' || value === 'Needs review').map(([label]) => label);
  const submit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(product.id, { ...context, ...Object.fromEntries(form.entries()) });
  };
  return <section className="workflow-page product-context-page"><header className="workflow-hero compact"><div><span className="app-eyebrow">PRODUCT CONTEXT </span><h1>Build your<br/><em>product profile.</em></h1><p>These facts guide source routing. They are not a regulatory classification or a compliance outcome.</p></div></header>
    <div className="product-selector" role="tablist" aria-label="Products">{products.map(item => <button key={item.id} role="tab" aria-selected={item.id === product.id} className={item.id === product.id ? 'selected' : ''} onClick={() => onSelectProduct(item.id)}>{item.name}<small>{item.model || 'Model pending'}</small></button>)}</div>
    <section className="source-route-note" aria-live="polite"><ShieldAlert size={23}/><div><strong>{missing.length ? 'Product facts still needed' : 'Core product facts recorded'}</strong><p>{missing.length ? `${missing.join(', ')}. Add the information you know below.` : 'These facts help narrow source review; they do not establish product compliance.'}</p></div></section>
    <form key={`category-${product.id}`} className="context-form workflow-panel product-basics" onSubmit={event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); onSave(product.id, { ...context, ...values }); }}>
      <div className="workflow-panel-head"><div><span>PRODUCT BASICS</span><h2>Describe your product</h2><p>A clear description helps your team find the right evidence.</p></div></div>
      <div className="context-grid product-basics-grid">
        <label>Product category<input name="productCategory" defaultValue={context.productCategory} placeholder="e.g. Sensor, power bank, mains adapter" maxLength={120}/><small>Choose the product type your team uses.</small></label>
        <label>Intended use<textarea name="intendedUse" defaultValue={context.intendedUse || product.intended_use || ''} placeholder="What does it do, who uses it, and where?" rows={4} maxLength={500}/><small>Include the purpose and operating environment.</small></label>
      </div>
      <div className="context-form-foot"><p>Keep these details current as your product develops.</p><button type="submit" className="app-action" disabled={saving}>{saving ? 'Saving…' : 'Save product details'} <ChevronRight size={16}/></button></div>
    </form>
    <form key={product.id} className="context-form workflow-panel" onSubmit={submit}><div className="workflow-panel-head"><div><span>FACT COLLECTION</span><h2>{product.name}</h2></div><FileText size={23}/></div><div className="context-grid"><label>Target EU markets<input name="targetMarkets" defaultValue={context.targetMarkets} placeholder="e.g. Germany, France"/></label><label>Intended user<select name="intendedUser" defaultValue={context.intendedUser}><option value="">Choose one</option><option>Consumer</option><option>Professional / industrial</option><option>Both / mixed</option></select></label><label>Power source<select name="powerSource" defaultValue={context.powerSource}><option value="unknown">Not recorded</option><option>Battery powered</option><option>Mains powered</option><option>USB powered</option><option>Mixed / other</option></select></label><label>Operating voltage<input name="operatingVoltage" defaultValue={context.operatingVoltage} placeholder="e.g. 5 V DC"/></label><label>Battery present<select name="containsBattery" defaultValue={context.containsBattery}><option value="unknown">Not recorded</option><option>Yes</option><option>No</option><option>Needs review</option></select></label><label>Internet / network connectivity<input name="connectivity" defaultValue={context.connectivity} placeholder="e.g. none, Wi-Fi, cellular"/></label><label>Battery chemistry<input name="batteryChemistry" defaultValue={context.batteryChemistry} placeholder="e.g. Lithium-ion"/></label><label>Battery capacity<input name="batteryCapacity" defaultValue={context.batteryCapacity} placeholder="e.g. 10,000 mAh / 37 Wh"/></label><label>Charging interface<input name="charging" defaultValue={context.charging} placeholder="e.g. USB-C input/output"/></label><label>Radio / wireless feature<select name="radio" defaultValue={context.radio}><option value="unknown">Not recorded</option><option>None known</option><option>Bluetooth / Wi-Fi / cellular</option><option>Wireless charging only</option><option>Needs review</option></select></label><label>EU importer status<select name="euImporter" defaultValue={context.euImporter}><option value="unknown">Not recorded</option><option>Importer identified</option><option>Importer details pending</option><option>Needs review</option></select></label></div><div className="context-form-foot"><p><ShieldCheck size={16}/> Save facts only when they are verified by your team or supplier. Copeit will identify evidence gaps, not issue a compliance result.</p><button className="app-action" disabled={saving}>{saving ? 'Saving…' : 'Save product context'} <ChevronRight size={16}/></button></div></form>
    <section className="source-route-note"><UserRoundCheck size={23}/><div><strong>What happens next</strong><p>Use these facts to review source routes, collect evidence, and assign a qualified reviewer. A product-specific requirement list appears only after approved sources and review rules are available.</p></div></section></section>;
}

export function DecisionWorkspace({ products, activeProductId, profiles, sources, tasks, onNavigate }) {
  const state = workflowState({ products, activeProductId, profiles, sources, tasks });
  return <section className="workflow-page"><header className="workflow-hero compact"><div><span className="app-eyebrow">DECISION READY </span><h1>Clear gaps.<br/><em>Human decision.</em></h1><p>Copeit prepares an evidence packet. Your qualified reviewer, lab, consultant or business owner decides what happens next.</p></div></header>
    <section className="decision-banner"><ShieldAlert size={28}/><div><strong>{state.product ? 'REVIEW REQUIRED' : 'PRODUCT CONTEXT REQUIRED'}</strong><p>{state.product ? 'Do not treat this product as launch-ready until missing evidence and qualified review are complete.' : 'Add a product and record facts before a review route can be prepared.'}</p></div></section>
    <div className="decision-grid"><section className="workflow-panel"><div className="workflow-panel-head"><div><span>DECISION ROUTE</span><h2>Three human steps</h2></div><UserRoundCheck size={23}/></div><ol className="decision-steps"><li><span>1</span><div><strong>Complete evidence</strong><small>Record facts, upload permitted evidence and check what is missing.</small></div></li><li><span>2</span><div><strong>Request qualified review</strong><small>Use a lab, consultant, importer or internal reviewer for decisions outside Copeit.</small></div></li><li><span>3</span><div><strong>Record internal go / no-go</strong><small>Keep your team’s final decision and rationale in its own controlled process.</small></div></li></ol></section><section className="workflow-panel"><div className="workflow-panel-head"><div><span>PACKET STATUS</span><h2>What is recorded</h2></div><FileCheck2 size={23}/></div><div className="packet-stat"><strong>{state.readiness}%</strong><span>preparation readiness</span></div><p className="packet-copy">{state.approved} approved source{state.approved === 1 ? '' : 's'} and {tasks.filter(task => task.status !== 'done').length} open action{tasks.filter(task => task.status !== 'done').length === 1 ? '' : 's'} are recorded for this workspace.</p><div className="decision-actions"><button onClick={() => onNavigate('Evidence')}>Open evidence <ChevronRight size={15}/></button><button onClick={() => onNavigate('Tasks')}>Assign a reviewer task <ChevronRight size={15}/></button></div></section></div></section>;
}
