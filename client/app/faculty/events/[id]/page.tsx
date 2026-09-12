"use client";

import {
  ArrowLeft,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  QrCode,
  Trash2,
  Trophy,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { loginPathFor } from "@/lib/auth";
import AnnouncementPanel from "@/components/events/AnnouncementPanel";
import JudgingPanel from "@/components/events/JudgingPanel";
import FacultyNavigation from "@/components/layout/FacultyNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  Input,
  Select,
  FieldError,
} from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type EventStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

type Event = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue: string;
  registration_deadline?: string | null;
  participant_limit?: number | null;
  rules?: string | null;
  image_url?: string | null;
  status: EventStatus;
};

type Student = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
};

type Participant = {
  id: string;
  registration_code: string;
  status: string;
  registered_at?: string | null;
  student?: Student | Student[] | null;
  attended: boolean;
};

type ParticipantStats = {
  registered: number;
  attended: number;
  absent: number;
  capacity: number | null;
};

type EventResult = {
  id: string;
  student_id: string;
  position: number;
  score?: number | null;
  remarks?: string | null;
  student?: Student | Student[] | null;
};

/*
 * Supabase returns a joined relation either as an
 * object or as a single-item array depending on the
 * query shape, so every relation is normalised.
 */
function getRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) return null;

  return Array.isArray(relation)
    ? relation[0] || null
    : relation;
}

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRange(event: Event) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || "Time TBA";
}

