import type { Sql } from 'postgres';
import type { SharedPostcard } from './shared-postcard';

export function postgresShareStore(sql: Sql) {
  return {
    async claim(slug: string, postcard: SharedPostcard) {
      const rows = await sql`
        INSERT INTO shared_postcards (slug, payload) VALUES (${slug}, ${sql.json(postcard)})
        ON CONFLICT (slug) DO NOTHING RETURNING slug
      `;
      return rows.length > 0;
    },
    async get(slug: string): Promise<SharedPostcard | null> {
      const rows = await sql`SELECT payload FROM shared_postcards WHERE slug = ${slug}`;
      return (rows[0]?.payload as SharedPostcard | undefined) ?? null;
    },
  };
}
