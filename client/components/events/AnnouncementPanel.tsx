"use client";

import { FormEvent, useState } from "react";
import { Megaphone, Send, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

const TITLE_LIMIT = 120;
const MESSAGE_LIMIT = 1000;

type AnnouncementPanelProps = {
  eventId: string;
  participantCount?: number;
};

export default function AnnouncementPanel({
  eventId,
  participantCount = 0,
}: AnnouncementPanelProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    participantCount > 0 &&
    !sending;

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setSuccess("");
    setError("");

    if (!title.trim()) {
      setError("Please enter an announcement title.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter an announcement message.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch(
        `${API_URL}/notifications/events/${encodeURIComponent(
          eventId
        )}/announce`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to send announcement"
        );
      }

      const confirmationText =
        data.message ||
        "Announcement sent successfully.";

      setSuccess(confirmationText);
      toast.success("Announcement sent", confirmationText);

      setTitle("");
      setMessage("");
    } catch (err) {
      console.error(
        "Announcement error:",
        err
      );

      const messageText =
        err instanceof Error
          ? err.message
          : "Failed to send announcement";

      setError(messageText);
      toast.error("Announcement not sent", messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      {/* Header */}

      <CardHeader className="flex-row items-start gap-4 border-b border-border">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary">
          <Megaphone size={20} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Send announcement
          </h2>

          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            This goes out immediately to everyone registered for
            this event — there is no draft or undo.
          </p>
        </div>
      </CardHeader>

      {/* Form */}

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {/* Recipient */}

          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                <Users size={16} aria-hidden="true" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recipients
                </p>

                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  Registered participants
                </p>
              </div>
            </div>

            <div className="tabular rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              {participantCount}{" "}
              {participantCount === 1
                ? "student"
                : "students"}
            </div>
          </div>

          {/* Title */}

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="announcement-title">
                Announcement title
              </Label>

              <span
                className={cn(
                  "tabular text-[11px]",
                  title.length > TITLE_LIMIT * 0.9
                    ? "text-warning"
                    : "text-muted-foreground"
                )}
              >
                {title.length}/{TITLE_LIMIT}
              </span>
            </div>

            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Important event update"
              maxLength={TITLE_LIMIT}
              className="w-full rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/12"
            />
          </div>

          {/* Message */}

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="announcement-message">
                Message
              </Label>

              <span
                className={cn(
                  "tabular text-[11px]",
                  message.length > MESSAGE_LIMIT * 0.9
                    ? "text-warning"
                    : "text-muted-foreground"
                )}
              >
                {message.length}/{MESSAGE_LIMIT}
              </span>
            </div>

            <textarea
              id="announcement-message"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Write the announcement you want to send to participants..."
              rows={6}
              maxLength={MESSAGE_LIMIT}
              className="w-full resize-none rounded-xl border border-input bg-card px-3.5 py-3 text-sm leading-6 text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/12"
            />
          </div>

          {/* Error */}

          {error && (
            <Alert tone="destructive" title="Announcement not sent">
              {error}
            </Alert>
          )}

          {/* Success */}

          {success && (
            <Alert tone="success" title="Announcement sent">
              {success}
            </Alert>
          )}
        </CardContent>

        {/* Submit */}

        <div className="flex flex-col gap-3 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {participantCount === 0
              ? "No one is registered yet, so there is no one to notify."
              : "Every registered participant gets a notification the moment you send this."}
          </p>

          <Button
            type="submit"
            disabled={!canSend}
            loading={sending}
            loadingText="Sending…"
            className="w-full shrink-0 sm:w-auto"
          >
            <Send size={16} aria-hidden="true" />

            {participantCount === 0
              ? "No participants"
              : `Send to ${participantCount} ${
                  participantCount === 1
                    ? "participant"
                    : "participants"
                }`}
          </Button>
        </div>
      </form>
    </Card>
  );
}
