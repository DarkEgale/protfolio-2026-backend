import ChatConversation from "../Models/ChatConversation.model.js";
import { assertObjectId, isEmail, sanitizeString } from "../Utils/validation.js";

const sanitizeMessage = (message) => sanitizeString(message, 2000);

const getClientConversation = async (conversationId) => {
  assertObjectId(conversationId, "conversation id");
  const conversation = await ChatConversation.findById(conversationId);

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  return conversation;
};

export const startChat = async (req, res) => {
  try {
    const clientName = sanitizeString(req.body.clientName, 120);
    const clientEmail = sanitizeString(req.body.clientEmail, 254).toLowerCase();
    const clientPassword = sanitizeString(req.body.clientPassword, 200);
    const { message } = req.body;
    const text = sanitizeMessage(message);

    if (!clientName || !isEmail(clientEmail) || !clientPassword || clientPassword.length < 6 || !text) {
      return res.status(400).json({
        success: false,
        message: "Name, valid email, password, and first message are required",
      });
    }

    const existing = await ChatConversation.findOne({ clientEmail });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A chat already exists with this email. Please login instead.",
      });
    }

    const conversation = await ChatConversation.create({
      clientName,
      clientEmail,
      clientPassword,
      status: "waiting",
      lastMessageAt: new Date(),
      messages: [
        {
          sender: "client",
          text,
          readByClient: true,
        },
      ],
    });
    const safeConversation = await ChatConversation.findById(conversation._id);

    res.status(201).json({
      success: true,
      data: safeConversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to start chat",
      error: error.message,
    });
  }
};

export const loginClientChat = async (req, res) => {
  try {
    const clientEmail = sanitizeString(req.body.clientEmail, 254).toLowerCase();
    const clientPassword = sanitizeString(req.body.clientPassword, 200);

    if (!isEmail(clientEmail) || !clientPassword) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required",
      });
    }

    const conversation = await ChatConversation.findOne({ clientEmail }).select("+clientPassword");
    const passwordMatches = conversation
      ? await conversation.compareClientPassword(clientPassword)
      : false;

    if (!conversation || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    conversation.messages.forEach((message) => {
      if (message.sender === "admin") {
        message.readByClient = true;
      }
    });
    await conversation.save();

    const safeConversation = await ChatConversation.findById(conversation._id);

    res.status(200).json({
      success: true,
      data: safeConversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to login to chat",
      error: error.message,
    });
  }
};

export const getClientChat = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);

    conversation.messages.forEach((message) => {
      if (message.sender === "admin") {
        message.readByClient = true;
      }
    });
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to fetch chat",
      error: error.message,
    });
  }
};

export const sendClientMessage = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);
    const text = sanitizeMessage(req.body.message);

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (conversation.status === "closed") {
      conversation.status = "waiting";
    }

    conversation.messages.push({
      sender: "client",
      text,
      readByClient: true,
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

export const listAdminChats = async (_req, res) => {
  try {
    const conversations = await ChatConversation.find()
      .sort({ lastMessageAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

export const getAdminChat = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);

    conversation.messages.forEach((message) => {
      if (message.sender === "client") {
        message.readByAdmin = true;
      }
    });
    if (conversation.status === "waiting") {
      conversation.status = "active";
    }
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to fetch conversation",
      error: error.message,
    });
  }
};

export const sendAdminMessage = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);
    const text = sanitizeMessage(req.body.message);

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    conversation.messages.push({
      sender: "admin",
      text,
      readByAdmin: true,
    });
    conversation.status = "active";
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to send reply",
      error: error.message,
    });
  }
};

export const updateChatStatus = async (req, res) => {
  try {
    const status = sanitizeString(req.body.status, 20);

    if (!["waiting", "active", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat status",
      });
    }

    const conversation = await getClientConversation(req.params.id);
    conversation.status = status;
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};
