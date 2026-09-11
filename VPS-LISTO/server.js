const express=require("express");
const mongoose=require("mongoose");
const multer=require("multer");
const cors=require("cors");
const fs=require("fs");
const path=require("path");
const {spawn}=require("child_process");
require("dotenv").config();

const Video=require("./models/Video");
const app=express();
const PORT=Number(process.env.PORT||3000);
const BASE=(process.env.PUBLIC_BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,"");
const FRONTEND=(process.env.FRONTEND_URL||"*").replace(/\/$/,"");
const UPLOADS=path.join(__dirname,"uploads");
const HLS=path.join(__dirname,"hls");
fs.mkdirSync(UPLOADS,{recursive:true});
fs.mkdirSync(HLS,{recursive:true});

app.use(cors({origin:FRONTEND==="*"?true:FRONTEND}));
app.use(express.json({limit:"2mb"}));

mongoose.connect(process.env.MONGODB_URI)
  .then(()=>console.log("✅ MongoDB conectado"))
  .catch(e=>console.error("❌ MongoDB:",e.message));

const storage=multer.diskStorage({
  destination:(_,__,cb)=>cb(null,UPLOADS),
  filename:(_,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    const base=path.basename(file.originalname,ext)
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-zA-Z0-9_-]/g,"-").replace(/-+/g,"-").slice(0,80)||"video";
    cb(null,`${Date.now()}-${base}${ext}`);
  }
});

const upload=multer({
  storage,
  limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||5000)*1024*1024},
  fileFilter:(_,file,cb)=>file.mimetype.startsWith("video/")?cb(null,true):cb(new Error("Solo se permiten videos"))
});

function publicOriginal(filename){return `${BASE}/media/${encodeURIComponent(filename)}`;}
function publicHls(id){return `${BASE}/hls/${id}/master.m3u8`;}

async function uniquePinnedPosition(pos,excludeId=null){
  if(!pos)return true;
  const q={fijado:true,posicion:pos};
  if(excludeId)q._id={$ne:excludeId};
  return !(await Video.exists(q));
}

function convertToHls(videoDoc,inputFile){
  const outDir=path.join(HLS,String(videoDoc._id));
  fs.mkdirSync(outDir,{recursive:true});
  const playlist=path.join(outDir,"master.m3u8");
  const segment=path.join(outDir,"seg_%05d.ts");

  const args=[
    "-y","-i",inputFile,
    "-c:v","libx264","-preset","veryfast","-crf","23",
    "-c:a","aac","-b:a","128k",
    "-hls_time","6",
    "-hls_playlist_type","vod",
    "-hls_segment_filename",segment,
    playlist
  ];

  const ff=spawn(process.env.FFMPEG_PATH||"ffmpeg",args,{stdio:["ignore","ignore","pipe"]});
  let err="";
  ff.stderr.on("data",d=>{err+=d.toString().slice(-4000);});
  ff.on("close",async code=>{
    if(code===0){
      await Video.findByIdAndUpdate(videoDoc._id,{
        hlsUrl:publicHls(videoDoc._id),
        hlsReady:true,
        conversionError:""
      });
      console.log("✅ HLS listo:",videoDoc._id);
    }else{
      await Video.findByIdAndUpdate(videoDoc._id,{
        hlsReady:false,
        conversionError:err.slice(-1500)||`FFmpeg terminó con código ${code}`
      });
      console.error("❌ HLS error:",videoDoc._id);
    }
  });
}

app.get("/health",(_,res)=>res.json({ok:true}));

app.get("/api/videos",async(_,res)=>{
  const videos=await Video.find().sort({fijado:-1,posicion:1,createdAt:-1}).lean();
  res.json({success:true,videos});
});

app.get("/api/videos/:id",async(req,res)=>{
  const v=await Video.findById(req.params.id).lean();
  if(!v)return res.status(404).json({success:false,message:"Video no encontrado"});
  res.json({success:true,video:v});
});

app.post("/api/videos",upload.single("video"),async(req,res,next)=>{
  try{
    if(!req.file)return res.status(400).json({success:false,message:"No se recibió el video"});
    const fijado=String(req.body.fijado)==="true";
    const posicion=fijado && req.body.posicion!=="" ? Number(req.body.posicion):null;
    if(fijado && !(await uniquePinnedPosition(posicion))){
      fs.unlinkSync(req.file.path);
      return res.status(409).json({success:false,message:"Ya existe un video fijado en esa posición"});
    }
    const video=await Video.create({
      titulo:req.body.titulo,
      descripcion:req.body.descripcion||"",
      archivoOriginal:req.file.filename,
      originalUrl:publicOriginal(req.file.filename),
      previewUrl:publicOriginal(req.file.filename),
      vistas:Number(req.body.vistas||0),
      likes:Number(req.body.likes||0),
      estado:req.body.estado==="inactivo"?"inactivo":"activo",
      fijado,
      posicion,
      hlsReady:false
    });
    convertToHls(video,req.file.path);
    res.status(201).json({success:true,message:"Video guardado. HLS se está generando.",video});
  }catch(e){next(e);}
});

app.put("/api/videos/:id",async(req,res,next)=>{
  try{
    const v=await Video.findById(req.params.id);
    if(!v)return res.status(404).json({success:false,message:"Video no encontrado"});
    const fijado=Boolean(req.body.fijado);
    const posicion=fijado && req.body.posicion!=null && req.body.posicion!==""?Number(req.body.posicion):null;
    if(fijado && !(await uniquePinnedPosition(posicion,v._id))){
      return res.status(409).json({success:false,message:"Ya existe un video fijado en esa posición"});
    }
    v.titulo=String(req.body.titulo||v.titulo).trim();
    v.descripcion=String(req.body.descripcion??v.descripcion);
    v.vistas=Math.max(0,Number(req.body.vistas??v.vistas));
    v.likes=Math.max(0,Number(req.body.likes??v.likes));
    v.estado=req.body.estado==="inactivo"?"inactivo":"activo";
    v.fijado=fijado;
    v.posicion=posicion;
    await v.save();
    res.json({success:true,video:v});
  }catch(e){next(e);}
});

app.post("/api/videos/:id/view",async(req,res)=>{
  const v=await Video.findByIdAndUpdate(req.params.id,{$inc:{vistas:1}},{new:true});
  if(!v)return res.status(404).json({success:false});
  res.json({success:true,vistas:v.vistas});
});

app.post("/api/videos/:id/like",async(req,res)=>{
  const v=await Video.findByIdAndUpdate(req.params.id,{$inc:{likes:1}},{new:true});
  if(!v)return res.status(404).json({success:false});
  res.json({success:true,likes:v.likes});
});

app.delete("/api/videos/:id",async(req,res,next)=>{
  try{
    const v=await Video.findById(req.params.id);
    if(!v)return res.status(404).json({success:false,message:"Video no encontrado"});
    const original=path.join(UPLOADS,v.archivoOriginal);
    if(fs.existsSync(original))fs.unlinkSync(original);
    const hlsDir=path.join(HLS,String(v._id));
    if(fs.existsSync(hlsDir))fs.rmSync(hlsDir,{recursive:true,force:true});
    await v.deleteOne();
    res.json({success:true,message:"Video eliminado"});
  }catch(e){next(e);}
});

app.use((err,req,res,next)=>{
  console.error(err);
  if(err.code==="LIMIT_FILE_SIZE")return res.status(413).json({success:false,message:"El video supera el límite configurado"});
  res.status(400).json({success:false,message:err.message||"Error"});
});

app.listen(PORT,"0.0.0.0",()=>console.log(`🚀 API en puerto ${PORT}`));
