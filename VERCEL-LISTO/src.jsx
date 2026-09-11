import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const API=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");

function App(){
  const [videos,setVideos]=useState([]);
  const [q,setQ]=useState("");
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [file,setFile]=useState(null);
  const [form,setForm]=useState({titulo:"",descripcion:"",vistas:0,likes:0,estado:"activo",fijado:false,posicion:""});
  const [progress,setProgress]=useState(0);
  const [msg,setMsg]=useState("");

  const load=async()=>{
    try{
      const r=await fetch(API+"/api/videos");
      const d=await r.json();
      setVideos(d.videos||[]);
    }catch(e){setMsg("No se pudo conectar con la API del VPS.");}
  };

  useEffect(()=>{ if(API) load(); },[]);

  const filtered=useMemo(()=>videos.filter(v=>{
    const t=(v.titulo+" "+(v.descripcion||"")).toLowerCase();
    return t.includes(q.toLowerCase());
  }),[videos,q]);

  const openNew=()=>{
    setEditing(null);
    setFile(null);
    setForm({titulo:"",descripcion:"",vistas:0,likes:0,estado:"activo",fijado:false,posicion:""});
    setProgress(0);setMsg("");setShowModal(true);
  };

  const openEdit=(v)=>{
    setEditing(v);
    setFile(null);
    setForm({
      titulo:v.titulo||"",
      descripcion:v.descripcion||"",
      vistas:v.vistas||0,
      likes:v.likes||0,
      estado:v.estado||"activo",
      fijado:!!v.fijado,
      posicion:v.posicion??""
    });
    setProgress(0);setMsg("");setShowModal(true);
  };

  const submit=(e)=>{
    e.preventDefault();
    if(!API){setMsg("Configura VITE_API_URL.");return;}
    if(editing){
      fetch(API+"/api/videos/"+editing._id,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          ...form,
          vistas:Number(form.vistas)||0,
          likes:Number(form.likes)||0,
          posicion:form.fijado && form.posicion!=="" ? Number(form.posicion):null
        })
      }).then(r=>r.json()).then(d=>{
        if(d.success){setShowModal(false);load();} else setMsg(d.message||"Error al guardar");
      }).catch(()=>setMsg("Error de conexión"));
      return;
    }

    if(!file){setMsg("Selecciona un video.");return;}
    const fd=new FormData();
    fd.append("video",file);
    Object.entries({
      ...form,
      vistas:Number(form.vistas)||0,
      likes:Number(form.likes)||0,
      posicion:form.fijado && form.posicion!=="" ? Number(form.posicion):""
    }).forEach(([k,v])=>fd.append(k,v));

    const x=new XMLHttpRequest();
    x.open("POST",API+"/api/videos");
    x.upload.onprogress=e=>e.lengthComputable&&setProgress(Math.round(e.loaded/e.total*100));
    x.onload=()=>{
      try{
        const d=JSON.parse(x.responseText);
        if(d.success){setShowModal(false);load();}
        else setMsg(d.message||"Error al subir");
      }catch{setMsg("Respuesta inválida del servidor");}
    };
    x.onerror=()=>setMsg("Error de conexión con el VPS");
    x.send(fd);
  };

  const del=async(v)=>{
    if(!confirm(`¿Eliminar "${v.titulo}"?`))return;
    const r=await fetch(API+"/api/videos/"+v._id,{method:"DELETE"});
    const d=await r.json();
    if(d.success) load();
    else alert(d.message||"No se pudo eliminar");
  };

  const fmt=n=>{
    n=Number(n||0);
    if(n>=1_000_000)return (n/1_000_000).toFixed(n%1_000_000?1:0)+"M";
    if(n>=1_000)return (n/1_000).toFixed(n%1_000?1:0)+"k";
    return String(n);
  };

  return <main className="page">
    <header className="topbar">
      <div>
        <h1>Videos <span>{videos.length}</span></h1>
        <p>Gestiona tus videos del VPS.</p>
      </div>
      <div className="toolbar">
        <button className="ghost">Ordenar</button>
        <button className="primary" onClick={openNew}>+ Nuevo</button>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar"/>
      </div>
    </header>

    {msg && <div className="notice">{msg}</div>}

    <section className="table">
      <div className="tr th">
        <div>Video</div><div>Título / descripción</div><div>Estadísticas</div><div>Fijado</div><div>Estado</div><div>Acciones</div>
      </div>
      {filtered.map(v=><div className="tr" key={v._id}>
        <div><video className="thumb" controls preload="metadata" src={v.previewUrl||v.url}/></div>
        <div>
          <strong>{v.titulo}</strong>
          <small>{v.descripcion||"Sin descripción"}</small>
          <code>{v.hlsUrl||v.url}</code>
        </div>
        <div className="stats">
          <span>👁 {fmt(v.vistas)} vistas</span>
          <span>♡ {fmt(v.likes)}</span>
        </div>
        <div>{v.fijado ? `📌 ${v.posicion}` : "—"}</div>
        <div><span className={"badge "+v.estado}>{v.estado}</span></div>
        <div className="actions">
          <button className="ghost" onClick={()=>navigator.clipboard.writeText(v.hlsUrl||v.url)}>Copiar</button>
          <button className="ghost" onClick={()=>openEdit(v)}>Editar</button>
          <button className="danger" onClick={()=>del(v)}>Eliminar</button>
        </div>
      </div>)}
    </section>

    {showModal&&<div className="modalBack">
      <div className="modal">
        <div className="modalHead">
          <h2>{editing?"Editar video":"Nuevo video"}</h2>
          <button className="ghost" onClick={()=>setShowModal(false)}>✕</button>
        </div>
        <form onSubmit={submit}>
          {!editing && <label>Archivo de video<input type="file" accept="video/*" onChange={e=>setFile(e.target.files[0])}/></label>}
          <label>Título<input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} required/></label>
          <label>Descripción<textarea rows="4" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
          <div className="grid2">
            <label>Vistas<input type="number" min="0" value={form.vistas} onChange={e=>setForm({...form,vistas:e.target.value})}/></label>
            <label>Likes<input type="number" min="0" value={form.likes} onChange={e=>setForm({...form,likes:e.target.value})}/></label>
          </div>
          <div className="grid2">
            <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
            <label>Posición<input type="number" min="1" disabled={!form.fijado} value={form.posicion} onChange={e=>setForm({...form,posicion:e.target.value})}/></label>
          </div>
          <label className="check"><input type="checkbox" checked={form.fijado} onChange={e=>setForm({...form,fijado:e.target.checked,posicion:e.target.checked?form.posicion:""})}/> Fijar video</label>
          {progress>0&&<progress max="100" value={progress}/>}
          {msg&&<div className="notice">{msg}</div>}
          <div className="modalActions">
            <button type="button" className="ghost" onClick={()=>setShowModal(false)}>Cancelar</button>
            <button className="primary">{editing?"Guardar cambios":"Subir video"}</button>
          </div>
        </form>
      </div>
    </div>}
  </main>
}

createRoot(document.getElementById("root")).render(<App/>);
