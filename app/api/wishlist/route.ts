import { handleWishlistPost } from "@/lib/api/wishlist-handler";

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
    return await handleWishlistPost(request);
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
