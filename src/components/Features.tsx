
import { Check, Globe, Award, BookOpen, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      title: "Comprehensive Assessment",
      description: "Evaluate interpretation skills across multiple domains with detailed metrics and feedback.",
      icon: <Check className="h-10 w-10 text-celblue-600" />
    },
    {
      title: "Multiple Languages",
      description: "Support for various language pairs to assess interpreters across different linguistic contexts.",
      icon: <Globe className="h-10 w-10 text-celblue-600" />
    },
    {
      title: "Industry Recognition",
      description: "Certification recognized by professional interpretation organizations and institutions.",
      icon: <Award className="h-10 w-10 text-celblue-600" />
    },
    {
      title: "Educational Framework",
      description: "Designed with educational objectives to help interpreters identify areas for improvement.",
      icon: <BookOpen className="h-10 w-10 text-celblue-600" />
    },
    {
      title: "Expert Evaluation",
      description: "Tests assessed by qualified professionals with extensive experience in interpretation.",
      icon: <Users className="h-10 w-10 text-celblue-600" />
    },
    {
      title: "Efficient Testing",
      description: "Streamlined process that ensures thorough assessment without unnecessary time commitment.",
      icon: <Clock className="h-10 w-10 text-celblue-600" />
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="cel-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose CEL Test PIP?</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Our comprehensive assessment platform provides accurate evaluation of interpreter skills with industry-recognized certification.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-200 hover:border-celblue-300 hover:shadow-md transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
