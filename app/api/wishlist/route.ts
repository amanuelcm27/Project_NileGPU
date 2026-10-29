import { after } from "next/server";
import { handleWishlistPost } from "@/lib/api/wishlist-handler";
import { sendApplicationConfirmation } from "@/lib/email/application-confirmation";

/**
 * POST /api/wishlist — persist a completed wishlist application.
 *
 * The implementation lives in `lib/api/wishlist-handler.ts` so that the whole
 * defence chain is unit-testable. This file only adapts it to Next.js.
 *
 * The service-role key is read inside the handler and never leaves the server.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleWishlistPost(request, {
      onStored: (application) => {
        // Runs after the response is sent. Delivery problems are intentionally
        // invisible to the applicant and cannot change the submission result.
        after(async () => {
          try {
            const result = await sendApplicationConfirmation(application);
            if (!result.sent && result.reason !== "not_configured") {
              console.warn(
                `[redfoxgpu] wishlist confirmation email not sent (request ${application.requestId}): ${result.reason}`,
              );
            }
          } catch {
            console.warn(
              `[redfoxgpu] wishlist confirmation email failed (request ${application.requestId})`,
            );
          }
        });
      },
    });
  } catch (error) {
    // Never let an unexpected exception surface as a framework error page: the
    // client expects JSON so it can show a safe, actionable message.
    console.error("[redfoxgpu] wishlist: unhandled submission error", error);
    return Response.json(
      {
        ok: false,
        error: {
          code: "server_error",
          message:
            "We could not save your application right now. Your answers are still here — please try again.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET(): Response {
  return Response.json(
    {
      ok: false,
      error: { code: "method_not_allowed", message: "Use POST to submit a wishlist application." },
    },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
