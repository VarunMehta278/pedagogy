"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  ShieldCheck,
  Trophy,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type CertificateData = {
  certificate_code: string;
  certificate_type: string;
  title: string;
  issued_at: string;
  student: {
    name: string;
    department?: string | null;
    year?: number | null;
  } | null;
  event: {
    title: string;
    event_date: string;
    venue?: string | null;
  } | null;
  result?: {
    position?: number | null;
    score?: number | null;
  } | null;
};

export default function CertificateVerificationPage() {
  const params = useParams();

  const certificateCode =
    params.certificateCode as string;

  const [certificate, setCertificate] =
    useState<CertificateData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!certificateCode) return;

    verifyCertificate();
  }, [certificateCode]);

  const verifyCertificate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/certificates/${encodeURIComponent(
          certificateCode
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.verified) {
        throw new Error(
          data.message ||
            "Certificate could not be verified"
        );
      }

      setCertificate(data.certificate);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Certificate could not be verified"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (
    date?: string | null
  ) => {
    if (!date) return "—";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatIssuedDate = (
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

    /*
     * 11th, 12th and 13th are irregular, so they
     * are handled before the general rule.
     */
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

  const certificatePdfUrl =
    certificate
      ? `${API_URL}/certificates/${encodeURIComponent(
          certificate.certificate_code
        )}/pdf`
      : "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <ShieldCheck
              size={26}
              className="text-white"
            />
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Verifying certificate
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Checking the certificate against
            the Pedagogy database...
          </p>

          <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
        </div>
      </main>
    );
  }

  if (error || !certificate) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-6 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm md:p-12">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <XCircle
                size={32}
                className="text-red-600"
              />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Pedagogy Verification
            </p>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Certificate Not Verified
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-500">
              We could not find a valid certificate
              matching this certificate ID.
            </p>

            <div className="mt-6 rounded-xl bg-neutral-50 px-4 py-3 font-mono text-xs text-neutral-500">
              {certificateCode}
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <ArrowLeft size={16} />
              Back to Pedagogy
            </Link>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">

        {/* Brand */}

        <div className="mb-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
            <ShieldCheck
              size={26}
              className="text-white"
            />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
            Pedagogy
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Certificate Verification
          </h1>

          <p className="mt-3 text-sm text-neutral-500">
            This certificate has been verified against
            the official Pedagogy database.
          </p>
        </div>

        {/* Verification Card */}

        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">

          {/* Verified Banner */}

          <div className="border-b border-neutral-200 bg-neutral-950 px-6 py-5 text-white md:px-8">
            <div className="flex items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
                <CheckCircle2 size={23} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Certificate Verified
                </p>

                <p className="mt-0.5 text-xs text-neutral-400">
                  This certificate is authentic.
                </p>
              </div>

            </div>
          </div>

          {/* Main Content */}

          <div className="p-7 md:p-10">

            {/* Achievement */}

            <div className="text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                {certificate.certificate_type ===
                "winner" ? (
                  <Trophy size={29} />
                ) : (
                  <Award size={29} />
                )}
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {certificate.title}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                {certificate.student?.name ||
                  "Unknown Student"}
              </h2>

              {certificate.student
                ?.department && (
                <p className="mt-2 text-sm text-neutral-500">
                  {certificate.student.department}
                  {certificate.student.year
                    ? ` · Year ${certificate.student.year}`
                    : ""}
                </p>
              )}

            </div>

            {/* Event */}

            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-neutral-200 bg-neutral-50 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Event
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                {certificate.event?.title ||
                  "Unknown Event"}
              </h3>

              {certificate.result
                ?.position && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                  <Trophy size={13} />

                  {getPositionText(
                    certificate.result
                      .position
                  )}
                </div>
              )}

              {certificate.result
                ?.score !== null &&
                certificate.result
                  ?.score !==
                  undefined && (
                  <span className="ml-2 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                    Score:{" "}
                    {
                      certificate.result
                        .score
                    }
                  </span>
                )}

            </div>

            {/* Details */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-neutral-200 p-5">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <CalendarDays size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-neutral-400">
                      Event Date
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(
                        certificate.event
                          ?.event_date
                      )}
                    </p>
                  </div>
                </div>

              </div>

              <div className="rounded-2xl border border-neutral-200 p-5">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Award size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-neutral-400">
                      Issued
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatIssuedDate(
                        certificate.issued_at
                      )}
                    </p>
                  </div>
                </div>

              </div>

              {certificate.event
                ?.venue && (
                <div className="rounded-2xl border border-neutral-200 p-5 sm:col-span-2">

                  <p className="text-xs text-neutral-400">
                    Venue
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {
                      certificate.event
                        .venue
                    }
                  </p>

                </div>
              )}

            </div>

            {/* Certificate ID */}

            <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">

              <p className="text-xs text-neutral-400">
                Certificate ID
              </p>

              <p className="mt-2 break-all font-mono text-sm font-semibold">
                {
                  certificate.certificate_code
                }
              </p>

            </div>

            {/* Actions */}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

              <a
                href={certificatePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                <Download size={16} />
                View Certificate
              </a>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-black hover:text-black"
              >
                <ArrowLeft size={16} />
                Pedagogy Home
              </Link>

            </div>

          </div>
        </section>

        {/* Footer Trust */}

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-neutral-400">
            <ShieldCheck size={14} />
            Verified by Pedagogy
          </div>
        </div>

      </div>
    </main>
  );
}
