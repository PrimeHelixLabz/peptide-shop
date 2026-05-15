import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Prose } from "@/components/blog/article-prose"
import { getAllSlugs, getPostBySlug, getAllPostsMeta } from "@/lib/blog/posts"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600
export const dynamicParams = false

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
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
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const Article = post.Component

  // Related posts: 2 most recent other posts
  const related = getAllPostsMeta()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
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
      <main className="flex-1 py-12 md:py-20">
        <article className="mx-auto max-w-3xl px-6 md:px-10">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
          </nav>

          <header className="mb-10 flex flex-col gap-4 border-b border-gray-200 pb-10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl text-balance">
              {post.title}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              {post.description}
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{post.author}</span>
              <span aria-hidden="true">&middot;</span>
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{post.readMinutes} min read</span>
            </div>
          </header>

          <Prose>
            <Article />
          </Prose>

          {related.length > 0 && (
            <aside className="mt-16 border-t border-gray-200 pt-10">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Related reading
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.07)]"
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
      </main>
      <Footer />
    </div>
  )
}
