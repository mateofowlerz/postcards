import "server-only";
import { neon } from "@neondatabase/serverless";
import { getSamplePage, normalizeQuery, PAGE_SIZE, type Postcard, type PostcardPage } from "./postcards";

export async function getPostcards(query = "", cursor = 0): Promise<PostcardPage> {
  if (process.env.POSTCARDS_DATA_SOURCE !== "postgres") {
    return getSamplePage(query, cursor);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the Postgres data source.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const terms = normalizeQuery(query).toLowerCase().split(" ").filter(Boolean);
  // Literal substring search: %, _ and quotes are never SQL wildcards or syntax.
  const result = await sql`
    WITH matching AS (
      SELECT id, title, place, image_url AS "imageUrl", width, height
      FROM postcards
      WHERE NOT EXISTS (
        SELECT 1 FROM unnest(${terms}::text[]) AS term
        WHERE strpos(lower(title || ' ' || place), term) = 0
      )
    ), page AS (
      SELECT * FROM matching WHERE id > ${cursor} ORDER BY id LIMIT ${PAGE_SIZE + 1}
    )
    SELECT (SELECT count(*)::int FROM matching) AS total,
      COALESCE((SELECT json_agg(page ORDER BY id) FROM page), '[]'::json) AS items
  `;
  const rows = result[0].items as Postcard[];
  const items = rows.slice(0, PAGE_SIZE);
  return {
    items,
    nextCursor: rows.length > PAGE_SIZE ? items.at(-1)!.id : null,
    total: result[0].total as number,
  };
}
