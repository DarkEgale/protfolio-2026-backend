import mongoose from "mongoose";
import Blog from "../Models/Blog.model.js";
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

const blogFields = ["title", "excerpt", "content", "category", "tags", "coverImage", "publishedAt"];

const setIfPresent = (data, source, field, normalize) => {
  if (source[field] !== undefined) data[field] = normalize(source[field]);
};

const normalizeBlogPayload = (source, { partial = false } = {}) => {
  const data = pickAllowed(source, blogFields);
  setIfPresent(data, source, "title", (value) => sanitizeString(value, 140));
  setIfPresent(data, source, "excerpt", (value) => sanitizeString(value, 300));
  setIfPresent(data, source, "content", (value) => sanitizeString(value, 20000));
  setIfPresent(data, source, "category", (value) => sanitizeString(value, 80));
  setIfPresent(data, source, "coverImage", (value) => sanitizeString(value, 1000));
  if (source.tags !== undefined) data.tags = normalizeStringArray(source.tags, 12, 40);
  if (!partial && data.category === undefined) data.category = "Development";

  if (data.publishedAt) {
    const publishedAt = new Date(data.publishedAt);
    if (!Number.isNaN(publishedAt.getTime())) data.publishedAt = publishedAt;
    else delete data.publishedAt;
  }

  return data;
};

const uniqueBlogSlug = async (title, currentId) => {
  const baseSlug = slugify(title) || "blog";
  let slug = baseSlug;
  let index = 2;

  while (await Blog.exists({ slug, _id: { $ne: currentId } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
};

export const createBlog = async (req, res) => {
  try {
    const data = normalizeBlogPayload(req.body);
    const missing = validateRequiredStrings(data, ["title", "excerpt", "content"]);
    if (missing) return res.status(400).json({ message: missing });
    if (!isHttpUrl(data.coverImage)) {
      return res.status(400).json({ message: "Cover image must be a valid URL." });
    }

    data.slug = await uniqueBlogSlug(data.title);

    const blog = await Blog.create(data);
    res.status(201).json(blog);
  } catch (error) {
    const isValidationError = error.name === "ValidationError";
    res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? "Blog validation failed" : "Failed to create blog",
      error: error.message,
    });
  }
};

export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishedAt: -1, createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blogs", error: error.message });
  }
};

export const getBlogBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const safeSlugOrId = sanitizeString(slugOrId, 160);
    const query = mongoose.Types.ObjectId.isValid(slugOrId)
      ? { _id: safeSlugOrId }
      : { slug: safeSlugOrId };
    const blog = await Blog.findOne(query);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blog", error: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    assertObjectId(id);
    const data = normalizeBlogPayload(req.body, { partial: true });
    if (data.coverImage && !isHttpUrl(data.coverImage)) {
      return res.status(400).json({ message: "Cover image must be a valid URL." });
    }

    if (data.title) {
      data.slug = await uniqueBlogSlug(data.title, id);
    }

    const blog = await Blog.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: "Failed to update blog", error: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    assertObjectId(id);
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete blog", error: error.message });
  }
};
