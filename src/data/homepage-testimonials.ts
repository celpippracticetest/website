export type HomepageTestimonial = {
  name: string;
  comment: string;
  source: string;
};

/** Visible homepage reviews — keep in sync with Review JSON-LD on `/`. */
export const HOMEPAGE_TESTIMONIALS: HomepageTestimonial[] = [
  {
    name: "Tatiana",
    comment:
      "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
    source: "Tatiana.png",
  },
  {
    name: "Carlos",
    comment:
      "CELPIPPRACTICETEST.com made my practice a revolutionary process. Practice in speaking and getting instant feedback increased my confidence level. I cleared with 9 in all sections!",
    source: "Carlos.png",
  },
  {
    name: "Admad",
    comment:
      "I finally got CLB 9 in writing after doing 2 weeks of practice tests at CELPIPPRACTICETEST.com. The AI feedback was exactly what I needed to improve structure and coherence. I highly recommend it!",
    source: "Ahmed.png",
  },
  {
    name: "Lie",
    comment:
      "The practice of speaking on this website is amazing. I practiced and listened to the high-score examples. It was so helpful.",
    source: "Li.png",
  },
  {
    name: "Dalia",
    comment:
      "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
    source: "Dalia.png",
  },
];
