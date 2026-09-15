import { getPostcards } from "@/lib/postcard-repository";
import { MAX_QUERY_LENGTH } from "@/lib/postcards";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";
  const rawCursor = params.get("cursor") ?? "0";
  const cursor = Number(rawCursor);
  if (query.length > MAX_QUERY_LENGTH || !/^\d+$/.test(rawCursor) || !Number.isSafeInteger(cursor)) {
    return Response.json({ error: "Invalid search or cursor." }, { status: 400 });
  }
  try {
    return Response.json(await getPostcards(query, cursor));
  } catch {
    return Response.json({ error: "Postcards could not be loaded. Please try again." }, { status: 503 });
  }
}
