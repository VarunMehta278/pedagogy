import {
  CalendarDays,
  QrCode,
  Award,
  BarChart3,
  Bell,
  Users,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Smart Event Management",
    description:
      "Create, publish, schedule, and manage technical events from one centralized platform.",
  },
  {
    icon: QrCode,
    title: "QR-Based Attendance",
    description:
      "Verify participants instantly using secure QR codes and eliminate manual attendance.",
  },
  {
    icon: Award,
    title: "Instant Certificates",
    description:
      "Automatically generate and distribute digital certificates after an event.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Track registrations, attendance, participation, and event performance through dashboards.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Keep students and organizers updated with event reminders, results, and announcements.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Dedicated experiences for students, faculty, volunteers, judges, and administrators.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Everything in one place
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run better events
          </h2>

          <p className="mt-4 text-muted-foreground">
            From the first registration to the final certificate,
            Pedagogy simplifies the entire technical event lifecycle.
          </p>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-lg font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}