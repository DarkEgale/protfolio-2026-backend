import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["client", "admin"],
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    attachment: {
      url: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      publicId: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      name: {
        type: String,
        trim: true,
        maxlength: 255,
      },
      mimeType: {
        type: String,
        trim: true,
        maxlength: 120,
      },
      size: {
        type: Number,
        min: 0,
      },
      resourceType: {
        type: String,
        trim: true,
        maxlength: 40,
      },
    },
    readByAdmin: {
      type: Boolean,
      default: false,
    },
    readByClient: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const callSignalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["audio", "video"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["idle", "ringing", "accepted", "ended", "declined"],
      default: "idle",
    },
    initiatedBy: {
      type: String,
      enum: ["client", "admin"],
      default: "client",
    },
    offer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    clientCandidates: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    adminCandidates: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatConversationSchema = new mongoose.Schema(
  {
    clientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientUser",
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      required: true,
      unique: true,
    },
    clientPassword: {
      type: String,
      select: false,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "closed"],
      default: "waiting",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    call: {
      type: callSignalSchema,
      default: () => ({ status: "idle" }),
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ status: 1, lastMessageAt: -1 });

chatConversationSchema.pre("save", async function () {
  if (!this.isModified("clientPassword")) return;

  this.clientPassword = await bcrypt.hash(this.clientPassword, 12);
});

chatConversationSchema.methods.compareClientPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.clientPassword);
};

const ChatConversation = mongoose.model("ChatConversation", chatConversationSchema);

export default ChatConversation;
