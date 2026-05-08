import mongoose from "mongoose";

const userProjectHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientUser",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    firstViewedAt: {
      type: Date,
      default: Date.now,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userProjectHistorySchema.index({ userId: 1, projectId: 1 }, { unique: true });
userProjectHistorySchema.index({ userId: 1, lastViewedAt: -1 });

const UserProjectHistory = mongoose.model("UserProjectHistory", userProjectHistorySchema);

export default UserProjectHistory;
