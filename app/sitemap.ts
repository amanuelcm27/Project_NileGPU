import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/privacy", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
