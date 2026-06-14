import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // TEMP DEBUG: dump selected env vars at server startup. These are
    // SECRETS and land in retained platform logs — remove this block once
    // the values have been verified.
    console.log("[env-debug] CRON_SECRET=", process.env.CRON_SECRET);
    console.log(
      "[env-debug] NEWSLETTER_IP_SALT=",
      process.env.NEWSLETTER_IP_SALT
    );
    console.log(
      "[env-debug] NEWSLETTER_UNSUBSCRIBE_SECRET=",
      process.env.NEWSLETTER_UNSUBSCRIBE_SECRET
    );
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
