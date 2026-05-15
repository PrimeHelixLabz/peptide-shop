import type { ReactNode } from "react"

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  author: string
  readMinutes: number
  tags: string[]
  featuredImage?: string
}

export interface BlogPost extends BlogPostMeta {
  Component: () => ReactNode
}
