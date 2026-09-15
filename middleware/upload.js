const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const allowed = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
  ["image/gif", [".gif"]],
  ["video/mp4", [".mp4"]],
  ["video/webm", [".webm"]],
  ["video/quicktime", [".mov"]]
]);

function safeExtension(file) {
  const originalExt = path.extname(file.originalname || "").toLowerCase();
  const validExtensions = allowed.get(file.mimetype);

  if (!validExtensions || !validExtensions.includes(originalExt)) {
    return null;
  }

  return originalExt;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = safeExtension(file);

    if (!ext) {
      return cb(new Error("TIPO_ARCHIVO_NO_PERMITIDO"));
    }

    const id = crypto.randomUUID().replaceAll("-", "");
    cb(null, `${Date.now()}-${id}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!allowed.has(file.mimetype)) {
    return cb(new Error("TIPO_ARCHIVO_NO_PERMITIDO"));
  }

  if (!safeExtension(file)) {
    return cb(new Error("TIPO_ARCHIVO_NO_PERMITIDO"));
  }

  cb(null, true);
}

const maxMb = Math.max(1, Number(process.env.MAX_FILE_SIZE_MB || 200));

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: maxMb * 1024 * 1024
  }
});
