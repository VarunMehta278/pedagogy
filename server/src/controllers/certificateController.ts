import { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateCertificatePDF } from "../services/certificateService";
import { isUniqueViolation } from "../utils/dbErrors";
import {
  createNotification,
  createNotifications,
} from "../services/notificationService";
import {
  getOrdinalPosition,
  getOrdinalSuffix,
} from "../utils/ordinals";

const generateCertificateCode = () => {
  return `CERT-${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
};

/*
 * Generate a certificate for a winner
 */

/*
 * One winner certificate per member of a placed team.
 *
 * Idempotent: a member who already has one is skipped rather than
 * given a second, so re-running the button is safe.
 */
const issueTeamWinnerCertificates = async (
  res: Response,
  eventId: string,
  result: any
) => {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(
      `id, name, members:team_members ( student_id )`
    )
    .eq("id", result.team_id)
    .maybeSingle();

  if (teamError || !team) {
    console.error("Team certificate lookup error:", teamError);

    return res.status(404).json({
      success: false,
      message: "The team for this result no longer exists",
    });
  }

  const memberIds: string[] = ((team as any).members || []).map(
    (m: any) => m.student_id
  );

  if (memberIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "That team has no members",
    });
  }

  const { data: existing } = await supabase
    .from("certificates")
    .select("student_id")
    .eq("event_id", eventId)
    .eq("certificate_type", "winner")
    .in("student_id", memberIds);

  const already = new Set(
    (existing || []).map((c: any) => c.student_id)
  );

  const created: any[] = [];

  for (const studentId of memberIds) {
    if (already.has(studentId)) continue;

    let certificateCode = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCertificateCode();

      const { data, error } = await supabase
        .from("certificates")
        .select("id")
        .eq("certificate_code", candidate)
        .maybeSingle();

      if (error) {
        console.error("Certificate code lookup error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to create certificates",
        });
      }

      if (!data) {
        certificateCode = candidate;
        break;
      }
    }

    if (!certificateCode) {
      return res.status(500).json({
        success: false,
        message: "Could not allocate a certificate code",
      });
    }

    const { data: certificate, error: insertError } = await supabase
      .from("certificates")
      .insert({
        certificate_code: certificateCode,
        event_id: eventId,
        student_id: studentId,
        team_id: (team as any).id,
        result_id: result.id,
        certificate_type: "winner",
        title: `${result.position ? getOrdinalPosition(result.position) : "Winner"} — ${(team as any).name}`,
      })
      .select()
      .single();

    /*
     * The unique index on (event_id, student_id, certificate_type) is
     * what actually prevents a duplicate — the "already exists?" check
     * above can be passed by two concurrent requests, which is exactly
     * what a double-clicked Generate button produces. The loser fetches
     * the row the winner created and returns it, so the caller gets the
     * certificate rather than an error.
     */
    if (isUniqueViolation(insertError)) {
      const { data: winner } = await supabase
        .from("certificates")
        .select("*")
        .eq("event_id", eventId)
        .eq("student_id", studentId)
        .eq("certificate_type", "winner")
        .maybeSingle();

      if (winner) {
        created.push(winner);
        continue;
      }
    }

    if (insertError) {
      console.error("Team certificate insert error:", insertError);

      return res.status(500).json({
        success: false,
        message: "Failed to create certificates",
      });
    }

    created.push(certificate);
  }

  if (created.length > 0) {
    await createNotifications(
      created.map((certificate) => ({
        userId: certificate.student_id,
        title: "Your certificate is ready",
        message: `Your winner certificate for ${(team as any).name} is available to download.`,
        type: "certificate" as const,
        eventId,
      }))
    );
  }

  return res.status(201).json({
    success: true,
    message:
      created.length > 0
        ? `${created.length} certificate${created.length === 1 ? "" : "s"} issued for ${(team as any).name}`
        : "Every member already has a certificate",
    certificates: created,
  });
};

export const generateWinnerCertificate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id, resultId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get event
    const { data: event, error: eventError } =
      await supabase
        .from("events")
        .select(
          "id, title, event_date, organizer_id, status"
        )
        .eq("id", id)
        .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Faculty can only generate certificates for their own events
    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to manage this event",
      });
    }

    // Get result + student
    const { data: result, error: resultError } =
      await supabase
        .from("event_results")
        .select(`
          id,
          event_id,
          student_id,
          registration_id,
          team_id,
          position,
          score,
          student:users!event_results_student_id_fkey (
            id,
            name,
            email,
            department,
            year
          )
        `)
        .eq("id", resultId)
        .eq("event_id", id)
        .single();

    if (resultError || !result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    /*
     * A team result has no student_id — the TEAM placed. Every member
     * gets their own certificate row and their own downloadable PDF,
     * all carrying the same team name and placement, so nobody has to
     * share a file. Handled here and then returned, leaving the
     * individual path below completely untouched.
     */
    if (result.team_id) {
      /*
       * @types/express models params as string | string[], so the
       * event id is narrowed the same way the rest of this codebase
       * narrows it rather than being asserted.
       */
      return issueTeamWinnerCertificates(
        res,
        Array.isArray(id) ? id[0] : id,
        result
      );
    }

    // Check whether certificate already exists
    const { data: existingCertificate } =
      await supabase
        .from("certificates")
        .select("*")
        .eq("event_id", id)
        .eq("student_id", result.student_id)
        .eq("certificate_type", "winner")
        .maybeSingle();

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: "Certificate already exists",
        certificate: existingCertificate,
      });
    }

    // Generate unique certificate code
    /*
     * Bounded retry: an unbounded loop here would spin
     * forever against a failing database, since a query
     * error also yields no row and reads as "taken".
     */
    let certificateCode = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCertificateCode();

      const { data, error: lookupError } =
        await supabase
          .from("certificates")
          .select("id")
          .eq("certificate_code", candidate)
          .maybeSingle();

      if (lookupError) {
        console.error(
          "Certificate code lookup error:",
          lookupError
        );

        return res.status(500).json({
          success: false,
          message: "Failed to create certificate",
        });
      }

      if (!data) {
        certificateCode = candidate;
        break;
      }
    }

    if (!certificateCode) {
      console.error(
        "Could not generate a unique certificate code"
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create certificate",
      });
    }

    // Create certificate record
    const { data: certificate, error } =
      await supabase
        .from("certificates")
        .insert({
          certificate_code: certificateCode,
          event_id: id,
          student_id: result.student_id,
          result_id: result.id,
          certificate_type: "winner",
          title: `${result.position}${getOrdinalSuffix(
            result.position
          )} Place`,
        })
        .select()
        .single();

    /*
     * The unique index on (event_id, student_id, certificate_type) is
     * what actually prevents a duplicate — the "already exists?" check
     * above can be passed by two concurrent requests, which is exactly
     * what a double-clicked Generate button produces. The loser fetches
     * the row the winner created and returns it, so the caller gets the
     * certificate rather than an error.
     */
    if (isUniqueViolation(error)) {
      const { data: existing } = await supabase
        .from("certificates")
        .select("*")
        .eq("event_id", id)
        .eq("student_id", result.student_id)
        .eq("certificate_type", "winner")
        .maybeSingle();

      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Certificate already exists",
          certificate: existing,
        });
      }
    }

    if (error || !certificate) {
      console.error(
        "Certificate database error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create certificate",
      });
    }

    await createNotification({
      userId: result.student_id,
      title: "Certificate Available",
      message: `Your certificate for ${event.title} is now ready to view.`,
      type: "certificate",
      eventId: event.id,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      certificate,
    });
  } catch (error) {
    console.error(
      "Generate certificate error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


/*
 * Generate participation certificate
 */
export const generateParticipationCertificate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id, studentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get event
    const { data: event, error: eventError } =
      await supabase
        .from("events")
        .select(
          "id, title, event_date, organizer_id, status"
        )
        .eq("id", id)
        .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to manage this event",
      });
    }

    // Find participant
    const { data: registration } =
      await supabase
        .from("registrations")
        .select(`
          id,
          status,
          student:users!registrations_student_id_fkey (
            id,
            name,
            email,
            department,
            year
          )
        `)
        .eq("event_id", id)
        .eq("student_id", studentId)
        .neq("status", "cancelled")
        .maybeSingle();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message:
          "Student is not registered for this event",
      });
    }

    // Participation certificate requires attendance
    const { data: attendance } =
      await supabase
        .from("attendance")
        .select("id")
        .eq("registration_id", registration.id)
        .maybeSingle();

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message:
          "Student must attend the event before receiving a participation certificate",
      });
    }

    // Existing certificate
    const { data: existingCertificate } =
      await supabase
        .from("certificates")
        .select("*")
        .eq("event_id", id)
        .eq("student_id", studentId)
        .eq("certificate_type", "participation")
        .maybeSingle();

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: "Certificate already exists",
        certificate: existingCertificate,
      });
    }

    /*
     * Bounded retry: an unbounded loop here would spin
     * forever against a failing database, since a query
     * error also yields no row and reads as "taken".
     */
    let certificateCode = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCertificateCode();

      const { data, error: lookupError } =
        await supabase
          .from("certificates")
          .select("id")
          .eq("certificate_code", candidate)
          .maybeSingle();

      if (lookupError) {
        console.error(
          "Certificate code lookup error:",
          lookupError
        );

        return res.status(500).json({
          success: false,
          message: "Failed to create certificate",
        });
      }

      if (!data) {
        certificateCode = candidate;
        break;
      }
    }

    if (!certificateCode) {
      console.error(
        "Could not generate a unique certificate code"
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create certificate",
      });
    }

    const { data: certificate, error } =
      await supabase
        .from("certificates")
        .insert({
          certificate_code: certificateCode,
          event_id: id,
          student_id: studentId,
          result_id: null,
          certificate_type: "participation",
          title: "Participation Certificate",
        })
        .select()
        .single();

    /* Same race as the winner path — see the note there. */
    if (isUniqueViolation(error)) {
      const { data: existing } = await supabase
        .from("certificates")
        .select("*")
        .eq("event_id", id)
        .eq("student_id", studentId)
        .eq("certificate_type", "participation")
        .maybeSingle();

      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Certificate already exists",
          certificate: existing,
        });
      }
    }

    if (error || !certificate) {
      console.error(
        "Participation certificate error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create certificate",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Participation certificate generated successfully",
      certificate,
    });
  } catch (error) {
    console.error(
      "Participation certificate error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


/*
 * Download / generate the actual PDF
 */
export const downloadCertificate = async (
  req: Request,
  res: Response
) => {
  try {
    const { certificateCode } = req.params;

    const { data: certificate, error } =
      await supabase
        .from("certificates")
        .select(`
          id,
          certificate_code,
          certificate_type,
          title,
          issued_at,
          event_id,
          student_id,
          result_id,
          event:events!certificates_event_id_fkey (
            id,
            title,
            event_date
          ),
          student:users!certificates_student_id_fkey (
            id,
            name,
            email,
            department,
            year
          ),
          result:event_results!certificates_result_id_fkey (
            position,
            score
          ),
          team:teams!certificates_team_id_fkey (
            id,
            name
          )
        `)
        .eq(
          "certificate_code",
          certificateCode
        )
        .single();

    if (error || !certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    const event = Array.isArray(certificate.event)
      ? certificate.event[0]
      : certificate.event;

    const student = Array.isArray(
      certificate.student
    )
      ? certificate.student[0]
      : certificate.student;

    const result = Array.isArray(
      certificate.result
    )
      ? certificate.result[0]
      : certificate.result;

    const team = Array.isArray(certificate.team)
      ? certificate.team[0]
      : certificate.team;

    if (!event || !student) {
      return res.status(500).json({
        success: false,
        message:
          "Certificate information is incomplete",
      });
    }

    const pdfBuffer =
      await generateCertificatePDF({
        certificateCode:
          certificate.certificate_code,

        studentName: student.name,

        /*
         * Null on an individual certificate, so the PDF renders
         * exactly as it did before teams existed.
         */
        teamName: team?.name ?? null,

        eventTitle: event.title,

        position:
          result?.position ?? null,

        certificateType:
          certificate.certificate_type ===
          "winner"
            ? "winner"
            : "participation",

        eventDate: event.event_date,

        department:
          student.department ?? null,
      });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${certificate.certificate_code}.pdf"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error(
      "Download certificate error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate certificate PDF",
    });
  }
};


/*
 * Public certificate verification
 */
export const verifyCertificate = async (
  req: Request,
  res: Response
) => {
  try {
    const { certificateCode } = req.params;

    const { data: certificate, error } =
      await supabase
        .from("certificates")
        .select(`
          certificate_code,
          certificate_type,
          title,
          issued_at,
          event:events!certificates_event_id_fkey (
            title,
            event_date,
            venue
          ),
          student:users!certificates_student_id_fkey (
            name,
            department,
            year
          ),
          result:event_results!certificates_result_id_fkey (
            position,
            score
          )
        `)
        .eq(
          "certificate_code",
          certificateCode
        )
        .single();

    if (error || !certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Certificate not found",
      });
    }

    const event = Array.isArray(certificate.event)
      ? certificate.event[0]
      : certificate.event;

    const student = Array.isArray(
      certificate.student
    )
      ? certificate.student[0]
      : certificate.student;

    const result = Array.isArray(
      certificate.result
    )
      ? certificate.result[0]
      : certificate.result;

    return res.json({
      success: true,
      verified: true,

      certificate: {
        certificate_code:
          certificate.certificate_code,

        certificate_type:
          certificate.certificate_type,

        title: certificate.title,

        issued_at: certificate.issued_at,

        student: student || null,

        event: event || null,

        result: result || null,
      },
    });
  } catch (error) {
    console.error(
      "Verify certificate error:",
      error
    );

    return res.status(500).json({
      success: false,
      verified: false,
      message:
        "Failed to verify certificate",
    });
  }
};


/*
 * Get certificates belonging to logged-in student
 */
export const getMyCertificates = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { data: certificates, error } =
      await supabase
        .from("certificates")
        .select(`
          id,
          certificate_code,
          certificate_type,
          title,
          issued_at,
          event:events!certificates_event_id_fkey (
            id,
            title,
            event_date,
            venue
          ),
          result:event_results!certificates_result_id_fkey (
            position,
            score
          )
        `)
        .eq(
          "student_id",
          req.user.userId
        )
        .order("issued_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Get certificates error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch certificates",
      });
    }

    return res.json({
      success: true,
      certificates: certificates || [],
    });
  } catch (error) {
    console.error(
      "My certificates error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
