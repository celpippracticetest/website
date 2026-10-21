"use client";

import { useId, useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "done" | "error";

export default function BlogNewsletterCard({ source }: { source: string }) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, company }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        alreadySubscribed?: boolean;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("done");
      setMessage(
        data.alreadySubscribed
          ? "You're already on the list. Thanks for reading!"
          : "You're subscribed! New tips will land in your inbox.",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Couldn't connect. Check your internet and try again.");
    }
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="relative overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#0B7A55_0%,#0E8A61_100%)] p-5 text-white"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/[0.07]"
      />
      <span className="relative grid size-11 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-5"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </span>
      <h2 id="newsletter-heading" className="relative mt-3.5 text-[18px] font-extrabold leading-snug">
        Subscribe to Our Newsletter
      </h2>
      <p className="relative mt-1.5 text-[14px] leading-[1.6] text-white/85">
        Get new CELPIP tips, sample answers and study plans in your inbox. No spam, unsubscribe anytime.
      </p>

      {status === "done" ? (
        <p
          role="status"
          className="relative mt-4 flex items-start gap-2 rounded-xl bg-white/12 px-3.5 py-3 text-[14px] font-medium leading-snug ring-1 ring-white/20"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-px size-4 shrink-0"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {message}
        </p>
      ) : (
        <form onSubmit={submit} noValidate={false} className="relative mt-4 flex flex-col gap-2.5">
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <input
            id={inputId}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="example@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status === "error") setStatus("idle");
            }}
            aria-invalid={status === "error" || undefined}
            aria-describedby={message ? `${inputId}-msg` : undefined}
            className="h-12 w-full rounded-xl border border-white/15 bg-[#08603F] px-4 text-[15px] text-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-white/55 focus:border-white/60 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.18)] aria-[invalid]:border-[#FFC9B8]"
          />
          {/* Honeypot: hidden from people and assistive tech. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="absolute left-[-9999px] h-px w-px opacity-0"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-bold text-[#0B7A55] transition-[background-color,transform] duration-200 ease-out hover:bg-[#ECF9F2] active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B7A55]"
          >
            {status === "loading" ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-[#0B7A55]/30 border-t-[#0B7A55]"
              />
            ) : null}
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
          {status === "error" && message ? (
            <p id={`${inputId}-msg`} role="alert" className="text-[13px] font-medium text-[#FFE1D6]">
              {message}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
