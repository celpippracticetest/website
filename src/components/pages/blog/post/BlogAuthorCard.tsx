import type { BlogAuthorProfile } from "@/data/blog-authors";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function BlogAuthorCard({ author }: { author: BlogAuthorProfile }) {
  return (
    <section aria-labelledby="author-heading" className="mt-10 border-t border-slate-200 pt-10">
      <h2 id="author-heading" className="text-xl font-bold text-slate-900">
        Author
      </h2>
      <div className="mt-4 rounded-2xl border border-[#E3E8F2] bg-[#F5F7FA] p-2 screen744:!p-3">
        <div className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(33,46,66,0.05)] screen744:!p-6">
          <div className="flex items-center gap-4">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                className="size-14 shrink-0 rounded-full border border-[#E3E8F2] bg-[#F4F7FF] object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[18px] font-bold text-[#2554D6]"
              >
                {initials(author.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-[#212E42]">{author.name}</p>
              <p className="mt-0.5 text-[14px] text-[#5B6B82]">{author.title}</p>
            </div>
            {author.email ? (
              <a
                href={`mailto:${author.email}`}
                aria-label={`Email ${author.name}`}
                title={author.email}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[#E3E8F2] text-[#37465C] transition-[background-color,border-color,color] duration-200 hover:border-[#2554D6] hover:bg-[#EEF3FF] hover:text-[#2554D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="size-[18px]"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-[15px] leading-[1.7] text-[#37465C]">{author.bio}</p>
        </div>
      </div>
    </section>
  );
}
