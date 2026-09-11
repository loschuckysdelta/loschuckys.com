import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const API=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");

function App(){
  const [videos,setVideos]=useState([]);
  const [q,setQ]=useState("");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [file,setFile]=useState(null);
  const [progress,setProgress]=useState(0);
  const [msg,setMsg]=useState("");
  const [form,setForm]=useState({
    titulo:"",
    descripcion:"",
    vistas:0,
    likes:0,
    estado:"activo",
    fijado:false,
    posicion:""
  });

  async function load(){
    if(!API){ setMsg("Falta configurar VITE_API_URL en Vercel."); return; }
    try{
      const r=await fetch(API+"/api/videos");
      const d=await r.json();
      setVideos(d.videos||[]);
    }catch{
      setMsg("No se pudo conectar con la API del VPS.");
    }
  }

  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>{
    const s=q.toLowerCase();
    return videos.filter(v=>(v.titulo+" "+(v.descripcion||"")).toLowerCase().includes(s));
  },[videos,q]);

  function newVideo(){
    setEditing(null); setFile(null); setProgress(0); setMsg("");
    setForm({titulo:"",descripcion:"",vistas:0,likes:0,estado:"activo",fijado:false,posicion:""});
    setModal(true);
  }

  function editVideo(v){
    setEditing(v); setFile(null); setProgress(0); setMsg("");
    setForm({
      titulo:v.titulo||"",
      descripcion:v.descripcion||"",
      vistas:v.vistas||0,
      likes:v.likes||0,
      estado:v.estado||"activo",
      fijado:!!v.fijado,
      posicion:v.posicion??""
    });
    setModal(true);
  }

  async function save(e){
    e.preventDefault();

    if(editing){
      const r=await fetch(API+"/api/videos/"+editing._id,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          ...form,
          vistas:Number(form.vistas)||0,
          likes:Number(form.likes)||0,
          posicion:form.fijado && form.posicion!==""?Number(form.posicion):null
        })
      });
      const d=await r.json();
      if(d.success){ setModal(false); load(); }
      else setMsg(d.message||"No se pudo guardar.");
      return;
    }

    if(!file){ setMsg("Selecciona un video."); return; }

    const fd=new FormData();
    fd.append("video",file);
    fd.append("titulo",form.titulo);
    fd.append("descripcion",form.descripcion);
    fd.append("vistas",String(Number(form.vistas)||0));
    fd.append("likes",String(Number(form.likes)||0));
    fd.append("estado",form.estado);
    fd.append("fijado",String(form.fijado));
    fd.append("posicion",form.fijado?String(form.posicion||""):"");

    const x=new XMLHttpRequest();
    x.open("POST",API+"/api/videos");
    x.upload.onprogress=e=>{
      if(e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100));
    };
    x.onload=()=>{
      try{
        const d=JSON.parse(x.responseText);
        if(d.success){ setModal(false); load(); }
        else setMsg(d.message||"Error al subir.");
      }catch{
        setMsg("Respuesta inválida del servidor.");
      }
    };
    x.onerror=()=>setMsg("Error de conexión con el VPS.");
    x.send(fd);
  }

  async function remove(v){
    if(!confirm(`¿Eliminar "${v.titulo}"?`)) return;
    const r=await fetch(API+"/api/videos/"+v._id,{method:"DELETE"});
    const d=await r.json();
    if(d.success) load();
    else alert(d.message||"No se pudo eliminar.");
  }

  function fmt(n){
    n=Number(n||0);
    if(n>=1_000_000) return (n/1_000_000).toFixed(n%1_000_000?1:0)+"M";
    if(n>=1_000) return (n/1_000).toFixed(n%1_000?1:0)+"k";
    return String(n);
  }

  return <main className="page">
    <header className="top">
      <div>
        <h1>Videos <span>{videos.length}</span></h1>
        <p>Sube y administra tus videos del VPS.</p>
      </div>
      <div className="tools">
        <input placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="primary" onClick={newVideo}>+ Nuevo</button>
      </div>
    </header>

    {msg && <div className="notice">{msg}</div>}

    <section className="table">
      <div className="row head">
        <div>Video</div>
        <div>Título / descripción</div>
        <div>Vistas / Likes</div>
        <div>Fijado</div>
        <div>Estado</div>
        <div>Acciones</div>
      </div>

      {filtered.map(v=><div className="row" key={v._id}>
        <div><video className="thumb" controls preload="metadata" src={v.originalUrl}/></div>
        <div>
          <strong>{v.titulo}</strong>
          <small>{v.descripcion||"Sin descripción"}</small>
          <code>{v.hlsUrl||v.originalUrl}</code>
        </div>
        <div className="stats">
          <span>👁 {fmt(v.vistas)} vistas</span>
          <span>♡ {fmt(v.likes)}</span>
        </div>
        <div>{v.fijado?`📌 ${v.posicion}`:"—"}</div>
        <div><span className={"badge "+v.estado}>{v.estado}</span></div>
        <div className="actions">
          <button onClick={()=>navigator.clipboard.writeText(v.hlsUrl||v.originalUrl)}>Copiar</button>
          <button onClick={()=>editVideo(v)}>Editar</button>
          <button className="danger" onClick={()=>remove(v)}>Eliminar</button>
        </div>
      </div>)}
    </section>

    {modal && <div className="overlay">
      <div className="modal">
        <div className="modalTitle">
          <h2>{editing?"Editar video":"Nuevo video"}</h2>
          <button onClick={()=>setModal(false)}>✕</button>
        </div>
        <form onSubmit={save}>
          {!editing && <label>Archivo<input type="file" accept="video/*" onChange={e=>setFile(e.target.files[0])}/></label>}
          <label>Título<input required value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></label>
          <label>Descripción<textarea rows="4" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
          <div className="cols">
            <label>Vistas<input type="number" min="0" value={form.vistas} onChange={e=>setForm({...form,vistas:e.target.value})}/></label>
            <label>Likes<input type="number" min="0" value={form.likes} onChange={e=>setForm({...form,likes:e.target.value})}/></label>
          </div>
          <div className="cols">
            <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
            <label>Posición<input type="number" min="1" disabled={!form.fijado} value={form.posicion} onChange={e=>setForm({...form,posicion:e.target.value})}/></label>
          </div>
          <label className="check"><input type="checkbox" checked={form.fijado} onChange={e=>setForm({...form,fijado:e.target.checked,posicion:e.target.checked?form.posicion:""})}/> Fijar video</label>
          {progress>0 && <progress max="100" value={progress}/>}
          {msg && <div className="notice">{msg}</div>}
          <div className="modalActions">
            <button type="button" onClick={()=>setModal(false)}>Cancelar</button>
            <button className="primary">{editing?"Guardar cambios":"Subir video"}</button>
          </div>
        </form>
      </div>
    </div>}
  </main>
}

createRoot(document.getElementById("root")).render(<App/>);
