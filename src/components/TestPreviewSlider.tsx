
"use client"
import { useState, useEffect, JSX } from "react";
import { ChevronLeft, ChevronRight, Headphones, BookOpen, Pen, Mic, FileText } from "lucide-react";

interface Slide {
  id: number;
  title: string;
  image: string;
  bgColor: string;
  icon: JSX.Element;
}

const TestPreviewSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const slides: Slide[] = [
    {
      id: 1,
      title: "Writing",
      image: "/lovable-uploads/a405b3a2-88a1-4bb2-96f9-34bbedcf1ca0.png",
      bgColor: "bg-amber-500",
      icon: <Pen className="h-8 w-8 text-amber-500" />,
    },
    {
      id: 2,
      title: "Reading",
      image: "/lovable-uploads/119d3814-03c3-4e99-9c86-01119a1ee447.png",
      bgColor: "bg-blue-500",
      icon: <BookOpen className="h-8 w-8 text-blue-500" />,
    },
    {
      id: 3,
      title: "Listening",
      image: "/lovable-uploads/79bc8d34-f131-4d2a-97ef-020a4e2e464b.png",
      bgColor: "bg-green-500",
      icon: <Headphones className="h-8 w-8 text-green-500" />,
    },
    {
      id: 4,
      title: "Speaking",
      image: "/lovable-uploads/136c4319-2626-4a8f-ab09-da3936c51e42.png",
      bgColor: "bg-red-500",
      icon: <Mic className="h-8 w-8 text-red-500" />,
    },
    {
      id: 5,
      title: "Mock Exams",
      image: "/lovable-uploads/804d9063-852c-47ed-a2e2-cab2e892d6e4.png",
      bgColor: "bg-purple-500",
      icon: <FileText className="h-8 w-8 text-purple-500" />,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      goToNextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const goToNextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPrevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="cel-container">
        <div className="relative overflow-hidden">
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-5xl font-bold relative z-10 text-center">{slides[currentIndex].title}</h2>
            <div className="ml-4">
              {slides[currentIndex].icon}
            </div>
          </div>
          
          <div className="relative">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-xl max-w-5xl mx-auto">
              <div
                className="transition-all duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                <div className="flex">
                  {slides.map((slide) => (
                    <div key={slide.id} className="w-full flex-shrink-0">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={goToPrevSlide}
              className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white rounded-full p-4 shadow-md hover:bg-gray-100 transition-colors z-10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={goToNextSlide}
              className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white rounded-full p-4 shadow-md hover:bg-gray-100 transition-colors z-10"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            <div className="flex justify-center mt-6 space-x-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    if (isAnimating) return;
                    setIsAnimating(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsAnimating(false), 500);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex
                      ? `${slide.bgColor}`
                      : "bg-gray-300"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestPreviewSlider;
