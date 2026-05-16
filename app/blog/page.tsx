import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"
import { Badge } from "@/components/common/badge"
import { getPublishedPosts } from "@/lib/blog/db"

export const metadata: Metadata = {
  title: "Research Blog | PrimeHelix Labz",
  description:
    "Research-focused articles on peptide science, laboratory handling, storage, and quality assurance. For in-vitro and laboratory research only.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Research Blog | PrimeHelix Labz",
    description:
      "Research-focused articles on peptide science, laboratory handling, storage, and quality assurance.",
    type: "website",
  },
}

export const revalidate = 300 // 5 minutes — fast enough to reflect new posts

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PrimeHelix Labz Research Blog",
    url: "https://primehelixlabz.com/blog",
    publisher: {
      "@type": "Organization",
      name: "PrimeHelix Labz",
      url: "https://primehelixlabz.com",
    },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      url: `https://primehelixlabz.com/blog/${p.slug}`,
      author: {
        "@type": "Organization",
        name: p.authorName,
      },
    })),
  }

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
              <div className="grid gap-6 md:grid-cols-2">
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
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized={post.featuredImage.includes("supabase")}
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
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
