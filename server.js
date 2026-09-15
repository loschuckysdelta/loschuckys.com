require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");

const resourceRoutes = require("./routes/resources");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const uploadsDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/uploads", express.static(uploadsDir, {
  fallthrough: false,
  maxAge: "1d",
  immutable: false
}));

app.use("/api/resources", resourceRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gestor-recursos-vps",
    time: new Date().toISOString()
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      ok: false,
      message: "El archivo supera el tamaño máximo permitido."
    });
  }

  if (err.message && err.message.startsWith("TIPO_ARCHIVO_NO_PERMITIDO")) {
    return res.status(400).json({
      ok: false,
      message: "Tipo de archivo no permitido."
    });
  }

  return res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Error interno del servidor."
  });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Falta MONGODB_URI en el archivo .env");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB conectado");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exit(1);
});
