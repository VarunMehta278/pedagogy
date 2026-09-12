import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import jwt from "jsonwebtoken";

import {
  SESSION_MAX_AGE_MS,
  sessionCookieOptions,
} from "../config/cookies";
import { getPasswordProblem } from "../utils/password";

export const register = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      department,
      year,
    } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const passwordProblem =
      getPasswordProblem(String(password));

    if (passwordProblem) {
      return res.status(400).json({
        success: false,
        message: passwordProblem,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether user already exists
    const { data: existingUser, error: existingUserError } =
      await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (existingUserError) {
      console.error(existingUserError);

      return res.status(500).json({
        success: false,
        message: "Failed to check existing user",
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        // Public sign-up always creates students. Faculty/admin
        // accounts are provisioned separately, so the role is
        // intentionally never taken from the request body.
        role: "student",
        department: department || null,
        year: year || null,
      })
      .select(
        "id, name, email, role, department, year, profile_image, created_at"
      )
      .single();

    if (insertError) {
      console.error(insertError);

      return res.status(500).json({
        success: false,
        message: "Failed to create account",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to find user",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password with bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create JWT
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    // Store JWT in secure HTTP-only cookie
    res.cookie("token", token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_MAX_AGE_MS,
    });

    // Never send password back to frontend
    const { password: _, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const logout = async (
  req: Request,
  res: Response
) => {
  try {
    res.clearCookie(
      "token",
      sessionCookieOptions()
    );

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};