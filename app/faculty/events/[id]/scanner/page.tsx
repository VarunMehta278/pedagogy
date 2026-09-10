"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

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
    <main className="min-h-screen bg-[#fafafa] text-[#171717]">
      {/* Navigation */}

      <header className="h-16 border-b border-[#e5e5e5] bg-white">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link
            href="/"
            className="text-[19px] font-semibold tracking-[-0.04em]"
          >
            pedagogy
          </Link>

          <Link
            href={`/faculty/events/${eventId}`}
            className="text-sm text-[#737373] hover:text-[#171717] transition"
          >
            ← Manage event
          </Link>
        </div>
      </header>

      {/* Main */}

      <section className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}

        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#a3a3a3] font-medium mb-3">
            Attendance
          </p>

          <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-[-0.045em]">
            QR scanner
          </h1>

          <p className="text-sm text-[#737373] mt-2">
            Scan a participant's registration QR
            code to mark attendance.
          </p>
        </div>

        {/* Scanner area */}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Camera */}

          <section className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    Scan registration
                  </h2>

                  <p className="text-xs text-[#a3a3a3] mt-1">
                    Position the QR code inside the frame.
                  </p>
                </div>

                {scanning && (
                  <span className="inline-flex items-center gap-2 text-xs text-[#166534]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    Camera active
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Scanner */}

              <div
                id="qr-reader"
                className="w-full overflow-hidden rounded-xl bg-[#111] min-h-[340px]"
              />

              {/* Start scanner */}

              {!scanning &&
                !processing &&
                !result && (
                  <button
                    onClick={startScanner}
                    disabled={starting}
                    className="w-full mt-4 h-11 rounded-lg bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition disabled:opacity-50"
                  >
                    {starting
                      ? "Starting camera..."
                      : "Start camera"}
                  </button>
                )}

              {/* Stop scanner */}

              {scanning && (
                <button
                  onClick={stopScanner}
                  className="w-full mt-4 h-11 rounded-lg border border-[#e5e5e5] text-sm font-medium hover:bg-[#f5f5f5] transition"
                >
                  Stop scanner
                </button>
              )}

              {/* Processing */}

              {processing && (
                <div className="mt-4 flex items-center justify-center gap-3 py-3 text-sm text-[#737373]">
                  <span className="w-4 h-4 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />

                  Verifying registration...
                </div>
              )}
            </div>
          </section>

          {/* Result panel */}

          <section className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden h-fit">
            <div className="px-6 py-5 border-b border-[#e5e5e5]">
              <h2 className="font-semibold">
                Scan result
              </h2>

              <p className="text-xs text-[#a3a3a3] mt-1">
                Participant information
              </p>
            </div>

            <div className="p-6">
              {/* Error */}

              {error && (
                <div className="rounded-xl border border-[#fecaca] bg-[#fff7f7] p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-[#171717] text-white flex items-center justify-center text-xs font-semibold">
                      !
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        Verification failed
                      </p>

                      <p className="text-xs text-[#737373] mt-1 leading-5">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success */}

              {result && (
                <div>
                  <div className="flex justify-center mb-5">
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
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#171717] text-white flex items-center justify-center text-2xl font-semibold">
                        {result.participant.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534] bg-[#f0fdf4] border border-[#dcfce7] rounded-full px-3 py-1 mb-3">
                      <span>✓</span>
                      Attendance marked
                    </div>

                    <h3 className="text-xl font-semibold">
                      {result.participant.name}
                    </h3>

                    <p className="text-sm text-[#737373] mt-1">
                      {result.participant.email}
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-[#eeeeee] pt-5">
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

                  <button
                    onClick={scanAgain}
                    className="w-full mt-6 h-11 rounded-lg bg-[#171717] text-white text-sm font-medium hover:bg-[#2a2a2a] transition"
                  >
                    Scan next participant
                  </button>
                </div>
              )}

              {/* Empty */}

              {!result &&
                !error &&
                !processing && (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4 text-[#737373]">
                      QR
                    </div>

                    <p className="text-sm font-medium">
                      Waiting for scan
                    </p>

                    <p className="text-xs text-[#a3a3a3] mt-1 leading-5">
                      Start the camera and scan a
                      participant's QR code.
                    </p>
                  </div>
                )}

              {/* Message */}

              {message && !result && (
                <p className="text-sm text-[#166534] mt-4">
                  {message}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Information */}

        <div className="mt-6 bg-white border border-[#e5e5e5] rounded-xl px-6 py-5">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-xs font-semibold shrink-0">
              i
            </div>

            <div>
              <p className="text-sm font-medium">
                Attendance verification
              </p>

              <p className="text-xs text-[#737373] leading-5 mt-1">
                Pedagogy verifies that the QR code belongs
                to a registered participant of this specific
                event. Attendance cannot be marked twice.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
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
      <span className="text-xs text-[#a3a3a3]">
        {label}
      </span>

      <span
        className={`text-xs text-right text-[#525252] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
