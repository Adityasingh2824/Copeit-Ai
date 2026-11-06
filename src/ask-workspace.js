export function answerWorkspaceQuestion(question, products, tasks) {
  const q = question.toLowerCase();
  const refs = [];
  if (/requirement|regulat|\b(?:ce|eu|india)\b|compliance|law|directive|standard|passport|certif|market access|import rule|export rule/.test(q)) {
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
