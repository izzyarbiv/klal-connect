// Helpers shared by both data layers.
export const nowISO = () => new Date().toISOString();
export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

// The app reads users as plain objects; password_hash must never be among them.
export function userToPublic(row) {
  if (!row) return null;
  return {
    ...(row.data || {}),
    id: row.id,
    email: row.email,
    role: row.role,
    verified: !!row.verified,
    created_date: row.created_date instanceof Date ? row.created_date.toISOString() : row.created_date,
    updated_date: row.updated_date instanceof Date ? row.updated_date.toISOString() : row.updated_date,
  };
}
