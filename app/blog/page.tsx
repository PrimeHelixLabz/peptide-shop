import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"
import { Badge } from "@/components/common/badge"
import { getPublishedPostsPaged } from "@/lib/blog/db"

export const revalidate = 300 // 5 minutes — fast enough to reflect new posts

const PAGE_SIZE = 9

interface BlogIndexPageProps {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  searchParams,
}: BlogIndexPageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const parsedPage = Number.parseInt(pageParam ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  // Page 1 keeps the clean /blog canonical; deeper pages self-canonicalize
  // so Google doesn't dedupe them against page 1.
  const canonical = page === 1 ? "/blog" : `/blog?page=${page}`
  const titleSuffix = page === 1 ? "" : ` — Page ${page}`

  return {
    title: `Research Blog${titleSuffix} | PrimeHelix Labz`,
    description:
      "Research-focused articles on peptide science, laboratory handling, storage, and quality assurance. For in-vitro and laboratory research only.",
    alternates: { canonical },
    // Pages beyond 1 are intentionally noindex'd to avoid thin-content
    // pagination soup competing with the canonical index in search results.
    robots:
      page > 1
        ? { index: false, follow: true, googleBot: { index: false, follow: true } }
        : undefined,
    openGraph: {
      title: "Research Blog | PrimeHelix Labz",
      description:
        "Research-focused articles on peptide science, laboratory handling, storage, and quality assurance.",
      type: "website",
    },
  }
}

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const { page: pageParam } = await searchParams
  const parsedPage = Number.parseInt(pageParam ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const { posts, total } = await getPublishedPostsPaged(page, PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Out-of-range ?page= bounces to the last valid page so deep links / bots
  // don't get an empty grid (and don't index dupes either).
  if (page > totalPages && total > 0) {
    redirect(`/blog?page=${totalPages}`)
  }

  const canonical =
    page === 1
      ? "https://www.primehelixlabz.com/blog"
      : `https://www.primehelixlabz.com/blog?page=${page}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PrimeHelix Labz Research Blog",
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: "PrimeHelix Labz",
      url: "https://www.primehelixlabz.com",
    },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      url: `https://www.primehelixlabz.com/blog/${p.slug}`,
      author: {
        "@type": "Organization",
        name: p.authorName,
      },
    })),
  }

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Research Blog"
              title="Peptide science, made readable."
              description="Field-tested articles on peptide research, laboratory handling, and quality assurance — written for researchers, by researchers."
              align="center"
              className="mb-12 md:mb-16"
            />

            {posts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                New articles coming soon.
              </p>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col overflow-hidden rounded-3xl bg-card text-card-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                    >
                      {post.featuredImage && (
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-4 p-6 md:p-8">
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="default" size="md">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary md:text-2xl">
                          {post.title}
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                          {post.description}
                        </p>
                        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
                          <time dateTime={post.publishedAt ?? undefined}>
                            {formatDate(post.publishedAt)}
                          </time>
                          <span aria-hidden="true">&middot;</span>
                          <span>{post.readMinutes} min read</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <BlogPagination
                    page={page}
                    totalPages={totalPages}
                    prevPage={prevPage}
                    nextPage={nextPage}
                  />
                )}
              </>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}

function BlogPagination({
  page,
  totalPages,
  prevPage,
  nextPage,
}: {
  page: number
  totalPages: number
  prevPage: number | null
  nextPage: number | null
}) {
  const pageHref = (n: number) => (n === 1 ? "/blog" : `/blog?page=${n}`)

  const pages: (number | "…")[] = []
  const window = 1
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - window && i <= page + window)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…")
    }
  }

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-12 flex items-center justify-center gap-2 md:mt-16"
    >
      {prevPage ? (
        <Link
          href={pageHref(prevPage)}
          rel="prev"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          ← Previous
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
        >
          ← Previous
        </span>
      )}

      <ul className="hidden items-center gap-1 md:flex">
        {pages.map((p, i) =>
          p === "…" ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-2 text-sm text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={pageHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    : "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-foreground transition-colors hover:bg-muted"
                }
              >
                {p}
              </Link>
            </li>
          )
        )}
      </ul>

      <span className="text-sm text-muted-foreground md:hidden">
        Page {page} of {totalPages}
      </span>

      {nextPage ? (
        <Link
          href={pageHref(nextPage)}
          rel="next"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Next →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
        >
          Next →
        </span>
      )}
    </nav>
  )
}
