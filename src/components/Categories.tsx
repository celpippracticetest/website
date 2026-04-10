
"use client"
import Headphones from "@mui/icons-material/Headphones";
import MenuBook from "@mui/icons-material/MenuBook";
import Draw from "@mui/icons-material/Draw";
import Mic from "@mui/icons-material/Mic";
import LibraryAddCheck from "@mui/icons-material/LibraryAddCheck";
import Link from "next/link";

const Categories = () => {
  const categories = [
    {
      name: "Listening",
      icon: <Headphones className="w-10 h-10 text-blue-500 group-hover:text-white transition-colors" />,
      path: "/listening",
    },
    {
      name: "Speaking",
      icon: <Mic className="w-10 h-10 text-purple-500 group-hover:text-white transition-colors" />,
      path: "/speaking",
    },
    {
      name: "Writing",
      icon: <Draw className="w-10 h-10 text-green-500 group-hover:text-white transition-colors" />,
      path: "/writing",
    },
    {
      name: "Reading",
      icon: <MenuBook className="w-10 h-10 text-red-500 group-hover:text-white transition-colors" />,
      path: "/reading",
    }//,
    // {
    //   name: "Mock Exams",
    //   icon: <LibraryAddCheck className="w-10 h-10 text-orange-500 group-hover:text-white transition-colors" />,
    //   path: "/exams"
    // }
  ];

  return (
    <section className="py-12">
      <div className="cel-container">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link
              key={index} 
              href={category.path}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:bg-[#3ebbf3] hover:text-white hover:border-[#3ebbf3] transition-all duration-200"
            >
              <div>
                {category.icon}
              </div>
              <span className="mt-3 text-lg font-medium">{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
