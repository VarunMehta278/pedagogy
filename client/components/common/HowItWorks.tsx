import { CalendarPlus, UserPlus, QrCode, Award } from "lucide-react";

import { RevealOnScroll, Stagger, StaggerItem } from "@/components/motion/reveal";

const steps = [
  {
    number: "01",
    icon: CalendarPlus,
    title: "Create an Event",
    description:
      "Faculty coordinators create and publish technical events with schedules, venues, rules, and participant limits.",
  },
  {
    number: "02",
    icon: UserPlus,
    title: "Students Register",
    description:
      "Students discover events, register online, and receive a unique digital event pass with a QR code.",
  },
  {
    number: "03",
    icon: QrCode,
    title: "Verify & Attend",
    description:
      "Volunteers scan participant QR codes at the venue and attendance is recorded instantly.",
  },
  {
    number: "04",
    icon: Award,
    title: "Results & Certificates",
    description:
      "Judges evaluate participants, results are published, and certificates are generated automatically.",
  },
];

export default function HowItWorks() {
  return (
    <section className="border-y bg-muted/30 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Simple workflow
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From registration to recognition
          </h2>

          <p className="mt-4 text-muted-foreground">
            Pedagogy connects every stage of a technical event in one
            seamless workflow.
          </p>
        </RevealOnScroll>

        {/* Steps */}
        <Stagger onScroll className="relative mt-16 grid gap-10 md:grid-cols-4">
          {/* Connecting Line */}
          <div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-brand opacity-30 md:block" />

          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <StaggerItem key={step.number} className="relative flex flex-col items-center text-center">
                {/* Icon */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-background shadow-sm">
                  <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>

                {/* Number */}
                <span className="tabular mt-5 text-xs font-semibold tracking-widest text-primary">
                  STEP {step.number}
                </span>

                {/* Title */}
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>

                {/* Description */}
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
