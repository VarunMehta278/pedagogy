"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatsSection from "@/components/common/StatsSection";
import FeaturesSection from "@/components/common/FeaturesSection";
import HowItWorks from "@/components/common/HowItWorks";
import EventsSection from "@/components/events/EventSection";
import CTASection from "@/components/common/CTASection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn, RevealOnScroll } from "@/components/motion/reveal";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main" className="min-h-screen bg-background text-foreground">
        {/* ============================= */}
        {/* HERO */}
        {/* ============================= */}

        <section className="bg-aurora relative overflow-hidden">
          <div className="grid-pattern pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pb-28 lg:pt-24">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              {/* LEFT */}
              <FadeIn>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Built for modern institutions
                </div>

                <h1 className="mt-7 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Run technical events
                  <br />
                  your campus{" "}
                  <span className="text-gradient-brand">actually loves.</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Pedagogy brings event discovery, registration, QR
                  attendance, results, certificates, notifications and
                  analytics into one centralized platform — built for
                  hackathons, workshops and competitions at scale.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/events">
                    <Button variant="brand" size="lg" block className="sm:w-auto">
                      Discover Events
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>

                  <Link href="/register">
                    <Button variant="outline" size="lg" block className="sm:w-auto">
                      Get Started
                    </Button>
                  </Link>
                </div>

                {/* Trust strip */}
                <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
                  <TrustItem text="Centralized management" />
                  <TrustItem text="QR-powered attendance" />
                  <TrustItem text="Automated certificates" />
                </div>
              </FadeIn>

              {/* RIGHT — PRODUCT PREVIEW */}
              <FadeIn delay={0.1} className="relative">
                <div className="absolute -inset-6 rounded-[2rem] bg-gradient-brand opacity-20 blur-3xl" />

                <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
                  {/* Window header */}
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                      <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                      <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                    </div>

                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Pedagogy Dashboard
                    </span>

                    <div className="h-5 w-5" />
                  </div>

                  <div className="p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Overview</p>
                        <p className="mt-1 text-xl font-semibold">Event ecosystem</p>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-lg bg-brand-subtle px-2.5 py-1 text-[10px] font-medium text-accent-foreground">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                        </span>
                        Live
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <PreviewStat label="Events" value="24" />
                      <PreviewStat label="Students" value="1.2K" />
                      <PreviewStat label="Attendance" value="87%" />
                    </div>

                    {/* Chart */}
                    <div className="mt-4 rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Registrations</p>
                        <TrendingMini />
                      </div>

                      <div className="mt-5 flex h-28 items-end gap-2">
                        {[35, 52, 43, 68, 56, 82, 72, 95, 76, 100].map(
                          (height, index) => (
                            <div
                              key={index}
                              className="flex-1 rounded-t-md bg-gradient-brand"
                              style={{
                                height: `${height}%`,
                                opacity: 0.35 + index * 0.065,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Event */}
                    <div className="mt-4 rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white">
                            <QrCode className="h-[19px] w-[19px]" aria-hidden="true" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold">AI & ML Hackathon</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Innovation Lab · 20 Sep
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">
                          86 registered
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ============================= */}
        {/* STATS */}
        {/* ============================= */}

        <StatsSection />

        {/* ============================= */}
        {/* FEATURES */}
        {/* ============================= */}

        <div id="features">
          <FeaturesSection />
        </div>

        {/* ============================= */}
        {/* HOW IT WORKS */}
        {/* ============================= */}

        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* ============================= */}
        {/* UPCOMING EVENTS (live data) */}
        {/* ============================= */}

        <EventsSection />

        {/* ============================= */}
        {/* ROLE SECTION */}
        {/* ============================= */}

        <section className="bg-background px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <RevealOnScroll className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Built for every stakeholder
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                One system. Different perspectives.
              </h2>

              <p className="mt-4 text-muted-foreground">
                Pedagogy gives each role the tools they actually need.
              </p>
            </RevealOnScroll>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <RoleCard
                title="Students"
                description="Discover events, register, manage participation, receive notifications and access certificates."
                items={[
                  "Event discovery",
                  "Digital registration",
                  "QR identity",
                  "Notifications",
                  "Certificates",
                ]}
              />

              <RoleCard
                title="Faculty"
                description="Create and operate events while managing participants, attendance, results and communication."
                items={[
                  "Event creation",
                  "Participant management",
                  "QR attendance",
                  "Results",
                  "Announcements",
                ]}
              />

              <RoleCard
                title="Administrators"
                description="Get institution-wide visibility into users, events, participation and performance."
                items={[
                  "User management",
                  "Event oversight",
                  "Analytics",
                  "Participation insights",
                  "System visibility",
                ]}
              />
            </div>
          </div>
        </section>

        {/* ============================= */}
        {/* CTA */}
        {/* ============================= */}

        <CTASection />
      </main>

      <Footer />
    </>
  );
}

/* ================================= */
/* COMPONENTS */
/* ================================= */

function TrustItem({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
      {text}
    </span>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function TrendingMini() {
  return (
    <div className="flex items-end gap-0.5">
      {[3, 5, 4, 7, 6].map((height, index) => (
        <span
          key={index}
          className="w-1 rounded-full bg-gradient-brand"
          style={{
            height: `${height * 2}px`,
            opacity: 0.4 + index * 0.12,
          }}
        />
      ))}
    </div>
  );
}

function RoleCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <RevealOnScroll>
      <Card className="h-full p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-subtle text-primary">
            {title === "Students" && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {title === "Faculty" && <Award className="h-4 w-4" aria-hidden="true" />}
            {title === "Administrators" && <Sparkles className="h-4 w-4" aria-hidden="true" />}
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </Card>
    </RevealOnScroll>
  );
}
