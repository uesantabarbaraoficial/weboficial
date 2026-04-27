/**
 * MÓDULO: TRANSPORTE ESCOLAR (Supabase Edition)
 * ✨ Diseño Vivo, Auditoría, PDF, Compartir, RESET MASIVO TOTAL (Con limpieza de Notificaciones) ✨
 */

window.ModTransporte = {
    paradas: [], rutas: [], docentes: [], trackingHoy: [], paradasTemporalesRuta: [],
    editandoParadaId: null, editandoRutaId: null, vistaActualOculta: null,
    
    init: function() {
        if (!window.Aplicacion.permiso('Transporte Escolar', 'ver')) {
            let contenedor = document.getElementById('transporte-dashboard');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar el Transporte Escolar.</p>
                </div>`;
            }
            return;
        }

        this.dibujarDashboardTarjetas();
        this.cargarTodo();
    },

    dibujarDashboardTarjetas: function() {
        const estilos = `<style>.tarjeta-sub { background: #ffffff; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; overflow: hidden; position: relative; display: flex; flex-direction: column; text-align: left; }.tarjeta-sub:hover { transform: translateY(-8px); box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important; }.tarjeta-sub .bg-icono-gigante { position: absolute; right: -20px; bottom: -20px; font-size: 8rem; opacity: 0.03; transition: transform 0.5s ease; pointer-events: none; }.tarjeta-sub:hover .bg-icono-gigante { transform: scale(1.2) rotate(-10deg); }.tarjeta-sub .icono-sub { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.2rem; transition: transform 0.3s ease; }.tarjeta-sub:hover .icono-sub { transform: scale(1.1); }.tarjeta-sub.bloqueado { filter: grayscale(100%); opacity: 0.7; cursor: not-allowed; }
        @keyframes pulso-vivo { 0% { box-shadow: 0 0 0 0 rgba(13, 202, 240, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(13, 202, 240, 0); } 100% { box-shadow: 0 0 0 0 rgba(13, 202, 240, 0); } }
        .nodo-activo .timeline-icon { animation: pulso-vivo 2s infinite; border-color: #0dcaf0; background-color: #e0f2fe; }
        .nodo-completado .timeline-icon { border-color: #198754; color: white; background-color: #198754; }
        .nodo-completado .timeline-content { border-color: #198754; background-color: #f0fdf4; }
        .nodo-pendiente .timeline-icon { border-color: #cbd5e1; color: #cbd5e1; }
        .nodo-pendiente .timeline-content { opacity: 0.7; }
        </style>`;
        
        let cNara = { bg: 'linear-gradient(135deg, #ffffff 0%, #fff5f2 100%)', b: '#ffdac2', t: '#f97316' };
        let cAmar = { bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', b: '#fde68a', t: '#d97706' };
        let cPurp = { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', b: '#ddd6fe', t: '#6d28d9' };
        let cVerd = { bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', b: '#bbf7d0', t: '#198754' };

        let pMaster = window.Aplicacion.permiso('Transporte Escolar', 'ver');

        let crearTarjeta = (tit, desc, ico, acc, c, px, col) => {
            if(!px) return ``; 
            return `<div class="${col} animate__animated animate__fadeInUp"><div class="tarjeta-sub p-4 h-100 shadow-sm" style="background:${c.bg}; border:1px solid ${c.b};" onclick="${acc}"><i class="bi ${ico} text-dark bg-icono-gigante"></i><div class="icono-sub shadow-sm" style="color:${c.t}; background:white; border:1px solid ${c.b};"><i class="bi ${ico}"></i></div><h5 class="fw-bold text-dark mb-2" style="position:relative; z-index:2;">${tit}</h5><p class="small text-muted mb-0" style="position:relative; z-index:2;">${desc}</p><div class="mt-auto pt-3 d-flex align-items-center fw-bold" style="color:${c.t}; font-size:0.9rem; position:relative; z-index:2;">Entrar <i class="bi bi-arrow-right ms-2"></i></div></div></div>`;
        };

        let html = estilos + 
            crearTarjeta('Paradas de Control', 'Crear puntos de recogida.', 'bi-geo-alt-fill', "window.ModTransporte.abrirVistaSegura('Paradas')", cNara, pMaster, 'col-md-6 col-xl-3') + 
            crearTarjeta('Diseño de Rutas', 'Armar secuencias.', 'bi-sign-turn-right-fill', "window.ModTransporte.abrirVistaSegura('Rutas')", cAmar, pMaster, 'col-md-6 col-xl-3') + 
            crearTarjeta('Operación de Ruta', 'Marcar hora y salida.', 'bi-broadcast', "window.ModTransporte.abrirVistaSegura('Operacion')", cPurp, pMaster, 'col-md-6 col-xl-3') +
            crearTarjeta('Visor de Recorrido', 'Seguimiento para padres.', 'bi-eye-fill', "window.ModTransporte.abrirVistaSegura('Visor')", cVerd, pMaster, 'col-md-6 col-xl-3');
        
        document.getElementById('transporte-dashboard').innerHTML = html;

        if(!window.Aplicacion.permiso('Transporte Escolar', 'crear')) { 
            let fp = document.getElementById('form-paradas-area'); if(fp) fp.innerHTML = `<div class="text-center py-4"><i class="bi bi-lock fs-1 text-muted"></i><p class="mt-2 text-muted small">No tiene permisos para crear o modificar.</p></div>`; 
            let fr = document.getElementById('form-rutas-area'); if(fr) fr.innerHTML = `<div class="text-center py-4"><i class="bi bi-lock fs-1 text-muted"></i><p class="mt-2 text-muted small">No tiene permisos para crear o modificar.</p></div>`; 
        }
    },

    abrirVistaSegura: function(vista) {
        let dash = document.getElementById('transporte-dashboard'); dash.classList.add('animate__fadeOutLeft');
        setTimeout(() => {
            dash.classList.add('d-none'); dash.classList.remove('animate__fadeOutLeft');
            let panel = document.getElementById(`vista-${vista.toLowerCase()}`); 
            panel.classList.remove('d-none'); panel.classList.add('animate__fadeInRight');
            document.getElementById('btn-volver-dashboard').classList.remove('d-none'); document.getElementById('btn-volver-dashboard').classList.add('animate__fadeIn');
            
            let elTitulo = document.getElementById('titulo-pagina'); if(elTitulo) elTitulo.innerHTML = `Gestión de ${vista}`;
            
            this.vistaActualOculta = vista;
            if(vista === 'Rutas') this.dibujarRutogramaVivo();
            if(vista === 'Operacion') { this.dibujarBotonMasivo(); this.cargarOperacion(); }
            if(vista === 'Visor') this.cargarVisor(); 
        }, 300);
    },

    volverDashboard: function() {
        if(!this.vistaActualOculta) return;
        let panel = document.getElementById(`vista-${this.vistaActualOculta.toLowerCase()}`); panel.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
        document.getElementById('btn-volver-dashboard').classList.add('d-none');
        setTimeout(() => {
            panel.classList.add('d-none'); panel.classList.remove('animate__fadeOutRight');
            let dash = document.getElementById('transporte-dashboard'); dash.classList.remove('d-none'); dash.classList.add('animate__fadeInLeft');
            let elTitulo = document.getElementById('titulo-pagina'); if(elTitulo) elTitulo.innerText = "Transporte Escolar"; 
            this.vistaActualOculta = null;
        }, 300);
    },

    obtenerFechaHoy: function() { const hoy = window.Aplicacion.obtenerFechaReal(); return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`; },

    obtenerImagenBase64: function(url) {
        return new Promise((resolve) => {
            let img = new Image(); img.crossOrigin = 'Anonymous';
            img.onload = () => {
                let canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                let ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null); img.src = url;
        });
    },

    cargarTodo: async function(silencioso = false) {
        if(!silencioso && typeof window.Aplicacion !== 'undefined') window.Aplicacion.mostrarCarga();
        
        try {
            const hoyStr = this.obtenerFechaHoy();
            const [paradasRes, rutasRes, usuariosRes, trackingRes] = await Promise.all([
                window.supabaseDB.from('paradas').select('*').order('nombre_parada', { ascending: true }),
                window.supabaseDB.from('rutas').select('*').order('nombre_ruta', { ascending: true }),
                window.supabaseDB.from('usuarios').select('cedula, nombre_completo, rol, cargo, telefono'),
                window.supabaseDB.from('tracking_rutas').select('*').eq('fecha_str', hoyStr)
            ]);

            if(!silencioso && typeof window.Aplicacion !== 'undefined') window.Aplicacion.ocultarCarga(); 

            if (paradasRes.error) throw paradasRes.error;
            if (rutasRes.error) throw rutasRes.error;
            if (usuariosRes.error) throw usuariosRes.error;
            if (trackingRes.error) throw trackingRes.error;

            this.paradas = paradasRes.data || []; 
            this.rutas = rutasRes.data || []; 
            this.trackingHoy = trackingRes.data || [];
            
            const rolesExcluidos = ["Estudiante", "Representante", "Invitado"];
            this.docentes = (usuariosRes.data || []).filter(u => !rolesExcluidos.includes(u.rol));

            this.dibujarTablaParadas(); 
            this.dibujarTarjetasRutas(); 
            this.llenarSelectores();
            
            if(this.vistaActualOculta === 'Operacion') this.cargarOperacion();
            if(this.vistaActualOculta === 'Visor') this.reRenderVisorSilencioso(); 

        } catch (e) {
            if(!silencioso && typeof window.Aplicacion !== 'undefined') window.Aplicacion.ocultarCarga(); 
            console.error(e);
            Swal.fire("Error", "No se pudo conectar con la base de datos.", "error");
        }
    },

    dibujarTablaParadas: function() { 
        const tbody = document.getElementById('tabla-paradas'); if(!tbody) return; 
        let html = ''; let pe = window.Aplicacion.permiso('Transporte Escolar', 'crear'); let peL = window.Aplicacion.permiso('Transporte Escolar', 'eliminar'); 
        this.paradas.forEach(p => { 
            let btnE = pe ? `<button class="btn btn-sm btn-light border text-primary me-1 shadow-sm" onclick="window.ModTransporte.cargarParaEditarParada('${p.id_parada}')"><i class="bi bi-pencil-fill"></i></button>` : ''; 
            let btnL = peL ? `<button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="window.ModTransporte.eliminarParada('${p.id_parada}')"><i class="bi bi-trash-fill"></i></button>` : ''; 
            html += `<tr><td class="fw-bold text-dark ps-3"><i class="bi bi-geo-alt-fill text-info me-2"></i>${p.nombre_parada}</td><td class="text-muted small">${p.referencia || 'Sin referencia'}</td><td class="text-end pe-3 text-nowrap">${btnE}${btnL}</td></tr>`; 
        }); 
        tbody.innerHTML = html || `<tr><td colspan="3" class="text-center py-4 text-muted"><i class="bi bi-signpost-split fs-1 d-block mb-3"></i>No hay paradas registradas.</td></tr>`; 
    },
    
    guardarParada: async function() { 
        let nombre = document.getElementById('txt-parada-nombre').value.trim(); 
        let ref = document.getElementById('txt-parada-ref').value.trim(); 
        if(!nombre) return Swal.fire('Atención', 'El nombre es obligatorio', 'warning'); 
        
        let payload = { nombre_parada: nombre, referencia: ref }; 

        window.Aplicacion.mostrarCarga(); 
        try {
            let errorResp;
            if(this.editandoParadaId) {
                const { error } = await window.supabaseDB.from('paradas').update(payload).eq('id_parada', this.editandoParadaId);
                errorResp = error;
            } else {
                payload.id_parada = "PAR-" + new Date().getTime();
                const { error } = await window.supabaseDB.from('paradas').insert([payload]);
                errorResp = error;
            }

            window.Aplicacion.ocultarCarga(); 
            if(errorResp) throw errorResp;

            window.Aplicacion.auditar('Transporte Escolar', this.editandoParadaId ? 'Editar Parada' : 'Nueva Parada', `Parada: ${nombre}`); 
            this.cancelarEdicionParada(); 
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Guardado.', showConfirmButton:false, timer:2000}); 
            this.cargarTodo(true); 
            
        } catch(e) {
            window.Aplicacion.ocultarCarga(); 
            Swal.fire('Error', 'Falla al guardar en la base de datos', 'error');
        }
    },
    
    eliminarParada: function(id) { 
        Swal.fire({title:'¿Borrar parada?', icon:'warning', showCancelButton:true, confirmButtonColor: '#dc3545', confirmButtonText: 'Sí, borrar'}).then(async (r) => { 
            if(r.isConfirmed) { 
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('paradas').delete().eq('id_parada', id);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    
                    window.Aplicacion.auditar('Transporte Escolar', 'Eliminar Parada', `ID Eliminada: ${id}`); 
                    this.cargarTodo(true); 
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al eliminar parada.', 'error');
                }
            } 
        }); 
    },
    
    cargarParaEditarParada: function(id) { let p = this.paradas.find(x => x.id_parada === id); if(p) { this.editandoParadaId = id; document.getElementById('txt-parada-nombre').value = p.nombre_parada; document.getElementById('txt-parada-ref').value = p.referencia; document.getElementById('btn-guardar-parada').innerText = "Actualizar"; document.getElementById('btn-cancelar-parada').classList.remove('d-none'); } },
    cancelarEdicionParada: function() { this.editandoParadaId = null; document.getElementById('txt-parada-nombre').value = ''; document.getElementById('txt-parada-ref').value = ''; document.getElementById('btn-guardar-parada').innerHTML = 'Guardar'; document.getElementById('btn-cancelar-parada').classList.add('d-none'); },

    llenarSelectores: function() {
        let docentesOcupados = this.rutas.filter(r => r.id_ruta !== this.editandoRutaId).map(r => String(r.cedula_docente));
        let selDoc = document.getElementById('sel-ruta-docente'); let valorDocentePrevio = selDoc ? selDoc.value : ''; 
        let htmlDoc = '<option value="">-- Sin Asignar --</option>'; 
        this.docentes.forEach(d => { if(!docentesOcupados.includes(String(d.cedula))) htmlDoc += `<option value="${d.cedula}">${d.nombre_completo || d.nombre} (${d.cargo || 'Personal'})</option>`; }); 
        if(selDoc) { selDoc.innerHTML = htmlDoc; selDoc.value = valorDocentePrevio; }

        let paradasOcupadas = [];
        this.rutas.forEach(r => { if(r.id_ruta !== this.editandoRutaId) { try { let arr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); paradasOcupadas = paradasOcupadas.concat(arr); } catch(e){} } });
        let paradasActualesBorrador = this.paradasTemporalesRuta.map(p => p.id_parada);
        let selPar = document.getElementById('sel-add-parada'); let htmlPar = '<option value="">-- Seleccione parada --</option>'; 
        this.paradas.forEach(p => { if(!paradasOcupadas.includes(p.id_parada) && !paradasActualesBorrador.includes(p.id_parada)) htmlPar += `<option value="${p.id_parada}">${p.nombre_parada}</option>`; }); 
        if(selPar) selPar.innerHTML = htmlPar;

        let htmlMon = '<option value="">-- Seleccione Ruta --</option>'; 
        this.rutas.forEach(r => htmlMon += `<option value="${r.id_ruta}">${r.nombre_ruta}</option>`); 
        let sOp = document.getElementById('op-sel-ruta'); if(sOp) { let vO = sOp.value; sOp.innerHTML = htmlMon; sOp.value = vO; }
        let sVis = document.getElementById('vis-sel-ruta'); if(sVis) { let vV = sVis.value; sVis.innerHTML = htmlMon; sVis.value = vV; }
    },

    agregarParadaARuta: function() { let sel = document.getElementById('sel-add-parada'); let id = sel.value; if(!id) return; let p = this.paradas.find(x => x.id_parada === id); if(p) { this.paradasTemporalesRuta.push(p); this.dibujarRutogramaVivo(); this.llenarSelectores(); } },
    quitarParadaDeRuta: function(index) { this.paradasTemporalesRuta.splice(index, 1); this.dibujarRutogramaVivo(); this.llenarSelectores(); },
    moverParadaTemporal: function(idx, dir) { let nIdx = idx + dir; if(nIdx < 0 || nIdx >= this.paradasTemporalesRuta.length) return; let tmp = this.paradasTemporalesRuta[idx]; this.paradasTemporalesRuta[idx] = this.paradasTemporalesRuta[nIdx]; this.paradasTemporalesRuta[nIdx] = tmp; this.dibujarRutogramaVivo(); },

    dibujarRutogramaVivo: function() { 
        let visor = document.getElementById('visor-rutograma-vivo'); if(!visor) return; 
        if(this.paradasTemporalesRuta.length === 0) { visor.innerHTML = '<div class="text-center text-muted small border rounded-3 p-4 bg-light shadow-sm"><i class="bi bi-geo-alt fs-2 d-block mb-2"></i>Añada paradas en la parte superior.</div>'; return; } 
        let html = '<div class="timeline-rutograma"><div class="timeline-node animate__animated animate__fadeInDown"><div class="timeline-icon start"><i class="bi bi-bus-front-fill"></i></div><div class="timeline-content border-warning border-2 shadow-sm"><span class="fw-bold text-dark mb-0">Inicio del Recorrido</span></div></div>'; 
        this.paradasTemporalesRuta.forEach((p, idx) => { 
            let btnUp = idx === 0 ? 'disabled style="opacity:0.2;"' : '';
            let btnDown = idx === this.paradasTemporalesRuta.length - 1 ? 'disabled style="opacity:0.2;"' : '';
            let flechas = `<div class="d-flex flex-column me-2"><button class="btn btn-sm text-secondary p-0 hover-efecto" style="line-height: 0.5;" ${btnUp} onclick="window.ModTransporte.moverParadaTemporal(${idx}, -1)" title="Subir parada"><i class="bi bi-caret-up-fill fs-5"></i></button><button class="btn btn-sm text-secondary p-0 hover-efecto mt-1" style="line-height: 0.5;" ${btnDown} onclick="window.ModTransporte.moverParadaTemporal(${idx}, 1)" title="Bajar parada"><i class="bi bi-caret-down-fill fs-5"></i></button></div>`;
            html += `<div class="timeline-node animate__animated animate__fadeInLeft" style="animation-delay: 0.${idx}s"><div class="timeline-icon stop"><i class="bi bi-signpost-fill"></i></div><div class="timeline-content shadow-sm"><div class="d-flex align-items-center">${flechas}<div><span class="badge bg-primary text-white me-2">${idx+1}</span><span class="fw-bold text-dark">${p.nombre_parada}</span></div></div><button class="btn btn-sm text-danger p-0 ms-2 hover-efecto" title="Remover de la ruta" onclick="window.ModTransporte.quitarParadaDeRuta(${idx})"><i class="bi bi-x-circle-fill fs-5"></i></button></div></div>`; 
        }); 
        html += `<div class="timeline-node animate__animated animate__fadeInUp" style="animation-delay: 0.${this.paradasTemporalesRuta.length}s"><div class="timeline-icon end"><i class="bi bi-building-fill"></i></div><div class="timeline-content border-success border-2 shadow-sm"><span class="fw-bold text-success mb-0">U.E. Libertador Bolívar</span></div></div></div>`; 
        visor.innerHTML = html; 
    },
    
    guardarRuta: async function() { 
        let n = document.getElementById('txt-ruta-nombre').value.trim(); 
        let c = document.getElementById('txt-ruta-chofer').value.trim(); 
        let d = document.getElementById('sel-ruta-docente').value; 
        let dDesde = document.getElementById('txt-ruta-desde').value;
        let dHasta = document.getElementById('txt-ruta-hasta').value;

        if(!n || !c) return Swal.fire('Atención', 'Faltan datos de la ruta.', 'warning'); 
        if(!dDesde || !dHasta) return Swal.fire('Atención', 'Especifique el período de validez.', 'warning');
        if(this.paradasTemporalesRuta.length === 0) return Swal.fire('Atención', 'Añada al menos una parada al recorrido.', 'warning'); 
        
        let ids = this.paradasTemporalesRuta.map(p => p.id_parada); 
        let payload = {
            nombre_ruta: n, chofer: c, cedula_docente: d || null,
            paradas_json: JSON.stringify(ids), validez_desde: dDesde, validez_hasta: dHasta
        };

        window.Aplicacion.mostrarCarga(); 
        try {
            let errorResp;
            if(this.editandoRutaId) {
                const { error } = await window.supabaseDB.from('rutas').update(payload).eq('id_ruta', this.editandoRutaId);
                errorResp = error;
            } else {
                payload.id_ruta = "RUT-" + new Date().getTime();
                const { error } = await window.supabaseDB.from('rutas').insert([payload]);
                errorResp = error;
            }

            window.Aplicacion.ocultarCarga(); 
            if(errorResp) throw errorResp;

            window.Aplicacion.auditar('Transporte Escolar', this.editandoRutaId ? 'Editar Ruta' : 'Nueva Ruta', `Ruta: ${n}`);
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Ruta Guardada', showConfirmButton:false, timer:2000}); 
            this.cancelarEdicionRuta(); 
            this.cargarTodo(true); 
            
        } catch(e) {
            window.Aplicacion.ocultarCarga(); 
            Swal.fire('Error', 'Falla al guardar en la base de datos', 'error');
        }
    },

    editarRuta: function(id) { 
        let r = this.rutas.find(x => x.id_ruta === id); if(!r) return; 
        this.editandoRutaId = id; 
        document.getElementById('txt-ruta-nombre').value = r.nombre_ruta; 
        document.getElementById('txt-ruta-chofer').value = r.chofer; 
        let formatDisplayDateForInput = (dStr) => { if(!dStr) return ''; return String(dStr).substring(0, 10); };
        document.getElementById('txt-ruta-desde').value = formatDisplayDateForInput(r.validez_desde);
        document.getElementById('txt-ruta-hasta').value = formatDisplayDateForInput(r.validez_hasta);
        this.paradasTemporalesRuta = []; 
        try { let idArr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); idArr.forEach(pid => { let pObj = this.paradas.find(p => p.id_parada === pid); if(pObj) this.paradasTemporalesRuta.push(pObj); }); } catch(e){} 
        this.llenarSelectores(); document.getElementById('sel-ruta-docente').value = r.cedula_docente || ""; this.dibujarRutogramaVivo(); 
        document.getElementById('btn-guardar-ruta').innerText = "Actualizar Ruta"; document.getElementById('btn-cancelar-ruta').classList.remove('d-none'); 
    },

    eliminarRuta: function(id) { 
        Swal.fire({title:'¿Borrar Ruta?', icon:'warning', showCancelButton:true, confirmButtonColor: '#dc3545'}).then(async (r) => { 
            if(r.isConfirmed) { 
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('rutas').delete().eq('id_ruta', id);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    window.Aplicacion.auditar('Transporte Escolar', 'Eliminar Ruta', `ID Eliminada: ${id}`); 
                    this.cargarTodo(true); 
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al eliminar ruta.', 'error');
                }
            } 
        }); 
    },
    
    cancelarEdicionRuta: function() { 
        this.editandoRutaId = null; document.getElementById('txt-ruta-nombre').value = ''; document.getElementById('txt-ruta-chofer').value = ''; document.getElementById('sel-ruta-docente').value = ''; document.getElementById('txt-ruta-desde').value = ''; document.getElementById('txt-ruta-hasta').value = '';
        this.paradasTemporalesRuta = []; this.dibujarRutogramaVivo(); this.llenarSelectores(); document.getElementById('btn-guardar-ruta').innerText = "Guardar Ruta"; document.getElementById('btn-cancelar-ruta').classList.add('d-none'); 
    },

    dibujarTarjetasRutas: function() {
        let tituloActivas = document.querySelector('#vista-rutas .col-xl-7 h5');
        if(tituloActivas && !document.getElementById('btn-batch-pdf')) { 
            tituloActivas.innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="fw-bold mb-2 mb-md-0"><i class="bi bi-signpost-split-fill text-success me-2"></i>Rutas Activas</div>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-success shadow-sm hover-efecto rounded-pill px-3 fw-bold" onclick="window.ModTransporte.compartirRutasMasivo()">
                        <i class="bi bi-whatsapp me-1"></i> Enviar a WhatsApp
                    </button>
                    <button id="btn-batch-pdf" class="btn btn-sm btn-danger shadow-sm hover-efecto rounded-pill px-3 fw-bold" onclick="window.ModTransporte.abrirSelectorLotePDF()">
                        <i class="bi bi-file-earmark-pdf-fill me-1"></i> Descargar Rutogramas
                    </button>
                </div>
            </div>`; 
        }
        let tbody = document.getElementById('tabla-rutas'); if(!tbody) return;
        if(this.rutas.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay rutas.</td></tr>'; return; }
        let html = ''; let pEL = window.Aplicacion.permiso('Transporte Escolar', 'eliminar'); let pED = window.Aplicacion.permiso('Transporte Escolar', 'crear');
        this.rutas.forEach(r => {
            let doc = this.docentes.find(d => String(d.cedula) === String(r.cedula_docente)); 
            let idArr = []; try { idArr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); } catch(e){}
            let btnV = `<button class="btn btn-sm btn-light border text-success shadow-sm me-1" title="Ver Recorrido" onclick="window.ModTransporte.verDetalleRuta('${r.id_ruta}')"><i class="bi bi-eye-fill"></i></button>`;
            let btnE = pED ? `<button class="btn btn-sm btn-light border text-primary shadow-sm me-1" onclick="window.ModTransporte.editarRuta('${r.id_ruta}')"><i class="bi bi-pencil-fill"></i></button>` : '';
            let btnL = pEL ? `<button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="window.ModTransporte.eliminarRuta('${r.id_ruta}')"><i class="bi bi-trash-fill"></i></button>` : '';
            html += `<tr><td class="ps-3 fw-bold text-primary">${r.nombre_ruta}</td><td class="small"><div class="text-muted"><i class="bi bi-person-vcard me-1"></i>Chofer: <span class="fw-bold text-dark">${r.chofer}</span></div><div><i class="bi bi-person-video3 me-1"></i>Guía: <span class="fw-bold text-dark">${doc ? doc.nombre_completo || doc.nombre : 'N/A'}</span></div></td><td class="text-center"><span class="badge bg-success rounded-pill px-2 py-1">${idArr.length}</span></td><td class="text-end pe-3 text-nowrap">${btnV}${btnE}${btnL}</td></tr>`;
        }); tbody.innerHTML = html;
    },

    verDetalleRuta: function(idRuta) { 
        let r = this.rutas.find(x => x.id_ruta === idRuta); if(!r) return; 
        let doc = this.docentes.find(d => String(d.cedula) === String(r.cedula_docente)); 
        let nombreDoc = doc ? (doc.nombre_completo || doc.nombre) : 'Sin asignar'; 
        let telDoc = doc && doc.telefono ? doc.telefono : 'No registrado'; 
        let idArr = []; try { idArr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); } catch(e){} 
        
        let html = `<div class="text-start"><div class="mb-4 text-center"><span class="badge bg-warning text-dark shadow-sm me-2 py-2 px-3 mb-2"><i class="bi bi-person-vcard me-1"></i> Chofer: ${r.chofer}</span><span class="badge bg-primary shadow-sm py-2 px-3 mb-2"><i class="bi bi-person-video3 me-1"></i> Guía: ${nombreDoc}</span><div class="mt-2 text-muted small"><i class="bi bi-telephone-fill me-1 text-success"></i> Teléfono del Guía: <span class="fw-bold">${telDoc}</span></div></div><div class="timeline-rutograma mt-3 pt-2"><div class="timeline-node"><div class="timeline-icon start"><i class="bi bi-bus-front-fill"></i></div><div class="timeline-content border-warning border-2 shadow-sm"><span class="fw-bold text-dark mb-0">Inicio del Recorrido</span></div></div>`; 
        idArr.forEach((pid, idx) => { let p = this.paradas.find(x => x.id_parada === pid); if(p) { html += `<div class="timeline-node"><div class="timeline-icon stop"><i class="bi bi-signpost-fill"></i></div><div class="timeline-content shadow-sm"><div><span class="badge bg-info text-dark me-2">${idx+1}</span><span class="fw-bold text-dark">${p.nombre_parada}</span></div>${p.referencia ? `<div class="small text-muted fst-italic ms-2">${p.referencia}</div>` : ''}</div></div>`; } }); 
        html += `<div class="timeline-node"><div class="timeline-icon end"><i class="bi bi-building-fill"></i></div><div class="timeline-content border-success border-2 shadow-sm"><span class="fw-bold text-success mb-0">Llegada U.E. Libertador Bolívar</span></div></div></div>`; 
        
        html += `
            <div class="mt-4 pt-3 border-top d-flex justify-content-center flex-wrap gap-2">
                <button class="btn btn-success fw-bold shadow-sm rounded-pill hover-efecto px-4" onclick="Swal.close(); setTimeout(() => window.ModTransporte.compartirRutaIndividual('${idRuta}'), 300)">
                    <i class="bi bi-whatsapp me-1"></i> Enviar
                </button>
                <button class="btn btn-danger fw-bold shadow-sm rounded-pill hover-efecto px-4" onclick="Swal.close(); setTimeout(() => window.ModTransporte.exportarRutograma('${idRuta}'), 300)">
                    <i class="bi bi-file-earmark-pdf-fill me-1"></i> Descargar
                </button>
            </div>
        </div>`;
        
        Swal.fire({ title: `<div class="text-primary fw-bold fs-3"><i class="bi bi-map-fill me-2"></i>${r.nombre_ruta}</div>`, html: html, showConfirmButton: false, showCloseButton: true, width: '600px' }); 
    },

    compartirRutaIndividual: async function(idRuta) {
        let r = this.rutas.find(x => x.id_ruta === idRuta);
        if(!r) return;

        Swal.fire({ title: 'Preparando Mensaje...', text: 'Generando imagen membretada de la ruta. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        try {
            let base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
            let base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');
            const fechaHoy = new Date().toLocaleString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let clon = document.createElement('div');
            clon.style.width = "800px"; clon.style.padding = "40px"; clon.style.background = "#ffffff"; clon.style.position = "absolute"; clon.style.top = "-9999px"; clon.style.left = "-9999px"; clon.style.fontFamily = "Arial, Helvetica, sans-serif";

            let doc = this.docentes.find(d => String(d.cedula) === String(r.cedula_docente));
            let nombreDoc = doc ? doc.nombre_completo || doc.nombre : 'Sin asignar';
            let telDoc = doc ? (doc.telefono || '') : '';
            let idArr = []; try { idArr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); } catch(e){}

            let htmlImagen = `
                <div style="display: flex; align-items: center; border-bottom: 2px solid #0066FF; padding-bottom: 15px; margin-bottom: 25px;">
                    ${base64LogoEscuela ? `<img src="${base64LogoEscuela}" style="height: 60px; margin-right: 15px;">` : ''}
                    <div>
                        <div style="font-size: 12px; color: #334155;">República Bolivariana de Venezuela</div>
                        <div style="font-size: 12px; color: #334155;">Ministerio del Poder Popular para la Educación</div>
                        <div style="font-size: 14px; font-weight: bold; color: #0f172a;">Unidad Educativa Libertador Bolívar</div>
                    </div>
                </div>
                <div style="text-align:center; margin-bottom:25px;">
                    <h2 style="color:#0066FF; margin:0; text-transform: uppercase;">Rutograma de Transporte Escolar</h2>
                </div>`;
            
            htmlImagen += `<div style="margin-bottom:20px; border:2px solid #e2e8f0; border-radius:10px; padding:20px; background: #f8fafc;">
                <h3 style="color:#f97316; margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px;">${r.nombre_ruta}</h3>
                <div style="font-size:16px; margin-bottom:15px; color: #1e293b;"><b>Chofer:</b> ${r.chofer} &nbsp;|&nbsp; <b>Guía:</b> ${nombreDoc} ${telDoc}</div>
                <div style="font-size:15px; font-weight:bold; margin-bottom:10px; color: #0f172a;">Secuencia de Recorrido:</div>
                <ul style="list-style-type:none; padding-left:0; font-size:15px; margin:0; color: #334155;">`;

            let textoMensaje = `🚍 *RUTA DE TRANSPORTE ESCOLAR*\n🏫 *U.E. Libertador Bolívar*\n\n📍 *${r.nombre_ruta}*\n👨‍✈️ Chofer: ${r.chofer}\n👩‍🏫 Guía: ${nombreDoc} ${telDoc ? '('+telDoc+')' : ''}\n\n*Paradas:*\n`;

            idArr.forEach((pid, idx) => {
                let p = this.paradas.find(x => x.id_parada === pid);
                if(p) {
                    htmlImagen += `<li style="margin-bottom:8px;"><b>${idx+1}.</b> ${p.nombre_parada} <span style="color:#64748b; font-size:13px;">(${p.referencia||'Sin referencia'})</span></li>`;
                    textoMensaje += `  ${idx+1}. ${p.nombre_parada}\n`;
                }
            });
            htmlImagen += `</ul></div>`;

            htmlImagen += `
                <div style="margin-top: 40px; border-top: 2px solid #dc3545; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                    ${base64CintilloMPPE ? `<img src="${base64CintilloMPPE}" style="height: 35px;">` : '<div></div>'}
                    <div style="text-align: right; font-size: 12px; color: #64748b;">Generado: ${fechaHoy}<br>Sistema SIGAE v1.0</div>
                </div>`;

            clon.innerHTML = htmlImagen;
            document.body.appendChild(clon);
            await new Promise(res => setTimeout(res, 500));

            const canvas = await html2canvas(clon, { scale: 2, backgroundColor: '#ffffff', logging: false });
            document.body.removeChild(clon);

            canvas.toBlob(async (blob) => {
                const file = new File([blob], `Ruta_${r.nombre_ruta.replace(/\s/g, '_')}.png`, { type: "image/png" });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    Swal.close();
                    try {
                        await navigator.share({ title: r.nombre_ruta, text: textoMensaje, files: [file] });
                        window.Aplicacion.auditar('Transporte Escolar', 'Compartir Ruta', `Se compartió imagen de: ${r.nombre_ruta}`);
                    } catch (err) { console.log("Compartir cancelado"); }
                } else {
                    Swal.close();
                    let urlImagen = canvas.toDataURL("image/png");
                    let a = document.createElement('a'); a.href = urlImagen; a.download = `Ruta_${r.nombre_ruta.replace(/\s/g, '_')}.png`; a.click();
                    navigator.clipboard.writeText(textoMensaje).then(() => {
                        window.Aplicacion.auditar('Transporte Escolar', 'Compartir Ruta', `Se generó imagen y texto de: ${r.nombre_ruta} para PC`);
                        Swal.fire({
                            title: '¡Ruta Preparada!', html: '<b>1.</b> La imagen PNG se descargó.<br><b>2.</b> El texto fue copiado al portapapeles.<br><br>¿Dónde deseas enviarlo?', icon: 'info', showCancelButton: true,
                            confirmButtonText: '<i class="bi bi-whatsapp me-1"></i> WhatsApp', cancelButtonText: '<i class="bi bi-telegram me-1"></i> Telegram', confirmButtonColor: '#25D366', cancelButtonColor: '#0088cc'
                        }).then((res2) => {
                            if (res2.isConfirmed) { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Información de la ruta escolar. ¡Adjunta la imagen descargada!\n\n' + textoMensaje)}`, '_blank'); } 
                            else if (res2.dismiss === Swal.DismissReason.cancel) { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(textoMensaje)}`, '_blank'); }
                        });
                    });
                }
            }, "image/png");
        } catch (error) { console.error(error); Swal.fire('Error', 'No se pudo generar la imagen.', 'error'); }
    },

    compartirRutasMasivo: async function() {
        if(this.rutas.length === 0) return Swal.fire('Atención', 'No hay rutas operativas para compartir.', 'warning');

        Swal.fire({ title: 'Preparando Mensaje...', text: 'Generando imagen membretada de las rutas. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        try {
            let base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
            let base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');
            const fechaHoy = new Date().toLocaleString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let clon = document.createElement('div');
            clon.style.width = "800px"; clon.style.padding = "40px"; clon.style.background = "#ffffff"; clon.style.position = "absolute"; clon.style.top = "-9999px"; clon.style.left = "-9999px"; clon.style.fontFamily = "Arial, Helvetica, sans-serif";

            let htmlImagen = `
                <div style="display: flex; align-items: center; border-bottom: 2px solid #0066FF; padding-bottom: 15px; margin-bottom: 25px;">
                    ${base64LogoEscuela ? `<img src="${base64LogoEscuela}" style="height: 60px; margin-right: 15px;">` : ''}
                    <div>
                        <div style="font-size: 12px; color: #334155;">República Bolivariana de Venezuela</div>
                        <div style="font-size: 12px; color: #334155;">Ministerio del Poder Popular para la Educación</div>
                        <div style="font-size: 14px; font-weight: bold; color: #0f172a;">Unidad Educativa Libertador Bolívar</div>
                    </div>
                </div>
                <div style="text-align:center; margin-bottom:25px;">
                    <h2 style="color:#0066FF; margin:0; text-transform: uppercase;">Rutogramas de Transporte Escolar</h2>
                </div>`;

            let textoMensaje = `🚍 *RUTAS DE TRANSPORTE ESCOLAR*\n🏫 *U.E. Libertador Bolívar*\n\n`;

            this.rutas.forEach(r => {
                let doc = this.docentes.find(d => String(d.cedula) === String(r.cedula_docente));
                let nombreDoc = doc ? doc.nombre_completo || doc.nombre : 'Sin asignar';
                let telDoc = doc ? (doc.telefono || '') : '';
                let idArr = []; try { idArr = typeof r.paradas_json === 'string' ? JSON.parse(r.paradas_json || "[]") : (r.paradas_json || []); } catch(e){}

                htmlImagen += `<div style="margin-bottom:20px; border:2px solid #e2e8f0; border-radius:10px; padding:20px; background: #f8fafc;">
                    <h3 style="color:#f97316; margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px;">${r.nombre_ruta}</h3>
                    <div style="font-size:16px; margin-bottom:15px; color: #1e293b;"><b>Chofer:</b> ${r.chofer} &nbsp;|&nbsp; <b>Guía:</b> ${nombreDoc} ${telDoc}</div>
                    <ul style="list-style-type:none; padding-left:0; font-size:15px; margin:0; color: #334155;">`;

                textoMensaje += `📍 *${r.nombre_ruta}*\n👨‍✈️ Chofer: ${r.chofer}\n👩‍🏫 Guía: ${nombreDoc} ${telDoc ? '('+telDoc+')' : ''}\n*Paradas:*\n`;

                idArr.forEach((pid, idx) => {
                    let p = this.paradas.find(x => x.id_parada === pid);
                    if(p) {
                        htmlImagen += `<li style="margin-bottom:8px;"><b>${idx+1}.</b> ${p.nombre_parada} <span style="color:#64748b; font-size:13px;">(${p.referencia||'Sin referencia'})</span></li>`;
                        textoMensaje += `  ${idx+1}. ${p.nombre_parada}\n`;
                    }
                });
                htmlImagen += `</ul></div>`;
                textoMensaje += `\n`;
            });

            htmlImagen += `
                <div style="margin-top: 40px; border-top: 2px solid #dc3545; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                    ${base64CintilloMPPE ? `<img src="${base64CintilloMPPE}" style="height: 35px;">` : '<div></div>'}
                    <div style="text-align: right; font-size: 12px; color: #64748b;">Generado: ${fechaHoy}<br>Sistema SIGAE v1.0</div>
                </div>`;

            clon.innerHTML = htmlImagen;
            document.body.appendChild(clon);

            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(clon, { scale: 2, backgroundColor: '#ffffff', logging: false });
            document.body.removeChild(clon);

            canvas.toBlob(async (blob) => {
                const file = new File([blob], "Rutas_Escolares.png", { type: "image/png" });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    Swal.close();
                    try {
                        await navigator.share({ title: 'Rutas Escolares', text: textoMensaje, files: [file] });
                        window.Aplicacion.auditar('Transporte Escolar', 'Compartir Rutas', 'Se compartió imagen de las rutas');
                    } catch (err) { console.log("Compartir cancelado o no completado."); }
                } else {
                    Swal.close();
                    
                    let urlImagen = canvas.toDataURL("image/png");
                    let a = document.createElement('a');
                    a.href = urlImagen;
                    a.download = "Rutas_Escolares.png";
                    a.click(); 

                    navigator.clipboard.writeText(textoMensaje).then(() => {
                        window.Aplicacion.auditar('Transporte Escolar', 'Compartir Rutas', 'Se generó imagen y texto de las rutas para PC');
                        Swal.fire({
                            title: '¡Rutas Preparadas!', html: '<b>1.</b> La imagen PNG ya se descargó.<br><b>2.</b> El texto ha sido copiado al portapapeles.<br><br>¿Dónde deseas enviarlo?', icon: 'info', showCancelButton: true,
                            confirmButtonText: '<i class="bi bi-whatsapp me-1"></i> WhatsApp', cancelButtonText: '<i class="bi bi-telegram me-1"></i> Telegram', confirmButtonColor: '#25D366', cancelButtonColor: '#0088cc'
                        }).then((res) => {
                            if (res.isConfirmed) { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Te envío la información de las rutas escolares. ¡No olvides adjuntar la imagen descargada!\n\n' + textoMensaje)}`, '_blank'); } 
                            else if (res.dismiss === Swal.DismissReason.cancel) { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(textoMensaje)}`, '_blank'); }
                        });
                    });
                }
            }, "image/png");

        } catch (error) { console.error(error); Swal.fire('Error', 'No se pudo generar la imagen para compartir.', 'error'); }
    },

    dibujarBotonMasivo: function() {
        let area = document.getElementById('area-btn-masivo'); if(!area) return;
        let esCoordinador = window.Aplicacion.permiso('Transporte Escolar', 'ver'); 
        if(esCoordinador) { 
            area.innerHTML = `
                <div class="d-flex flex-wrap gap-2 justify-content-end">
                    <button class="btn btn-outline-danger fw-bold shadow-sm rounded-pill hover-efecto px-3" onclick="window.ModTransporte.reiniciarTodasLasRutas()">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Reset Masivo
                    </button>
                    <button class="btn btn-outline-secondary fw-bold shadow-sm rounded-pill hover-efecto px-3" onclick="window.ModTransporte.reiniciarRecorridoRuta()">
                        <i class="bi bi-arrow-counterclockwise me-1"></i>Reset Ruta
                    </button>
                    <button class="btn btn-warning text-dark fw-bold shadow-sm rounded-pill hover-efecto px-4" onclick="window.ModTransporte.marcarSalidaMasivaRetorno()">
                        <i class="bi bi-megaphone-fill text-danger me-2"></i>Despacho Masivo
                    </button>
                </div>`; 
        } else { area.innerHTML = ''; }
    },
    
    refrescarVisor: function() { let idRuta = document.getElementById('vis-sel-ruta').value; if(!idRuta) return; this.cargarTodo(false); },
    reRenderVisorSilencioso: function() { let divArea = document.getElementById('vis-recorrido-area'); if(!divArea || divArea.classList.contains('d-none')) return; this.renderizarLineaTiempo('vis-sel-ruta', 'vis-sel-momento', 'vis-recorrido-area', false); },
    formatearHoraAMPM: function(time24) { let parts = time24.split(':'); let h = parseInt(parts[0]); let m = parts[1]; let ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; return `${String(h).padStart(2,'0')}:${m} ${ampm}`; },
    cargarOperacion: function() { this.renderizarLineaTiempo('op-sel-ruta', 'op-sel-momento', 'op-recorrido-area', true); },
    cargarVisor: function() { this.renderizarLineaTiempo('vis-sel-ruta', 'vis-sel-momento', 'vis-recorrido-area', false); },

    // ✨ NUEVA FUNCIÓN: RESETEAR TODAS LAS RUTAS DE IDA Y RETORNO Y LIMPIAR NOTIFICACIONES ✨
    reiniciarTodasLasRutas: function() {
        Swal.fire({ 
            title: '¿Resetear TODAS las rutas?', 
            text: `ATENCIÓN: Se borrarán todas las horas marcadas y las notificaciones de TODAS las rutas para el día de hoy.`, 
            icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#dc3545', 
            confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i>Sí, resetear todo', 
            cancelButtonText: 'Cancelar'
        }).then(async res => {
            if(res.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    let tracksABorrar = this.trackingHoy.map(t => t.id_tracking);
                    
                    if(tracksABorrar.length > 0) {
                        const { error } = await window.supabaseDB.from('tracking_rutas').delete().in('id_tracking', tracksABorrar);
                        if(error) throw error;
                    }

                    // ✨ LIMPIEZA DE NOTIFICACIONES DE HOY ✨
                    let inicioDia = window.Aplicacion.obtenerFechaReal();
                    inicioDia.setHours(0,0,0,0);
                    await window.supabaseDB.from('notificaciones')
                        .delete()
                        .eq('tipo', 'Transporte')
                        .gte('created_at', inicioDia.toISOString());
                    
                    window.Aplicacion.ocultarCarga(); 
                    window.Aplicacion.auditar('Transporte Escolar', 'Reset Masivo Total', `Se reiniciaron TODAS las rutas y se limpiaron las notificaciones.`); 
                    Swal.fire({toast:true, position:'top-end', icon:'success', title:'Reset Masivo Completado', showConfirmButton:false, timer:2000}); 
                    this.cargarTodo(true); 
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla de BD al resetear rutas.', 'error');
                }
            }
        });
    },

    // ✨ RESETEAR RUTA ESPECÍFICA Y LIMPIAR SUS NOTIFICACIONES ✨
    reiniciarRecorridoRuta: function() {
        let idRuta = document.getElementById('op-sel-ruta').value; let tipo = document.getElementById('op-sel-momento').value;
        if(!idRuta) return Swal.fire('Atención', 'Seleccione una ruta primero para poder reiniciarla.', 'warning');
        
        Swal.fire({ 
            title: '¿Reiniciar Recorrido?', 
            text: `Se borrarán las horas marcadas y las notificaciones para la ruta actual.`, 
            icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#dc3545', 
            confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i>Sí, reiniciar ruta', 
            cancelButtonText: 'Cancelar'
        }).then(async res => {
            if(res.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
                    if(trackActual) {
                        const { error } = await window.supabaseDB.from('tracking_rutas').delete().eq('id_tracking', trackActual.id_tracking);
                        if(error) throw error;
                    }

                    // ✨ LIMPIEZA DE NOTIFICACIONES DE ESTA RUTA ✨
                    let inicioDia = window.Aplicacion.obtenerFechaReal();
                    inicioDia.setHours(0,0,0,0);
                    await window.supabaseDB.from('notificaciones')
                        .delete()
                        .eq('tipo', 'Transporte')
                        .eq('referencia_id', idRuta)
                        .gte('created_at', inicioDia.toISOString());

                    window.Aplicacion.ocultarCarga(); 
                    window.Aplicacion.auditar('Transporte Escolar', 'Reiniciar Recorrido', `Ruta ID: ${idRuta} limpiada (incluyendo notificaciones)`); 
                    Swal.fire({toast:true, position:'top-end', icon:'success', title:'Ruta Reiniciada', showConfirmButton:false, timer:2000}); 
                    this.cargarTodo(true); 
                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    Swal.fire('Error', 'Falla de BD al reiniciar.', 'error'); 
                }
            }
        });
    },

    moverParadaOperacion: async function(idRuta, tipo, index, direccion) {
        let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
        let marcadas = {}; if(trackActual) { try { marcadas = typeof trackActual.estado_json === 'string' ? JSON.parse(trackActual.estado_json || "{}") : (trackActual.estado_json || {}); } catch(e){} }
        let ruta = this.rutas.find(r => r.id_ruta === idRuta); if(!ruta) return;
        let rutaIds = []; try { rutaIds = typeof ruta.paradas_json === 'string' ? JSON.parse(ruta.paradas_json || "[]") : (ruta.paradas_json || []); } catch(e){}
        
        let defaultOrder = [];
        if (tipo === 'Ida') { rutaIds.forEach(id => { let p = this.paradas.find(x => x.id_parada === id); if(p) defaultOrder.push(p.id_parada); }); defaultOrder.push('escuela'); } 
        else { defaultOrder.push('escuela'); let reversa = [...rutaIds].reverse(); reversa.forEach(id => { let p = this.paradas.find(x => x.id_parada === id); if(p) defaultOrder.push(p.id_parada); }); }
        
        let ordenActual = (marcadas._orden && Array.isArray(marcadas._orden) && marcadas._orden.length === defaultOrder.length) ? [...marcadas._orden] : defaultOrder;
        let nuevoIndex = index + direccion; if (nuevoIndex < 0 || nuevoIndex >= ordenActual.length) return;
        if (ordenActual[index] === 'escuela' || ordenActual[nuevoIndex] === 'escuela') return; 
        
        let temp = ordenActual[index]; ordenActual[index] = ordenActual[nuevoIndex]; ordenActual[nuevoIndex] = temp;
        marcadas._orden = ordenActual;
        
        window.Aplicacion.mostrarCarga();
        this.guardarTrackingSupabase(idRuta, tipo, marcadas);
    },

    guardarTrackingSupabase: async function(idRuta, tipo, marcadas) {
        try {
            let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
            let payload = { fecha_str: this.obtenerFechaHoy(), id_ruta: idRuta, tipo_recorrido: tipo, estado_json: JSON.stringify(marcadas) };
            
            if(trackActual) { await window.supabaseDB.from('tracking_rutas').update(payload).eq('id_tracking', trackActual.id_tracking); } 
            else { payload.id_tracking = "TRK-" + new Date().getTime(); await window.supabaseDB.from('tracking_rutas').insert([payload]); }
            window.Aplicacion.ocultarCarga(); this.cargarTodo(true);
        } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo guardar la ubicación.', 'error'); }
    },

    renderizarLineaTiempo: function(idSelectRuta, idSelectMomento, idDivArea, esOperacion) {
        let idRuta = document.getElementById(idSelectRuta).value; let tipo = document.getElementById(idSelectMomento).value; let divArea = document.getElementById(idDivArea);
        if(!idRuta) { divArea.classList.add('d-none'); return; }
        let ruta = this.rutas.find(r => r.id_ruta === idRuta); if(!ruta) return; divArea.classList.remove('d-none');
        let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
        let marcadas = {}; if(trackActual) { try { marcadas = typeof trackActual.estado_json === 'string' ? JSON.parse(trackActual.estado_json || "{}") : (trackActual.estado_json || {}); } catch(e){} }
        let rutaIds = []; try { rutaIds = typeof ruta.paradas_json === 'string' ? JSON.parse(ruta.paradas_json || "[]") : (ruta.paradas_json || []); } catch(e){}
        
        let defaultPuntos = [];
        if (tipo === 'Ida') { rutaIds.forEach(id => { let p = this.paradas.find(x => x.id_parada === id); if(p) defaultPuntos.push({id: p.id_parada, nombre: p.nombre_parada, ref: p.referencia, tipo: 'parada'}); }); defaultPuntos.push({id: 'escuela', nombre: 'U.E. Libertador Bolívar', ref: 'Llegada a la Institución', tipo: 'llegada'}); } 
        else { defaultPuntos.push({id: 'escuela', nombre: 'U.E. Libertador Bolívar', ref: 'Salida de la Institución', tipo: 'salida'}); let reversa = [...rutaIds].reverse(); reversa.forEach(id => { let p = this.paradas.find(x => x.id_parada === id); if(p) defaultPuntos.push({id: p.id_parada, nombre: p.nombre_parada, ref: p.referencia, tipo: 'parada'}); }); }
        
        let puntosRecorrido = []; if (marcadas._orden && Array.isArray(marcadas._orden) && marcadas._orden.length === defaultPuntos.length) { puntosRecorrido = marcadas._orden.map(id => defaultPuntos.find(p => p.id === id)).filter(p => p); if (puntosRecorrido.length !== defaultPuntos.length) puntosRecorrido = defaultPuntos; } else { puntosRecorrido = defaultPuntos; }
        
        let miCedula = window.Aplicacion.usuario ? String(window.Aplicacion.usuario.cedula) : '';
        let esCoordinador = window.Aplicacion.permiso('Transporte Escolar', 'ver'); let pOperacion = window.Aplicacion.permiso('Transporte Escolar', 'ver'); let esDocenteRuta = (miCedula === String(ruta.cedula_docente)); let puedeMarcar = esOperacion && pOperacion && (esCoordinador || esDocenteRuta);
        
        let infoVisor = '';
        if(!esOperacion) { let doc = this.docentes.find(d => String(d.cedula) === String(ruta.cedula_docente)); let nombreDoc = doc ? (doc.nombre_completo || doc.nombre) : 'Sin asignar'; let telDoc = doc && doc.telefono ? doc.telefono : 'No registrado'; infoVisor = `<div class="mb-4 p-3 bg-white border border-success rounded-4 shadow-sm text-center"><div class="row"><div class="col-6 border-end"><span class="small text-muted d-block">Chofer</span><span class="fw-bold text-dark"><i class="bi bi-person-vcard me-1 text-warning"></i>${ruta.chofer}</span></div><div class="col-6"><span class="small text-muted d-block">Docente Guía</span><span class="fw-bold text-dark"><i class="bi bi-person-video3 me-1 text-primary"></i>${nombreDoc}</span><br><span class="small text-success fw-bold"><i class="bi bi-telephone-fill me-1"></i>${telDoc}</span></div></div></div>`; }
        
        let htmlTimeline = infoVisor + '<div class="timeline-rutograma mt-2">'; let nodoAnteriorCompletado = true; let todosMarcados = true; 
        puntosRecorrido.forEach((pto, idx) => {
            let horaPaso = marcadas[pto.id]; if(!horaPaso) todosMarcados = false; 
            let estadoClase = ''; if (horaPaso) { estadoClase = 'nodo-completado'; nodoAnteriorCompletado = true; } else if (nodoAnteriorCompletado) { estadoClase = 'nodo-activo'; nodoAnteriorCompletado = false; } else { estadoClase = 'nodo-pendiente'; }
            let icono = 'bi-signpost-fill'; if(pto.tipo === 'salida') icono = 'bi-building-fill-up'; if(pto.tipo === 'llegada') icono = 'bi-building-fill-down';
            let iconBusVisor = ''; if(!esOperacion && estadoClase === 'nodo-activo') { iconBusVisor = `<span class="badge bg-primary rounded-pill position-absolute shadow-sm" style="right: -10px; top: -10px; font-size: 1rem; animation: flotar-suave 2s infinite;"><i class="bi bi-bus-front-fill me-1"></i> Aquí viene</span>`; }
            let botonMarcar = ''; let botonesReordenar = ''; let badgeHora = '';
            
            if (horaPaso) { badgeHora = `<span class="badge bg-success ms-2 shadow-sm d-inline-flex align-items-center"><i class="bi bi-check2-all me-1"></i>${horaPaso}</span>`; if (puedeMarcar && esOperacion) { badgeHora += `<button class="btn btn-sm btn-outline-danger ms-2 py-0 px-1 border border-danger hover-efecto shadow-sm d-inline-flex align-items-center justify-content-center" style="font-size: 0.8rem; border-radius:50px; background: white;" onclick="window.ModTransporte.eliminarHoraCheckPoint('${idRuta}', '${tipo}', '${pto.id}')" title="Desmarcar Hora"><i class="bi bi-x-lg fw-bold text-danger" style="line-height: 1;"></i></button>`; } }
            if (puedeMarcar && esOperacion) {
                if(!horaPaso) { let textoBtn = pto.tipo === 'salida' ? 'Marcar Salida' : (pto.tipo === 'llegada' ? 'Marcar Llegada' : 'Pasó el Bus'); botonMarcar = `<button class="btn btn-sm btn-info text-white fw-bold shadow-sm rounded-pill px-3 ms-auto hover-efecto" onclick="window.ModTransporte.preguntarHoraCheckPoint('${idRuta}', '${tipo}', '${pto.id}')"><i class="bi bi-clock-history me-1"></i> <span class="d-none d-sm-inline">${textoBtn}</span><span class="d-sm-none">Marcar</span></button>`; }
                if(pto.id !== 'escuela') { let disableUp = (idx === 0 || puntosRecorrido[idx - 1].id === 'escuela'); let disableDown = (idx === puntosRecorrido.length - 1 || puntosRecorrido[idx + 1].id === 'escuela'); botonesReordenar = `<div class="d-flex flex-column ms-1 me-3 justify-content-center align-items-center"><button class="btn btn-sm text-secondary p-0 hover-efecto" style="line-height: 0.5; ${disableUp ? 'opacity:0.2; cursor:not-allowed;' : ''}" ${disableUp ? 'disabled' : ''} onclick="window.ModTransporte.moverParadaOperacion('${idRuta}', '${tipo}', ${idx}, -1)" title="Subir parada"><i class="bi bi-caret-up-fill fs-4"></i></button><button class="btn btn-sm text-secondary p-0 hover-efecto mt-1" style="line-height: 0.5; ${disableDown ? 'opacity:0.2; cursor:not-allowed;' : ''}" ${disableDown ? 'disabled' : ''} onclick="window.ModTransporte.moverParadaOperacion('${idRuta}', '${tipo}', ${idx}, 1)" title="Bajar parada"><i class="bi bi-caret-down-fill fs-4"></i></button></div>`; }
            }
            htmlTimeline += `<div class="timeline-node ${estadoClase} animate__animated animate__fadeInLeft position-relative">${iconBusVisor}<div class="timeline-icon"><i class="bi ${icono}"></i></div><div class="timeline-content ${horaPaso ? 'border-success bg-white' : 'shadow-sm'}"><div class="d-flex align-items-center">${botonesReordenar}<div><div class="fw-bold fs-6 text-dark d-flex align-items-center flex-wrap">${pto.nombre} ${badgeHora}</div><div class="small text-muted fst-italic">${pto.ref || ''}</div></div></div>${botonMarcar}</div></div>`;
        });
        htmlTimeline += '</div>';
        if(todosMarcados && puntosRecorrido.length > 0) { htmlTimeline += `<div class="mt-4 p-3 bg-success bg-opacity-10 border border-success rounded-4 text-center animate__animated animate__tada shadow-sm"><i class="bi bi-flag-fill text-success fs-1 d-block mb-2"></i><h5 class="fw-bold text-success mb-0">¡Fin de la Ruta!</h5><p class="text-success small mb-0 mt-1">El recorrido ha concluido exitosamente.</p></div>`; }
        divArea.innerHTML = htmlTimeline;
    },

    eliminarHoraCheckPoint: function(idRuta, tipo, idParada) {
        Swal.fire({ title: '¿Desmarcar punto de control?', text: 'Se eliminará la hora registrada.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, borrar', confirmButtonColor: '#dc3545' }).then(res => {
            if(res.isConfirmed) {
                let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
                let marcadas = {}; if(trackActual) { try { marcadas = typeof trackActual.estado_json === 'string' ? JSON.parse(trackActual.estado_json || "{}") : (trackActual.estado_json || {}); } catch(e){} }
                delete marcadas[idParada]; window.Aplicacion.mostrarCarga(); this.guardarTrackingSupabase(idRuta, tipo, marcadas);
            }
        });
    },

    preguntarHoraCheckPoint: function(idRuta, tipo, idParada) {
        let d = new Date(); let defaultTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        Swal.fire({ title: 'Marcar Hora de Paso', html: `<label class="fw-bold text-muted small mb-2">Confirme o ajuste la hora en la que el bus pasó por este punto:</label><input type="time" id="hora-manual-track" class="form-control text-center fs-3 fw-bold text-primary" value="${defaultTime}">`, showCancelButton: true, confirmButtonText: '<i class="bi bi-save me-1"></i> Registrar Hora', confirmButtonColor: '#0066FF', preConfirm: () => document.getElementById('hora-manual-track').value }).then(res => {
            if(res.isConfirmed && res.value) { let horaFinal = this.formatearHoraAMPM(res.value); this.enviarCheckPoint(idRuta, tipo, idParada, horaFinal); }
        });
    },

    enviarCheckPoint: async function(idRuta, tipo, idParada, horaFinal) {
        let trackActual = this.trackingHoy.find(t => t.id_ruta === idRuta && t.tipo_recorrido === tipo);
        let marcadas = {}; if(trackActual) { try { marcadas = typeof trackActual.estado_json === 'string' ? JSON.parse(trackActual.estado_json || "{}") : (trackActual.estado_json || {}); } catch(e){} }
        marcadas[idParada] = horaFinal; window.Aplicacion.mostrarCarga();
        let rutaObj = this.rutas.find(r => r.id_ruta === idRuta); let pObj = this.paradas.find(p => p.id_parada === idParada); let nombreParada = pObj ? pObj.nombre_parada : (idParada === 'escuela' ? 'la U.E. Libertador Bolívar' : idParada);
        window.Aplicacion.auditar('Transporte Escolar', 'Punto de Control', `Ruta ${rutaObj.nombre_ruta} por ${nombreParada}`);
        
        await this.guardarTrackingSupabase(idRuta, tipo, marcadas);

        try {
            await window.supabaseDB.from('notificaciones').insert([{
                id_notificacion: "NOT-" + new Date().getTime(),
                tipo: 'Transporte',
                referencia_id: idRuta, 
                titulo: `🚌 Actualización de ${rutaObj.nombre_ruta}`,
                mensaje: `El transporte acaba de reportar su paso por: ${nombreParada} a las ${horaFinal}.`,
                roles_destino: 'Administrador,Coordinador',
                usuarios_destino: rutaObj.cedula_docente || ''
            }]);
        } catch(e) { console.log("Error enviando notificación push"); }
    },

    abrirSelectorLotePDF: function() { if(this.rutas.length === 0) return Swal.fire('Atención', 'No hay rutas registradas para exportar.', 'warning'); let html = `<div class="text-start"><div class="form-check mb-3 border-bottom pb-3"><input class="form-check-input" type="checkbox" id="chk-all-rutas" onchange="document.querySelectorAll('.chk-export-ruta').forEach(c => c.checked = this.checked)" checked><label class="form-check-label fw-bold text-primary" for="chk-all-rutas">Seleccionar Todo el Lote</label></div><div style="max-height: 250px; overflow-y: auto;" class="px-2">`; this.rutas.forEach(r => { html += `<div class="form-check mb-2 bg-light p-2 rounded border border-light"><input class="form-check-input ms-1 chk-export-ruta" type="checkbox" value="${r.id_ruta}" id="chk-exp-${r.id_ruta}" checked><label class="form-check-label ms-2 w-100" for="chk-exp-${r.id_ruta}" style="cursor:pointer;"><i class="bi bi-bus-front me-2 text-muted"></i>${r.nombre_ruta}</label></div>`; }); html += `</div></div>`; Swal.fire({ title: 'Descargar Rutogramas', html: html, showCancelButton: true, confirmButtonText: '<i class="bi bi-file-earmark-pdf-fill me-1"></i> Generar Documento', confirmButtonColor: '#dc3545', preConfirm: () => { let seleccionados = []; document.querySelectorAll('.chk-export-ruta:checked').forEach(c => seleccionados.push(c.value)); if(seleccionados.length === 0) { Swal.showValidationMessage('Seleccione al menos una ruta'); return false; } return seleccionados; } }).then(res => { if(res.isConfirmed) { this.exportarMultiplesRutogramas(res.value); } }); },
    
    exportarMultiplesRutogramas: async function(idsArray) { Swal.fire({ title: 'Generando Documento...', text: 'Construyendo Rutogramas. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }}); try { let base64LogoEscuela = null; let base64CintilloMPPE = null; try { base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png'); } catch(e){} try { base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png'); } catch(e){} const jsPDF = window.jspdf.jsPDF; const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' }); const margin = 20; const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); for(let idx = 0; idx < idsArray.length; idx++) { let idRuta = idsArray[idx]; let ruta = this.rutas.find(r => r.id_ruta === idRuta); if(!ruta) continue; if(idx > 0) doc.addPage(); let docPerfil = this.docentes.find(d => String(d.cedula) === String(ruta.cedula_docente)); let nombreDoc = docPerfil ? docPerfil.nombre_completo || docPerfil.nombre : 'Sin asignar'; let telDoc = docPerfil ? docPerfil.telefono || 'N/A' : 'N/A'; 
        let rutaIds = []; try { rutaIds = typeof ruta.paradas_json === 'string' ? JSON.parse(ruta.paradas_json || "[]") : (ruta.paradas_json || []); } catch(e){} 
        let formatDisplayDate = (dStr) => { if(!dStr) return 'No definida'; let parts = String(dStr).substring(0,10).split('-'); if(parts.length===3) return `${parts[2]}/${parts[1]}/${parts[0]}`; return dStr; }; let fDesde = formatDisplayDate(ruta.validez_desde); let fHasta = formatDisplayDate(ruta.validez_hasta);
        let textX = margin; if (base64LogoEscuela) { doc.addImage(base64LogoEscuela, 'PNG', margin, margin, 16, 16); textX = margin + 20; } doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text("República Bolivariana de Venezuela", textX, margin + 5); doc.text("Ministerio del Poder Popular para la Educación", textX, margin + 10); doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", textX, margin + 15); doc.setTextColor(0, 102, 255); doc.setFontSize(14); doc.text("RUTOGRAMA DE TRANSPORTE ESCOLAR", pageWidth / 2, margin + 28, { align: "center" }); let anioEscolar = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026"; doc.setTextColor(100, 116, 139); doc.setFontSize(10); 
        doc.text(`Período Escolar: ${anioEscolar}`, pageWidth / 2, margin + 33, { align: "center" }); 
        doc.text(`Vigencia de la Ruta: Desde ${fDesde} Hasta ${fHasta}`, pageWidth / 2, margin + 38, { align: "center" }); 
        doc.setDrawColor(0, 102, 255); doc.setLineWidth(1.5); doc.line(margin, margin + 41, pageWidth - margin, margin + 41); 
        doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Ruta Identificada:`, margin, margin + 50); doc.setFont("helvetica", "normal"); doc.text(`${ruta.nombre_ruta}`, margin + 35, margin + 50); doc.setFont("helvetica", "bold"); doc.text(`Chofer Asignado:`, margin, margin + 57); doc.setFont("helvetica", "normal"); doc.text(`${ruta.chofer}`, margin + 35, margin + 57); doc.setFont("helvetica", "bold"); doc.text(`Docente Guía:`, margin, margin + 64); doc.setFont("helvetica", "normal"); doc.text(`${nombreDoc} (Tel: ${telDoc})`, margin + 30, margin + 64); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0); doc.text("Secuencia de Recorrido (Entrada a la Institución):", margin, margin + 80); doc.setFontSize(11); doc.setFont("helvetica", "normal"); let startY = margin + 90; rutaIds.forEach((id, indexParada) => { let p = this.paradas.find(x => x.id_parada === id); if(p) { if (startY > pageHeight - 30) { doc.addPage(); startY = margin; } doc.setDrawColor(0, 102, 255); doc.setFillColor(255, 255, 255); doc.circle(margin + 5, startY, 2, 'FD'); doc.text(`${indexParada + 1}. ${p.nombre_parada}`, margin + 10, startY + 1); doc.setFontSize(9); doc.setTextColor(100,100,100); doc.text(`Ref: ${p.referencia || 'N/A'}`, margin + 10, startY + 5); doc.setFontSize(11); doc.setTextColor(0,0,0); if (indexParada < rutaIds.length - 1) { doc.setDrawColor(200, 200, 200); doc.line(margin + 5, startY + 2, margin + 5, startY + 13); } startY += 15; } }); if (startY > pageHeight - 30) { doc.addPage(); startY = margin; } doc.setDrawColor(0, 230, 118); doc.setFillColor(0, 230, 118); doc.circle(margin + 5, startY, 2, 'FD'); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 150, 50); doc.text(`LLEGADA: U.E. Libertador Bolívar`, margin + 10, startY + 1); } const pgs = doc.internal.getNumberOfPages(); for(let i=1; i<=pgs; i++) { doc.setPage(i); doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.5); doc.line(margin, pageHeight - margin - 8, pageWidth - margin, pageHeight - margin - 8); if (base64CintilloMPPE) { doc.addImage(base64CintilloMPPE, 'PNG', margin, pageHeight - margin - 6, 35, 6); } doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont("helvetica", "normal"); const fechaHoy = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); doc.text(`Generado: ${fechaHoy}`, margin + 40, pageHeight - margin - 1.5); doc.text(`Página ${i} de ${pgs}`, pageWidth - margin, pageHeight - margin - 1.5, { align: "right" }); } let nombreArchivo = idsArray.length === 1 ? `Rutograma_${this.rutas.find(r => r.id_ruta === idsArray[0]).nombre_ruta.replace(/\s/g, '_')}` : `Lote_Rutogramas_${new Date().getTime()}`; doc.save(`${nombreArchivo}.pdf`); Swal.close(); window.Aplicacion.auditar('Transporte Escolar', 'Exportar Rutogramas', 'Se descargaron los rutogramas en PDF'); Swal.fire({toast:true, position:'top-end', icon:'success', title:'Documento Generado', showConfirmButton:false, timer:2000}); } catch(error) { console.error("Error al generar PDF Múltiple: ", error); Swal.close(); Swal.fire('Error', 'No se pudo generar el documento PDF.', 'error'); } },
    exportarRutograma: function(idRuta) { this.exportarMultiplesRutogramas([idRuta]); }
};

window.init_Transporte_Escolar = function() { window.ModTransporte.init(); };