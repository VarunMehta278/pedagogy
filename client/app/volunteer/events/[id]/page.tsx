"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  UserCheck,
  Users,
  UserX,
  XCircle,
} from "lucide-react";

import { fetchCurrentUser, guardRole, loginPathFor } from "@/lib/auth";

import VolunteerNavigation from "@/components/layout/VolunteerNavigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, LiveDot } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

/* ========================================================
   TYPES
======================================================== */

type EventStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

type VolunteerEvent = {
  id: string;
  title: string;
  category: string;
  event_date: string;
  venue: string;
  status: EventStatus;
};

type Student = {
  id?: string;
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
  attended: boolean;
  attended_at?: string | null;
  registered_at?: string | null;
  /*
   * Nullable on purpose. The join returns null when the student's
   * account was deleted while their registration row survived, and
   * the check-in desk must still show the registration rather than
   * crashing the page.
   */
  student: Student | null;
};

type ParticipantStats = {
  registered: number;
  attended: number;
  cancelled: number;
};

type ScanResult = {
  participant: Student;
  registration_code: string;
  attendance: {
    id: string;
    attended_at: string;
  };
};

type ScanHistoryEntry = {
  id: string;
  name: string;
  time: string;
};

/* ========================================================
   PAGE
======================================================== */

export default function VolunteerEventPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const eventId = params.id as string;

  const [authorised, setAuthorised] = useState(false);
  const [event, setEvent] = useState<VolunteerEvent | null>(null);

  /* -------------------- QR scanner state -------------------- */

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState("");

  /*
   * The scan callback is created once, when start() is called, so it
   * closes over the `processing` and `lastCode` of that render and
   * never sees a newer value. Both guards below were therefore dead:
   * they always compared against false and "". Mirroring the state
   * into refs gives the callback the live values, which is what stops
   * the same code being submitted twice while a check-in is still in
   * flight.
   */
  const processingRef = useRef(false);
  const lastCodeRef = useRef("");

  const markProcessing = (value: boolean) => {
    processingRef.current = value;
    setProcessing(value);
  };

  const rememberCode = (value: string) => {
    lastCodeRef.current = value;
    setLastCode(value);
  };


  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  /* -------------------- Participant lookup state -------------------- */

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<ParticipantStats>({
    registered: 0,
    attended: 0,
    cancelled: 0,
  });

  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantsError, setParticipantsError] = useState("");

  /* -------------------- Guard + initial load -------------------- */

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      const currentUser = await fetchCurrentUser();
      const redirectPath = guardRole(currentUser, ["volunteer"], pathname);

      if (redirectPath) {
        router.replace(redirectPath);
        return;
      }

      if (!cancelled) {
        setAuthorised(true);
      }
    };

    guard();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /*
   * There is no GET /volunteer/events/:id endpoint, so the event's
   * title, date and venue for the header come from the assigned
   * events list the volunteer already has access to.
   */
  useEffect(() => {
    if (!authorised) return;

    const loadEvent = async () => {
      try {
        const response = await fetch(`${API_URL}/volunteer/events`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        const match = (data.events || []).find(
          (item: VolunteerEvent) => item.id === eventId
        );

        if (match) {
          setEvent(match);
        }
      } catch (err) {
        console.error("Unable to load event details:", err);
      }
    };

    loadEvent();
  }, [authorised, eventId]);

  /* -------------------- Participant search (debounced) -------------------- */

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadParticipants = useCallback(
    async (query: string) => {
      try {
        setParticipantsLoading(true);
        setParticipantsError("");

        const url = new URL(
          `${API_URL}/volunteer/events/${eventId}/participants`
        );

        if (query) {
          url.searchParams.set("q", query);
        }

        const response = await fetch(url.toString(), {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace(loginPathFor(pathname));
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data?.message || "Unable to load participants"
          );
        }

        setParticipants(data.participants || []);

        setStats(
          data.stats || {
            registered: 0,
            attended: 0,
            cancelled: 0,
          }
        );
      } catch (err) {
        console.error("Participant lookup error:", err);

        setParticipantsError(
          err instanceof Error
            ? err.message
            : "Unable to load participants"
        );
      } finally {
        setParticipantsLoading(false);
      }
    },
    [eventId, pathname, router]
  );

  useEffect(() => {
    if (!authorised) return;

    loadParticipants(debouncedSearch);
  }, [authorised, debouncedSearch, loadParticipants]);

  /* -------------------- QR scanner -------------------- */

  const startScanner = async () => {
    try {
      setStarting(true);
      setScanError("");
      setScanMessage("");

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
        },
        async (decodedText) => {
          if (processingRef.current) return;
          if (decodedText === lastCodeRef.current) return;

          rememberCode(decodedText);

          await stopScanner();
          await verifyAttendance(decodedText);
        },
        () => {
          // QR not detected yet.
        }
      );

      setScanning(true);
    } catch (err) {
      console.error(err);

      setScanError(
        "Unable to access the camera. Please allow camera permission and try again."
      );

      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();

        if (state === 2) {
          await scannerRef.current.stop();
        }

        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Scanner stop error:", err);
    }

    setScanning(false);
  };

  const verifyAttendance = async (registrationCode: string) => {
    try {
      markProcessing(true);
      setScanError("");
      setScanMessage("");
      setScanResult(null);

      const response = await fetch(
        `${API_URL}/volunteer/events/${eventId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            registration_code: registrationCode,
          }),
        }
      );

      if (response.status === 401) {
        router.replace(loginPathFor(pathname));
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.already_attended) {
          setScanError(
            "This participant's attendance has already been marked."
          );
        } else {
          setScanError(data.message || "Invalid registration QR.");
        }

        return;
      }

      setScanResult({
        participant: data.participant,
        registration_code: data.registration_code,
        attendance: data.attendance,
      });

      setScanMessage("Attendance marked successfully.");

      setScanHistory((previous) =>
        [
          {
            id: data.attendance?.id || `${Date.now()}`,
            name: data.participant?.name || "Unknown participant",
            time: new Date(
              data.attendance?.attended_at || Date.now()
            ).toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            }),
          },
          ...previous,
        ].slice(0, 6)
      );

      /* Refresh the lookup list so the person just scanned shows
         as checked in there too, in case the volunteer switches
         over to confirm it. */
      loadParticipants(debouncedSearch);
    } catch (err) {
      console.error(err);

      setScanError("Unable to verify the QR code. Please try again.");
    } finally {
      markProcessing(false);
      rememberCode("");
    }
  };

  const scanAgain = async () => {
    setScanResult(null);
    setScanMessage("");
    setScanError("");
    rememberCode("");

    await startScanner();
  };

  useEffect(() => {
    return () => {
      /*
       * Release the camera on unmount. stop() rejects when the
       * scanner was never started or is mid-start, so the state is
       * checked first and the promise is still guarded — an
       * unhandled rejection here would surface as a red overlay on
       * a page the user has already navigated away from. clear()
       * afterwards frees the DOM the library attached.
       */
      const scanner = scannerRef.current;

      if (!scanner) return;

      scannerRef.current = null;

      Promise.resolve()
        .then(() => (scanner.getState() === 2 ? scanner.stop() : null))
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, []);

  const checkedInCount = useMemo(
    () => stats.attended,
    [stats.attended]
  );

  if (!authorised) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <VolunteerNavigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* HEADER */}

        <div className="mb-8">
          <Link
            href="/volunteer/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Your events
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Event check-in
              </p>

              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {event?.title || "Event check-in"}
              </h1>

              {event && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} aria-hidden="true" />
                    {new Date(
                      `${event.event_date}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} aria-hidden="true" />
                    {event.venue}
                  </span>

                  <StatusBadge status={event.status} size="sm" />
                </div>
              )}
            </div>

            {/* Running tally */}

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
                <UserCheck size={18} aria-hidden="true" />
              </div>

              <div>
                <p className="tabular text-xl font-bold leading-none text-foreground">
                  {scanHistory.length}
                </p>

                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Checked in this session
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* ============================================
              QR CHECK-IN
          ============================================ */}

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between border-b border-border">
                <div>
                  <h2 className="font-semibold text-foreground">
                    QR check-in
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Position the QR code inside the frame.
                  </p>
                </div>

                {scanning && (
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-success">
                    <LiveDot />
                    Camera active
                  </span>
                )}
              </CardHeader>

              <CardContent className="pt-6">
                {/* Scanner target — huge, for a phone at a door */}

                <div
                  className={cn(
                    "relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-muted min-h-[320px] sm:min-h-[380px]",
                    scanning
                      ? "border-2 border-success/60"
                      : "border-2 border-dashed border-border"
                  )}
                >
                {/*
                  html5-qrcode takes ownership of #qr-reader and
                  replaces its children with a <video>. React must
                  therefore never render anything inside that node —
                  it would try to remove children the library had
                  already swapped out, which throws
                  "NotFoundError: The node to be removed is not a
                  child of this node" the moment the camera starts.
                  The placeholders are siblings overlaid on top.
                */}
                  <div id="qr-reader" className="w-full" />

                  {!scanning && !starting && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-primary">
                        <UserCheck size={28} aria-hidden="true" />
                      </div>
                      <p className="text-sm font-medium">Camera is off</p>
                    </div>
                  )}

                  {starting && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Spinner className="h-7 w-7" />
                      <p className="text-sm font-medium">Starting camera…</p>
                    </div>
                  )}
                </div>

                {!scanning && !processing && !scanResult && (
                  <Button
                    onClick={startScanner}
                    loading={starting}
                    loadingText="Starting camera…"
                    variant="brand"
                    size="lg"
                    block
                    className="mt-4"
                  >
                    <UserCheck size={18} aria-hidden="true" />
                    Start camera
                  </Button>
                )}

                {scanning && (
                  <Button
                    onClick={stopScanner}
                    variant="outline"
                    size="lg"
                    block
                    className="mt-4"
                  >
                    Stop scanner
                  </Button>
                )}

                {processing && (
                  <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-muted py-4 text-sm font-medium text-muted-foreground">
                    <Spinner className="h-4 w-4" />
                    Verifying registration…
                  </div>
                )}

                {/* Result — colour AND icon AND text, never colour alone */}

                {scanError && (
                  <Alert
                    tone="destructive"
                    title="Check-in failed"
                    className="mt-4"
                  >
                    {scanError}
                  </Alert>
                )}

                {scanResult && (
                  <div className="mt-4 rounded-2xl border border-success/25 bg-success/8 p-5">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      <p className="text-sm font-semibold">
                        {scanMessage}
                      </p>
                    </div>

                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {scanResult.participant.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {scanResult.participant.email}
                    </p>

                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {scanResult.registration_code}
                    </p>

                    <Button
                      onClick={scanAgain}
                      variant="brand"
                      block
                      className="mt-4"
                    >
                      Scan next participant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent scans */}

            {scanHistory.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">
                    Recently checked in
                  </h2>
                </CardHeader>

                <CardContent className="space-y-1 p-3">
                  {scanHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                        <CheckCircle2 size={15} aria-hidden="true" />
                      </div>

                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {entry.name}
                      </p>

                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 size={12} aria-hidden="true" />
                        {entry.time}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ============================================
              PARTICIPANT LOOKUP
          ============================================ */}

          <div className="space-y-6">
            {/* Stats */}

            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Registered"
                value={stats.registered}
                icon={Users}
                tone="brand"
              />

              <StatCard
                label="Checked in"
                value={checkedInCount}
                icon={UserCheck}
                tone="success"
              />

              <StatCard
                label="Cancelled"
                value={stats.cancelled}
                icon={UserX}
                tone="destructive"
              />
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border">
                <h2 className="font-semibold text-foreground">
                  Participant lookup
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Search by name, email or registration code — for
                  anyone whose QR code won&apos;t scan.
                </p>

                <div className="relative mt-4">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search participants…"
                    aria-label="Search participants"
                    className="pl-10"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-3">
                {participantsLoading && <SkeletonRows rows={5} />}

                {!participantsLoading && participantsError && (
                  <Alert
                    tone="destructive"
                    title="Unable to load participants"
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadParticipants(debouncedSearch)}
                      >
                        Try again
                      </Button>
                    }
                  >
                    {participantsError}
                  </Alert>
                )}

                {!participantsLoading &&
                  !participantsError &&
                  participants.length === 0 && (
                    <EmptyState
                      icon={Users}
                      title={
                        debouncedSearch
                          ? "No matching participants"
                          : "No registrations yet"
                      }
                      description={
                        debouncedSearch
                          ? "Try a different name, email or registration code."
                          : "Registrations for this event will show up here."
                      }
                    />
                  )}

                {!participantsLoading &&
                  !participantsError &&
                  participants.length > 0 && (
                    <div className="space-y-1">
                      {participants.map((participant) => (
                        <ParticipantRow
                          key={participant.id}
                          participant={participant}
                        />
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ========================================================
   PARTICIPANT ROW
======================================================== */

function ParticipantRow({ participant }: { participant: Participant }) {
  const name = participant.student?.name?.trim() || "Deleted account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {name}
          </p>

          <StatusBadge
            status={participant.status}
            kind="registration"
            size="sm"
          />
        </div>

        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {participant.registration_code}
        </p>
      </div>

      <div className="shrink-0">
        {participant.attended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <CheckCircle2 size={13} aria-hidden="true" />
            Checked in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <XCircle size={13} aria-hidden="true" />
            Not checked in
          </span>
        )}
      </div>
    </div>
  );
}
