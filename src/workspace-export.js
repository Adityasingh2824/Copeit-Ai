const tables = [
  ['products', 'id'], ['product_profiles', 'product_id'], ['work_items', 'id'],
  ['sources', 'id'], ['document_versions', 'id'], ['source_reviews', 'id'],
  ['source_review_events', 'id'], ['memberships', 'user_id'],
];

export async function exportWorkspace(db, tenant, pageSize = 500) {
  const result = { format: 'copeit-workspace-export-v1', exportedAt: new Date().toISOString(),
    workspace: { id: tenant.id, name: tenant.name },
    scope: 'Records visible to the signed-in account. Source files and browser chat history are not included.', records: {} };
  for (const [table, key] of tables) {
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db.from(table).select('*').eq('tenant_id', tenant.id).order(key).range(offset, offset + pageSize - 1);
      if (error) throw new Error(`Could not export ${table}. Please retry or contact support.`);
      if (!Array.isArray(data)) throw new Error('The export response was incomplete. Please retry.');
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    result.records[table] = rows;
  }
  return result;
}
