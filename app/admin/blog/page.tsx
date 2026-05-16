import Link from "next/link"
import { Plus, FileText, Pencil } from "lucide-react"
import { getAllPostsAsAdmin } from "@/lib/blog/db"

export const dynamic = "force-dynamic"

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
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Blog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage research articles. Published posts go live at
            <code className="ml-1 text-foreground">/blog/&lt;slug&gt;</code>.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </div>

      {/* List */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-16 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No posts yet.</p>
          <Link
            href="/admin/blog/new"
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Write your first post
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-muted-foreground dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Published</th>
                  <th className="px-6 py-3">Last edited</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-foreground dark:divide-gray-800">
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {post.title}
                        </Link>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          /blog/{post.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          post.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(post.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-gray-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
