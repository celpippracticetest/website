
import { 
  House, 
  ClipboardCheck, 
  Laptop, 
  Smile, 
  Zap, 
  Shield 
} from "lucide-react";

const ComparisonSection = () => {
  const features = [
    {
      icon: <House className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Authentic Day-to-Day Contexts",
      description: "Engage with exam tasks that mirror real-world interactions, ensuring CELPIP aligns closely with daily communication in English-speaking environments."
    },
    {
      icon: <ClipboardCheck className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Single-Session Exam",
      description: "Finish your assessment all at once, cutting down on scheduling hassles and stress—unlike IELTS, which often requires multiple days."
    },
    {
      icon: <Laptop className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Fully Digital Format",
      description: "Benefit from a streamlined, computer-based test that provides uniform clarity and consistency throughout."
    },
    {
      icon: <Smile className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Canada-Focused Assessment",
      description: "Showcase your language abilities in contexts relevant to Canadian culture and daily life—perfect for those planning to live, work, or study in Canada."
    },
    {
      icon: <Zap className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Faster Turnaround",
      description: "Get your scores in just four to five days—quicker than IELTS—so you can move forward with your plans right away."
    },
    {
      icon: <Shield className="h-6 w-6 text-gray-800 group-hover:text-[#3ebbf3]" />,
      title: "Fair Scoring",
      description: "Benefit from a scoring system that considers a wide range of English accents and cultural contexts, ensuring a fair assessment."
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="cel-container">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose CELPIP Over IELTS</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Find out what makes CELPIP the more practical and efficient option for your English language skills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group border rounded-lg p-6 transition-all hover:shadow-md hover:border-[#3ebbf3]"
            >
              <div className="bg-gray-100 rounded-full w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-[#3ebbf3]/10">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-[#3ebbf3]">{feature.title}</h3>
              <p className="text-gray-600 group-hover:text-gray-700">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
