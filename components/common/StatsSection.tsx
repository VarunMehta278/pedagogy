const stats = [
  {
    value: "100+",
    label: "Technical Events",
  },
  {
    value: "5K+",
    label: "Student Participants",
  },
  {
    value: "2K+",
    label: "Certificates Issued",
  },
  {
    value: "95%",
    label: "Attendance Accuracy",
  },
];

export default function StatsSection() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center px-6 py-10 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {stat.value}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}