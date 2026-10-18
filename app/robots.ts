import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The submission endpoint is not a page and must never be indexed.
        disallow: ["/api/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
