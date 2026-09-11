"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import FacultyNavigation from "@/components/layout/FacultyNavigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Input,
  Textarea,
  Select,
  Label,
  FieldHint,
  FieldError,
} from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { loginPathFor } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export default function CreateEventPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Hackathon",
    event_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    registration_deadline: "",
    participant_limit: "",
    rules: "",
    image_url: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Presentation-only: surfaces the same rules handleSubmit enforces,
     inline, once the organiser has tried to submit at least once. */
  const [attempted, setAttempted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const titleError =
    attempted && !form.title.trim()
      ? "Event title is required"
      : "";

  const eventDateError =
    attempted && !form.event_date
      ? "Event date is required"
      : "";

  const venueError =
    attempted && !form.venue.trim()
      ? "Venue is required"
      : "";

  const participantLimitError =
    attempted &&
    form.participant_limit &&
    Number(form.participant_limit) <= 0
      ? "Participant limit must be greater than 0"
      : "";

  const timeOrderError =
    attempted &&
    form.start_time &&
    form.end_time &&
    form.start_time >= form.end_time
      ? "End time must be later than start time"
      : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setAttempted(true);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!form.title.trim()) {
        throw new Error("Event title is required");
      }

      if (!form.event_date) {
        throw new Error("Event date is required");
      }

      if (!form.venue.trim()) {
        throw new Error("Venue is required");
      }

      if (
        form.participant_limit &&
        Number(form.participant_limit) <= 0
      ) {
        throw new Error(
          "Participant limit must be greater than 0"
        );
      }

      if (
        form.start_time &&
        form.end_time &&
        form.start_time >= form.end_time
      ) {
        throw new Error(
          "End time must be later than start time"
        );
      }

      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          venue: form.venue.trim(),
          registration_deadline:
            form.registration_deadline || null,
          participant_limit: form.participant_limit
            ? Number(form.participant_limit)
            : null,
          rules: form.rules.trim() || null,
          image_url: form.image_url.trim() || null,
        }),
      });

      if (response.status === 401) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create event"
        );
      }

      setSuccess("Event created successfully.");

      setTimeout(() => {
        router.push("/faculty/dashboard");
      }, 900);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FacultyNavigation />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Page heading */}

        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Faculty workspace
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create a new event
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add the details for your technical event. Your event
            will be saved as a draft and can be published when
            you&apos;re ready.
          </p>
        </div>

        {/* Alerts */}

        {error && (
          <Alert tone="destructive" title="Unable to create event" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert tone="success" title="Event created" className="mb-6">
            Redirecting you to your dashboard…
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Basics */}

          <FormSection
            number="01"
            title="Basics"
            description="Give your event a clear identity."
          >
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" required>
                  Event title
                </Label>

                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. AI & Machine Learning Hackathon"
                  aria-invalid={Boolean(titleError)}
                  required
                />

                {titleError ? (
                  <FieldError>{titleError}</FieldError>
                ) : (
                  <FieldHint>Use a short, descriptive name.</FieldHint>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>

                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the event, its purpose and what participants can expect..."
                  rows={5}
                />

                <FieldHint>
                  Tell participants what the event is about.
                </FieldHint>
              </div>

              <div>
                <Label htmlFor="category" required>
                  Category
                </Label>

                <Select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Hackathon">Hackathon</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Technical Competition">
                    Technical Competition
                  </option>
                  <option value="Coding Contest">Coding Contest</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>
          </FormSection>

          {/* Schedule */}

          <FormSection
            number="02"
            title="Schedule"
            description="When will the event take place?"
          >
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="event_date" required>
                  Event date
                </Label>

                <Input
                  type="date"
                  id="event_date"
                  name="event_date"
                  value={form.event_date}
                  onChange={handleChange}
                  aria-invalid={Boolean(eventDateError)}
                  required
                />

                <FieldError>{eventDateError}</FieldError>
              </div>

              <div>
                <Label htmlFor="start_time">Start time</Label>

                <Input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  aria-invalid={Boolean(timeOrderError)}
                />
              </div>

              <div>
                <Label htmlFor="end_time">End time</Label>

                <Input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  aria-invalid={Boolean(timeOrderError)}
                />

                {timeOrderError && (
                  <FieldError>{timeOrderError}</FieldError>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="registration_deadline">
                  Registration deadline
                </Label>

                <Input
                  type="datetime-local"
                  id="registration_deadline"
                  name="registration_deadline"
                  value={form.registration_deadline}
                  onChange={handleChange}
                />

                <FieldHint>
                  Participants won&apos;t be able to register after this time.
                </FieldHint>
              </div>
            </div>
          </FormSection>

          {/* Venue & capacity */}

          <FormSection
            number="03"
            title="Venue & capacity"
            description="Where it happens, and how many can attend."
          >
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="venue" required>
                  Venue
                </Label>

                <Input
                  id="venue"
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="e.g. Innovation Lab"
                  aria-invalid={Boolean(venueError)}
                  required
                />

                <FieldError>{venueError}</FieldError>
              </div>

              <div>
                <Label htmlFor="participant_limit">
                  Participant limit
                </Label>

                <Input
                  type="number"
                  id="participant_limit"
                  name="participant_limit"
                  value={form.participant_limit}
                  onChange={handleChange}
                  placeholder="e.g. 120"
                  min="1"
                  aria-invalid={Boolean(participantLimitError)}
                />

                {participantLimitError ? (
                  <FieldError>{participantLimitError}</FieldError>
                ) : (
                  <FieldHint>Leave empty if there is no maximum.</FieldHint>
                )}
              </div>
            </div>
          </FormSection>

          {/* Rules */}

          <FormSection
            number="04"
            title="Rules"
            description="Share anything participants need to know, and an optional image for the listing."
          >
            <div className="space-y-6">
              <div>
                <Label htmlFor="rules">Event rules</Label>

                <Textarea
                  id="rules"
                  name="rules"
                  value={form.rules}
                  onChange={handleChange}
                  placeholder={`Participants must carry their college ID.\n\nTeams can have 2–4 members.\n\nParticipants must report 15 minutes before the event.`}
                  rows={8}
                />

                <FieldHint>
                  You can add multiple rules on separate lines.
                </FieldHint>
              </div>

              <div>
                <Label htmlFor="image_url">Image URL</Label>

                <Input
                  id="image_url"
                  name="image_url"
                  value={form.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/event-image.jpg"
                />

                <FieldHint>
                  Optional. Image uploads through Supabase Storage can be
                  added later.
                </FieldHint>

                {form.image_url ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={form.image_url}
                      alt="Event preview"
                      className="max-h-72 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-4 text-xs text-muted-foreground">
                    <Eye size={16} aria-hidden="true" />
                    No image yet — the listing will use a category default.
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Bottom actions */}

          <div className="flex flex-col-reverse items-stretch justify-between gap-4 pt-3 sm:flex-row sm:items-center">
            <Link
              href="/faculty/dashboard"
              className="py-2.5 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </Link>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={loading}
              loadingText="Creating event…"
            >
              Create event
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Your event will be created as a draft. You can publish
            it from the faculty dashboard.
          </p>
        </form>
      </main>
    </div>
  );
}

/* -------------------------------- */
/* Form Section                     */
/* -------------------------------- */

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-5 overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex items-start gap-4">
          <span className="pt-1 text-[11px] font-medium text-muted-foreground">
            {number}
          </span>

          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
