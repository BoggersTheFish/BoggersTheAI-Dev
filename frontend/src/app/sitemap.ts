import type { MetadataRoute } from "next";
import { SITE_META } from "@/lib/tsData";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_META.url;
  const now = new Date("2026-03-21");

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/ts-os`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/lab`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/waves`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/network`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
