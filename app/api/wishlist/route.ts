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
  return handleWishlistPost(request);
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
