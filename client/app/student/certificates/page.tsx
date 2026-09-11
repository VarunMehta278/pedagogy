"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileBadge,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { loginPathFor } from "@/lib/auth";

import StudentNavigation from "@/components/layout/StudentNavigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";

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

  const winnerCount = certificates.filter(
    (certificate) =>
      certificate.certificate_type === "winner"
  ).length;

  const participationCount = certificates.filter(
    (certificate) =>
      certificate.certificate_type === "participation"
  ).length;

  return (
    <main className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        <FadeIn>
          <PageHeader
            eyebrow="Achievements"
            title="My Certificates"
            description="View, verify and access every certificate you've earned through Pedagogy events."
          />
        </FadeIn>

        {/* Summary */}
        {!loading && !error && (
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-3">
            <StaggerItem>
              <StatCard
                icon={Award}
                label="Total Certificates"
                value={certificates.length}
                tone="brand"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={Trophy}
                label="Winner Certificates"
                value={winnerCount}
                tone="warning"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={CheckCircle2}
                label="Participation Certificates"
                value={participationCount}
                tone="success"
              />
            </StaggerItem>
          </Stagger>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-10">
            <SkeletonGrid count={4} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Alert tone="destructive" title="Couldn't load certificates" className="mt-10">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadCertificates}
            >
              Try again
            </Button>
          </Alert>
        )}

        {/* Empty state */}
        {!loading && !error && certificates.length === 0 && (
          <EmptyState
            className="mt-10"
            icon={FileBadge}
            title="No certificates yet"
            description="Certificates are issued automatically once an event you've registered for wraps up — participate, and yours will show up here."
            action={
              <Button variant="brand" asChild>
                <Link href="/events">
                  Explore events
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
        )}

        {/* Certificates */}
        {!loading && !error && certificates.length > 0 && (
          <Stagger className="mt-10 grid gap-6 md:grid-cols-2">
            {certificates.map((certificate) => (
              <StaggerItem key={certificate.id}>
                <CertificateCard
                  certificate={certificate}
                  formatDate={formatDate}
                  getPositionText={getPositionText}
                  getPdfUrl={getPdfUrl}
                  getVerificationUrl={getVerificationUrl}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {/* Trust section */}
        {!loading && !error && certificates.length > 0 && (
          <section className="mt-10 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>

              <div>
                <h3 className="text-sm font-semibold">
                  Every certificate is verifiable
                </h3>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Each certificate has a unique certificate ID that can be
                  publicly verified through Pedagogy at any time.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* ========================================================
   CERTIFICATE CARD
======================================================== */

function CertificateCard({
  certificate,
  formatDate,
  getPositionText,
  getPdfUrl,
  getVerificationUrl,
}: {
  certificate: Certificate;
  formatDate: (date?: string | null) => string;
  getPositionText: (position?: number | null) => string;
  getPdfUrl: (code: string) => string;
  getVerificationUrl: (code: string) => string;
}) {
  const isWinner = certificate.certificate_type === "winner";

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-gradient-brand p-[1.5px] shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl">
      <div className="overflow-hidden rounded-[calc(1rem-1.5px)] bg-card">
        {/* Certificate header — brand seal treatment */}
        <div className="relative overflow-hidden bg-gradient-brand px-6 py-7 text-white">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary-foreground/15" aria-hidden="true" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full border border-primary-foreground/10" aria-hidden="true" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground text-primary shadow-sm">
              {isWinner ? (
                <Trophy className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Award className="h-5 w-5" aria-hidden="true" />
              )}
            </div>

            <span className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              {isWinner ? "Winner" : "Participation"}
            </span>
          </div>

          <p className="relative mt-7 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            Certificate of
          </p>

          <h2 className="relative mt-2 text-xl font-semibold">
            {certificate.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold tracking-tight">
            {certificate.event?.title || "Technical Event"}
          </h3>

          {isWinner && certificate.result?.position && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold text-accent-foreground">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              {getPositionText(certificate.result.position)}

              {certificate.result.score !== null &&
                certificate.result.score !== undefined && (
                  <>
                    <span className="text-accent-foreground/40">·</span>
                    Score {certificate.result.score}
                  </>
                )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <DetailRow
              icon={CalendarDays}
              label="Event Date"
              value={formatDate(certificate.event?.event_date)}
            />

            <DetailRow
              icon={CheckCircle2}
              label="Issued"
              value={formatDate(certificate.issued_at)}
            />
          </div>

          {/* Certificate ID */}
          <div className="mt-5 rounded-xl bg-muted p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Certificate ID
            </p>

            <p className="mt-1 break-all font-mono text-[11px] font-semibold text-foreground">
              {certificate.certificate_code}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="brand" size="sm" asChild>
              <a
                href={getPdfUrl(certificate.certificate_code)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download
              </a>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={getVerificationUrl(certificate.certificate_code)}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verify
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ========================================================
   DETAIL ROW
======================================================== */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
