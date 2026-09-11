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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FadeIn } from "@/components/motion/reveal";

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
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
            <ShieldCheck
              className="h-6.5 w-6.5 text-white"
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-foreground">
            Verifying certificate
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Checking the certificate against
            the Pedagogy database…
          </p>

          <Spinner className="mx-auto mt-6 h-6 w-6" />
        </div>
      </main>
    );
  }

  if (error || !certificate) {
    return (
      <main className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-destructive/25 bg-card p-8 text-center shadow-sm md:p-12">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <XCircle
                className="h-8 w-8 text-destructive"
                aria-hidden="true"
              />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Pedagogy Verification
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-destructive">
              Certificate Not Verified
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              We could not find a valid certificate
              matching this certificate ID.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs text-muted-foreground">
              {certificateCode}
            </div>

            <Link href="/" className="mt-6 inline-block">
              <Button variant="brand">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Pedagogy
              </Button>
            </Link>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">

        {/* Brand */}

        <FadeIn>
          <div className="mb-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
              <ShieldCheck
                className="h-6.5 w-6.5 text-white"
                aria-hidden="true"
              />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Pedagogy
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Certificate Verification
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">
              This certificate has been verified against
              the official Pedagogy database.
            </p>
          </div>

          {/* Verification Card */}

          <section className="overflow-hidden rounded-3xl border border-success/25 bg-card shadow-sm">

            {/* Verified Banner */}

            <div className="flex items-center gap-4 border-b border-success/20 bg-success/10 px-6 py-5 md:px-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>

              <div>
                <p className="text-sm font-bold text-success">
                  Certificate Verified
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  This certificate is authentic.
                </p>
              </div>
            </div>

            {/* Main Content */}

            <div className="p-7 md:p-10">

              {/* Achievement */}

              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-primary">
                  {certificate.certificate_type === "winner" ? (
                    <Trophy className="h-7 w-7" aria-hidden="true" />
                  ) : (
                    <Award className="h-7 w-7" aria-hidden="true" />
                  )}
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {certificate.title}
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {certificate.student?.name || "Unknown Student"}
                </h2>

                {certificate.student?.department && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {certificate.student.department}
                    {certificate.student.year
                      ? ` · Year ${certificate.student.year}`
                      : ""}
                  </p>
                )}
              </div>

              {/* Event */}

              <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-muted/40 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Event
                </p>

                <h3 className="mt-2 text-xl font-semibold text-foreground">
                  {certificate.event?.title || "Unknown Event"}
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {certificate.result?.position && (
                    <Badge variant="solid" size="lg">
                      <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                      {getPositionText(certificate.result.position)}
                    </Badge>
                  )}

                  {certificate.result?.score !== null &&
                    certificate.result?.score !== undefined && (
                      <Badge variant="outline" size="lg">
                        Score: {certificate.result.score}
                      </Badge>
                    )}
                </div>
              </div>

              {/* Details */}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">

                <DetailTile
                  icon={<CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />}
                  label="Event Date"
                  value={formatDate(certificate.event?.event_date)}
                />

                <DetailTile
                  icon={<Award className="h-4.5 w-4.5" aria-hidden="true" />}
                  label="Issued"
                  value={formatIssuedDate(certificate.issued_at)}
                />

                {certificate.event?.venue && (
                  <div className="rounded-2xl border border-border p-5 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Venue</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {certificate.event.venue}
                    </p>
                  </div>
                )}

              </div>

              {/* Certificate ID */}

              <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Certificate ID
                </p>

                <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
                  {certificate.certificate_code}
                </p>
              </div>

              {/* Actions */}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={certificatePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="brand" size="lg" block>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    View Certificate
                  </Button>
                </a>

                <Link href="/">
                  <Button variant="outline" size="lg" block>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Pedagogy Home
                  </Button>
                </Link>
              </div>

            </div>
          </section>

          {/* Footer Trust */}

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified by Pedagogy
            </div>
          </div>
        </FadeIn>

      </div>
    </main>
  );
}

/* -------------------------------- */
/* Detail tile */
/* -------------------------------- */

function DetailTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
          {icon}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
