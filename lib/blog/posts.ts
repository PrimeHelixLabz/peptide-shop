import type { BlogPost, BlogPostMeta } from "@/lib/blog/types"

import bpc157Guide from "@/lib/blog/posts/bpc-157-research-guide"
import bpcVsTb500 from "@/lib/blog/posts/bpc-157-vs-tb-500"
import storageGuide from "@/lib/blog/posts/peptide-storage-guide"
import readingCoa from "@/lib/blog/posts/how-to-read-peptide-coa"
import ghkCuOverview from "@/lib/blog/posts/ghk-cu-research-overview"

const allPosts: BlogPost[] = [
  bpc157Guide,
  bpcVsTb500,
  storageGuide,
  readingCoa,
  ghkCuOverview,
]

export function getAllPosts(): BlogPost[] {
  return [...allPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  )
}

export function getAllPostsMeta(): BlogPostMeta[] {
  return getAllPosts().map(({ Component: _Component, ...meta }) => meta)
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return allPosts.find((p) => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return allPosts.map((p) => p.slug)
}
