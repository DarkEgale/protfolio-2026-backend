import ClientUser from "../Models/ClientUser.model.js";
import Project from "../Models/Project.mode.js";
import UserProjectHistory from "../Models/UserProjectHistory.model.js";
import { clientAuthCookieName, clientCookieOptions, signClientToken } from "../MiddleWare/clientAuth.js";
import { assertObjectId, isEmail, sanitizeString } from "../Utils/validation.js";
import { emailVerificationExpiresAt, sendVerificationEmail } from "../Utils/mailer.js";
import crypto from "crypto";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  emailVerified: Boolean(user.emailVerified),
  createdAt: user.createdAt,
});

const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));

const hashVerificationCode = (code) =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

const sendAndStoreVerificationCode = async (user) => {
  const code = createVerificationCode();
  user.emailVerificationCode = hashVerificationCode(code);
  user.emailVerificationExpires = emailVerificationExpiresAt();
  user.emailVerificationSentAt = new Date();
  await user.save();

  const receiverEmail = user.email;

  try {
    await sendVerificationEmail({ to: receiverEmail, name: user.name, code });

    return {
      code,
      receiverEmail,
      emailSent: true,
      emailError: "",
      expiresAt: user.emailVerificationExpires,
    };
  } catch (error) {
    console.error("Verification email delivery failed:", error.message);

    return {
      code,
      receiverEmail,
      emailSent: false,
      emailError: error.message,
      expiresAt: user.emailVerificationExpires,
    };
  }
};

export const registerClientUser = async (req, res) => {
  try {
    const name = sanitizeString(req.body.name, 120);
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    const password = sanitizeString(req.body.password, 200);

    if (!name || !isEmail(email) || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Name, valid email, and a 6 character password are required",
      });
    }

    const existing = await ClientUser.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email",
      });
    }

    const user = await ClientUser.create({ name, email, password });
    res.cookie(clientAuthCookieName, signClientToken(user), clientCookieOptions);

    res.status(201).json({
      success: true,
      message: verification.emailSent
        ? "Registration successful. Please verify your email."
        : "Registration successful, but verification email could not be sent. Please check SMTP settings and resend the code.",
      emailSent: verification.emailSent,
      verificationEmailReceiver: verification.receiverEmail,
      user: publicUser(user),
      ...(process.env.NODE_ENV !== "production" ? { devVerificationCode: verification.code } : {}),
    });
    const verification = await sendAndStoreVerificationCode(user);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

export const loginClientUser = async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    const password = sanitizeString(req.body.password, 200);

    if (!isEmail(email) || !password) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required",
      });
    }

    const user = await ClientUser.findOne({ email }).select("+password");
    const passwordMatches = user ? await user.comparePassword(password) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    res.cookie(clientAuthCookieName, signClientToken(user), clientCookieOptions);
    res.status(200).json({
      success: true,
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

export const getClientMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: publicUser(req.clientUser),
  });
};

export const verifyClientEmail = async (req, res) => {
  try {
    const code = sanitizeString(req.body.code, 20).replace(/\D/g, "");

    if (code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "A valid 6 digit verification code is required",
      });
    }

    const user = await ClientUser.findById(req.clientUser._id).select(
      "+emailVerificationCode +emailVerificationExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
        user: publicUser(user),
      });
    }

    const matches = user.emailVerificationCode === hashVerificationCode(code);
    const validTime = user.emailVerificationExpires && user.emailVerificationExpires.getTime() > Date.now();

    if (!matches || !validTime) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: error.message,
    });
  }
};

export const resendClientVerificationEmail = async (req, res) => {
  try {
    const user = await ClientUser.findById(req.clientUser._id).select(
      "+emailVerificationCode +emailVerificationExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
        user: publicUser(user),
      });
    }

    const lastSentAt = user.emailVerificationSentAt?.getTime() || 0;
    if (Date.now() - lastSentAt < 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: "Please wait one minute before requesting another code",
      });
    }

    const verification = await sendAndStoreVerificationCode(user);

    res.status(200).json({
      success: true,
      message: verification.emailSent
        ? "Verification email sent"
        : "Verification code saved, but email could not be sent. Please check SMTP settings.",
      emailSent: verification.emailSent,
      verificationEmailReceiver: verification.receiverEmail,
      user: publicUser(user),
      ...(process.env.NODE_ENV !== "production" ? { devVerificationCode: verification.code } : {}),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not resend verification email",
      error: error.message,
    });
  }
};

export const logoutClientUser = (_req, res) => {
  res.clearCookie(clientAuthCookieName, { ...clientCookieOptions, maxAge: 0 });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const recordProjectView = async (req, res) => {
  try {
    assertObjectId(req.params.projectId, "project id");

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const history = await UserProjectHistory.findOneAndUpdate(
      { userId: req.clientUser._id, projectId: project._id },
      {
        $set: { lastViewedAt: new Date() },
        $setOnInsert: { firstViewedAt: new Date() },
        $inc: { viewCount: 1 },
      },
      { upsert: true, new: true }
    ).populate("projectId");

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Could not save project history",
      error: error.message,
    });
  }
};

export const getProjectHistory = async (req, res) => {
  try {
    const history = await UserProjectHistory.find({ userId: req.clientUser._id })
      .populate("projectId")
      .sort({ lastViewedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load project history",
      error: error.message,
    });
  }
};
