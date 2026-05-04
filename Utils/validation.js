import mongoose from "mongoose";

const dangerousKeyPattern = /(^\$)|\./;

export const hasDangerousKeys = (value) => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasDangerousKeys);

  return Object.entries(value).some(([key, nestedValue]) => {
    if (dangerousKeyPattern.test(key)) return true;
    return hasDangerousKeys(nestedValue);
  });
};

export const rejectDangerousKeys = (req, res, next) => {
  if ([req.body, req.query, req.params].some(hasDangerousKeys)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request payload.",
    });
  }

  next();
};

export const sanitizeString = (value, maxLength = 1000) =>
  String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, maxLength);

export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const isHttpUrl = (value, allowEmpty = true) => {
  const text = String(value || "").trim();
  if (!text) return allowEmpty;

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

export const assertObjectId = (id, label = "id") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${label}.`);
    error.statusCode = 400;
    throw error;
  }
};

export const pickAllowed = (source, allowedFields) =>
  allowedFields.reduce((data, field) => {
    if (source[field] !== undefined) data[field] = source[field];
    return data;
  }, {});

export const normalizeStringArray = (value, maxItems = 20, maxLength = 80) => {
  const items = Array.isArray(value) ? value : String(value || "").split(",");

  return items
    .map((item) => sanitizeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

export const validateRequiredStrings = (data, fields) => {
  const missing = fields.find((field) => !sanitizeString(data[field], 5000));
  if (!missing) return null;
  return `${missing} is required.`;
};
