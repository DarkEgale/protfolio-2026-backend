import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  slug: {
    type: String,
    trim: true,
    index: true,
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20000,
  },
  category: {
    type: String,
    trim: true,
    maxlength: 80,
    default: "Development",
  },
  tags: [
    {
      type: String,
      trim: true,
      maxlength: 40,
    },
  ],
  coverImage: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: "",
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
