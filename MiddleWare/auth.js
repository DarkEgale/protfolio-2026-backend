import jwt from "jsonwebtoken";
import User from "../Models/User.model.js";
import AccessToken from "../Models/AccessToken.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.JWT_TOKEN || process.env.SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET or SECRET is missing in backend .env");
  }

  return secret;
};

export const authCookieName = "admin_token";

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const signAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
};

export const requireAdminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[authCookieName];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
      });
    }
    const tokenInDb = await AccessToken.findOne({ token });
    if (!tokenInDb) {
      return res.status(401).json({
        success: false,
        message: "Authentication session not found",
      });
    }
    //send user
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication session",
    });
  }
};
