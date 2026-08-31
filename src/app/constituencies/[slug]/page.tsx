import { permanentRedirect } from "next/navigation";

/**
 * The constituency profile moved to the singular `/constituency/[slug]`.
 *
 * A 308 rather than a deletion: this path is already linked from candidate
 * profiles, results, search and any external page, and those links should keep
 * working and pass their SEO weight to the canonical URL.
 */
export default async function LegacyConstituencyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/constituency/${slug}`);
}
