"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { loginPathFor } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export default function CreateEventPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Hackathon",
    event_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    registration_deadline: "",
    participant_limit: "",
    rules: "",
    image_url: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!form.title.trim()) {
        throw new Error("Event title is required");
      }

      if (!form.event_date) {
        throw new Error("Event date is required");
      }

      if (!form.venue.trim()) {
        throw new Error("Venue is required");
      }

      if (
        form.participant_limit &&
        Number(form.participant_limit) <= 0
      ) {
        throw new Error(
          "Participant limit must be greater than 0"
        );
      }

      if (
        form.start_time &&
        form.end_time &&
        form.start_time >= form.end_time
      ) {
        throw new Error(
          "End time must be later than start time"
        );
      }

      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          venue: form.venue.trim(),
          registration_deadline:
            form.registration_deadline || null,
          participant_limit: form.participant_limit
            ? Number(form.participant_limit)
            : null,
          rules: form.rules.trim() || null,
          image_url: form.image_url.trim() || null,
        }),
      });

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
          data.message || "Failed to create event"
        );
      }

      setSuccess("Event created successfully.");

      setTimeout(() => {
        router.push("/faculty/dashboard");
      }, 900);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#171717]">
      {/* Navigation */}
      <header className="h-16 border-b border-[#e5e5e5] bg-white">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-[19px] font-semibold tracking-[-0.04em]"
          >
            pedagogy
          </Link>

          <Link
            href="/faculty/dashboard"
            className="text-sm text-[#737373] hover:text-[#171717] transition"
          >
            ← Faculty dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <section className="max-w-5xl mx-auto px-6 py-10 sm:py-14">
        {/* Page heading */}
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-[#a3a3a3] mb-3">
            Faculty workspace
          </p>

          <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-[-0.045em] leading-tight">
            Create a new event
          </h1>

          <p className="text-[#737373] text-sm sm:text-[15px] leading-6 mt-3">
            Add the details for your technical event. Your event
            will be saved as a draft and can be published when
            you're ready.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3.5">
            <div className="w-5 h-5 shrink-0 rounded-full bg-[#171717] text-white flex items-center justify-center text-[11px] font-semibold mt-0.5">
              !
            </div>

            <div>
              <p className="text-sm font-medium text-[#171717]">
                Unable to create event
              </p>

              <p className="text-xs text-[#737373] mt-0.5">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#d1fae5] bg-[#f7fffb] px-4 py-3.5">
            <div className="w-5 h-5 shrink-0 rounded-full bg-[#171717] text-white flex items-center justify-center text-[11px] font-semibold mt-0.5">
              ✓
            </div>

            <div>
              <p className="text-sm font-medium text-[#171717]">
                Event created
              </p>

              <p className="text-xs text-[#737373] mt-0.5">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic information */}
          <FormSection
            number="01"
            title="Basic information"
            description="Give your event a clear identity."
          >
            <div className="space-y-6">
              <Field
                label="Event title"
                required
                hint="Use a short, descriptive name."
              >
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. AI & Machine Learning Hackathon"
                  className="input"
                  required
                />
              </Field>

              <Field
                label="Description"
                hint="Tell participants what the event is about."
              >
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the event, its purpose and what participants can expect..."
                  rows={5}
                  className="input resize-none"
                />
              </Field>

              <Field
                label="Category"
                required
              >
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="input appearance-none"
                  required
                >
                  <option value="Hackathon">
                    Hackathon
                  </option>

                  <option value="Workshop">
                    Workshop
                  </option>

                  <option value="Technical Competition">
                    Technical Competition
                  </option>

                  <option value="Coding Contest">
                    Coding Contest
                  </option>

                  <option value="Quiz">
                    Quiz
                  </option>

                  <option value="Seminar">
                    Seminar
                  </option>

                  <option value="Webinar">
                    Webinar
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </Field>
            </div>
          </FormSection>

          {/* Schedule */}
          <FormSection
            number="02"
            title="Schedule & venue"
            description="When and where will the event take place?"
          >
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-6">
              <Field
                label="Event date"
                required
              >
                <input
                  type="date"
                  name="event_date"
                  value={form.event_date}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </Field>

              <Field
                label="Venue"
                required
              >
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="e.g. Innovation Lab"
                  className="input"
                  required
                />
              </Field>

              <Field label="Start time">
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  className="input"
                />
              </Field>

              <Field label="End time">
                <input
                  type="time"
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  className="input"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Registration deadline"
                  hint="Participants won't be able to register after this time."
                >
                  <input
                    type="datetime-local"
                    name="registration_deadline"
                    value={form.registration_deadline}
                    onChange={handleChange}
                    className="input"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          {/* Registration */}
          <FormSection
            number="03"
            title="Registration"
            description="Set limits for participant registrations."
          >
            <Field
              label="Participant limit"
              hint="Leave empty if there is no maximum."
            >
              <input
                type="number"
                name="participant_limit"
                value={form.participant_limit}
                onChange={handleChange}
                placeholder="e.g. 120"
                min="1"
                className="input"
              />
            </Field>
          </FormSection>

          {/* Rules */}
          <FormSection
            number="04"
            title="Rules & instructions"
            description="Share anything participants need to know."
          >
            <Field
              label="Event rules"
              hint="You can add multiple rules on separate lines."
            >
              <textarea
                name="rules"
                value={form.rules}
                onChange={handleChange}
                placeholder={`Participants must carry their college ID.

Teams can have 2–4 members.

Participants must report 15 minutes before the event.`}
                rows={8}
                className="input resize-none"
              />
            </Field>
          </FormSection>

          {/* Image */}
          <FormSection
            number="05"
            title="Event image"
            description="Add a visual for your event listing."
          >
            <Field
              label="Image URL"
              hint="Optional. Image uploads through Supabase Storage can be added later."
            >
              <input
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                placeholder="https://example.com/event-image.jpg"
                className="input"
              />
            </Field>

            {form.image_url && (
              <div className="mt-5 overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f5f5f5]">
                <img
                  src={form.image_url}
                  alt="Event preview"
                  className="w-full max-h-72 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </FormSection>

          {/* Bottom actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3">
            <Link
              href="/faculty/dashboard"
              className="text-center text-sm text-[#737373] hover:text-[#171717] transition py-2.5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] text-white px-6 py-3 text-sm font-medium hover:bg-[#2a2a2a] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating event...
                </>
              ) : (
                <>
                  Create event
                  <span className="text-base">→</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-[#a3a3a3] mt-5">
            Your event will be created as a draft. You can publish
            it from the faculty dashboard.
          </p>
        </form>
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e5e5e5;
          background: #ffffff;
          color: #171717;
          border-radius: 0.625rem;
          padding: 0.7rem 0.85rem;
          font-size: 0.875rem;
          line-height: 1.5rem;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .input:hover {
          border-color: #d4d4d4;
        }

        .input:focus {
          border-color: #171717;
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.06);
        }

        .input::placeholder {
          color: #a3a3a3;
        }

        .input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        select.input {
          cursor: pointer;
        }

        input[type="date"],
        input[type="time"],
        input[type="datetime-local"] {
          color-scheme: light;
        }
      `}</style>
    </main>
  );
}

/* -------------------------------- */
/* Form Section                     */
/* -------------------------------- */

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[#e5e5e5] rounded-xl mb-5 overflow-hidden">
      <div className="px-6 sm:px-8 py-6 border-b border-[#eeeeee]">
        <div className="flex items-start gap-4">
          <span className="text-[11px] font-medium text-[#a3a3a3] pt-1">
            {number}
          </span>

          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              {title}
            </h2>

            <p className="text-sm text-[#737373] mt-1">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-7">
        {children}
      </div>
    </section>
  );
}

/* -------------------------------- */
/* Form Field                       */
/* -------------------------------- */

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <label className="text-sm font-medium text-[#262626]">
          {label}
          {required && (
            <span className="text-[#737373] ml-1">*</span>
          )}
        </label>

        {hint && (
          <span className="hidden sm:block text-[11px] text-[#a3a3a3]">
            {hint}
          </span>
        )}
      </div>

      {children}

      {hint && (
        <p className="sm:hidden text-[11px] text-[#a3a3a3] mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}