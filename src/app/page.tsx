import { PostcardGallery } from "@/components/postcard-gallery";
import { PaperTexture } from "@/components/paper-texture";
import { getPostcards } from "@/lib/postcard-repository";
import { normalizeQuery } from "@/lib/postcards";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const query = normalizeQuery(typeof params.q === "string" ? params.q : "");
  const initialPage = await getPostcards(query);
  return (
    <main className="postcard-view">
      <PaperTexture />
      <Image
        src="/images/split-rock-postcard.png"
        width={2064}
        height={2620}
        alt="Vintage postcard of Split Rock at Lake Harmony in Pennsylvania's Pocono Mountains, with visitors atop the cliffs and the blank address side below."
        className="postcard main-postcard"
        sizes="100vw"
        preload
      />
      <div className="gallery-container">
        <PostcardGallery key={query} initialQuery={query} initialPage={initialPage} />
      </div>
    </main>
  );
}
import Image from "next/image";
