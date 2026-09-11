"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  QrCode,
  Users,
} from "lucide-react";

import FacultyNavigation from "@/components/layout/FacultyNavigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { LiveDot } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { loginPathFor } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

interface Participant {
  id: string;
  name: string;
  email: string;
  department: string | null;
  year: number | null;
  profile_image: string | null;
}

interface ScanResult {
  participant: Participant;
  registration_code: string;
  attendance: {
    id: string;
    attended_at: string;
  };
}

interface ScanHistoryEntry {
  id: string;
  name: string;
  time: string;
}

export default function QRScannerPage() {
  const router = useRouter();

  const params = useParams();

  const eventId = params.id as string;

  const scannerRef = useRef<Html5Qrcode | null>(
    null
  );

  const [scanning, setScanning] =
    useState(false);

  const [starting, setStarting] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<ScanResult | null>(null);

  const [lastCode, setLastCode] =
    useState("");

  /* Presentation-only: a running tally and short history of
     successful check-ins, for a faculty member working a door. */
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  const startScanner = async () => {
    try {
      setStarting(true);
      setError("");
      setMessage("");

      const scanner = new Html5Qrcode(
        "qr-reader"
      );

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
        },
        async (decodedText) => {
          if (processing) return;

          if (decodedText === lastCode) {
            return;
          }

          setLastCode(decodedText);

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

      setError(
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
        const state =
          scannerRef.current.getState();

        if (state === 2) {
          await scannerRef.current.stop();
        }

        scannerRef.current.clear();

        scannerRef.current = null;
      }
    } catch (err) {
      console.error(
        "Scanner stop error:",
        err
      );
    }

    setScanning(false);
  };

  const verifyAttendance = async (
    registrationCode: string
  ) => {
    try {
      setProcessing(true);
      setError("");
      setMessage("");
      setResult(null);

      const response = await fetch(
        `${API_URL}/events/${eventId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            registration_code:
              registrationCode,
          }),
        }
      );

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
        if (data.already_attended) {
          setError(
            "This participant's attendance has already been marked."
          );
        } else {
          setError(
            data.message ||
              "Invalid registration QR."
          );
        }

        return;
      }

      setResult({
        participant: data.participant,
        registration_code:
          data.registration_code,
        attendance: data.attendance,
      });

      setMessage(
        "Attendance marked successfully."
      );

      setScanHistory((previous) => [
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
      ].slice(0, 6));
    } catch (err) {
      console.error(err);

      setError(
        "Unable to verify the QR code. Please try again."
      );
    } finally {
      setProcessing(false);
      setLastCode("");
    }
  };

  const scanAgain = async () => {
    setResult(null);
    setMessage("");
    setError("");
    setLastCode("");

    await startScanner();
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <FacultyNavigation />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Header */}

        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Link
              href={`/faculty/events/${eventId}`}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              Manage event
            </Link>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Attendance
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              QR scanner
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Scan a participant&apos;s registration QR
              code to mark attendance.
            </p>
          </div>

          {/* Running tally */}

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
              <Users size={18} aria-hidden="true" />
            </div>

            <div>
              <p className="tabular text-xl font-bold leading-none text-foreground">
                {scanHistory.length}
              </p>

              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Checked in
              </p>
            </div>
          </div>
        </div>

        {/* Scanner area */}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Camera */}

          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">
                  Scan registration
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
                id="qr-reader"
                className={cn(
                  "flex min-h-[380px] w-full items-center justify-center overflow-hidden rounded-2xl bg-muted sm:min-h-[440px]",
                  scanning
                    ? "border-2 border-success/60"
                    : "border-2 border-dashed border-border"
                )}
              >
                {!scanning && !starting && (
                  <div className="flex flex-col items-center gap-3 px-6 text-center text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-primary">
                      <QrCode size={28} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium">Camera is off</p>
                  </div>
                )}

                {starting && (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Spinner className="h-7 w-7" />
                    <p className="text-sm font-medium">Starting camera…</p>
                  </div>
                )}
              </div>

              {/* Start scanner */}

              {!scanning &&
                !processing &&
                !result && (
                  <Button
                    onClick={startScanner}
                    loading={starting}
                    loadingText="Starting camera…"
                    variant="brand"
                    size="lg"
                    block
                    className="mt-4"
                  >
                    <QrCode size={18} aria-hidden="true" />
                    Start camera
                  </Button>
                )}

              {/* Stop scanner */}

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

              {/* Processing */}

              {processing && (
                <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-muted py-4 text-sm font-medium text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  Verifying registration…
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result panel */}

          <div className="space-y-6">
            <Card className="h-fit overflow-hidden">
              <CardHeader className="border-b border-border">
                <h2 className="font-semibold text-foreground">
                  Scan result
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Participant information
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Error — colour + icon + text, never colour alone */}

                {error && (
                  <Alert tone="destructive" title="Verification failed">
                    {error}
                  </Alert>
                )}

                {/* Success */}

                {result && (
                  <div>
                    <div className="mb-5 flex justify-center">
                      {result.participant
                        .profile_image ? (
                        <img
                          src={
                            result.participant
                              .profile_image
                          }
                          alt={
                            result.participant.name
                          }
                          className="h-20 w-20 rounded-full object-cover ring-4 ring-success/15"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand text-2xl font-semibold text-white ring-4 ring-success/15">
                          {result.participant.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="mb-6 text-center">
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Attendance marked
                      </div>

                      <h3 className="text-xl font-semibold text-foreground">
                        {result.participant.name}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {result.participant.email}
                      </p>
                    </div>

                    <div className="space-y-3 border-t border-border pt-5">
                      <InfoRow
                        label="Department"
                        value={
                          result.participant
                            .department ||
                          "Not provided"
                        }
                      />

                      <InfoRow
                        label="Year"
                        value={
                          result.participant.year
                            ? `Year ${result.participant.year}`
                            : "Not provided"
                        }
                      />

                      <InfoRow
                        label="Registration"
                        value={
                          result.registration_code
                        }
                        mono
                      />

                      <InfoRow
                        label="Attendance"
                        value={new Date(
                          result.attendance
                            .attended_at
                        ).toLocaleString(
                          "en-IN"
                        )}
                      />
                    </div>

                    <Button
                      onClick={scanAgain}
                      variant="brand"
                      block
                      className="mt-6"
                    >
                      Scan next participant
                    </Button>
                  </div>
                )}

                {/* Empty */}

                {!result &&
                  !error &&
                  !processing && (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <QrCode size={20} aria-hidden="true" />
                      </div>

                      <p className="text-sm font-medium text-foreground">
                        Waiting for scan
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Start the camera and scan a
                        participant&apos;s QR code.
                      </p>
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
        </div>

        {/* Information */}

        <Alert
          tone="info"
          title="Attendance verification"
          className="mt-6"
        >
          Pedagogy verifies that the QR code belongs
          to a registered participant of this specific
          event. Attendance cannot be marked twice.
        </Alert>
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

      <span
        className={cn(
          "text-right text-xs text-foreground",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  );
}
