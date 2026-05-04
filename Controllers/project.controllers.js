import Project from "../Models/Project.mode.js";
import mongoose from "mongoose";
import {
  assertObjectId,
  isHttpUrl,
  normalizeStringArray,
  pickAllowed,
  sanitizeString,
  validateRequiredStrings,
} from "../Utils/validation.js";

const slugify = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniqueProjectSlug = async (title, currentId) => {
  const baseSlug = slugify(title) || "project";
  let slug = baseSlug;
  let index = 2;

  while (await Project.exists({ slug, _id: { $ne: currentId } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
};

const projectFields = [
  "title",
  "subtitle",
  "techStuck",
  "description",
  "fetures",
  "features",
  "category",
  "client",
  "githubUrl",
  "challenges",
  "duration",
  "coverImage",
  "screenshots",
  "projectUrl",
];

const setIfPresent = (data, source, field, normalize) => {
  if (source[field] !== undefined) data[field] = normalize(source[field]);
};

const normalizeProjectPayload = (source, { partial = false } = {}) => {
  const data = pickAllowed(source, projectFields);
  setIfPresent(data, source, "title", (value) => sanitizeString(value, 140));
  setIfPresent(data, source, "subtitle", (value) => sanitizeString(value, 220));
  setIfPresent(data, source, "description", (value) => sanitizeString(value, 10000));
  setIfPresent(data, source, "fetures", (value) => sanitizeString(value, 8000));
  if (data.fetures === undefined && source.features !== undefined) {
    data.fetures = sanitizeString(source.features, 8000);
  }
  setIfPresent(data, source, "category", (value) => sanitizeString(value, 80));
  setIfPresent(data, source, "client", (value) => sanitizeString(value, 120));
  setIfPresent(data, source, "githubUrl", (value) => sanitizeString(value, 1000));
  setIfPresent(data, source, "challenges", (value) => sanitizeString(value, 8000));
  setIfPresent(data, source, "duration", (value) => sanitizeString(value, 80));
  setIfPresent(data, source, "coverImage", (value) => sanitizeString(value, 1000));
  setIfPresent(data, source, "projectUrl", (value) => sanitizeString(value, 1000));
  if (source.techStuck !== undefined) data.techStuck = normalizeStringArray(source.techStuck, 20, 60);
  if (source.screenshots !== undefined) data.screenshots = normalizeStringArray(source.screenshots, 10, 1000);
  if (!partial && data.client === undefined) data.client = "Personal";
  delete data.features;

  return data;
};

const validateProjectUrls = (data) => {
  if (data.projectUrl && !isHttpUrl(data.projectUrl, false)) return "Project URL must be valid.";
  if (data.githubUrl && !isHttpUrl(data.githubUrl)) return "Github URL must be valid.";
  if (data.coverImage && !isHttpUrl(data.coverImage, false)) return "Cover image must be valid.";
  if (data.screenshots?.some((url) => !isHttpUrl(url, false))) return "Screenshots must be valid URLs.";
  return null;
};

export const createProject = async (req, res) => {
  try {
    const data = normalizeProjectPayload(req.body);
    const files = req.files || {};

    if (files.coverImage?.length > 0) {
      data.coverImage = files.coverImage[0].path || files.coverImage[0].secure_url || files.coverImage[0].url;
    }

    if (files.screenshots?.length > 0) {
      data.screenshots = files.screenshots
        .map((file) => file.path || file.secure_url || file.url)
        .filter(Boolean);
    }

    data.slug = await uniqueProjectSlug(data.title);

    const requiredFields = [
      "title", "subtitle", "techStuck", "description", 
      "fetures", "category", "duration", "coverImage", 
      "screenshots", "projectUrl"
    ];

    const missing = requiredFields.find((field) => {
      const value = data[field];
      return !value || (Array.isArray(value) && value.length === 0);
    });
    if (missing) return res.status(400).json({ message: `Field '${missing}' is required or empty.` });

    const urlError = validateProjectUrls(data);
    if (urlError) return res.status(400).json({ message: urlError });

    const project = new Project(data);
    await project.save();

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project
    });

  } catch (error) {
    if (!res.headersSent) {
      const isValidationError = error.name === "ValidationError";

      res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError ? "Project validation failed" : "Internal Server Error",
        error: error.message,
      });
    }
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error });
  }
};

export const getProjectBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const safeSlugOrId = sanitizeString(slugOrId, 160);
    const query = mongoose.Types.ObjectId.isValid(safeSlugOrId)
      ? { _id: safeSlugOrId }
      : { slug: safeSlugOrId };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", error });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    assertObjectId(id);
    const data = normalizeProjectPayload(req.body, { partial: true });
    const urlError = validateProjectUrls(data);
    if (urlError) return res.status(400).json({ message: urlError });

    if (data.title) {
      data.slug = await uniqueProjectSlug(data.title, id);
    }

    const project = await Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to update project", error });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    assertObjectId(id);
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project", error });
  }
};
