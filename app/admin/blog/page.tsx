import Link from "next/link"
import { Plus, FileText, Pencil } from "lucide-react"
import { getAllPostsAsAdmin } from "@/lib/blog/db"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import type { BlogPostStatus } from "@/lib/blog/types"

export const dynamic = "force-dynamic"

const STATUS_VARIANT: Record<BlogPostStatus, StatusVariant> = {
  draft: "warning",
  published: "success",
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function AdminBlogListPage() {
  const posts = await getAllPostsAsAdmin()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Blog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage research articles. Published posts go live at{" "}
            <code className="text-foreground">/blog/&lt;slug&gt;</code>.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus />
            New post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <AdminCard flush>
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description="Draft your first research article. You can save it as a draft and publish whenever you're ready."
            action={{ label: "Write your first post", href: "/admin/blog/new" }}
          />
        </AdminCard>
      ) : (
        <AdminCard flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Published
                  </th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Last edited
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {post.title}
                        </Link>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          /blog/{post.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={STATUS_VARIANT[post.status]}>
                        {post.status}
                      </StatusBadge>
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                      {formatDate(post.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/blog/${post.id}/edit`}>
                          <Pencil />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  )
}
