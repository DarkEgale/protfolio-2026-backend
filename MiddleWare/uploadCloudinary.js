import multer from "multer";
import sharp from "sharp";
import cloudinary from "../Config/cloudinaryConfig.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

const uploadToCloudinary = (buffer, originalname) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "Projects",
        resource_type: "image",
        format: "webp",
        use_filename: false,
        unique_filename: true,
        filename_override: originalname,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
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
        return cb(new Error("Only jpg, png, and webp images are allowed."));
      }

      const input = await streamToBuffer(file.stream);
      const optimized = await sharp(input)
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      const result = await uploadToCloudinary(optimized, file.originalname);

      cb(null, {
        path: result.secure_url,
        secure_url: result.secure_url,
        url: result.secure_url,
        public_id: result.public_id,
        filename: result.public_id,
        originalname: file.originalname,
        mimetype: "image/webp",
        size: optimized.length,
      });
    } catch (error) {
      cb(error);
    }
  },

  _removeFile(_req, file, cb) {
    if (!file.public_id) return cb(null);

    cloudinary.uploader.destroy(file.public_id, () => cb(null));
  },
};

const CloudinaryUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 12,
  },
});

export default CloudinaryUpload;
