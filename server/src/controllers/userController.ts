import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import { createNotification } from "../services/notificationService";

/*
 * GET CURRENT USER
 * GET /api/users/me
 */
export const getMe = async (
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

    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        department,
        year,
        profile_image,
        created_at,
        updated_at
      `)
      .eq("id", req.user.userId)
      .single();

    if (error || !user) {
      console.error(
        "Get current user error:",
        error
      );

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get me error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

/*
 * UPDATE CURRENT USER
 * PUT /api/users/me
 */
export const updateMe = async (
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

    const {
      name,
      department,
      year,
      profile_image,
    } = req.body;

    if (
      name !== undefined &&
      (!name ||
        typeof name !== "string" ||
        !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (year !== undefined && year !== null) {
      const numericYear = Number(year);

      if (
        !Number.isInteger(numericYear) ||
        numericYear < 1 ||
        numericYear > 4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Academic year must be between 1 and 4",
        });
      }
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (department !== undefined) {
      updateData.department =
        department === null
          ? null
          : String(department).trim() || null;
    }

    if (year !== undefined) {
      updateData.year =
        year === null
          ? null
          : Number(year);
    }

    if (profile_image !== undefined) {
      updateData.profile_image =
        profile_image || null;
    }

    updateData.updated_at = new Date().toISOString();

    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.user.userId)
      .select(`
        id,
        name,
        email,
        role,
        department,
        year,
        profile_image,
        created_at,
        updated_at
      `)
      .single();

    if (error || !user) {
      console.error(
        "Update user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }

    return res.json({
      success: true,
      message:
        "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error(
      "Update me error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

/*
 * GET ALL USERS FOR ADMIN
 * GET /api/users/admin
 */
export const getAdminUsers = async (
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

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      data: users,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        department,
        year,
        profile_image,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Get admin users error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }

    const userList = users || [];

    return res.json({
      success: true,

      stats: {
        total: userList.length,

        students: userList.filter(
          (user) =>
            user.role === "student"
        ).length,

        faculty: userList.filter(
          (user) =>
            user.role === "faculty"
        ).length,

        admins: userList.filter(
          (user) =>
            user.role === "admin"
        ).length,

        judges: userList.filter(
          (user) =>
            user.role === "judge"
        ).length,

        volunteers: userList.filter(
          (user) =>
            user.role === "volunteer"
        ).length,
      },

      users: userList,
    });
  } catch (error) {
    console.error(
      "Admin users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
/*
 * Admin changes a user's role.
 *
 * This is how judges and volunteers come to exist: a person signs
 * up normally, then an admin promotes them. There is deliberately
 * no way to pick these roles at signup, so nobody can appoint
 * themselves a judge.
 */
export const updateUserRole = async (
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

    const rawId = req.params.id;
    const userId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const allowedRoles = [
      "student",
      "faculty",
      "admin",
      "judge",
      "volunteer",
    ];

    const role =
      typeof req.body?.role === "string"
        ? req.body.role.trim().toLowerCase()
        : "";

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${allowedRoles.join(", ")}`,
      });
    }

    /*
     * An admin cannot demote themselves. Doing so mid-session would
     * lock them out of the page they are standing on, and if they
     * were the only admin it would lock everyone out permanently.
     */
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const { data: target, error: lookupError } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("id", userId)
      .maybeSingle();

    if (lookupError) {
      console.error("Role lookup error:", lookupError);

      return res.status(500).json({
        success: false,
        message: "Failed to look up the user",
      });
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (target.role === role) {
      return res.status(200).json({
        success: true,
        message: `${target.name} is already a ${role}`,
        user: target,
      });
    }

    /*
     * Losing the judge or volunteer role must also drop the event
     * assignments that came with it, otherwise the person keeps
     * appearing on faculty's judge list while no longer being able
     * to sign in as one.
     */
    if (target.role === "judge" && role !== "judge") {
      const { count } = await supabase
        .from("judge_evaluations")
        .select("id", { count: "exact", head: true })
        .eq("judge_id", userId);

      if ((count ?? 0) > 0) {
        return res.status(409).json({
          success: false,
          message: `${target.name} has already submitted ${count} evaluation${
            count === 1 ? "" : "s"
          }. Changing their role would leave those scores without a judge.`,
        });
      }

      await supabase
        .from("event_judges")
        .delete()
        .eq("judge_id", userId);
    }

    if (target.role === "volunteer" && role !== "volunteer") {
      await supabase
        .from("event_volunteers")
        .delete()
        .eq("volunteer_id", userId);
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id, name, email, role, department, year")
      .single();

    if (updateError) {
      console.error("Role update error:", updateError);

      return res.status(500).json({
        success: false,
        message: "Failed to update the role",
      });
    }

    await createNotification({
      userId,
      title: "Your role has changed",
      message: `An administrator changed your role to ${role}. Sign out and back in to see your new dashboard.`,
      type: "general",
    });

    return res.status(200).json({
      success: true,
      message: `${updated.name} is now a ${role}`,
      user: updated,
    });
  } catch (error) {
    console.error("Update role error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
