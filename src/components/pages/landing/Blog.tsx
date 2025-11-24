import React from "react";
import Image from "next/image";

const Blog = () => {
    const blogs = [
        {
            id: 1,
            title: "Lorem Ipsum",
            description:
                "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's",
            image: "/images/hero.png", // Placeholder
            readTime: "5 min read",
        },
        {
            id: 2,
            title: "Lorem Ipsum",
            description:
                "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's",
            image: "/images/hero.png", // Placeholder
            readTime: "5 min read",
        },
        {
            id: 3,
            title: "Lorem Ipsum",
            description:
                "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's",
            image: "/images/hero.png", // Placeholder
            readTime: "5 min read",
        },
    ];

    return (
        <section aria-labelledby="blog-heading" className="mt-[80px] screen1280:!mt-[104px] mb-[80px]">
            <div className="max-w-[1440px] mx-auto px-[20px] screen1280:!px-[40px]">
                <h2
                    id="blog-heading"
                    className="text-center text-[24px] screen744:!text-[32px] font-medium text-text1 mb-[40px]"
                >
                    Go To Blog
                </h2>

                <div className="grid grid-cols-1 screen744:!grid-cols-2 screen1280:!grid-cols-3 gap-[24px]">
                    {blogs.map((blog) => (
                        <div
                            key={blog.id}
                            className="border border-[#E0E0E0] rounded-[24px] p-[16px] flex flex-col gap-[16px] bg-[#F8F9FC]"
                        >
                            <div className="relative w-full h-[200px] rounded-[16px] overflow-hidden">
                                <Image
                                    src={blog.image}
                                    alt={blog.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                <h3 className="text-[20px] font-medium text-text1">
                                    {blog.title}
                                </h3>
                                <p className="text-[16px] text-[#5F6D7E] leading-[24px]">
                                    {blog.description}
                                </p>
                            </div>
                            <div className="flex justify-between items-center mt-auto pt-[8px]">
                                <button className="bg-[#4379EE] text-white px-[24px] py-[10px] rounded-[30px] text-[14px] font-medium hover:bg-blue-600 transition-colors">
                                    Read More
                                </button>
                                <span className="text-[#5F6D7E] text-[14px]">{blog.readTime}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-[40px]">
                    <button className="border border-[#5F6D7E] text-[#5F6D7E] px-[32px] py-[12px] rounded-[30px] text-[16px] font-medium hover:bg-gray-50 transition-colors">
                        Show more
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Blog;
