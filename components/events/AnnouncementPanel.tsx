"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Megaphone,
  Send,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

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

      setSuccess(
        data.message ||
          "Announcement sent successfully."
      );

      setTitle("");
      setMessage("");
    } catch (err) {
      console.error(
        "Announcement error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send announcement"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">

      {/* Header */}

      <div className="border-b border-neutral-100 px-6 py-5">
        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
            <Megaphone size={20} />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Send Announcement
            </h2>

            <p className="mt-1 text-sm leading-5 text-neutral-500">
              Send an important update directly
              to everyone registered for this event.
            </p>
          </div>

        </div>
      </div>

      {/* Form */}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 p-6"
      >

        {/* Recipient */}

        <div className="rounded-xl bg-neutral-50 p-4">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Recipients
              </p>

              <p className="mt-1 text-sm font-semibold">
                Registered Participants
              </p>
            </div>

            <div className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">
              {participantCount}{" "}
              {participantCount === 1
                ? "student"
                : "students"}
            </div>

          </div>

        </div>

        {/* Title */}

        <div>
          <label
            htmlFor="announcement-title"
            className="mb-2 block text-sm font-medium"
          >
            Announcement Title
          </label>

          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="e.g. Important Event Update"
            maxLength={120}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black"
          />

          <p className="mt-1.5 text-right text-[10px] text-neutral-400">
            {title.length}/120
          </p>
        </div>

        {/* Message */}

        <div>
          <label
            htmlFor="announcement-message"
            className="mb-2 block text-sm font-medium"
          >
            Message
          </label>

          <textarea
            id="announcement-message"
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Write the announcement you want to send to participants..."
            rows={6}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-neutral-400 focus:border-black"
          />

          <p className="mt-1.5 text-right text-[10px] text-neutral-400">
            {message.length}/1000
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <span className="mt-0.5 font-bold">
              !
            </span>

            <p>{error}</p>
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Announcement sent
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Submit */}

        <div className="flex justify-end border-t border-neutral-100 pt-5">

          <button
            type="submit"
            disabled={
              sending ||
              participantCount === 0
            }
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />

            {sending
              ? "Sending..."
              : participantCount === 0
              ? "No Participants"
              : `Send to ${participantCount} ${
                  participantCount === 1
                    ? "Participant"
                    : "Participants"
                }`}
          </button>

        </div>

      </form>
    </div>
  );
}