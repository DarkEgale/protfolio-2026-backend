import ChatConversation from "../Models/ChatConversation.model.js";
import { assertObjectId, isEmail, sanitizeString } from "../Utils/validation.js";

const sanitizeMessage = (message) => sanitizeString(message, 2000);

const chatAttachment = (file) => {
  if (!file) return undefined;

  return {
    url: file.secure_url || file.url || file.path,
    publicId: file.public_id,
    name: sanitizeString(file.originalname, 255),
    mimeType: sanitizeString(file.mimetype, 120),
    size: file.size,
    resourceType: sanitizeString(file.resource_type, 40),
  };
};

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

const ensureConversationOwner = (conversation, user) => {
  if (!user) return;
  const conversationUser = conversation.clientUser?.toString();
  const matchesUser = conversationUser && conversationUser === user._id.toString();
  const matchesLegacyEmail = conversation.clientEmail === user.email;

  if (!matchesUser && !matchesLegacyEmail) {
    const error = new Error("Conversation access denied");
    error.statusCode = 403;
    throw error;
  }
};

const publicConversation = async (conversation) => {
  if (conversation.clientUser) return conversation;
  return ChatConversation.findById(conversation._id);
};

export const startChat = async (req, res) => {
  try {
    const loggedInUser = req.clientUser;
    const clientName = loggedInUser ? loggedInUser.name : sanitizeString(req.body.clientName, 120);
    const clientEmail = loggedInUser ? loggedInUser.email : sanitizeString(req.body.clientEmail, 254).toLowerCase();
    const clientPassword = sanitizeString(req.body.clientPassword, 200);
    const { message } = req.body;
    const text = sanitizeMessage(message);
    const attachment = chatAttachment(req.file);

    if (!clientName || !isEmail(clientEmail) || (!loggedInUser && (!clientPassword || clientPassword.length < 6)) || (!text && !attachment)) {
      return res.status(400).json({
        success: false,
        message: "User login and message or file are required",
      });
    }

    const existing = await ChatConversation.findOne({ clientEmail });

    if (existing) {
      if (loggedInUser && !existing.clientUser) {
        existing.clientUser = loggedInUser._id;
        await existing.save();
      }

      if (text || attachment) {
        existing.messages.push({
          sender: "client",
          text,
          attachment,
          readByClient: true,
        });
        existing.status = existing.status === "closed" ? "waiting" : existing.status;
        existing.lastMessageAt = new Date();
        await existing.save();
      }

      return res.status(200).json({
        success: true,
        data: await publicConversation(existing),
      });
    }

    const conversation = await ChatConversation.create({
      clientUser: loggedInUser?._id,
      clientName,
      clientEmail,
      ...(loggedInUser ? {} : { clientPassword }),
      status: "waiting",
      lastMessageAt: new Date(),
      messages: [
        {
          sender: "client",
          text,
          attachment,
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
    ensureConversationOwner(conversation, req.clientUser);

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
    ensureConversationOwner(conversation, req.clientUser);
    const text = sanitizeMessage(req.body.message);
    const attachment = chatAttachment(req.file);

    if (!text && !attachment) {
      return res.status(400).json({
        success: false,
        message: "Message or file is required",
      });
    }

    if (conversation.status === "closed") {
      conversation.status = "waiting";
    }

    conversation.messages.push({
      sender: "client",
      text,
      attachment,
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

export const getMyChat = async (req, res) => {
  try {
    const conversation = await ChatConversation.findOne({
      $or: [{ clientUser: req.clientUser._id }, { clientEmail: req.clientUser.email }],
    }).sort({ updatedAt: -1 });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    if (!conversation.clientUser) {
      conversation.clientUser = req.clientUser._id;
    }

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

export const updateClientCallSignal = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);
    ensureConversationOwner(conversation, req.clientUser);
    const action = sanitizeString(req.body.action, 30);
    const callType = sanitizeString(req.body.type, 20);

    if (action === "start") {
      conversation.call = {
        type: callType === "audio" ? "audio" : "video",
        status: "ringing",
        initiatedBy: "client",
        offer: req.body.offer || null,
        answer: null,
        clientCandidates: [],
        adminCandidates: [],
        updatedAt: new Date(),
      };
      conversation.messages.push({
        sender: "client",
        text: `Started a ${callType === "audio" ? "audio" : "video"} call`,
        readByClient: true,
      });
    } else if (action === "answer") {
      conversation.call.answer = req.body.answer || null;
      conversation.call.status = "accepted";
      conversation.call.updatedAt = new Date();
      conversation.messages.push({
        sender: "client",
        text: "Accepted the call",
        readByClient: true,
      });
    } else if (action === "candidate") {
      conversation.call.clientCandidates.push(req.body.candidate);
      conversation.call.updatedAt = new Date();
    } else if (action === "end") {
      conversation.call.status = "ended";
      conversation.call.updatedAt = new Date();
    } else {
      return res.status(400).json({ success: false, message: "Invalid call action" });
    }

    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to update call",
      error: error.message,
    });
  }
};

export const updateAdminCallSignal = async (req, res) => {
  try {
    const conversation = await getClientConversation(req.params.id);
    const action = sanitizeString(req.body.action, 30);

    const callType = sanitizeString(req.body.type, 20);

    if (action === "start") {
      conversation.call = {
        type: callType === "audio" ? "audio" : "video",
        status: "ringing",
        initiatedBy: "admin",
        offer: req.body.offer || null,
        answer: null,
        clientCandidates: [],
        adminCandidates: [],
        updatedAt: new Date(),
      };
      conversation.messages.push({
        sender: "admin",
        text: `Started a ${callType === "audio" ? "audio" : "video"} call`,
        readByAdmin: true,
      });
    } else if (action === "answer") {
      conversation.call.answer = req.body.answer || null;
      conversation.call.status = "accepted";
      conversation.call.updatedAt = new Date();
      conversation.messages.push({
        sender: "admin",
        text: "Accepted the call",
        readByAdmin: true,
      });
    } else if (action === "candidate") {
      conversation.call.adminCandidates.push(req.body.candidate);
      conversation.call.updatedAt = new Date();
    } else if (action === "decline") {
      conversation.call.status = "declined";
      conversation.call.updatedAt = new Date();
    } else if (action === "end") {
      conversation.call.status = "ended";
      conversation.call.updatedAt = new Date();
    } else {
      return res.status(400).json({ success: false, message: "Invalid call action" });
    }

    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to update call",
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
    const attachment = chatAttachment(req.file);

    if (!text && !attachment) {
      return res.status(400).json({
        success: false,
        message: "Message or file is required",
      });
    }

    conversation.messages.push({
      sender: "admin",
      text,
      attachment,
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