function getPositionLabel(position: number) {
  if (
    position % 100 >= 11 &&
    position % 100 <= 13
  ) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st`;

    case 2:
      return `${position}nd`;

    case 3:
      return `${position}rd`;

    default:
      return `${position}th`;
  }
}

function initials(name?: string | null) {
  if (!name) return "?";

  return name.charAt(0).toUpperCase();
}

export default function FacultyManageEventPage() {
  const params = useParams();
  const router = useRouter();

  const eventId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [event, setEvent] =
    useState<Event | null>(null);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [participantStats, setParticipantStats] =
    useState<ParticipantStats | null>(null);

  const [results, setResults] =
    useState<EventResult[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [statusUpdating, setStatusUpdating] =
    useState(false);

  /*
   * Result form
   */
  const [resultStudentId, setResultStudentId] =
    useState("");

  const [resultPosition, setResultPosition] =
    useState("");

  const [resultScore, setResultScore] =
    useState("");

  const [resultRemarks, setResultRemarks] =
    useState("");

  const [editingResultId, setEditingResultId] =
    useState<string | null>(null);

  const [savingResult, setSavingResult] =
    useState(false);

  const [resultError, setResultError] =
    useState("");

  /*
   * Certificate feedback, keyed by result id
   * or by `student:<id>` for participation.
   */
  const [certificateBusy, setCertificateBusy] =
    useState<Record<string, boolean>>({});

  const [certificateMessage, setCertificateMessage] =
    useState<Record<string, string>>({});

  const loadEvent = async () => {
    if (!eventId) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * IMPORTANT:
       * Faculty management uses /events/manage
       * because public /events/:id only returns
       * published events.
       */

      const [
        eventsResponse,
        participantsResponse,
        resultsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/events/manage`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),

        fetch(
          `${API_URL}/events/${encodeURIComponent(
            eventId
          )}/participants`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        ),

        fetch(
          `${API_URL}/events/${encodeURIComponent(
            eventId
          )}/results`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        ),
      ]);

      if (
        eventsResponse.status === 401 ||
        eventsResponse.status === 403
      ) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const data =
        await eventsResponse.json();

      if (!eventsResponse.ok) {
        throw new Error(
          data?.message ||
            "Unable to load events"
        );
      }

      const events: Event[] =
        data.events || [];

      const foundEvent = events.find(
        (item) => item.id === eventId
      );

      if (!foundEvent) {
        throw new Error(
          "This event could not be found in your managed events."
        );
      }

      setEvent(foundEvent);

      if (participantsResponse.ok) {
        const participantData =
          await participantsResponse.json();

        setParticipants(
          participantData.participants || []
        );

        setParticipantStats(
          participantData.stats || null
        );
      }

      if (resultsResponse.ok) {
        const resultData =
          await resultsResponse.json();

        setResults(resultData.results || []);
      }
    } catch (err) {
      console.error(
        "Manage event error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load event"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /*
   * Students who already have a result cannot be
   * given a second one, so they are hidden from the
   * result form (unless they are being edited).
   */
  const selectableParticipants = useMemo(() => {
    const usedStudentIds = new Set(
      results
        .filter(
          (result) =>
            result.id !== editingResultId
        )
        .map((result) => result.student_id)
    );

    return participants.filter((participant) => {
      const student = getRelation(
        participant.student
      );

      if (!student) return false;

      return (
        student.id === resultStudentId ||
        !usedStudentIds.has(student.id)
      );
    });
  }, [
    participants,
    results,
    editingResultId,
    resultStudentId,
  ]);

  const attendedParticipants = useMemo(
    () =>
      participants.filter(
        (participant) => participant.attended
      ),
    [participants]
  );

  const updateStatus = async (
    status: EventStatus
  ) => {
    if (!event) return;

    try {
      setStatusUpdating(true);

      const response = await fetch(
        `${API_URL}/events/${encodeURIComponent(
          event.id
        )}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data?.message ||
            "Failed to update event status"
        );

        return;
      }

      setEvent((current) =>
        current
          ? { ...current, status }
          : current
      );
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        "Unable to update event status"
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const resetResultForm = () => {
    setEditingResultId(null);
    setResultStudentId("");
    setResultPosition("");
    setResultScore("");
    setResultRemarks("");
    setResultError("");
  };

  const startEditingResult = (
    result: EventResult
  ) => {
    setEditingResultId(result.id);
    setResultStudentId(result.student_id);
    setResultPosition(
      String(result.position)
    );
    setResultScore(
      result.score === null ||
        result.score === undefined
        ? ""
        : String(result.score)
    );
    setResultRemarks(result.remarks || "");
    setResultError("");

    if (typeof window !== "undefined") {
      document
        .getElementById("results")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }
  };

  const saveResult = async () => {
    if (!event) return;

    setResultError("");

    if (!resultStudentId) {
      setResultError(
        "Select a participant."
      );
      return;
    }

    const position = Number(resultPosition);

    if (
      !resultPosition ||
      !Number.isInteger(position) ||
      position < 1
    ) {
      setResultError(
        "Position must be a positive whole number."
      );
      return;
    }

    try {
      setSavingResult(true);

      const url = editingResultId
        ? `${API_URL}/events/${encodeURIComponent(
            event.id
          )}/results/${encodeURIComponent(
            editingResultId
          )}`
        : `${API_URL}/events/${encodeURIComponent(
            event.id
          )}/results`;

      const response = await fetch(url, {
        method: editingResultId
          ? "PUT"
          : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: resultStudentId,
          position,
          score:
            resultScore === ""
              ? null
              : Number(resultScore),
          remarks:
            resultRemarks.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResultError(
          data?.message ||
            "Failed to save the result"
        );

        return;
      }

      resetResultForm();
      await loadEvent();
    } catch (err) {
      console.error(
        "Save result error:",
        err
      );

      setResultError(
        "Failed to save the result"
      );
    } finally {
      setSavingResult(false);
    }
  };

  const deleteResult = async (
    result: EventResult
  ) => {
    if (!event) return;

    const student = getRelation(
      result.student
    );

    const confirmed = window.confirm(
      `Delete the result for ${
        student?.name || "this participant"
      }?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/events/${encodeURIComponent(
          event.id
        )}/results/${encodeURIComponent(
          result.id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResultError(
          data?.message ||
            "Failed to delete the result"
        );

        return;
      }

      if (editingResultId === result.id) {
        resetResultForm();
      }

      await loadEvent();
    } catch (err) {
      console.error(
        "Delete result error:",
        err
      );

      setResultError(
        "Failed to delete the result"
      );
    }
  };

  const generateCertificate = async (
    key: string,
    url: string
  ) => {
    setCertificateBusy((current) => ({
      ...current,
      [key]: true,
    }));

    setCertificateMessage((current) => ({
      ...current,
      [key]: "",
    }));

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCertificateMessage((current) => ({
          ...current,
          [key]:
            data?.message ||
            "Failed to generate the certificate",
        }));

        return;
      }

      setCertificateMessage((current) => ({
        ...current,
        [key]: data.certificate
          ?.certificate_code
          ? `Ready · ${data.certificate.certificate_code}`
          : data.message ||
            "Certificate ready",
      }));
    } catch (err) {
      console.error(
        "Generate certificate error:",
        err
      );

      setCertificateMessage((current) => ({
        ...current,
        [key]:
          "Failed to generate the certificate",
      }));
    } finally {
      setCertificateBusy((current) => ({
        ...current,
        [key]: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <FacultyNavigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="space-y-8">
            <Skeleton className="h-5 w-32" />

            <Skeleton className="h-72 rounded-3xl sm:h-80" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-24 rounded-2xl" />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
              </div>
              <SkeletonText lines={6} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <FacultyNavigation />

        <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <EmptyState
            icon={CalendarDays}
            title="Unable to open event"
            description={
              error ||
              "The requested event could not be found."
            }
            tone="destructive"
            action={
              <>
                <Link href="/faculty/events">
                  <Button variant="outline">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to events
                  </Button>
                </Link>

                <Button onClick={loadEvent}>Try again</Button>
              </>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FacultyNavigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* BACK */}

        <Link
          href="/faculty/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to events
        </Link>

        {/* ERROR BANNER */}

        {error && (
          <Alert tone="destructive" className="mt-5">
            {error}
          </Alert>
        )}

        {/* HEADER */}

        <section className="mt-7 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative h-72 bg-muted sm:h-80">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted">
                <CalendarDays
                  size={60}
                  className="text-muted-foreground/40"
                  aria-hidden="true"
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-4">
              <span className="rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
                {event.category}
              </span>

              <div className="rounded-full bg-card/95 p-0.5 shadow-sm backdrop-blur-sm">
                <StatusBadge status={event.status} />
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="max-w-4xl text-2xl font-bold tracking-tight sm:text-3xl">
                {event.title}
              </h1>

              <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
                <MapPin size={15} aria-hidden="true" />
                {event.venue}
              </p>
            </div>
          </div>

          {/* EVENT DETAILS */}

          <div className="grid border-t border-border sm:grid-cols-3">
            <EventDetail
              icon={CalendarDays}
              label="Date"
              value={formatDate(
                event.event_date
              )}
            />

            <EventDetail
              icon={Clock3}
              label="Time"
              value={getTimeRange(event)}
            />

            <EventDetail
              icon={MapPin}
              label="Venue"
              value={event.venue}
            />
          </div>

          {/* STATUS CONTROLS */}

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Event status
            </span>

            {event.status === "draft" && (
              <Button
                size="sm"
                variant="brand"
                loading={statusUpdating}
                onClick={() =>
                  updateStatus("published")
                }
              >
                Publish event
              </Button>
            )}

            {event.status === "published" && (
              <Button
                size="sm"
                variant="brand"
                loading={statusUpdating}
                onClick={() =>
                  updateStatus("ongoing")
                }
              >
                Start event
              </Button>
            )}

            {event.status === "ongoing" && (
              <Button
                size="sm"
                variant="brand"
                loading={statusUpdating}
                onClick={() =>
                  updateStatus("completed")
                }
              >
                Mark completed
              </Button>
            )}

            {event.status !== "completed" &&
              event.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusUpdating}
                  onClick={() =>
                    updateStatus("cancelled")
                  }
                >
                  Cancel event
                </Button>
              )}

            {(event.status === "completed" ||
              event.status === "cancelled") && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusUpdating}
                onClick={() =>
                  updateStatus("draft")
                }
              >
                Move back to draft
              </Button>
            )}
          </div>
        </section>

        {/* ACTIONS */}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href={`/faculty/events/${event.id}/scanner`}
            icon={QrCode}
            title="Scan attendance"
            description="Scan participant QR codes"
            dark
          />

          <ActionCard
            href={`/faculty/events/${event.id}#participants`}
            icon={Users}
            title="Participants"
            description={`${
              participantStats?.registered ?? 0
            } registered`}
          />

          <ActionCard
            href={`/faculty/events/${event.id}#results`}
            icon={Trophy}
            title="Results"
            description={`${results.length} recorded`}
          />

          <ActionCard
            href={`/faculty/events/${event.id}#certificates`}
            icon={Award}
            title="Certificates"
            description="Generate certificates"
          />
        </section>

        {/* CONTENT */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}

          <div className="space-y-6">
            {/* DESCRIPTION */}

            <Card>
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                  About the event
                </p>

                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  Event overview
                </h2>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {event.description ||
                    "No description has been added for this event yet."}
                </p>
              </CardContent>
            </Card>

            {/* PARTICIPANT MANAGEMENT */}

            <Card
              id="participants"
              className="scroll-mt-24"
            >
              <CardContent className="p-6">
                <SectionHeader
                  icon={Users}
                  title="Participants"
                  description="Manage registrations and attendance."
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Registered"
                    value={
                      participantStats?.registered ??
                      participants.length
                    }
                    icon={Users}
                    tone="brand"
                  />

                  <StatCard
                    label="Attended"
                    value={
                      participantStats?.attended ??
                      attendedParticipants.length
                    }
                    icon={CheckCircle2}
                    tone="success"
                  />

                  <StatCard
                    label="Capacity"
                    value={
                      event.participant_limit
                        ? event.participant_limit
                        : "Unlimited"
                    }
                    icon={Users}
                    tone="violet"
                  />
                </div>

                {participants.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    icon={Users}
                    title="No registrations yet"
                    description="No students have registered for this event yet."
                  />
                ) : (
                  <div className="mt-6 max-h-[420px] overflow-auto rounded-xl border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            Student
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Contact
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Code
                          </th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Attendance
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {participants.map(
                          (participant) => {
                            const student =
                              getRelation(
                                participant.student
                              );

                            return (
                              <tr
                                key={participant.id}
                                className="transition-colors duration-150 hover:bg-accent/40"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-primary">
                                      {initials(
                                        student?.name
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">
                                        {student?.name ||
                                          "Unknown student"}
                                      </p>

                                      <p className="truncate text-xs text-muted-foreground">
                                        {student?.department
                                          ? student.department
                                          : "—"}
                                        {student?.year
                                          ? ` · Year ${student.year}`
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {student?.email || "—"}
                                </td>

                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  {
                                    participant.registration_code
                                  }
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <Badge
                                    variant={
                                      participant.attended
                                        ? "success"
                                        : "muted"
                                    }
                                    className="ml-auto"
                                  >
                                    {participant.attended ? (
                                      <CheckCircle2
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <XCircle
                                        aria-hidden="true"
                                      />
                                    )}
                                    {participant.attended
                                      ? "Attended"
                                      : "Not attended"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <Link href={`/faculty/events/${event.id}/scanner`}>
                  <Button className="mt-6">
                    <QrCode size={16} aria-hidden="true" />
                    Open QR scanner
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* RESULTS */}

            <Card
              id="results"
              className="scroll-mt-24"
            >
              <CardContent className="p-6">
                <SectionHeader
                  icon={Trophy}
                  title="Results"
                  description="Manage winners and event results."
                />

                {/* RESULT FORM */}

                <div className="mt-6 rounded-xl bg-muted p-5">
                  <p className="text-sm font-medium text-foreground">
                    {editingResultId
                      ? "Edit result"
                      : "Add a result"}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                    <Select
                      value={resultStudentId}
                      onChange={(e) =>
                        setResultStudentId(
                          e.target.value
                        )
                      }
                      disabled={Boolean(
                        editingResultId
                      )}
                      aria-label="Participant"
                    >
                      <option value="">
                        Select participant
                      </option>

                      {selectableParticipants.map(
                        (participant) => {
                          const student =
                            getRelation(
                              participant.student
                            );

                          if (!student) {
                            return null;
                          }

                          return (
                            <option
                              key={student.id}
                              value={student.id}
                            >
                              {student.name}
                            </option>
                          );
                        }
                      )}
                    </Select>

                    <Input
                      type="number"
                      min={1}
                      value={resultPosition}
                      onChange={(e) =>
                        setResultPosition(
                          e.target.value
                        )
                      }
                      placeholder="Position"
                      aria-label="Position"
                    />

                    <Input
                      type="number"
                      value={resultScore}
                      onChange={(e) =>
                        setResultScore(
                          e.target.value
                        )
                      }
                      placeholder="Score (optional)"
                      aria-label="Score"
                    />
                  </div>

                  <Input
                    type="text"
                    value={resultRemarks}
                    onChange={(e) =>
                      setResultRemarks(
                        e.target.value
                      )
                    }
                    placeholder="Remarks (optional)"
                    aria-label="Remarks"
                    className="mt-3"
                  />

                  <FieldError>{resultError}</FieldError>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={saveResult}
                      loading={savingResult}
                      loadingText={
                        editingResultId
                          ? "Updating…"
                          : "Adding…"
                      }
                    >
                      {editingResultId
                        ? "Update result"
                        : "Add result"}
                    </Button>

                    {editingResultId && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={resetResultForm}
                      >
                        Cancel
                      </Button>
                    )}

                    {participants.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Results can only be added for
                        registered participants.
                      </span>
                    )}
                  </div>
                </div>

                {/* RESULT LIST */}

                {results.length > 0 && (
                  <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {[...results]
                      .sort(
                        (a, b) =>
                          a.position - b.position
                      )
                      .map((result) => {
                        const student =
                          getRelation(
                            result.student
                          );

                        return (
                          <div
                            key={result.id}
                            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <PositionBadge
                                position={
                                  result.position
                                }
                              />

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {student?.name ||
                                    "Unknown student"}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {result.score !==
                                    null &&
                                  result.score !==
                                    undefined
                                    ? `Score ${result.score}`
                                    : "No score"}

                                  {result.remarks
                                    ? ` · ${result.remarks}`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                  startEditingResult(
                                    result
                                  )
                                }
                                aria-label="Edit result"
                              >
                                <Pencil
                                  size={14}
                                  aria-hidden="true"
                                />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                  deleteResult(
                                    result
                                  )
                                }
                                aria-label="Delete result"
                              >
                                <Trash2
                                  size={14}
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CERTIFICATES */}

            <Card
              id="certificates"
              className="scroll-mt-24"
            >
              <CardContent className="p-6">
                <SectionHeader
                  icon={Award}
                  title="Certificates"
                  description="Generate winner and participation certificates."
                />

                {/* WINNER CERTIFICATES */}

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Winner certificates
                </p>

                {results.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-muted p-5 text-sm text-muted-foreground">
                    Add event results first — winner
                    certificates are generated from
                    recorded positions.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {[...results]
                      .sort(
                        (a, b) =>
                          a.position - b.position
                      )
                      .map((result) => {
                        const student =
                          getRelation(
                            result.student
                          );

                        const key = result.id;

                        return (
                          <CertificateRow
                            key={key}
                            name={
                              student?.name ||
                              "Unknown student"
                            }
                            detail={`${getPositionLabel(
                              result.position
                            )} place`}
                            busy={Boolean(
                              certificateBusy[key]
                            )}
                            message={
                              certificateMessage[
                                key
                              ]
                            }
                            onGenerate={() =>
                              generateCertificate(
                                key,
                                `${API_URL}/certificates/events/${encodeURIComponent(
                                  event.id
                                )}/results/${encodeURIComponent(
                                  result.id
                                )}`
                              )
                            }
                          />
                        );
                      })}
                  </div>
                )}

                {/* PARTICIPATION CERTIFICATES */}

                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Participation certificates
                </p>

                {attendedParticipants.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-muted p-5 text-sm text-muted-foreground">
                    Participation certificates become
                    available once attendance has been
                    marked.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {attendedParticipants.map(
                      (participant) => {
                        const student =
                          getRelation(
                            participant.student
                          );

                        if (!student) return null;

                        const key = `student:${student.id}`;

                        return (
                          <CertificateRow
                            key={key}
                            name={student.name}
                            detail={
                              student.department ||
                              "Attended"
                            }
                            busy={Boolean(
                              certificateBusy[key]
                            )}
                            message={
                              certificateMessage[
                                key
                              ]
                            }
                            onGenerate={() =>
                              generateCertificate(
                                key,
                                `${API_URL}/certificates/events/${encodeURIComponent(
                                  event.id
                                )}/students/${encodeURIComponent(
                                  student.id
                                )}`
                              )
                            }
                          />
                        );
                      }
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* JUDGING */}

            <section id="judging" className="scroll-mt-24">
              <JudgingPanel eventId={event.id} />
            </section>

            {/* ANNOUNCEMENTS */}

            <section
              id="announcements"
              className="scroll-mt-24"
            >
              <AnnouncementPanel
                eventId={event.id}
                participantCount={
                  participantStats?.registered ??
                  participants.length
                }
              />
            </section>
          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="space-y-6">
            {/* QUICK ACTIONS */}

            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Quick actions
                </p>

                <div className="mt-4 space-y-1">
                  <SideAction
                    href={`/faculty/events/${event.id}/scanner`}
                    icon={QrCode}
                    title="Scan QR"
                  />

                  <SideAction
                    href="#participants"
                    icon={Users}
                    title="Participants"
                  />

                  <SideAction
                    href="#results"
                    icon={Trophy}
                    title="Results"
                  />

                  <SideAction
                    href="#certificates"
                    icon={Award}
                    title="Certificates"
                  />

                  <SideAction
                    href="#announcements"
                    icon={Bell}
                    title="Announcements"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ATTENDANCE SNAPSHOT */}

            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Attendance
                </p>

                <div className="mt-5 space-y-4">
                  <Info
                    label="Registered"
                    value={String(
                      participantStats?.registered ??
                        participants.length
                    )}
                  />

                  <Info
                    label="Attended"
                    value={String(
                      participantStats?.attended ??
                        attendedParticipants.length
                    )}
                  />

                  <Info
                    label="Absent"
                    value={String(
                      participantStats?.absent ??
                        participants.length -
                          attendedParticipants.length
                    )}
                  />

                  <Info
                    label="Results recorded"
                    value={String(results.length)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* EVENT INFORMATION */}

            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Event information
                </p>

                <div className="mt-5 space-y-4">
                  <Info
                    label="Category"
                    value={event.category}
                  />

                  <Info
                    label="Status"
                    value={
                      event.status
                        .charAt(0)
                        .toUpperCase() +
                      event.status.slice(1)
                    }
                  />

                  <Info
                    label="Participant limit"
                    value={
                      event.participant_limit
                        ? String(
                            event.participant_limit
                          )
                        : "Unlimited"
                    }
                  />

                  <Info
                    label="Registration deadline"
                    value={
                      event.registration_deadline
                        ? new Date(
                            event.registration_deadline
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Not specified"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* RULES */}

            {event.rules && (
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Rules
                  </p>

                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {event.rules}
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------- */
/* POSITION BADGE                   */
/* -------------------------------- */

function PositionBadge({
  position,
}: {
  position: number;
}) {
  if (position > 3) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {getPositionLabel(position)}
      </span>
    );
  }

  const tones: Record<
    number,
    string
  > = {
    1: "bg-warning/15 text-warning ring-1 ring-warning/30",
    2: "bg-muted text-foreground ring-1 ring-border",
    3: "bg-violet-subtle text-violet ring-1 ring-violet/25",
  };

  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full",
        tones[position]
      )}
      title={`${getPositionLabel(position)} place`}
    >
      <Trophy size={15} aria-hidden="true" />
    </span>
  );
}

/* -------------------------------- */
/* CERTIFICATE ROW */
/* -------------------------------- */

function CertificateRow({
  name,
  detail,
  busy,
  message,
  onGenerate,
}: {
  name: string;
  detail: string;
  busy: boolean;
  message?: string;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {name}
        </p>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {message || detail}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onGenerate}
        loading={busy}
        loadingText="Generating…"
        className="w-fit shrink-0"
      >
        <Award size={13} aria-hidden="true" />
        Generate
      </Button>
    </div>
  );
}

/* -------------------------------- */
/* EVENT DETAIL */
/* -------------------------------- */

function EventDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={17} aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- */
/* ACTION CARD */
/* -------------------------------- */

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  dark = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-2xl border p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
        dark
          ? "border-transparent bg-gradient-brand text-white shadow-brand hover:shadow-brand-lg"
          : "border-border bg-card text-foreground hover:border-primary/30"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          dark
            ? "bg-primary-foreground/15"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon size={19} aria-hidden="true" />
      </div>

      <p className="mt-4 text-sm font-semibold">
        {title}
      </p>

      <p
        className={cn(
          "mt-1 text-xs",
          dark
            ? "text-white/70"
            : "text-muted-foreground"
        )}
      >
        {description}
      </p>
    </Link>
  );
}

/* -------------------------------- */
/* SECTION HEADER */
/* -------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-primary">
        <Icon size={18} aria-hidden="true" />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- */
/* SIDE ACTION */
/* -------------------------------- */

function SideAction({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent/60 hover:text-foreground"
    >
      <Icon size={16} className="text-muted-foreground" aria-hidden="true" />
      {title}
    </Link>
  );
}

/* -------------------------------- */
/* INFO */
/* -------------------------------- */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

      <span className="tabular text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
