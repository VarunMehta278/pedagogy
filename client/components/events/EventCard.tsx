"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(image) && !imageFailed;

  return (
    <Card interactive className="group flex h-full flex-col overflow-hidden p-0">
      <div className="relative h-48 shrink-0 overflow-hidden bg-muted">
        {hasImage ? (
          <>
            <img
              src={image}
              alt={title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Gradient scrim so the category chip stays legible over any photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
          </>
        ) : (
          <div className="bg-aurora flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
            <Ticket className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs font-medium">No image available</span>
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur">
          {category}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-tight">{title}</h3>

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{date}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{participants} participants</span>
          </div>
        </div>

        <Link href={`/events/${id}`} className="mt-5 block">
          <Button variant="brand" block>
            View Event
          </Button>
        </Link>
      </div>
    </Card>
  );
}
