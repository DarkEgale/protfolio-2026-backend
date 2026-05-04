import User from "../Models/User.model.js";
import AccessToken from "../Models/AccessToken.js";
import { authCookieName, cookieOptions, signAuthToken } from "../MiddleWare/auth.js";
import { isEmail, sanitizeString } from "../Utils/validation.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

export const loginAdmin = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    const password = sanitizeString(req.body.password, 200);

    if (!isEmail(email) || !password) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    const passwordMatches = user ? await user.comparePassword(password) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signAuthToken(user);

    res.cookie(authCookieName, token, cookieOptions);
    await AccessToken.create({
      userId: user._id,
      token: token,
      expiresAt: new Date(Date.now() + 7*24 * 60 * 60 * 1000), // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
};

export const logoutAdmin = async (_req, res) => {
  res.clearCookie(authCookieName, { ...cookieOptions, maxAge: 0 });
  await AccessToken.deleteOne({ token: _req.cookies[authCookieName] });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
