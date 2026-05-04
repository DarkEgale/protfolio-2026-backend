import SiteContent from "../Models/SiteContent.model.js";
import { hasDangerousKeys, sanitizeString } from "../Utils/validation.js";

const parseJSONField = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizeContentValue = (value) => {
  if (typeof value === "string") return sanitizeString(value, 5000);
  if (Array.isArray(value)) return value.map(sanitizeContentValue).slice(0, 50);
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce((next, [key, item]) => {
    next[key] = sanitizeContentValue(item);
    return next;
  }, {});
};

const getDefaultContent = () => new SiteContent({ singletonKey: "main" });

const getOrCreateSiteContent = async () => {
  let content = await SiteContent.findOne({ singletonKey: "main" });

  if (!content) {
    content = getDefaultContent();
    await content.save();
  }

  return content;
};

export const getSiteContent = async (_req, res) => {
  try {
    const content = await getOrCreateSiteContent();
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch site content",
      error: error.message,
    });
  }
};

export const updateSiteContent = async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};
    const current = await getOrCreateSiteContent();

    const update = {
      brand: sanitizeContentValue(parseJSONField(body.brand, current.brand)),
      navLinks: sanitizeContentValue(parseJSONField(body.navLinks, current.navLinks)),
      hero: sanitizeContentValue(parseJSONField(body.hero, current.hero)),
      profile: sanitizeContentValue(parseJSONField(body.profile, current.profile)),
      services: sanitizeContentValue(parseJSONField(body.services, current.services)),
      contact: sanitizeContentValue(parseJSONField(body.contact, current.contact)),
      footer: sanitizeContentValue(parseJSONField(body.footer, current.footer)),
    };

    if (hasDangerousKeys(update)) {
      return res.status(400).json({
        success: false,
        message: "Invalid CMS payload.",
      });
    }

    if (files.logoImage?.[0]) {
      update.brand.logoImage = files.logoImage[0].path;
    }

    if (files.heroImage?.[0]) {
      update.hero.heroImage = files.heroImage[0].path;
    }

    if (files.profileImage?.[0]) {
      update.hero.profileImage = files.profileImage[0].path;
      update.profile.image = files.profileImage[0].path;
    }

    const content = await SiteContent.findOneAndUpdate(
      { singletonKey: "main" },
      { $set: update },
      { new: true, runValidators: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Site content updated successfully",
      data: content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update site content",
      error: error.message,
    });
  }
};
