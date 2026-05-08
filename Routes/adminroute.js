import express from "express";
import { createProject, deleteProject, updateProject, getProjects, getProjectBySlugOrId } from "../Controllers/project.controllers.js";
import { createBlog, deleteBlog, getBlogBySlugOrId, getBlogs, updateBlog } from "../Controllers/blog.controllers.js";
import { getSiteContent, updateSiteContent } from "../Controllers/siteContent.controllers.js";
import { getMe, loginAdmin, logoutAdmin } from "../Controllers/auth.controllers.js";
import {
  getAdminChat,
  getClientChat,
  getMyChat,
  listAdminChats,
  loginClientChat,
  sendAdminMessage,
  sendClientMessage,
  startChat,
  updateAdminCallSignal,
  updateClientCallSignal,
  updateChatStatus,
} from "../Controllers/chat.controllers.js";
import {
  getClientMe,
  getProjectHistory,
  loginClientUser,
  logoutClientUser,
  recordProjectView,
  registerClientUser,
  resendClientVerificationEmail,
  verifyClientEmail,
} from "../Controllers/userAuth.controllers.js";
import { requireAdminAuth } from "../MiddleWare/auth.js";
import { requireClientAuth, requireVerifiedClient } from "../MiddleWare/clientAuth.js";
import ChatFileUpload from "../MiddleWare/chatFileUpload.js";
import CloudinaryUpload from "../MiddleWare/uploadCloudinary.js";

const router = express.Router();

const uploadProjectImages = (req, res, next) => {
  const upload = CloudinaryUpload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "screenshots", maxCount: 10 },
  ]);

  upload(req, res, (error) => {
    if (error) {
      console.error("Project image upload failed:", error);
      return res.status(500).json({
        success: false,
        message: "Image upload failed. Please check Cloudinary config and image file types.",
        error: error.message,
      });
    }

    next();
  });
};

const uploadSiteImages = (req, res, next) => {
  const upload = CloudinaryUpload.fields([
    { name: "logoImage", maxCount: 1 },
    { name: "heroImage", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]);

  upload(req, res, (error) => {
    if (error) {
      console.error("Site image upload failed:", error);
      return res.status(500).json({
        success: false,
        message: "Site image upload failed. Please check Cloudinary config and image file types.",
        error: error.message,
      });
    }

    next();
  });
};

router.post("/auth/login", loginAdmin);
router.get("/auth/me", requireAdminAuth, getMe);
router.post("/auth/logout", requireAdminAuth, logoutAdmin);

router.post("/user/register", registerClientUser);
router.post("/user/login", loginClientUser);
router.get("/user/me", requireClientAuth, getClientMe);
router.post("/user/logout", requireClientAuth, logoutClientUser);
router.post("/user/verify-email", requireClientAuth, verifyClientEmail);
router.post("/user/resend-verification", requireClientAuth, resendClientVerificationEmail);
router.get("/user/project-history", requireClientAuth, requireVerifiedClient, getProjectHistory);
router.post("/user/project-history/:projectId", requireClientAuth, requireVerifiedClient, recordProjectView);

router.post("/chat/start", requireClientAuth, requireVerifiedClient, ChatFileUpload.single("file"), startChat);
router.post("/chat/login", loginClientChat);
router.get("/chat/me", requireClientAuth, requireVerifiedClient, getMyChat);
router.get("/chat/:id", requireClientAuth, requireVerifiedClient, getClientChat);
router.post("/chat/:id/messages", requireClientAuth, requireVerifiedClient, ChatFileUpload.single("file"), sendClientMessage);
router.post("/chat/:id/call", requireClientAuth, requireVerifiedClient, updateClientCallSignal);
router.get("/admin/chats", requireAdminAuth, listAdminChats);
router.get("/admin/chats/:id", requireAdminAuth, getAdminChat);
router.post("/admin/chats/:id/messages", requireAdminAuth, ChatFileUpload.single("file"), sendAdminMessage);
router.post("/admin/chats/:id/call", requireAdminAuth, updateAdminCallSignal);
router.patch("/admin/chats/:id/status", requireAdminAuth, updateChatStatus);

router.get("/site-content", getSiteContent);
router.patch("/site-content", requireAdminAuth, uploadSiteImages, updateSiteContent);
router.post(["/create-project", "/create-projects"], requireAdminAuth, uploadProjectImages, createProject);
router.get("/projects", getProjects);
router.get("/projects/:slugOrId", getProjectBySlugOrId);
router.delete("/projects/:id", requireAdminAuth, deleteProject);
router.patch("/projects/:id", requireAdminAuth, updateProject);
router.get("/blogs", getBlogs);
router.get("/blogs/:slugOrId", getBlogBySlugOrId);
router.post("/blogs", requireAdminAuth, createBlog);
router.patch("/blogs/:id", requireAdminAuth, updateBlog);
router.delete("/blogs/:id", requireAdminAuth, deleteBlog);
export default router;
