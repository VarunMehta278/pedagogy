"use client";

import {
  ArrowLeft,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  QrCode,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { loginPathFor } from "@/lib/auth";
import AnnouncementPanel from "@/components/events/AnnouncementPanel";
import FacultyNavigation from "@/components/layout/FacultyNavigation";

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

function statusClasses(status: EventStatus) {
  switch (status) {
    case "published":
      return "bg-neutral-100 text-neutral-700";

    case "ongoing":
      return "bg-black text-white";

    case "completed":
      return "bg-neutral-200 text-neutral-600";

    case "cancelled":
      return "bg-neutral-100 text-neutral-400";

    case "draft":
    default:
      return "border border-neutral-200 bg-white text-neutral-500";
  }
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
      <div className="min-h-screen bg-[#fafafa]">
        <FacultyNavigation />

        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="animate-pulse">
            <div className="h-5 w-32 rounded bg-neutral-200" />

            <div className="mt-8 h-10 w-2/3 rounded bg-neutral-200" />

            <div className="mt-4 h-5 w-1/2 rounded bg-neutral-200" />

            <div className="mt-10 h-64 rounded-2xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <FacultyNavigation />

        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <CalendarDays
              size={22}
              className="text-neutral-400"
            />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Unable to open event
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-500">
            {error ||
              "The requested event could not be found."}
          </p>

          <div className="mt-7 flex justify-center gap-3">
            <Link
              href="/faculty/events"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              <ArrowLeft size={16} />
              Back to Events
            </Link>

            <button
              type="button"
              onClick={loadEvent}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <FacultyNavigation />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* BACK */}

        <Link
          href="/faculty/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to Events
        </Link>

        {/* ERROR BANNER */}

        {error && (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            {error}
          </div>
        )}

        {/* HEADER */}

        <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          <div className="relative h-72 bg-neutral-100 sm:h-80">
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
              <div className="flex h-full items-center justify-center bg-neutral-100">
                <CalendarDays
                  size={60}
                  className="text-neutral-300"
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-4">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
                {event.category}
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(
                  event.status
                )}`}
              >
                {event.status
                  .charAt(0)
                  .toUpperCase() +
                  event.status.slice(1)}
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {event.title}
              </h1>

              <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
                <MapPin size={15} />
                {event.venue}
              </p>
            </div>
          </div>

          {/* EVENT DETAILS */}

          <div className="grid border-t border-neutral-100 sm:grid-cols-3">
            <EventDetail
              icon={<CalendarDays size={17} />}
              label="Date"
              value={formatDate(
                event.event_date
              )}
            />

            <EventDetail
              icon={<Clock3 size={17} />}
              label="Time"
              value={getTimeRange(event)}
            />

            <EventDetail
              icon={<MapPin size={17} />}
              label="Venue"
              value={event.venue}
            />
          </div>

          {/* STATUS CONTROLS */}

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-6 py-5">
            <span className="mr-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Event status
            </span>

            {event.status === "draft" && (
              <StatusButton
                label="Publish event"
                onClick={() =>
                  updateStatus("published")
                }
                disabled={statusUpdating}
                primary
              />
            )}

            {event.status === "published" && (
              <StatusButton
                label="Start event"
                onClick={() =>
                  updateStatus("ongoing")
                }
                disabled={statusUpdating}
                primary
              />
            )}

            {event.status === "ongoing" && (
              <StatusButton
                label="Mark completed"
                onClick={() =>
                  updateStatus("completed")
                }
                disabled={statusUpdating}
                primary
              />
            )}

            {event.status !== "completed" &&
              event.status !== "cancelled" && (
                <StatusButton
                  label="Cancel event"
                  onClick={() =>
                    updateStatus("cancelled")
                  }
                  disabled={statusUpdating}
                />
              )}

            {(event.status === "completed" ||
              event.status === "cancelled") && (
              <StatusButton
                label="Move back to draft"
                onClick={() =>
                  updateStatus("draft")
                }
                disabled={statusUpdating}
              />
            )}
          </div>
        </section>

        {/* ACTIONS */}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href={`/faculty/events/${event.id}/scanner`}
            icon={<QrCode size={19} />}
            title="Scan Attendance"
            description="Scan participant QR codes"
            dark
          />

          <ActionCard
            href={`/faculty/events/${event.id}#participants`}
            icon={<Users size={19} />}
            title="Participants"
            description={`${
              participantStats?.registered ?? 0
            } registered`}
          />

          <ActionCard
            href={`/faculty/events/${event.id}#results`}
            icon={<Trophy size={19} />}
            title="Results"
            description={`${results.length} recorded`}
          />

          <ActionCard
            href={`/faculty/events/${event.id}#certificates`}
            icon={<Award size={19} />}
            title="Certificates"
            description="Generate certificates"
          />
        </section>

        {/* CONTENT */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}

          <div className="space-y-6">
            {/* DESCRIPTION */}

            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                About the event
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Event Overview
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-600">
                {event.description ||
                  "No description has been added for this event yet."}
              </p>
            </section>

            {/* PARTICIPANT MANAGEMENT */}

            <section
              id="participants"
              className="scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <SectionHeader
                icon={<Users size={18} />}
                title="Participants"
                description="Manage registrations and attendance."
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <MiniStat
                  label="Registered"
                  value={String(
                    participantStats?.registered ??
                      participants.length
                  )}
                />

                <MiniStat
                  label="Attended"
                  value={String(
                    participantStats?.attended ??
                      attendedParticipants.length
                  )}
                />

                <MiniStat
                  label="Capacity"
                  value={
                    event.participant_limit
                      ? String(
                          event.participant_limit
                        )
                      : "Unlimited"
                  }
                />
              </div>

              {participants.length === 0 ? (
                <p className="mt-6 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">
                  No students have registered for
                  this event yet.
                </p>
              ) : (
                <div className="mt-6 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
                  {participants.map(
                    (participant) => {
                      const student =
                        getRelation(
                          participant.student
                        );

                      return (
                        <div
                          key={participant.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {student?.name ||
                                "Unknown student"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-neutral-400">
                              {student?.email ||
                                "—"}
                              {student?.department
                                ? ` · ${student.department}`
                                : ""}
                              {student?.year
                                ? ` · Year ${student.year}`
                                : ""}
                            </p>

                            <p className="mt-1 font-mono text-[11px] text-neutral-400">
                              {
                                participant.registration_code
                              }
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                              participant.attended
                                ? "bg-black text-white"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {participant.attended && (
                              <CheckCircle2
                                size={12}
                              />
                            )}

                            {participant.attended
                              ? "Attended"
                              : "Not attended"}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              <Link
                href={`/faculty/events/${event.id}/scanner`}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <QrCode size={16} />
                Open QR Scanner
              </Link>
            </section>

            {/* RESULTS */}

            <section
              id="results"
              className="scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <SectionHeader
                icon={<Trophy size={18} />}
                title="Results"
                description="Manage winners and event results."
              />

              {/* RESULT FORM */}

              <div className="mt-6 rounded-xl bg-neutral-50 p-5">
                <p className="text-sm font-medium">
                  {editingResultId
                    ? "Edit result"
                    : "Add a result"}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                  <select
                    value={resultStudentId}
                    onChange={(e) =>
                      setResultStudentId(
                        e.target.value
                      )
                    }
                    disabled={Boolean(
                      editingResultId
                    )}
                    className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-black disabled:opacity-60"
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
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={resultPosition}
                    onChange={(e) =>
                      setResultPosition(
                        e.target.value
                      )
                    }
                    placeholder="Position"
                    className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />

                  <input
                    type="number"
                    value={resultScore}
                    onChange={(e) =>
                      setResultScore(
                        e.target.value
                      )
                    }
                    placeholder="Score (optional)"
                    className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </div>

                <input
                  type="text"
                  value={resultRemarks}
                  onChange={(e) =>
                    setResultRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Remarks (optional)"
                  className="mt-3 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-black"
                />

                {resultError && (
                  <p className="mt-3 text-xs text-neutral-600">
                    {resultError}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveResult}
                    disabled={savingResult}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {savingResult && (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    )}

                    {editingResultId
                      ? "Update result"
                      : "Add result"}
                  </button>

                  {editingResultId && (
                    <button
                      type="button"
                      onClick={resetResultForm}
                      className="text-sm font-medium text-neutral-500 hover:text-black"
                    >
                      Cancel
                    </button>
                  )}

                  {participants.length === 0 && (
                    <span className="text-xs text-neutral-400">
                      Results can only be added for
                      registered participants.
                    </span>
                  )}
                </div>
              </div>

              {/* RESULT LIST */}

              {results.length > 0 && (
                <div className="mt-5 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
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
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                              {getPositionLabel(
                                result.position
                              )}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {student?.name ||
                                  "Unknown student"}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-neutral-400">
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
                            <button
                              type="button"
                              onClick={() =>
                                startEditingResult(
                                  result
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-black hover:text-black"
                              aria-label="Edit result"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteResult(
                                  result
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-black hover:text-black"
                              aria-label="Delete result"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {/* CERTIFICATES */}

            <section
              id="certificates"
              className="scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <SectionHeader
                icon={<Award size={18} />}
                title="Certificates"
                description="Generate winner and participation certificates."
              />

              {/* WINNER CERTIFICATES */}

              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-neutral-400">
                Winner certificates
              </p>

              {results.length === 0 ? (
                <p className="mt-3 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">
                  Add event results first — winner
                  certificates are generated from
                  recorded positions.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
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

              <p className="mt-8 text-xs font-medium uppercase tracking-wider text-neutral-400">
                Participation certificates
              </p>

              {attendedParticipants.length === 0 ? (
                <p className="mt-3 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">
                  Participation certificates become
                  available once attendance has been
                  marked.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
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

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Quick actions
              </p>

              <div className="mt-4 space-y-2">
                <SideAction
                  href={`/faculty/events/${event.id}/scanner`}
                  icon={<QrCode size={16} />}
                  title="Scan QR"
                />

                <SideAction
                  href="#participants"
                  icon={<Users size={16} />}
                  title="Participants"
                />

                <SideAction
                  href="#results"
                  icon={<Trophy size={16} />}
                  title="Results"
                />

                <SideAction
                  href="#certificates"
                  icon={<Award size={16} />}
                  title="Certificates"
                />

                <SideAction
                  href="#announcements"
                  icon={<Bell size={16} />}
                  title="Announcements"
                />
              </div>
            </section>

            {/* ATTENDANCE SNAPSHOT */}

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
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
            </section>

            {/* EVENT INFORMATION */}

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
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
            </section>

            {/* RULES */}

            {event.rules && (
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Rules
                </p>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-neutral-600">
                  {event.rules}
                </p>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------- */
/* STATUS BUTTON */
/* -------------------------------- */

function StatusButton({
  label,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
        primary
          ? "bg-black text-white hover:bg-neutral-800"
          : "border border-neutral-200 text-neutral-600 hover:border-black hover:text-black"
      }`}
    >
      {label}
    </button>
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
        <p className="truncate text-sm font-medium">
          {name}
        </p>

        <p className="mt-0.5 truncate text-xs text-neutral-400">
          {message || detail}
        </p>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={busy}
        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 py-2 text-xs font-medium transition hover:border-black disabled:opacity-50"
      >
        {busy ? (
          <Loader2
            size={13}
            className="animate-spin"
          />
        ) : (
          <Award size={13} />
        )}

        {busy ? "Generating" : "Generate"}
      </button>
    </div>
  );
}

/* -------------------------------- */
/* EVENT DETAIL */
/* -------------------------------- */

function EventDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-100 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-neutral-700">
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
  icon,
  title,
  description,
  dark = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition ${
        dark
          ? "border-black bg-black text-white hover:bg-neutral-800"
          : "border-neutral-200 bg-white text-black hover:border-neutral-300 hover:shadow-md"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          dark
            ? "bg-white/10"
            : "bg-neutral-100"
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-semibold">
        {title}
      </p>

      <p
        className={`mt-1 text-xs ${
          dark
            ? "text-white/60"
            : "text-neutral-400"
        }`}
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
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        {icon}
      </div>

      <div>
        <h2 className="font-semibold tracking-tight">
          {title}
        </h2>

        <p className="mt-1 text-xs text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- */
/* MINI STAT */
/* -------------------------------- */

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-400">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------- */
/* SIDE ACTION */
/* -------------------------------- */

function SideAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-black"
    >
      <span className="text-neutral-400">
        {icon}
      </span>

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
      <span className="text-xs text-neutral-400">
        {label}
      </span>

      <span className="text-right text-xs font-medium text-neutral-700">
        {value}
      </span>
    </div>
  );
}
