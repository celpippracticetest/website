export type PageSeoIndexability = "index" | "noindex";

/** Static route SEO definition (path is the public URL, without trailing slash). */
export type PageSeoItem = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  indexability?: PageSeoIndexability;
  /** Override canonical when it differs from `path` (rare). */
  canonicalPath?: string;
  openGraphType?: "website" | "article";
};
