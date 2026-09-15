const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");

const Resource = require("../models/Resource");
const upload = require("../middleware/upload");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "uploads");

function normalizeBaseUrl(req) {
  const configured = String(process.env.BASE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  return `${req.protocol}://${req.get("host")}`;
}

function publicUrl(req, filename) {
  return `${normalizeBaseUrl(req)}/uploads/${encodeURIComponent(filename)}`;
}

function typeFromMime(mime) {
  return String(mime).startsWith("image/") ? "image" : "video";
}

router.post("/", upload.single("archivo"), async (req, res, next) => {
  let createdFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Selecciona una imagen o un video."
      });
    }

    createdFilePath = req.file.path;

    const resource = await Resource.create({
      nombreOriginal: req.file.originalname,
      nombreArchivo: req.file.filename,
      tipo: typeFromMime(req.file.mimetype),
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: publicUrl(req, req.file.filename)
    });

    res.status(201).json({
      ok: true,
      resource
    });
  } catch (error) {
    if (createdFilePath) {
      await fs.unlink(createdFilePath).catch(() => {});
    }
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const tipo = String(req.query.tipo || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const query = {};

    if (["image", "video"].includes(tipo)) {
      query.tipo = tipo;
    }

    if (search) {
      query.$or = [
        { nombreOriginal: { $regex: search, $options: "i" } },
        { nombreArchivo: { $regex: search, $options: "i" } }
      ];
    }

    const [items, total] = await Promise.all([
      Resource.find(query)
        .sort({ fechaCreacion: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Resource.countDocuments(query)
    ]);

    res.json({
      ok: true,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      items
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "ID inválido." });
    }

    const resource = await Resource.findById(req.params.id).lean();

    if (!resource) {
      return res.status(404).json({ ok: false, message: "Recurso no encontrado." });
    }

    res.json({ ok: true, resource });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: "ID inválido." });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        ok: false,
        message: "Recurso no encontrado."
      });
    }

    const filename = path.basename(resource.nombreArchivo);
    const filePath = path.join(uploadsDir, filename);

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });

    await resource.deleteOne();

    res.json({
      ok: true,
      message: "Recurso eliminado."
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
