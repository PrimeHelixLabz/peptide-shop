import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getAllPostsMeta } from "@/lib/blog/posts"

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

export const revalidate = 3600

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function BlogIndexPage() {
  const posts = getAllPostsMeta()

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
      dateModified: p.updatedAt || p.publishedAt,
      url: `https://primehelixlabz.com/blog/${p.slug}`,
      author: {
        "@type": "Organization",
        name: p.author,
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
      <main className="flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="mb-12 flex flex-col gap-3 text-center md:mb-16">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Research Blog
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
              Peptide science, made readable.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Field-tested articles on peptide research, laboratory handling, and
              quality assurance &mdash; written for researchers, by researchers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] md:p-8"
              >
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary md:text-2xl">
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {post.description}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span aria-hidden="true">&middot;</span>
                  <span>{post.readMinutes} min read</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
