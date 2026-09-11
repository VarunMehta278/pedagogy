import { Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import { createNotification } from "../services/notificationService";

/**
 * Generate a unique registration code
 */
const generateRegistrationCode = () => {
  return `REG-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
};

/**
 * Student registers for an event
 *
 * Supports all of these:
 *
 * POST /api/registrations/:eventId
 *
 * POST /api/registrations?eventId=...
 *
 * POST /api/registrations
 * {
 *   eventId: "..."
 * }
 */
export const registerForEvent = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    /*
     * Authentication
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /*
     * Only students
     */
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "Only students can register for events",
      });
    }

    /*
     * --------------------------------------------------
     * Resolve Event ID
     * --------------------------------------------------
     *
     * Check:
     *
     * 1. URL parameter
     * 2. Request body
     * 3. Query parameter
     */

    const paramEventId =
      typeof req.params.eventId === "string"
        ? req.params.eventId
        : undefined;

   const bodyEventId =
  req.body &&
  typeof req.body.eventId === "string"
    ? req.body.eventId
    : req.body &&
      typeof req.body.event_id === "string"
    ? req.body.event_id
    : undefined;

    const queryEventId =
      typeof req.query.eventId === "string"
        ? req.query.eventId
        : undefined;

    const eventId =
      paramEventId ||
      bodyEventId ||
      queryEventId;

    /*
     * Event ID validation
     */
    if (!eventId || !eventId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    /*
     * Clean ID
     */
    const resolvedEventId =
      eventId.trim();

    /*
     * --------------------------------------------------
     * Get Event
     * --------------------------------------------------
     */

    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("events")
      .select("*")
      .eq("id", resolvedEventId)
      .single();

    if (eventError || !event) {
      console.error(
        "Event lookup error:",
        eventError
      );

      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    /*
     * --------------------------------------------------
     * Event must be published
     * --------------------------------------------------
     */

    if (event.status !== "published") {
      return res.status(400).json({
        success: false,
        message:
          "Registration is not available for this event",
      });
    }

    /*
     * --------------------------------------------------
     * Registration Deadline
     * --------------------------------------------------
     */

    if (event.registration_deadline) {
      const deadline = new Date(
        event.registration_deadline
      );

      if (new Date() > deadline) {
        return res.status(400).json({
          success: false,
          message:
            "Registration deadline has passed",
        });
      }
    }

    /*
     * --------------------------------------------------
     * Check Existing Registration
     * --------------------------------------------------
     */

    const {
      data: existingRegistration,
      error: existingError,
    } = await supabase
      .from("registrations")
      .select(
        "id, registration_code, status"
      )
      .eq(
        "event_id",
        resolvedEventId
      )
      .eq(
        "student_id",
        req.user.userId
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing registration check error:",
        existingError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to check existing registration",
      });
    }

    /*
     * Existing active registration
     */
    if (
      existingRegistration &&
      existingRegistration.status !==
        "cancelled"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "You are already registered for this event",
        registration:
          existingRegistration,
      });
    }

    /*
     * --------------------------------------------------
     * Participant Limit
     * --------------------------------------------------
     */

    if (event.participant_limit) {
      const {
        count,
        error: countError,
      } = await supabase
        .from("registrations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "event_id",
          resolvedEventId
        )
        .neq(
          "status",
          "cancelled"
        );

      if (countError) {
        console.error(
          "Participant count error:",
          countError
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to check event capacity",
        });
      }

      if (
        count !== null &&
        count >= event.participant_limit
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This event has reached its participant limit",
        });
      }
    }

    /*
     * --------------------------------------------------
     * Generate Registration Code
     * --------------------------------------------------
     */

    const registrationCode =
      generateRegistrationCode();

    /*
     * --------------------------------------------------
     * Create Registration
     * --------------------------------------------------
     *
     * A student who cancelled earlier already has a row
     * for this event. That row is revived rather than
     * inserting a second one — a duplicate would break
     * the (event_id, student_id) lookups that expect a
     * single row, such as adding an event result.
     */

    const { data: registration, error: registrationError } =
      existingRegistration
        ? await supabase
            .from("registrations")
            .update({
              registration_code:
                registrationCode,

              status: "registered",

              registered_at:
                new Date().toISOString(),

              updated_at:
                new Date().toISOString(),
            })
            .eq("id", existingRegistration.id)
            .select()
            .single()
        : await supabase
            .from("registrations")
            .insert({
              registration_code:
                registrationCode,

              event_id:
                resolvedEventId,

              student_id:
                req.user.userId,

              status:
                "registered",
            })
            .select()
            .single();

    if (
      registrationError ||
      !registration
    ) {
      console.error(
        "Registration creation error:",
        registrationError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to register for event",
      });
    }

    /*
     * --------------------------------------------------
     * Capacity re-check
     * --------------------------------------------------
     *
     * The limit check above and the write are two
     * separate statements, so simultaneous requests can
     * both pass it and overfill the event. Re-counting
     * afterwards closes that window: if this row is the
     * one that went over, it is rolled back.
     *
     * A unique//check constraint in the database would
     * be the airtight fix; this keeps the API honest in
     * the meantime.
     */

    if (event.participant_limit) {
      const { count: confirmedCount } =
        await supabase
          .from("registrations")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("event_id", resolvedEventId)
          .neq("status", "cancelled");

      if (
        confirmedCount !== null &&
        confirmedCount >
          event.participant_limit
      ) {
        await supabase
          .from("registrations")
          .update({
            status: "cancelled",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", registration.id);

        return res.status(400).json({
          success: false,
          message:
            "This event has reached its participant limit",
        });
      }
    }

    /*
     * --------------------------------------------------
     * Generate QR Code
     * --------------------------------------------------
     */

    const qrCodeDataUrl =
      await QRCode.toDataURL(
        registrationCode,
        {
          width: 400,
          margin: 2,
          errorCorrectionLevel:
            "H",
        }
      );

    /*
     * --------------------------------------------------
     * Notification
     * --------------------------------------------------
     */

    try {
      await createNotification({
        userId:
          req.user.userId,

        title:
          "Registration Confirmed",

        message:
          `You have successfully registered for ${event.title}. Your registration code is ${registrationCode}.`,

        type:
          "registration",

        eventId:
          resolvedEventId,
      });
    } catch (notificationError) {
      console.error(
        "Registration notification error:",
        notificationError
      );
    }

    /*
     * --------------------------------------------------
     * Success
     * --------------------------------------------------
     */

    return res.status(201).json({
      success: true,

      message:
        "Successfully registered for the event",

      registration: {
        ...registration,

        qr_code:
          qrCodeDataUrl,
      },
    });
  } catch (error) {
    console.error(
      "Register for event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while registering for the event",
    });
  }
};

/**
 * Get logged-in student's registrations
 */
export const getMyRegistrations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "Only students can access registrations",
      });
    }

    const {
      data: registrations,
      error,
    } = await supabase
      .from("registrations")
      .select(`
        id,
        registration_code,
        status,
        registered_at,
        created_at,
        event_id,
        events (
          id,
          title,
          description,
          category,
          event_date,
          start_time,
          end_time,
          venue,
          registration_deadline,
          participant_limit,
          image_url,
          status
        )
      `)
      .eq(
        "student_id",
        req.user.userId
      )
      .order(
        "registered_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Get registrations error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch your registrations",
      });
    }

    const registrationsWithQR =
      await Promise.all(
        (registrations || []).map(
          async (registration) => {
            const qrCodeDataUrl =
              await QRCode.toDataURL(
                registration.registration_code,
                {
                  width: 400,
                  margin: 2,
                  errorCorrectionLevel:
                    "H",
                }
              );

            return {
              ...registration,

              qr_code:
                qrCodeDataUrl,
            };
          }
        )
      );

    return res.json({
      success: true,

      registrations:
        registrationsWithQR,
    });
  } catch (error) {
    console.error(
      "Get my registrations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch your registrations",
    });
  }
};