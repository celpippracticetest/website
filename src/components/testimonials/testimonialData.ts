
type TestimonialType = "mock" | "speaking" | "writing" | "reading" | "listening";

export interface Testimonial {
  name: string;
  text: string;
  type: TestimonialType;
  avatar?: string;
}

// Helper function to get initial from name
export const getInitials = (name: string): string => {
  return name.split(" ")[0][0];
};

// Color mapping for different types of testimonials
export const testimonialColors = {
  mock: "#6366F1", // Indigo
  speaking: "#EC4899", // Pink
  writing: "#14B8A6", // Teal
  reading: "#F97316", // Orange
  listening: "#8B5CF6" // Purple
};
