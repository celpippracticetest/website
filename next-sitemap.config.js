const now = new Date().toISOString();

module.exports = {
  siteUrl: "https://celpippracticetest.com",
  generateRobotsTxt: true,
  changefreq: "daily",
  priority: 0.7,
  exclude: ["/auth/*", "/cms/*", "/referral", "/referral/*"],
  robotsTxtOptions: {
    additionalSitemaps: [
      "https://blog.celpippracticetest.com/sitemap_index.xml",
    ],
  },
  additionalPaths: async (config) => {
    return [
      {
        loc: "/reading",
        changefreq: "daily",
        priority: 0.7,
        lastmod: now,
      },
      {
        loc: "/writing",
        changefreq: "daily",
        priority: 0.7,
        lastmod: now,
      },
      {
        loc: "/speaking",
        changefreq: "daily",
        priority: 0.7,
        lastmod: now,
      },
      {
        loc: "/listening",
        changefreq: "daily",
        priority: 0.7,
        lastmod: now,
      },
    ];
  },
};
