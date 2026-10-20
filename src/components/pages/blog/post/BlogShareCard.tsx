"use client";

import { useEffect, useRef, useState } from "react";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TelegramIcon from "@mui/icons-material/Telegram";
import XIcon from "@mui/icons-material/X";
import { copyToClipboard } from "@/lib/clipboard";

type Network = {
  key: string;
  label: string;
  Icon: typeof XIcon;
  /** Hover colours written out so Tailwind generates them. */
  hover: string;
  href?: (url: string, title: string) => string;
};

const NETWORKS: Network[] = [
  {
    key: "x",
    label: "X",
    Icon: XIcon,
    hover: "hover:border-[#0F1419] hover:bg-[#0F1419] hover:text-white",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    Icon: FacebookIcon,
    hover: "hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    Icon: LinkedInIcon,
    hover: "hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: "instagram",
    label: "Instagram",
    Icon: InstagramIcon,
    hover: "hover:border-[#D62976] hover:bg-[#D62976] hover:text-white",
  },
  {
    key: "telegram",
    label: "Telegram",
    Icon: TelegramIcon,
    hover: "hover:border-[#229ED9] hover:bg-[#229ED9] hover:text-white",
    href: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

const BUTTON_CLASS =
  "grid size-11 place-items-center rounded-xl border border-[#E3E8F2] bg-white text-[#212E42] transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40";

export default function BlogShareCard({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const flash = (message: string | null) => {
    setCopied(true);
    setHint(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setHint(null);
    }, 2400);
  };

  const copyLink = async () => {
    if (await copyToClipboard(url)) flash(null);
  };

  // Instagram has no web share link: use the phone's share sheet, or copy.
  const shareInstagram = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    if (await copyToClipboard(url)) flash("Link copied. Paste it into your Instagram story or bio.");
  };

  return (
    <section aria-labelledby="share-heading" className="rounded-2xl border border-[#E3E8F2] bg-[#F5F7FA] p-5">
      <h2 id="share-heading" className="text-[16px] font-bold text-[#212E42]">
        Share on
      </h2>
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {NETWORKS.map(({ key, label, Icon, hover, href }) => (
          <li key={key}>
            {href ? (
              <a
                href={href(url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${label}`}
                title={label}
                className={`${BUTTON_CLASS} ${hover}`}
              >
                <Icon sx={{ fontSize: 20 }} />
              </a>
            ) : (
              <button
                type="button"
                onClick={shareInstagram}
                aria-label={`Share on ${label}`}
                title={label}
                className={`${BUTTON_CLASS} ${hover}`}
              >
                <Icon sx={{ fontSize: 20 }} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={copyLink}
        data-copied={copied || undefined}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E3E8F2] bg-white px-4 text-[14px] font-semibold text-[#212E42] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-[#2554D6] hover:text-[#2554D6] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40 data-[copied]:border-[#BFE7D3] data-[copied]:bg-[#ECF9F2] data-[copied]:text-[#0B7A55]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4"
        >
          {copied ? (
            <path d="M20 6 9 17l-5-5" />
          ) : (
            <>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </>
          )}
        </svg>
        {copied ? "Link copied" : "Copy link"}
      </button>
      <p aria-live="polite" className="mt-2 min-h-0 text-[12.5px] leading-snug text-[#5B6B82] empty:hidden">
        {hint}
      </p>
    </section>
  );
}
