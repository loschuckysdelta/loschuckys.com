const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    nombreOriginal: {
      type: String,
      required: true,
      trim: true
    },
    nombreArchivo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    tipo: {
      type: String,
      enum: ["image", "video"],
      required: true,
      index: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: {
      createdAt: "fechaCreacion",
      updatedAt: "fechaActualizacion"
    }
  }
);

resourceSchema.index({ nombreOriginal: "text", nombreArchivo: "text" });

module.exports = mongoose.model("Resource", resourceSchema);
