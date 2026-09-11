import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";

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