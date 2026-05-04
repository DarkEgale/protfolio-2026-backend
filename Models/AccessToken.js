import mongoose from "mongoose";

const AccessTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

const AccessToken = mongoose.model('AccessToken', AccessTokenSchema);

export default AccessToken;