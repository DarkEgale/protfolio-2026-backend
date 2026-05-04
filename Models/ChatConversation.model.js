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
      required: true,
      trim: true,
      maxlength: 2000,
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

const chatConversationSchema = new mongoose.Schema(
  {
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
      required: true,
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
