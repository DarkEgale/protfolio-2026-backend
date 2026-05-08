import multer from "multer";
import cloudinary from "../Config/cloudinaryConfig.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);

const uploadBuffer = (buffer, file) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "ChatFiles",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        filename_override: file.originalname,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    upload.end(buffer);
  });

const storage = {
  async _handleFile(_req, file, cb) {
    try {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new Error("Unsupported chat file type."));
      }

      const chunks = [];
      file.stream.on("data", (chunk) => chunks.push(chunk));
      file.stream.on("error", cb);
      file.stream.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await uploadBuffer(buffer, file);

          cb(null, {
            path: result.secure_url,
            secure_url: result.secure_url,
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size || buffer.length,
          });
        } catch (error) {
          cb(error);
        }
      });
    } catch (error) {
      cb(error);
    }
  },

  _removeFile(_req, file, cb) {
    if (!file.public_id) return cb(null);

    cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type || "auto" }, () => cb(null));
  },
};

const ChatFileUpload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
});

export default ChatFileUpload;
