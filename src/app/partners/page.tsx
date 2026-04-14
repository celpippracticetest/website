import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gift,
  HelpCircle,
  LineChart,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Become a Partner | CELPIP Practice Test",
  description:
    "Help your clients succeed with CELPIP Practice Test and earn 30% commission on first subscription purchases.",
};

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468453012/Nvow3xsVp4swjjq4NHT4Qb/hero-bg-g9DwStDGBNv3J3K25xbmtK.webp";

const earningsRows = [
  {
    monthlyReferrals: 10,
    averageSubscriptionPrice: 50,
    partnerCommission: 15,
    monthlyEarnings: 150,
  },
  {
    monthlyReferrals: 50,
    averageSubscriptionPrice: 50,
    partnerCommission: 15,
    monthlyEarnings: 750,
  },
  {
    monthlyReferrals: 100,
    averageSubscriptionPrice: 50,
    partnerCommission: 15,
    monthlyEarnings: 1500,
  },
];

const whyItems = [
  {
    title: "High conversion rates",
    body: "Realistic practice tests are in high demand by thousands of candidates every month.",
    icon: LineChart,
  },
  {
    title: "Generous 30% commission",
    body: "Earn 30% of every subscription fee from users you refer—on their initial purchase.",
    icon: Gift,
  },
  {
    title: "Help your clients",
    body: "Give them a tool that improves scores and supports their immigration timeline.",
    icon: Users,
  },
  {
    title: "Real-time tracking",
    body: "A dedicated dashboard for referrals, earnings, and payout details.",
    icon: BarChart3,
  },
] as const;

const steps = [
  {
    step: "01",
    title: "Sign up",
    body: "Join our partner program for free in less than 2 minutes.",
  },
  {
    step: "02",
    title: "Share your link",
    body: "Use your unique referral link in emails, your website, or social bios.",
  },
  {
    step: "03",
    title: "Get paid",
    body: "Receive your 30% commission via e-transfer once you reach the minimum payout threshold.",
  },
] as const;

const audience = [
  {
    title: "Immigration consultants",
    body: "Help clients hit CLB 9+ requirements with trusted, exam-realistic prep.",
  },
  {
    title: "English tutors & schools",
    body: "Add professional-grade mock exams to your curriculum.",
  },
  {
    title: "Influencers & bloggers",
    body: "Monetize “Life in Canada” or study-abroad content with a product that works.",
  },
] as const;

const faqItems = [
  {
    q: "How much does it cost to join?",
    a: "It is 100% free to become a partner.",
  },
  {
    q: "When do I get paid?",
    a: "We process payouts on the [1st/15th] of every month.",
  },
  {
    q: "How long does the cookie last?",
    a: "Our tracking cookie lasts for 60 days. If they click your link and buy a month later, you still get the commission.",
  },
  {
    q: "Do you provide marketing materials?",
    a: "Yes! Once you join, you will have access to banners, logos, and pre-written email templates to help you sell.",
  },
] as const;

