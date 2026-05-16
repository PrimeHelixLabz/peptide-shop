import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Container, Section } from "@/components/layout"
import { Badge } from "@/components/common/badge"
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedSlugs,
} from "@/lib/blog/db"

interface PageProps {
  params: Promise<{ slug: string }>
}

// ISR: refresh after 5 minutes so admin edits go live without a redeploy.
export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) {
    return { title: "Article Not Found | PrimeHelix Labz" }
  }
  return {
    title: `${post.title} | PrimeHelix Labz`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      tags: post.tags,
      images: post.featuredImage ? [{ url: post.featuredImage }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()

  // Related posts: 2 most recent other posts
  const allPosts = await getPublishedPosts()
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "PrimeHelix Labz",
      url: "https://primehelixlabz.com",
      logo: {
        "@type": "ImageObject",
        url: "https://primehelixlabz.com/logo.webp",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://primehelixlabz.com/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
    ...(post.featuredImage && { image: post.featuredImage }),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://primehelixlabz.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://primehelixlabz.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://primehelixlabz.com/blog/${post.slug}`,
      },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container size="sm">
            <article>
              <nav
                aria-label="Breadcrumb"
                className="mb-6 text-xs text-muted-foreground"
              >
                <Link href="/" className="hover:text-foreground">Home</Link>
                <span className="mx-2" aria-hidden="true">/</span>
                <Link href="/blog" className="hover:text-foreground">Blog</Link>
              </nav>

              <header className="mb-10 flex flex-col gap-4 border-b border-border/50 pb-10">
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="md">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl text-balance">
                  {post.title}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  {post.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{post.authorName}</span>
                  <span aria-hidden="true">&middot;</span>
                  <time dateTime={post.publishedAt ?? undefined}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span aria-hidden="true">&middot;</span>
                  <span>{post.readMinutes} min read</span>
                </div>
              </header>

              {post.featuredImage && (
                <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-3xl bg-muted">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                    priority
                    unoptimized={post.featuredImage.includes("supabase")}
                  />
                </div>
              )}

              <div
                className="blog-article-prose"
                dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
              />

              {related.length > 0 && (
                <aside className="mt-16 border-t border-border/50 pt-10">
                  <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Related reading
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {related.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/blog/${p.slug}`}
                        className="group flex flex-col gap-2 rounded-3xl bg-card text-card-foreground p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                      >
                        <h3 className="text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                          {p.title}
                        </h3>
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {p.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </aside>
              )}
            </article>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
