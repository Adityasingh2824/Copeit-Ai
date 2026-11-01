// Only treat explicit workspace lookups as local data requests. Product-law
// questions must continue through reviewed evidence, even if they mention products.
export function isWorkspaceLookup(question) {
  return /^(what products are in (?:this|my|our) workspace\??|what (?:are )?(?:my|our|the) (?:open )?(?:tasks|actions)\??|what needs attention next\??)$/i.test(question.trim());
}

export function needsProductSelection(question, productId) {
  return !productId && /\b(my|our|this)\s+(product|device|power bank|charger|equipment)\b/i.test(question)
    && /\b(requirements?|certificates?|documents?|compliance|applicab|export|sell|market|regulat)/i.test(question);
}
