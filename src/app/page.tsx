import { PostcardGallery } from "@/components/postcard-gallery";
import { getPostcards } from "@/lib/postcard-repository";
import { normalizeQuery } from "@/lib/postcards";
import { WelcomePostcard } from "@/components/welcome-postcard";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const query = normalizeQuery(typeof params.q === "string" ? params.q : "");
  const initialPage = await getPostcards(query);
  return (
    <main className="postcard-view">
      <WelcomePostcard />
      <div className="gallery-container">
        <PostcardGallery key={query} initialQuery={query} initialPage={initialPage} />
      </div>
    </main>
  );
}

