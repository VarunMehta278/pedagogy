import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";

interface EventCardProps {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  participants: number;
  image: string;
}

export default function EventCard({
  id,
  title,
  category,
  date,
  venue,
  participants,
  image,
}: EventCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur">
          {category}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold">{title}</h3>

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span>{date}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>{participants} participants</span>
          </div>
        </div>

        <Link
          href={`/events/${id}`}
          className="mt-5 block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          View Event
        </Link>
      </div>
    </div>
  );
}