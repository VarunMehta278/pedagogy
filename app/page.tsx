"use client";

import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrophyIcon,
  Users,
} from "lucide-react";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      {/* ============================= */}
      {/* NAVBAR */}
      {/* ============================= */}

      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* BRAND */}
          <Link
            href="/"
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <ShieldCheck size={19} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Pedagogy
              </p>

              <p className="hidden text-[9px] uppercase tracking-[0.18em] text-neutral-400 sm:block">
                Event Management
              </p>
            </div>
          </Link>

          {/* NAV */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/events"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
            >
              Events
            </Link>

            <a
              href="#features"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
            >
              How it works
            </a>
          </nav>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 sm:inline-flex"
            >
              Login
            </Link>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Explore Events
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ============================= */}
      {/* HERO */}
      {/* ============================= */}

      <section className="relative overflow-hidden border-b border-neutral-200">
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm">
                <Sparkles size={13} />

                Built for modern institutions
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Technical events,
                <br />

                <span className="text-neutral-400">
                  managed better.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">
                Pedagogy brings event discovery,
                registration, QR attendance,
                results, certificates,
                notifications and analytics
                into one centralized platform.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Discover Events
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-neutral-50"
                >
                  Get Started
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-neutral-500">
                <TrustItem text="Centralized management" />

                <TrustItem text="QR-powered attendance" />

                <TrustItem text="Automated certificates" />
              </div>
            </div>

            {/* RIGHT — PRODUCT PREVIEW */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-neutral-100 blur-2xl" />

              <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
                {/* Window header */}
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                  </div>

                  <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                    Pedagogy Dashboard
                  </span>

                  <div className="h-5 w-5" />
                </div>

                <div className="p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-neutral-400">
                        Overview
                      </p>

                      <p className="mt-1 text-xl font-semibold">
                        Event ecosystem
                      </p>
                    </div>

                    <div className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[10px] font-medium">
                      Live
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <PreviewStat
                      label="Events"
                      value="24"
                    />

                    <PreviewStat
                      label="Students"
                      value="1.2K"
                    />

                    <PreviewStat
                      label="Attendance"
                      value="87%"
                    />
                  </div>

                  {/* Chart */}
                  <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">
                        Registrations
                      </p>

                      <TrendingMini />
                    </div>

                    <div className="mt-5 flex h-28 items-end gap-2">
                      {[35, 52, 43, 68, 56, 82, 72, 95, 76, 100].map(
                        (height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t-md bg-black"
                            style={{
                              height: `${height}%`,
                              opacity:
                                0.25 +
                                index * 0.07,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Event */}
                  <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                          <QrCode size={19} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            AI & ML Hackathon
                          </p>

                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            Innovation Lab · 20 Sep
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold">
                        86 registered
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= */}
      {/* VALUE STRIP */}
      {/* ============================= */}

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-7xl divide-y divide-neutral-200 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ValueItem
            icon={<Users size={19} />}
            title="One participant record"
            description="No more scattered spreadsheets."
          />

          <ValueItem
            icon={<QrCode size={19} />}
            title="Instant verification"
            description="Fast, reliable QR attendance."
          />

          <ValueItem
            icon={<BarChart3 size={19} />}
            title="Actionable analytics"
            description="Understand participation at a glance."
          />
        </div>
      </section>

      {/* ============================= */}
      {/* FEATURES */}
      {/* ============================= */}

      <section
        id="features"
        className="mx-auto max-w-7xl px-6 py-24 lg:py-28"
      >
        <SectionHeading
          eyebrow="Everything connected"
          title="One platform for the entire event lifecycle."
          description="Replace disconnected forms, spreadsheets, messages and manual certificate workflows with one centralized system."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<CalendarDays size={20} />}
            number="01"
            title="Event Discovery"
            description="Students can discover upcoming technical events, view complete details and register from one place."
          />

          <FeatureCard
            icon={<Users size={20} />}
            number="02"
            title="Smart Registration"
            description="Centralized participant records prevent duplicate registrations and simplify capacity management."
          />

          <FeatureCard
            icon={<QrCode size={20} />}
            number="03"
            title="QR Attendance"
            description="Scan participant QR codes to verify registrations and record attendance in seconds."
          />

          <FeatureCard
            icon={<TrophyIcon size={20} />}
            number="04"
            title="Results Management"
            description="Faculty can record positions, scores and remarks while maintaining a structured event record."
          />

          <FeatureCard
            icon={<Award size={20} />}
            number="05"
            title="Digital Certificates"
            description="Generate verifiable winner and participation certificates without manual document preparation."
          />

          <FeatureCard
            icon={<Bell size={20} />}
            number="06"
            title="Real-time Communication"
            description="Send event announcements and keep participants informed through centralized notifications."
          />
        </div>
      </section>

      {/* ============================= */}
      {/* HOW IT WORKS */}
      {/* ============================= */}

      <section
        id="how-it-works"
        className="border-y border-neutral-200 bg-neutral-950 text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
          <SectionHeading
            dark
            eyebrow="Simple by design"
            title="From registration to recognition."
            description="Every stage of a technical event is connected, reducing manual work for institutions and friction for students."
          />

          <div className="mt-16 grid gap-10 md:grid-cols-4">
            <ProcessStep
              number="01"
              icon={<CalendarDays size={20} />}
              title="Discover"
              text="Find relevant events and explore dates, venues, rules and capacity."
            />

            <ProcessStep
              number="02"
              icon={<QrCode size={20} />}
              title="Participate"
              text="Register digitally and use your QR identity for event verification."
            />

            <ProcessStep
              number="03"
              icon={<CheckCircle2 size={20} />}
              title="Compete"
              text="Attendance, results and announcements are managed centrally."
            />

            <ProcessStep
              number="04"
              icon={<Award size={20} />}
              title="Achieve"
              text="Receive digital certificates that can be verified instantly."
            />
          </div>
        </div>
      </section>

      {/* ============================= */}
      {/* ROLE SECTION */}
      {/* ============================= */}

      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-28">
        <SectionHeading
          eyebrow="Built for every stakeholder"
          title="One system. Different perspectives."
          description="Pedagogy gives each role the tools they actually need."
        />

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
      </section>

      {/* ============================= */}
      {/* CTA */}
      {/* ============================= */}

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Sparkles size={21} />
          </div>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Ready to simplify
            technical events?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
            Give students, faculty and
            administrators one place to
            manage the complete event
            experience.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Explore Events
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold hover:bg-neutral-100"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ============================= */}
      {/* FOOTER */}
      {/* ============================= */}

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
                <ShieldCheck size={14} />
              </div>

              <span className="text-sm font-semibold">
                Pedagogy
              </span>
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              Centralized Technical Event
              Management System
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-xs text-neutral-500">
            <Link
              href="/events"
              className="hover:text-black"
            >
              Events
            </Link>

            <Link
              href="/login"
              className="hover:text-black"
            >
              Login
            </Link>

            <span>
              Built for modern institutions
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ================================= */
/* COMPONENTS */
/* ================================= */

function TrustItem({
  text,
}: {
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2
        size={14}
        className="text-neutral-700"
      />

      {text}
    </span>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-[10px] text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

function TrendingMini() {
  return (
    <div className="flex items-end gap-0.5">
      {[3, 5, 4, 7, 6].map(
        (height, index) => (
          <span
            key={index}
            className="w-1 rounded-full bg-black"
            style={{
              height: `${height * 2}px`,
              opacity:
                0.35 + index * 0.12,
            }}
          />
        )
      )}
    </div>
  );
}

function ValueItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 px-2 py-7 sm:px-8">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-neutral-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
          dark
            ? "text-neutral-400"
            : "text-neutral-500"
        }`}
      >
        {eyebrow}
      </p>

      <h2
        className={`mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl ${
          dark
            ? "text-white"
            : "text-neutral-950"
        }`}
      >
        {title}
      </h2>

      <p
        className={`mt-4 text-sm leading-6 sm:text-base ${
          dark
            ? "text-neutral-400"
            : "text-neutral-500"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
          {icon}
        </div>

        <span className="text-xs font-medium text-neutral-300">
          {number}
        </span>
      </div>

      <h3 className="mt-7 text-base font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-neutral-500">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-1 text-xs font-medium text-neutral-400 transition group-hover:text-black">
        Learn more
        <ChevronRight size={13} />
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700">
          {icon}
        </div>

        <span className="text-xs text-neutral-600">
          {number}
        </span>
      </div>

      <h3 className="mt-6 font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-neutral-400">
        {text}
      </p>
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {title}
        </h3>

        <ArrowRight
          size={17}
          className="text-neutral-400"
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2.5 text-sm"
          >
            <CheckCircle2
              size={15}
              className="shrink-0 text-neutral-500"
            />

            {item}
          </div>
        ))}
      </div>
    </div>
  );
}