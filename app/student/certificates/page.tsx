"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileBadge,
  Loader2,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { loginPathFor } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type Certificate = {
  id: string;
  certificate_code: string;
  certificate_type:
    | "winner"
    | "participation";
  title: string;
  issued_at: string;

  event?: {
    id: string;
    title: string;
    event_date: string;
    venue?: string | null;
  } | null;

  result?: {
    position?: number | null;
    score?: number | null;
  } | null;
};

export default function MyCertificatesPage() {
  const router = useRouter();

  const [certificates, setCertificates] =
    useState<Certificate[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/certificates/me`,
        {
          credentials: "include",
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
        throw new Error(
          data.message ||
            "Failed to load certificates"
        );
      }

      setCertificates(
        data.certificates || []
      );
    } catch (err) {
      console.error(
        "Load certificates error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load certificates"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (
    date?: string | null
  ) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  const getPositionText = (
    position?: number | null
  ) => {
    if (!position) return "";

    if (position === 1) return "1st Place";
    if (position === 2) return "2nd Place";
    if (position === 3) return "3rd Place";

    if (
      position % 100 >= 11 &&
      position % 100 <= 13
    ) {
      return `${position}th Place`;
    }

    switch (position % 10) {
      case 1:
        return `${position}st Place`;

      case 2:
        return `${position}nd Place`;

      case 3:
        return `${position}rd Place`;

      default:
        return `${position}th Place`;
    }
  };

  const getPdfUrl = (
    certificateCode: string
  ) => {
    return `${API_URL}/certificates/${encodeURIComponent(
      certificateCode
    )}/pdf`;
  };

  const getVerificationUrl = (
    certificateCode: string
  ) => {
    return `/verify/${encodeURIComponent(
      certificateCode
    )}`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <Award
              size={25}
              className="text-white"
            />
          </div>

          <p className="mt-5 text-sm font-semibold">
            Loading certificates...
          </p>

          <div className="mx-auto mt-5 flex justify-center">
            <Loader2
              size={22}
              className="animate-spin text-neutral-500"
            />
          </div>

        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-10 md:px-8">

        <div className="mx-auto max-w-3xl">

          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>

          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-10 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Award
                size={24}
                className="text-red-500"
              />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Couldn't load certificates
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadCertificates}
              className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Try Again
            </button>

          </div>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">

      {/* Header */}

      <header className="border-b border-neutral-200 bg-white">

        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">

          <Link
            href="/student/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
              P
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Pedagogy
              </p>

              <p className="hidden text-[10px] uppercase tracking-wider text-neutral-400 sm:block">
                Student Portal
              </p>
            </div>
          </Link>

          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-600 transition hover:border-black hover:text-black"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">

        {/* Page heading */}

        <section className="mb-10">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <Award
              size={26}
              className="text-white"
            />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Achievements
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            My Certificates
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
            View, verify and access every
            certificate you've earned through
            Pedagogy events.
          </p>

        </section>

        {/* Summary */}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">

          <SummaryCard
            icon={<Award size={18} />}
            label="Total Certificates"
            value={certificates.length}
          />

          <SummaryCard
            icon={<Trophy size={18} />}
            label="Winner Certificates"
            value={
              certificates.filter(
                (certificate) =>
                  certificate.certificate_type ===
                  "winner"
              ).length
            }
          />

          <SummaryCard
            icon={
              <CheckCircle2 size={18} />
            }
            label="Participation Certificates"
            value={
              certificates.filter(
                (certificate) =>
                  certificate.certificate_type ===
                  "participation"
              ).length
            }
          />

        </section>

        {/* Empty state */}

        {certificates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
              <FileBadge
                size={28}
                className="text-neutral-400"
              />
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              No certificates yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Participate in technical events
              and earn certificates that will
              appear here.
            </p>

            <Link
              href="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Explore Events
              <ExternalLink size={15} />
            </Link>

          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">

            {certificates.map(
              (certificate) => {
                const isWinner =
                  certificate.certificate_type ===
                  "winner";

                return (
                  <article
                    key={certificate.id}
                    className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl"
                  >

                    {/* Certificate header */}

                    <div className="relative overflow-hidden bg-neutral-950 px-6 py-7 text-white">

                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />

                      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full border border-white/5" />

                      <div className="relative flex items-start justify-between gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                          {isWinner ? (
                            <Trophy
                              size={21}
                            />
                          ) : (
                            <Award
                              size={21}
                            />
                          )}
                        </div>

                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                          {isWinner
                            ? "Winner"
                            : "Participation"}
                        </span>

                      </div>

                      <p className="relative mt-7 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                        Certificate of
                      </p>

                      <h2 className="relative mt-2 text-xl font-semibold">
                        {certificate.title}
                      </h2>

                    </div>

                    {/* Content */}

                    <div className="p-6">

                      <h3 className="text-lg font-semibold">
                        {certificate.event
                          ?.title ||
                          "Technical Event"}
                      </h3>

                      {/* Result */}

                      {isWinner &&
                        certificate.result
                          ?.position && (
                          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                            <Trophy
                              size={13}
                            />

                            {getPositionText(
                              certificate
                                .result
                                .position
                            )}

                            {certificate
                              .result
                              .score !==
                              null &&
                              certificate
                                .result
                                .score !==
                                undefined && (
                                <>
                                  <span className="text-white/30">
                                    ·
                                  </span>

                                  Score{" "}
                                  {
                                    certificate
                                      .result
                                      .score
                                  }
                                </>
                              )}
                          </div>
                        )}

                      {/* Details */}

                      <div className="mt-6 space-y-3">

                        <DetailRow
                          icon={
                            <CalendarDays
                              size={15}
                            />
                          }
                          label="Event Date"
                          value={formatDate(
                            certificate
                              .event
                              ?.event_date
                          )}
                        />

                        <DetailRow
                          icon={
                            <CheckCircle2
                              size={15}
                            />
                          }
                          label="Issued"
                          value={formatDate(
                            certificate.issued_at
                          )}
                        />

                      </div>

                      {/* Certificate ID */}

                      <div className="mt-5 rounded-xl bg-neutral-50 p-3">

                        <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                          Certificate ID
                        </p>

                        <p className="mt-1 break-all font-mono text-[11px] font-semibold text-neutral-700">
                          {
                            certificate.certificate_code
                          }
                        </p>

                      </div>

                      {/* Actions */}

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">

                        <a
                          href={getPdfUrl(
                            certificate.certificate_code
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-semibold text-white transition hover:bg-neutral-800"
                        >
                          <ExternalLink
                            size={14}
                          />
                          View Certificate
                        </a>

                        <Link
                          href={getVerificationUrl(
                            certificate.certificate_code
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-xs font-semibold text-neutral-700 transition hover:border-black hover:text-black"
                        >
                          <ShieldCheck
                            size={14}
                          />
                          Verify
                        </Link>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

        {/* Trust section */}

        {certificates.length > 0 && (
          <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <ShieldCheck
                  size={20}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold">
                  Every certificate is verifiable
                </h3>

                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Each certificate has a unique
                  certificate ID and QR code that
                  can be publicly verified through
                  Pedagogy.
                </p>
              </div>

            </div>

          </section>
        )}

      </div>

    </main>
  );
}


/* -------------------------------- */
/* Summary Card */
/* -------------------------------- */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
        {icon}
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-400">
        {label}
      </p>

    </div>
  );
}


/* -------------------------------- */
/* Detail Row */
/* -------------------------------- */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        {icon}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-semibold text-neutral-700">
          {value}
        </p>
      </div>

    </div>
  );
}
