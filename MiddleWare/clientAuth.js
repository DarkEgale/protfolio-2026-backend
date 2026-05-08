import jwt from "jsonwebtoken";
import ClientUser from "../Models/ClientUser.model.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.JWT_TOKEN || process.env.SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET or SECRET is missing in backend .env");
  }

  return secret;
};

export const clientAuthCookieName = "client_token";

export const clientCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const signClientToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      scope: "client",
    },
    getJwtSecret(),
    { expiresIn: "30d" }
  );

export const requireClientAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[clientAuthCookieName];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "User login required",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = decoded.scope === "client" ? await ClientUser.findById(decoded.id).select("-password") : null;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid user session",
      });
    }

    req.clientUser = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired user session",
    });
  }
};

export const requireVerifiedClient = (req, res, next) => {
  if (!req.clientUser?.emailVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email before opening your dashboard",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
};