export default async function PartnersLandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-parchment text-navy antialiased">
      {/* Hero — passport-style image + gradient */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 min-h-[520px] lg:min-h-[560px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_BG} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary1/80 via-navy/82 to-[#151d2e]/95" />
        </div>
        <div className="container relative z-10 flex min-h-[520px] flex-col justify-center py-16 lg:min-h-[560px] lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <Sparkles className="h-4 w-4 text-amber-light" aria-hidden />
              <span className="text-sm font-medium text-white/90">Partner program</span>
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <h1
                className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
              >
                Become a Partner:
              </h1>
              <h2
                className="font-display max-w-4xl text-2xl font-semibold leading-snug tracking-tight text-white/95 sm:text-3xl lg:text-4xl"
                style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
              >
                Help Your Clients Succeed &amp; Earn 30% Commission
              </h2>
            </div>
            <p
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Empower your students and clients with the best CELPIP preparation tools. Partner with{" "}
              <strong className="text-white">CELPIP Practice Test</strong>—trusted exam simulation—while earning an
              industry-leading commission for every referral.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-maple px-8 py-6 text-lg font-semibold text-white shadow-lg shadow-maple/30 hover:bg-maple-dark"
                style={{ fontFamily: "var(--font-body)" }}
                asChild
              >
                <Link href="/partners/auth">
                  Apply to join
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {userId ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/35 bg-white/10 px-8 py-6 text-lg text-white hover:bg-white/15"
                  style={{ fontFamily: "var(--font-body)" }}
                  asChild
                >
                  <Link href="/partners/dashboard">Open dashboard</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="border-b border-navy/10 bg-white py-10">
        <div className="container">
          <p
            className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-navy/80"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Are you an immigration consultant, English coach, or content creator? Partner with us to help your audience
            reach Canadian PR goals—with realistic practice and clear tracking for you.
          </p>
        </div>
      </section>

      {/* Why partner — card grid like marketing sections */}
      <section id="why" className="scroll-mt-24 py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              Why partner with us?
            </h2>
            <p className="mt-3 text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
              Built for professionals who want results for clients—and clarity for themselves.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="group rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-xl bg-parchment p-3 ring-1 ring-maple/15 transition group-hover:bg-maple/5">
                  <Icon className="h-6 w-6 text-maple" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-navy" style={{ fontFamily: "var(--font-body)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 border-t border-navy/10 bg-parchment-dark/40 py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              How it works
            </h2>
            <p className="mt-3 text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
              Three simple steps from signup to payout.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-sm"
              >
                <span className="font-display text-5xl font-bold text-maple/20">{s.step}</span>
                <h3 className="mt-2 text-xl font-semibold text-navy" style={{ fontFamily: "var(--font-body)" }}>
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who */}
      <section className="border-t border-navy/10 bg-white py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              Who is this for?
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audience.map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-maple/20 bg-gradient-to-b from-white to-parchment/80 p-8 shadow-sm"
              >
                <CheckCircle2 className="mb-4 h-8 w-8 text-maple" aria-hidden />
                <h3 className="text-lg font-semibold text-navy" style={{ fontFamily: "var(--font-body)" }}>
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings table */}
      <section id="earnings" className="scroll-mt-24 border-t border-navy/10 bg-parchment py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              Partner earnings example
            </h2>
            <p className="mt-3 text-navy/70" style={{ fontFamily: "var(--font-body)" }}>
              Show them the money—people respond well to numbers.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="px-5 py-4 font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                      Monthly referrals
                    </th>
                    <th className="px-5 py-4 font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                      Subscription price (avg)
                    </th>
                    <th className="px-5 py-4 font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                      Your 30% commission
                    </th>
                    <th className="px-5 py-4 font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                      Monthly earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/10">
                  {earningsRows.map((row) => (
                    <tr key={row.monthlyReferrals} className="bg-white hover:bg-parchment/50">
                      <td className="px-5 py-4 text-navy" style={{ fontFamily: "var(--font-body)" }}>
                        {row.monthlyReferrals}
                      </td>
                      <td className="px-5 py-4 text-navy/80" style={{ fontFamily: "var(--font-body)" }}>
                        ${row.averageSubscriptionPrice}
                      </td>
                      <td className="px-5 py-4 text-navy/80" style={{ fontFamily: "var(--font-body)" }}>
                        ${row.partnerCommission}
                      </td>
                      <td
                        className="px-5 py-4 text-lg font-bold text-maple"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        ${row.monthlyEarnings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-navy/10 bg-white py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <HelpCircle className="mb-4 h-10 w-10 text-maple" aria-hidden />
            <h2
              className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              Frequently asked questions
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-parchment/50">
            {faqItems.map((item) => (
              <div key={item.q} className="px-6 py-5 first:rounded-t-2xl last:rounded-b-2xl">
                <h3 className="text-base font-semibold text-navy" style={{ fontFamily: "var(--font-body)" }}>
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75" style={{ fontFamily: "var(--font-body)" }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-navy/10 py-16 lg:py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1a2740] to-[#151d2e] px-8 py-14 text-center shadow-xl sm:px-12 lg:px-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-maple/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-light/10 blur-3xl" />
            <h2
              className="relative font-display text-3xl font-bold text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-passport-display), Georgia, serif" }}
            >
              Ready to grow with us?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/80" style={{ fontFamily: "var(--font-body)" }}>
              Join 100+ consultants helping candidates ace the CELPIP.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button
                size="default"
                className="max-w-full bg-maple px-4 text-xs font-semibold text-white shadow-lg hover:bg-maple-dark whitespace-nowrap sm:px-5 sm:text-sm"
                style={{ fontFamily: "var(--font-body)" }}
                asChild
              >
                <Link href="/partners/auth">
                  Apply to join the partner program now
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                </Link>
              </Button>
              {userId ? (
                <Button
                  size="default"
                  variant="outline"
                  className="max-w-full border-white/40 bg-white/10 px-4 text-xs text-white hover:bg-white/15 whitespace-nowrap sm:px-5 sm:text-sm"
                  style={{ fontFamily: "var(--font-body)" }}
                  asChild
                >
                  <Link href="/partners/dashboard">Open partner dashboard</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip — aligned with passport navy footer tone */}
      <footer className="border-t border-white/10 bg-navy py-10 text-white/70">
        <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <Image
              src="/images/logo.png"
              alt="CELPIP Practice Test"
              width={140}
              height={42}
              className="h-9 w-auto opacity-90"
            />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ fontFamily: "var(--font-body)" }}>
            <Link href="/pricing" className="transition-colors hover:text-maple-light">
              Pricing
            </Link>
            <Link href="/contact-us" className="transition-colors hover:text-maple-light">
              Contact
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-maple-light">
              Privacy
            </Link>
            <Link href="/" className="transition-colors hover:text-maple-light">
              Main site
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
