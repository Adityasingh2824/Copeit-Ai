// Only treat explicit workspace lookups as local data requests. Product-law
// questions must continue through reviewed evidence, even if they mention products.
export function isWorkspaceLookup(question) {
  return /^(what products are in (?:this|my|our) workspace\??|what (?:are )?(?:my|our|the) (?:open )?(?:tasks|actions)\??|what needs attention next\??)$/i.test(question.trim());
}

export function needsProductSelection(question, productId) {
  return !productId && /\b(my|our|this)\s+(product|device|power bank|charger|equipment|adapter|sensor|monitor)\b/i.test(question)
    && /\b(requirements?|certificates?|documents?|compliance|applicable|exports?|exporting|sell|selling|market|regulations?|regulatory|ce marking|test reports?)\b/i.test(question);
}

export function buildRetrievalQuery(question, productContext) {
  if (!productContext) return question;
  const { product, facts } = productContext;
  const fields = [
    ['Category', facts?.productCategory || product.category],
    ['Intended use', facts?.intendedUse || product.intended_use],
    ['Destination', facts?.targetMarkets],
    ['Intended user', facts?.intendedUser],
    ['Power supply', facts?.powerSource],
    ['Voltage', facts?.operatingVoltage],
    ['Contains battery', facts?.containsBattery],
    ['Battery chemistry', facts?.batteryChemistry],
    ['Radio', facts?.radio],
    ['Connectivity', facts?.connectivity],
  ];
  const context = fields.flatMap(([label, value]) => {
    if (typeof value !== 'string') return [];
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!clean || /^(unknown|needs review|unscoped electronics)$/i.test(clean)) return [];
    return [`${label}: ${clean}`];
  });
  return context.length ? `${question}\nProduct search context: ${context.join(' | ')}` : question;
}
