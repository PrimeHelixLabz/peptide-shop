import { notFound } from "next/navigation"
import { AdminBlogForm } from "@/components/admin/admin-blog-form"
import { getPostByIdAsAdmin } from "@/lib/blog/db"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditBlogPostPage({ params }: PageProps) {
  const { id } = await params
  const post = await getPostByIdAsAdmin(id)
  if (!post) notFound()
  return <AdminBlogForm initial={post} />
}
