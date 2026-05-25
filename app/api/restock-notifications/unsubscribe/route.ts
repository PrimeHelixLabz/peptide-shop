import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * One-click restock-notification unsubscribe.
 *
 * Linked from every restock email. We accept GET (Gmail/Outlook may render
 * the link directly) and respond with a simple HTML confirmation page so
 * the user isn't dumped to a JSON blob.
 *
 * Possession of the token = authority to delete the row, so no auth check
 * beyond the lookup. Unknown tokens just render the "already unsubscribed"
 * message — same UX as a successful unsub.
 */
function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | PrimeHelix Labz</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:48px 20px;color:#111827}main{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{margin:0 0 12px;font-size:22px}p{margin:8px 0;line-height:1.6;color:#374151}a{color:#1e293b}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token")?.trim()

  if (!token) {
    return htmlResponse(
      `<h1>Invalid link</h1><p>This unsubscribe link is missing a token. If you received this email by mistake, please contact <a href="mailto:support@primehelixlabz.com">support@primehelixlabz.com</a>.</p>`,
      400
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("restock_notifications")
    .delete()
    .eq("unsubscribe_token", token)

  if (error) {
    console.error("Restock unsubscribe failed:", error)
    return htmlResponse(
      `<h1>Something went wrong</h1><p>We couldn't process your unsubscribe right now. Please email <a href="mailto:support@primehelixlabz.com">support@primehelixlabz.com</a> and we'll handle it manually.</p>`,
      500
    )
  }

  return htmlResponse(
    `<h1>You're unsubscribed</h1><p>You won't receive any more restock notifications for this product. You can re-subscribe anytime from the product page.</p><p style="margin-top:24px"><a href="https://primehelixlabz.com/shop">Continue shopping</a></p>`
  )
}

// Required for RFC 8058 List-Unsubscribe one-click — some mail clients POST
// to the unsubscribe URL automatically when the user hits the inbox button.
export async function POST(request: NextRequest) {
  return GET(request)
}
