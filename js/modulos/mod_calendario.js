/**
 * MÓDULO: CALENDARIOS DE GESTIÓN 
 * ACTUALIZADO: CONEXIÓN TOTAL CON LA MATRIZ RECURSIVA DE ROLES
 * ✨ INCLUYE AUDITORÍA ✨
 */
window.ModCalendario = {
    eventos: [], periodoActivo: "", editandoId: null, vistaActualOculta: null, filtroCalendario: null,
    paginaActual: 1, itemsPorPagina: 5, mesRender: new Date().getMonth(), anioRender: new Date().getFullYear(), modoVisual: 'grid',
    colectivosList: [], personalList: [], 

    init: function() { this.dibujarDashboardTarjetas(); this.cargarEventos(); },

    obtenerColorEvento: function(tipo) {
        if (!tipo) return { css: 'bg-secondary text-white', style: '', rgb: [108, 117, 125] };
        if (tipo.includes('Reunión')) return { css: 'bg-warning text-dark', style: '', rgb: [245, 158, 11] };
        if (tipo.includes('Cívico') || tipo.includes('Feriado')) return { css: 'bg-success text-white', style: '', rgb: [16, 185, 129] }; 
        if (tipo.includes('Evaluación') || tipo.includes('Notas')) return { css: 'bg-danger text-white', style: '', rgb: [225, 29, 72] }; 
        if (tipo.includes('Celebración') || tipo.includes('Fiesta')) return { css: 'text-white', style: 'background-color: #8b5cf6;', rgb: [139, 92, 246] }; 
        if (tipo.includes('Taller') || tipo.includes('Formación')) return { css: 'text-white', style: 'background-color: #06b6d4;', rgb: [6, 182, 212] }; 
        if (["Colectivo", "Coordinación", "Brigada", "Comité", "Docente Particular"].includes(tipo)) return { css: 'bg-dark text-white', style: '', rgb: [33, 37, 41] }; 
        return { css: 'bg-primary text-white', style: '', rgb: [37, 99, 235] }; 
    },

    // ✨ FUNCION HELPER PARA OBTENER EL NOMBRE DEL PERMISO ✨
    _getCardKey: function(tipo_calendario) {
        if(tipo_calendario === 'Administrativo') return 'Tarjeta: Calendario Administrativo';
        if(tipo_calendario === 'Pedagógico') return 'Tarjeta: Calendario Pedagógico';
        return 'Tarjeta: Calendario Oficial MPPE';
    },

    // ✨ RENDERIZADO CONDICIONAL DE TARJETAS BASADO EN ROLES ✨
    dibujarDashboardTarjetas: function() {
        const estilos = `<style>.tarjeta-sub { background: #ffffff; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; overflow: hidden; position: relative; display: flex; flex-direction: column; text-align: left; }.tarjeta-sub:hover { transform: translateY(-8px); box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important; }.tarjeta-sub .bg-icono-gigante { position: absolute; right: -20px; bottom: -20px; font-size: 8rem; opacity: 0.03; transition: transform 0.5s ease; pointer-events: none; }.tarjeta-sub:hover .bg-icono-gigante { transform: scale(1.2) rotate(-10deg); }.tarjeta-sub .icono-sub { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.2rem; transition: transform 0.3s ease; }.tarjeta-sub:hover .icono-sub { transform: scale(1.1); }.tarjeta-sub.bloqueado { filter: grayscale(100%); opacity: 0.7; cursor: not-allowed; }</style>`;
        
        let cAzul = { bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', b: '#bfdbfe', t: '#0066FF' };
        let cNara = { bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', b: '#fde68a', t: '#d97706' };
        let cVerd = { bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', b: '#bbf7d0', t: '#198754' };
        let cMora = { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', b: '#ddd6fe', t: '#6d28d9' };

        let crearTarjeta = (tit, desc, ico, acc, c, col) => {
            return `<div class="${col} animate__animated animate__fadeInUp"><div class="tarjeta-sub p-4 h-100 shadow-sm" style="background:${c.bg}; border:1px solid ${c.b};" onclick="${acc}"><i class="bi ${ico} text-dark bg-icono-gigante"></i><div class="icono-sub shadow-sm" style="color:${c.t}; background:white; border:1px solid ${c.b};"><i class="bi ${ico}"></i></div><h5 class="fw-bold text-dark mb-2" style="position:relative; z-index:2;">${tit}</h5><p class="small text-muted mb-0" style="position:relative; z-index:2;">${desc}</p><div class="mt-auto pt-3 d-flex align-items-center fw-bold" style="color:${c.t}; font-size:0.9rem; position:relative; z-index:2;">Entrar <i class="bi bi-arrow-right ms-2"></i></div></div></div>`;
        };

        let html = estilos;
        let mostradas = 0;

        // Se verifica individualmente cada tarjeta
        if (window.Aplicacion.permiso('Tarjeta: Calendario Oficial MPPE', 'ver')) {
            html += crearTarjeta('Calendario Oficial MPPE', 'Efemérides y actos cívicos.', 'bi-calendar2-heart', "window.ModCalendario.abrirVisorSeguro('Escolar')", cAzul, 'col-md-6 col-xl-3');
            mostradas++;
        }
        if (window.Aplicacion.permiso('Tarjeta: Calendario Administrativo', 'ver')) {
            html += crearTarjeta('Calendario Administrativo', 'Reuniones y gestión.', 'bi-briefcase', "window.ModCalendario.abrirVisorSeguro('Administrativo')", cNara, 'col-md-6 col-xl-3');
            mostradas++;
        }
        if (window.Aplicacion.permiso('Tarjeta: Calendario Pedagógico', 'ver')) {
            html += crearTarjeta('Calendario Pedagógico', 'Evaluaciones y entregas.', 'bi-journal-bookmark-fill', "window.ModCalendario.abrirVisorSeguro('Pedagógico')", cVerd, 'col-md-6 col-xl-3');
            mostradas++;
        }
        if (window.Aplicacion.permiso('Tarjeta: Planificador', 'ver')) {
            html += crearTarjeta('Planificador', 'Crear o editar actividades.', 'bi-calendar-plus-fill', "window.ModCalendario.abrirPlanificadorConFecha()", cMora, 'col-md-6 col-xl-3');
            mostradas++;
        }
        
        // Si no tiene permisos para ninguna tarjeta, muestra mensaje
        if (mostradas === 0) {
            html += `<div class="col-12 text-center py-5 mt-4 animate__animated animate__fadeIn"><div class="bg-light d-inline-block p-4 rounded-circle mb-3 border shadow-sm"><i class="bi bi-shield-lock-fill text-muted" style="font-size: 3rem;"></i></div><h4 class="fw-bold text-dark">Área Restringida</h4><p class="text-muted">No tiene permisos asignados para visualizar las tarjetas de este módulo.</p></div>`;
        }
        
        document.getElementById('calendario-dashboard').innerHTML = html;

        // Validación para el formulario interno del planificador
        let formArea = document.getElementById('form-planificador-area');
        if(formArea && !window.Aplicacion.permiso('Tarjeta: Planificador', 'crear')) { 
            formArea.innerHTML = `<div class="text-center py-5"><i class="bi bi-lock text-danger fs-1"></i><h5 class="mt-3 text-muted">No tiene permisos para programar eventos en el sistema.</h5></div>`; 
        }
    },

    cambiarVista: function(vistaDestino) {
        const vistas = ['calendario-dashboard', 'vista-visor'];
        vistas.forEach(v => { let el = document.getElementById(v); if(el) el.classList.add('d-none'); });
        let btnRetrocesoPadre = document.querySelector('.btn-white.shadow-sm.border.rounded-pill');
        if (vistaDestino === 'Dashboard') {
            document.getElementById('calendario-dashboard').classList.remove('d-none');
            document.getElementById('btn-volver-dashboard').classList.add('d-none');
            if(btnRetrocesoPadre) btnRetrocesoPadre.parentElement.style.display = 'block';
            this.vistaActualOculta = null; this.filtroCalendario = null; this.cancelarEdicion();
        } else {
            let panel = document.getElementById(`vista-${vistaDestino.toLowerCase()}`);
            if(panel) panel.classList.remove('d-none');
            document.getElementById('btn-volver-dashboard').classList.remove('d-none');
            if(btnRetrocesoPadre) btnRetrocesoPadre.parentElement.style.display = 'none';
            this.vistaActualOculta = vistaDestino;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    volverDashboard: function() { this.cambiarVista('Dashboard'); },

    // ✨ BLOQUEO SEGURO DE LA PANTALLA DEL CALENDARIO ✨
    abrirVisorSeguro: function(tipo) {
        let req = this._getCardKey(tipo);
        if(!window.Aplicacion.permiso(req, 'ver')) return Swal.fire('Acceso Denegado', 'No tienes permiso para ver este calendario.', 'error');
        
        this.filtroCalendario = tipo; this.paginaActual = 1; this.mesRender = new Date().getMonth(); this.anioRender = new Date().getFullYear();
        let tituloVisor = tipo === 'Escolar' ? 'Oficial MPPE' : tipo;
        document.getElementById('lbl-titulo-visor').innerHTML = `<i class="bi bi-calendar-week text-info me-2"></i> Calendario ${tituloVisor}`;
        this.procesarVistas(); this.cambiarVista('Visor'); 
    },

    toggleForm: function() {
        let tipo = document.getElementById('cal-tipo-calendario').value;
        let esAdmin = (tipo === 'Administrativo');
        
        let ocultarEnAdmin = ['contenedor-estandar-clasificacion', 'contenedor-estandar-desc'];
        let mostrarEnAdmin = ['contenedor-admin-cat', 'contenedor-admin-entidad', 'contenedor-admin-calculos', 'contenedor-admin-req-ped', 'contenedor-admin-req-log', 'contenedor-admin-obs'];
        
        ocultarEnAdmin.forEach(id => { let el = document.getElementById(id); if(el) esAdmin ? el.classList.add('d-none') : el.classList.remove('d-none'); });
        mostrarEnAdmin.forEach(id => { let el = document.getElementById(id); if(el) esAdmin ? el.classList.remove('d-none') : el.classList.add('d-none'); });
        
        if(esAdmin) this.calcularDias();
    },

    calcularDias: function() {
        let iniVal = document.getElementById('cal-inicio').value;
        let finVal = document.getElementById('cal-fin').value;
        let dAct = document.getElementById('cal-dias-act');
        let dAnt = document.getElementById('cal-dias-ant');
        
        if(!iniVal || !finVal) { if(dAct) dAct.innerText = "-"; if(dAnt) dAnt.innerText = "-"; return; }
        
        let dI = new Date(iniVal); let dF = new Date(finVal);
        let hoy = new Date(); hoy.setHours(0,0,0,0);
        
        let diffAct = dF - dI;
        let diasAct = Math.ceil(diffAct / (1000 * 60 * 60 * 24));
        if(diasAct <= 0) diasAct = 1; 
        
        let diffAnt = dI - hoy;
        let diasAnt = Math.floor(diffAnt / (1000 * 60 * 60 * 24));
        
        if(dAct) dAct.innerText = diasAct + (diasAct === 1 ? " día" : " días");
        if(dAnt) dAnt.innerText = diasAnt > 0 ? diasAnt + " días" : (diasAnt === 0 ? "Hoy" : "Ya pasó");
    },

    cambiarCategoriaAdmin: function() {
        let cat = document.getElementById('cal-admin-cat').value;
        let sel = document.getElementById('cal-admin-entidad');
        sel.innerHTML = '<option value="">Seleccione...</option>';
        
        if(!cat) return;
        
        if(cat === "Docente Particular") {
            this.personalList.forEach(p => {
                let n = p.nombre_completo || p.nombre;
                sel.innerHTML += `<option value="${n}">${n} (${p.rol || 'Docente'})</option>`;
            });
            if(this.personalList.length === 0) sel.innerHTML = '<option value="">Aún no hay personal registrado en el sistema.</option>';
        } else {
            let cols = this.colectivosList.filter(c => c.tipo === cat);
            cols.forEach(c => { sel.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`; });
            if(cols.length === 0) sel.innerHTML = '<option value="">No hay registros de esta categoría. Créelos en Organización Escolar.</option>';
        }
    },

    // ✨ BLOQUEO SEGURO DEL PLANIFICADOR ✨
    abrirPlanificadorConFecha: function(fechaStr = null) { 
        if(!window.Aplicacion.permiso('Tarjeta: Planificador', 'crear')) return Swal.fire('Acceso Denegado', 'No tienes permiso para registrar actividades.', 'warning');
        this.cancelarEdicion();
        
        if(this.filtroCalendario) { 
            let sC = document.getElementById('cal-tipo-calendario'); 
            if(sC) sC.value = this.filtroCalendario === 'Escolar' ? 'Escolar' : this.filtroCalendario; 
        }
        
        if(fechaStr && typeof fechaStr === 'string') { document.getElementById('cal-inicio').value = fechaStr + "T08:00"; document.getElementById('cal-fin').value = fechaStr + "T10:00"; }
        
        this.toggleForm(); 

        let modal = document.getElementById('vista-planificador');
        if(modal) {
            modal.classList.remove('d-none');
            modal.querySelector('.animate__animated').classList.remove('animate__zoomOut');
            modal.querySelector('.animate__animated').classList.add('animate__zoomIn');
        }
    },

    cerrarPlanificador: function() {
        let modal = document.getElementById('vista-planificador');
        if(!modal) return;
        modal.querySelector('.animate__animated').classList.replace('animate__zoomIn', 'animate__zoomOut');
        setTimeout(() => { modal.classList.add('d-none'); this.cancelarEdicion(); }, 300);
    },

    cargarEventos: async function(silencioso = false) { 
        if(!silencioso) window.Aplicacion.mostrarCarga(); 
        
        try {
            const { data: perData } = await window.supabaseDB.from('conf_periodos').select('valor, fecha_inicio, fecha_fin');
            let hoy = new Date().getTime();
            let pActivo = (perData || []).find(item => {
                if(item.fecha_inicio && item.fecha_fin) {
                    return hoy >= new Date(item.fecha_inicio+"T00:00:00").getTime() && hoy <= new Date(item.fecha_fin+"T23:59:59").getTime();
                }
                return false;
            });
            this.periodoActivo = pActivo ? pActivo.valor : "No definido";
            
            let lbl = document.getElementById('lbl-periodo-activo');
            if(lbl) lbl.innerText = this.periodoActivo;

            const { data: evData, error } = await window.supabaseDB.from('calendario_eventos').select('*');
            if (error) throw error;
            
            this.eventos = (evData || []).map(e => ({ ...e, desc: e.descripcion }));

            window.Aplicacion.peticion({ action: "get_colectivos_data" }, (resCol) => {
                if(!silencioso) window.Aplicacion.ocultarCarga(); 
                if(resCol && resCol.status === "success") {
                    this.colectivosList = resCol.colectivos || [];
                    this.personalList = resCol.personal || resCol.docentes || [];
                }
                if(this.vistaActualOculta === 'Visor') this.procesarVistas(); 
            });

        } catch (e) {
            if(!silencioso) window.Aplicacion.ocultarCarga(); 
            console.error(e);
            Swal.fire('Error', 'No se pudo conectar a la base de datos del Calendario.', 'error');
        }
    },

    cambiarVistaModo: function(modo) {
        this.modoVisual = modo; let btnGrid = document.getElementById('btn-vista-grid'); let btnLista = document.getElementById('btn-vista-lista'); let areaGrid = document.getElementById('area-vista-grid'); let areaLista = document.getElementById('area-vista-lista');
        if(modo === 'grid') { btnGrid.classList.replace('btn-light', 'btn-info'); btnGrid.classList.replace('text-muted', 'text-white'); btnLista.classList.replace('btn-info', 'btn-light'); btnLista.classList.replace('text-white', 'text-muted'); areaLista.classList.add('d-none'); areaGrid.classList.remove('d-none'); } 
        else { btnLista.classList.replace('btn-light', 'btn-info'); btnLista.classList.replace('text-muted', 'text-white'); btnGrid.classList.replace('btn-info', 'btn-light'); btnGrid.classList.replace('text-white', 'text-muted'); areaGrid.classList.add('d-none'); areaLista.classList.remove('d-none'); }
        this.procesarVistas();
    },

    procesarVistas: function() { this.dibujarLista(); this.dibujarGrid(); },
    cambiarMesGrid: function(offset) { this.mesRender += offset; if(this.mesRender > 11) { this.mesRender = 0; this.anioRender++; } else if(this.mesRender < 0) { this.mesRender = 11; this.anioRender--; } this.dibujarGrid(); },

    dibujarGrid: function() {
        const contenedor = document.getElementById('contenedor-cuadricula-calendario'); if(!contenedor) return;
        let meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('lbl-mes-anio-grid').innerText = `${meses[this.mesRender]} ${this.anioRender}`;
        let primerDiaMes = new Date(this.anioRender, this.mesRender, 1).getDay(); let diasEnMes = new Date(this.anioRender, this.mesRender + 1, 0).getDate(); let diasMesAnterior = new Date(this.anioRender, this.mesRender, 0).getDate();
        let html = `<div class="cal-grid shadow-sm">`; let diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; diasSemana.forEach(d => html += `<div class="cal-header-cell">${d}</div>`);
        let evFiltrados = this.eventos.filter(e => { if(this.filtroCalendario === 'Escolar') return (e.tipo_calendario === 'Escolar' || e.tipo_calendario === 'Institucional' || e.tipo_calendario === 'Efeméride'); return e.tipo_calendario === this.filtroCalendario; });
        let diaActualRender = 1; let hoy = new Date(); let esMesActualReal = (hoy.getMonth() === this.mesRender && hoy.getFullYear() === this.anioRender);

        for (let i = 0; i < 42; i++) {
            if (i < primerDiaMes) { html += `<div class="cal-cell dia-distinto"><span class="cal-dia-numero text-muted opacity-50">${diasMesAnterior - primerDiaMes + i + 1}</span></div>`; } 
            else if (diaActualRender <= diasEnMes) {
                let esHoy = (esMesActualReal && hoy.getDate() === diaActualRender) ? 'hoy' : ''; let fCelda = new Date(this.anioRender, this.mesRender, diaActualRender);
                let mesStr = String(this.mesRender + 1).padStart(2, '0'); let diaStr = String(diaActualRender).padStart(2, '0'); let fechaISO = `${this.anioRender}-${mesStr}-${diaStr}`;
                
                let htmlEventos = '';
                evFiltrados.forEach(e => {
                    let eIni = new Date(e.inicio); let eFin = new Date(e.fin); let cDay = new Date(fCelda.getFullYear(), fCelda.getMonth(), fCelda.getDate()).getTime(); let dIni = new Date(eIni.getFullYear(), eIni.getMonth(), eIni.getDate()).getTime(); let dFin = new Date(eFin.getFullYear(), eFin.getMonth(), eFin.getDate()).getTime();
                    if(cDay >= dIni && cDay <= dFin) {
                        let cData = this.obtenerColorEvento(e.tipo_evento);
                        let exSt = cData.style ? `style="${cData.style}"` : '';
                        htmlEventos += `<div class="cal-evento-chip ${cData.css}" ${exSt} onclick="event.stopPropagation(); window.ModCalendario.mostrarDetalleEvento('${e.id}')">${e.titulo}</div>`;
                    }
                });
                html += `<div class="cal-cell ${esHoy}" style="cursor:pointer;" title="Clic para registrar actividad" onclick="window.ModCalendario.abrirPlanificadorConFecha('${fechaISO}')"><span class="cal-dia-numero">${diaActualRender}</span>${htmlEventos}</div>`; diaActualRender++;
            } else { html += `<div class="cal-cell dia-distinto"><span class="cal-dia-numero text-muted opacity-50">${diaActualRender - diasEnMes}</span></div>`; diaActualRender++; }
        }
        html += `</div>`; contenedor.innerHTML = html;
    },

    // ✨ CONTROL DE EDICIÓN Y ELIMINACIÓN SEGÚN ROLES ✨
    mostrarDetalleEvento: function(id) {
        let e = this.eventos.find(x => x.id === id); if(!e) return;
        
        let cardKey = this._getCardKey(e.tipo_calendario);
        let pEditar = window.Aplicacion.permiso(cardKey, 'crear'); 
        let pEliminar = window.Aplicacion.permiso(cardKey, 'eliminar');

        let fIniStr = new Date(e.inicio).toLocaleString('es-VE', {dateStyle:'long', timeStyle:'short'}); let fFinStr = new Date(e.fin).toLocaleString('es-VE', {dateStyle:'long', timeStyle:'short'});
        
        let cData = this.obtenerColorEvento(e.tipo_evento);
        let exSt = cData.style ? `style="${cData.style}"` : '';

        let badgeHtml = '';
        let infoHtml = '';
        
        if(e.tipo_calendario === 'Administrativo') {
            badgeHtml = `<span class="badge ${cData.css} me-2 shadow-sm" ${exSt}><i class="bi bi-diagram-3 me-1"></i>${e.tipo_evento}: ${e.docentes}</span>`;
            infoHtml += e.objetivo ? `<div class="mt-3"><h6 class="fw-bold text-success mb-1"><i class="bi bi-book me-1"></i>Req. Pedagógicos</h6><p class="small text-muted mb-2">${e.objetivo}</p></div>` : '';
            infoHtml += e.requerimientos ? `<div class="mt-2"><h6 class="fw-bold text-danger mb-1"><i class="bi bi-box me-1"></i>Req. Logísticos Admin.</h6><p class="small text-muted mb-2">${e.requerimientos}</p></div>` : '';
            infoHtml += e.observacion ? `<div class="mt-2"><h6 class="fw-bold text-muted mb-1"><i class="bi bi-chat-text me-1"></i>Observaciones</h6><p class="small text-muted mb-2">${e.observacion}</p></div>` : '';
            infoHtml += e.desc ? `<hr><div class="small text-muted text-center fw-bold bg-light p-2 rounded">${e.desc}</div>` : '';
        } else {
            badgeHtml = `<span class="badge ${cData.css} me-2 shadow-sm" ${exSt}>${e.tipo_evento}</span>`;
            infoHtml += e.desc ? `<p class="text-muted"><i class="bi bi-card-text me-2"></i>${e.desc}</p>` : '';
        }

        Swal.fire({ 
            title: `<span class="text-primary fs-3">${e.titulo}</span>`, 
            html: `<div class="text-start mt-3">
                    <p class="mb-2">${badgeHtml} <span class="badge bg-light text-dark border"><i class="bi bi-folder2 me-1"></i>${e.tipo_calendario}</span></p>
                    <div class="bg-light p-3 rounded-3 border mb-3"><div class="small fw-bold text-muted mb-1"><i class="bi bi-clock text-info me-1"></i> Inicio:</div> <div class="mb-2 text-dark">${fIniStr}</div><div class="small fw-bold text-muted mb-1"><i class="bi bi-clock-history text-danger me-1"></i> Fin:</div> <div class="text-dark">${fFinStr}</div></div>
                    ${infoHtml}
                  </div>`, 
            showCloseButton: true, showCancelButton: pEliminar, showConfirmButton: pEditar, 
            confirmButtonText: '<i class="bi bi-pencil me-1"></i> Editar', cancelButtonText: '<i class="bi bi-trash me-1"></i> Borrar', 
            confirmButtonColor: '#0066FF', cancelButtonColor: '#dc3545' 
        }).then((result) => { if (result.isConfirmed) { this.editarEvento(e.id); } else if (result.dismiss === Swal.DismissReason.cancel) { this.eliminarEvento(e.id); } });
    },

    dibujarLista: function() { 
        const tbody = document.getElementById('tabla-eventos'); const paginador = document.getElementById('paginacion-eventos'); if(!tbody) return;
        
        let evs = this.eventos.filter(e => { if(this.filtroCalendario === 'Escolar') return (e.tipo_calendario === 'Escolar' || e.tipo_calendario === 'Institucional' || e.tipo_calendario === 'Efeméride'); return e.tipo_calendario === this.filtroCalendario; });
        evs.sort((a,b) => new Date(a.inicio) - new Date(b.inicio));
        
        let tot = evs.length; let tPag = Math.ceil(tot / this.itemsPorPagina); if(tPag===0) tPag=1; if(this.paginaActual>tPag) this.paginaActual=tPag;
        let ini = (this.paginaActual - 1) * this.itemsPorPagina; let fin = ini + this.itemsPorPagina; let ePag = evs.slice(ini, fin);
        
        let h = '';
        ePag.forEach(e => {
            let cardKey = this._getCardKey(e.tipo_calendario);
            let pE = window.Aplicacion.permiso(cardKey, 'crear'); 
            let pL = window.Aplicacion.permiso(cardKey, 'eliminar');

            let dI = new Date(e.inicio); let dF = new Date(e.fin); let fI = dI.toLocaleDateString('es-VE', {day:'2-digit', month:'short', year:'numeric'}); let fF = dF.toLocaleDateString('es-VE', {day:'2-digit', month:'short', year:'numeric'}); let hI = dI.toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'});
            let bE = pE ? `<button class="btn btn-sm btn-light border text-primary me-1 shadow-sm" onclick="window.ModCalendario.editarEvento('${e.id}')"><i class="bi bi-pencil"></i></button>` : ''; 
            let bL = pL ? `<button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="window.ModCalendario.eliminarEvento('${e.id}')"><i class="bi bi-trash"></i></button>` : '';
            
            let cData = this.obtenerColorEvento(e.tipo_evento);
            let exSt = cData.style ? `style="${cData.style}"` : '';

            h += `<tr><td class="ps-3 align-middle"><span class="badge ${cData.css} mb-1 shadow-sm px-2 py-1" ${exSt}>${e.tipo_evento}</span></td><td class="align-middle"><div class="fw-bold text-dark"><i class="bi bi-calendar-event me-1 text-muted"></i> ${fI}</div>${fI !== fF ? `<div class="small text-muted"><i class="bi bi-arrow-return-right mx-1"></i> al ${fF}</div>` : `<div class="small text-muted"><i class="bi bi-clock me-1"></i> ${hI}</div>`}</td><td class="align-middle"><div class="fw-bold text-dark fs-6" style="cursor:pointer;" onclick="window.ModCalendario.mostrarDetalleEvento('${e.id}')">${e.titulo}</div>${e.desc ? `<div class="small text-muted text-truncate" style="max-width: 300px;">${e.desc}</div>` : ''}</td><td class="text-end pe-3 align-middle">${bE}${bL}</td></tr>`;
        });
        
        tbody.innerHTML = h || `<tr><td colspan="4" class="text-center py-5"><i class="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i><span class="text-muted fw-bold">Vacío.</span></td></tr>`;
        if(paginador) { if(tot > 0) { let cIn = this.filtroCalendario === 'Escolar' ? 'primary' : (this.filtroCalendario === 'Administrativo' ? 'warning text-dark' : 'success'); let cB = this.filtroCalendario === 'Administrativo' ? 'warning' : (this.filtroCalendario === 'Pedagógico' ? 'success' : 'primary'); paginador.innerHTML = `<div class="small text-muted fw-bold mb-2 mb-md-0"><i class="bi bi-card-list me-1"></i> Mostrando ${ini + 1} al ${Math.min(fin, tot)} de ${tot} actividades</div><div class="d-flex gap-2 align-items-center justify-content-center"><button class="btn btn-sm btn-outline-${cB} fw-bold" ${this.paginaActual===1?'disabled':''} onclick="window.ModCalendario.cambiarPagina(${this.paginaActual-1})"><i class="bi bi-chevron-left me-1"></i> Anterior</button><span class="badge bg-${cIn} rounded-pill px-3 py-2 shadow-sm">Pág. ${this.paginaActual} de ${tPag}</span><button class="btn btn-sm btn-outline-${cB} fw-bold" ${this.paginaActual===tPag?'disabled':''} onclick="window.ModCalendario.cambiarPagina(${this.paginaActual+1})">Siguiente <i class="bi bi-chevron-right ms-1"></i></button></div>`; paginador.classList.remove('d-none'); } else { paginador.innerHTML = ''; paginador.classList.add('d-none'); } }
    },

    guardarEvento: async function() { 
        let tC = document.getElementById('cal-tipo-calendario').value; 
        let tit = document.getElementById('cal-titulo').value.trim(); 
        let ini = document.getElementById('cal-inicio').value; 
        let fin = document.getElementById('cal-fin').value; 
        
        if(!tit || !ini || !fin) return Swal.fire('Aviso', 'Faltan datos obligatorios', 'warning'); 
        if(new Date(fin)<new Date(ini)) return Swal.fire('Error', 'Fechas inválidas', 'error'); 
        
        let tE, desc, obj, doc, req, obs;
        
        if(tC === 'Administrativo') {
            tE = document.getElementById('cal-admin-cat').value; 
            doc = document.getElementById('cal-admin-entidad').value; 
            obj = document.getElementById('cal-admin-req-ped').value; 
            req = document.getElementById('cal-admin-req-log').value; 
            obs = document.getElementById('cal-admin-obs').value; 
            
            let dAct = document.getElementById('cal-dias-act').innerText;
            let dAnt = document.getElementById('cal-dias-ant').innerText;
            desc = `Duración de Actividad: ${dAct} | Antelación Solicitada: ${dAnt}`;
            
            if(!tE || !doc) return Swal.fire('Aviso', 'Debe seleccionar quién programa o coordina.', 'warning');
        } else {
            tE = document.getElementById('cal-tipo-evento').value;
            desc = document.getElementById('cal-desc').value;
            obj = ""; doc = ""; req = ""; obs = "";
        }
        
        window.Aplicacion.mostrarCarga(); 
        
        try {
            const payload = { 
                periodo: this.periodoActivo, 
                tipo_calendario: tC, 
                tipo_evento: tE, 
                titulo: tit, 
                inicio: ini, 
                fin: fin, 
                descripcion: desc,
                objetivo: obj, 
                docentes: doc, 
                requerimientos: req, 
                observacion: obs
            }; 
            
            let errorGuardado;
            let accionAuditoria = this.editandoId ? 'Editar Actividad' : 'Nueva Actividad'; 

            if(this.editandoId) { 
                const { error } = await window.supabaseDB.from('calendario_eventos').update(payload).eq('id', this.editandoId);
                errorGuardado = error;
            } else {
                payload.id = 'CAL-' + new Date().getTime();
                const { error } = await window.supabaseDB.from('calendario_eventos').insert([payload]);
                errorGuardado = error;
            }

            if(errorGuardado) throw errorGuardado;

            window.Aplicacion.ocultarCarga(); 
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Actividad registrada', timer:2000, showConfirmButton:false}); 
            
            window.Aplicacion.auditar('Calendario Escolar', accionAuditoria, `Se guardó la actividad: ${tit} (${tC})`);

            this.cerrarPlanificador(); 
            this.cargarEventos(true); 

        } catch (e) {
            window.Aplicacion.ocultarCarga(); 
            Swal.fire('Error', 'Falla al guardar en la base de datos Supabase.', 'error');
        }
    },
    
    eliminarEvento: function(id) { 
        Swal.fire({title:'¿Borrar?', icon:'warning', showCancelButton:true, confirmButtonColor:'#dc3545', confirmButtonText:'Borrar'}).then(async r => { 
            if(r.isConfirmed) { 
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('calendario_eventos').delete().eq('id', id);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    
                    window.Aplicacion.auditar('Calendario Escolar', 'Eliminar Actividad', `Se eliminó la actividad con ID: ${id}`);
                    
                    this.cargarEventos(true);
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al eliminar el evento.', 'error');
                }
            }
        }); 
    },
    
    editarEvento: function(id) { 
        let e = this.eventos.find(x => x.id === id); if(!e) return;
        this.editandoId = id; 
        
        let tC = (e.tipo_calendario === 'Institucional' || e.tipo_calendario === 'Efeméride') ? 'Escolar' : e.tipo_calendario;
        document.getElementById('cal-tipo-calendario').value = tC;
        this.toggleForm(); 
        
        document.getElementById('cal-titulo').value = e.titulo; 
        document.getElementById('cal-inicio').value = e.inicio.slice(0,16); 
        document.getElementById('cal-fin').value = e.fin.slice(0,16); 
        this.calcularDias();
        
        if(tC === 'Administrativo') {
            document.getElementById('cal-admin-cat').value = e.tipo_evento;
            this.cambiarCategoriaAdmin();
            document.getElementById('cal-admin-entidad').value = e.docentes; 
            document.getElementById('cal-admin-req-ped').value = e.objetivo;
            document.getElementById('cal-admin-req-log').value = e.requerimientos;
            document.getElementById('cal-admin-obs').value = e.observacion;
        } else {
            document.getElementById('cal-tipo-evento').value = e.tipo_evento; 
            document.getElementById('cal-desc').value = e.desc; 
        }
        
        document.getElementById('btn-guardar-evento').innerHTML = '<i class="bi bi-save-fill me-2"></i>Actualizar Actividad'; 
        let modal = document.getElementById('vista-planificador'); 
        if(modal) { 
            modal.classList.remove('d-none'); 
            modal.querySelector('.animate__animated').classList.remove('animate__zoomOut'); 
            modal.querySelector('.animate__animated').classList.add('animate__zoomIn'); 
        } 
    },
    
    cancelarEdicion: function() { 
        this.editandoId=null; 
        document.getElementById('cal-titulo').value=''; 
        document.getElementById('cal-inicio').value=''; 
        document.getElementById('cal-fin').value=''; 
        document.getElementById('cal-desc').value=''; 
        document.getElementById('btn-guardar-evento').innerHTML='<i class="bi bi-box-arrow-down me-2"></i>Guardar en el Calendario'; 
        
        let cCat = document.getElementById('cal-admin-cat'); if(cCat) cCat.value = '';
        let cEnt = document.getElementById('cal-admin-entidad'); if(cEnt) cEnt.innerHTML = '<option value="">Seleccione primero la categoría...</option>';
        let cRp = document.getElementById('cal-admin-req-ped'); if(cRp) cRp.value = '';
        let cRl = document.getElementById('cal-admin-req-log'); if(cRl) cRl.value = '';
        let cOb = document.getElementById('cal-admin-obs'); if(cOb) cOb.value = '';
        let cDa = document.getElementById('cal-dias-act'); if(cDa) cDa.innerText = '-';
        let cDan = document.getElementById('cal-dias-ant'); if(cDan) cDan.innerText = '-';
    },

    cargaMasiva: function() { /* ...Código de importador... */ },
    imprimirPDF: function() { Swal.fire({ title: 'Formato PDF', icon: 'question', showDenyButton: true, showCancelButton: true, confirmButtonText: '<i class="bi bi-grid-3x3 me-1"></i> Cuadrícula', denyButtonText: '<i class="bi bi-list-ul me-1"></i> Lista', cancelButtonText: 'Cancelar', confirmButtonColor: '#0066FF', denyButtonColor: '#475569' }).then((result) => { if (result.isConfirmed) { this.generarPDFOficial('grid'); } else if (result.isDenied) { this.generarPDFOficial('lista'); } }); },
    obtenerImagenBase64: function(url) { return new Promise((r) => { let img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { let canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; let ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); r(canvas.toDataURL('image/png')); }; img.onerror = () => r(null); img.src = url; }); },
    
    generarPDFOficial: async function(formatoExportacion) {
        let evs = this.eventos.filter(e => { if(this.filtroCalendario === 'Escolar') return (e.tipo_calendario === 'Escolar' || e.tipo_calendario === 'Institucional' || e.tipo_calendario === 'Efeméride'); return e.tipo_calendario === this.filtroCalendario; });
        if(evs.length === 0) return Swal.fire('Atención', 'No hay eventos para exportar.', 'warning'); 
        evs.sort((a,b) => new Date(a.inicio) - new Date(b.inicio));
        window.Aplicacion.mostrarCarga();
        
        try {
            const bEsc = await this.obtenerImagenBase64('assets/img/logo.png'); const bMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');
            const { jsPDF } = window.jspdf; const orientacionDoc = formatoExportacion === 'grid' ? 'landscape' : 'portrait'; const doc = new jsPDF({ orientation: orientacionDoc, unit: 'mm', format: 'letter' }); 
            const m = 15; const pW = doc.internal.pageSize.getWidth(); const pH = doc.internal.pageSize.getHeight();
            let mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']; let eventosPorMes = [];
            
            evs.forEach(e => { let dIni = new Date(e.inicio); let mesKey = dIni.getFullYear() + '-' + dIni.getMonth(); let g = eventosPorMes.find(x => x.key === mesKey); if(!g) { g = { key: mesKey, anio: dIni.getFullYear(), mesNum: dIni.getMonth(), nombre: mesesNombres[dIni.getMonth()] + ' ' + dIni.getFullYear(), eventos: [] }; eventosPorMes.push(g); } g.eventos.push(e); });
            let cT = this.filtroCalendario === 'Administrativo' ? [217,119,6] : (this.filtroCalendario === 'Pedagógico' ? [22,163,74] : [0,102,255]);

            eventosPorMes.forEach((grupo, index) => {
                if (index > 0) doc.addPage();
                let sY = m + 40; 
                const dibujarCabecera = () => { let tX = m; if (bEsc) { doc.addImage(bEsc, 'PNG', m, m, 16, 16); tX = m + 20; } doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text("República Bolivariana de Venezuela\nMinisterio del Poder Popular para la Educación", tX, m + 5); doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", tX, m + 15); doc.setTextColor(cT[0], cT[1], cT[2]); doc.setFontSize(16); let tituloPDF = this.filtroCalendario === 'Escolar' ? 'OFICIAL MPPE' : this.filtroCalendario.toUpperCase(); doc.text(`CALENDARIO ${tituloPDF}`, pW/2, m+23, {align:"center"}); doc.setTextColor(100,116,139); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Mes de Planificación: ${grupo.nombre.toUpperCase()}`, pW/2, m+29, {align:"center"}); doc.setDrawColor(cT[0], cT[1], cT[2]); doc.setLineWidth(1.5); doc.line(m, m+33, pW-m, m+33); };
                dibujarCabecera();

                if (formatoExportacion === 'lista') {
                    grupo.eventos.forEach((e) => { if (sY > pH - 30) { doc.addPage(); dibujarCabecera(); sY = m + 40; } let dI = new Date(e.inicio); let dF = new Date(e.fin); let fS = dI.toLocaleDateString('es-VE', {day:'2-digit', month:'short'}); let esM = (dI.getFullYear()===dF.getFullYear() && dI.getMonth()===dF.getMonth() && dI.getDate()===dF.getDate()); if(!esM) fS += ` al ${dF.toLocaleDateString('es-VE', {day:'2-digit', month:'short'})}`; let bW = esM ? 24 : 42; doc.setDrawColor(cT[0], cT[1], cT[2]); doc.setFillColor(248,250,252); doc.roundedRect(m, sY-4, bW, 10, 2, 2, 'FD'); doc.setTextColor(30,41,59); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(fS, m+(bW/2), sY+2.5, {align:'center'}); let ofX = m+bW+6; doc.setTextColor(15,23,42); doc.setFontSize(11); doc.text(e.titulo, ofX, sY+1); doc.setTextColor(cT[0], cT[1], cT[2]); doc.setFontSize(8); doc.text(`[${e.tipo_evento}]`, ofX, sY+5); if(e.desc) { doc.setTextColor(100,116,139); doc.setFont("helvetica", "normal"); doc.setFontSize(9); let sD = doc.splitTextToSize(e.desc, pW-ofX-15); doc.text(sD, ofX, sY+10); sY += (sD.length * 4); } sY += 12; });
                } else {
                    const startX = m; const startY = m + 38; const cellW = (pW - (2 * m)) / 7; const cellH = (pH - startY - 28) / 6; doc.setFillColor(241, 245, 249); doc.rect(startX, startY, pW - (2*m), 8, 'F'); doc.setTextColor(71, 85, 105); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); let diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; diasSemana.forEach((d, i) => { doc.text(d, startX + (i * cellW) + (cellW/2), startY + 5.5, {align:'center'}); }); let currentY = startY + 8; let primerDiaMes = new Date(grupo.anio, grupo.mesNum, 1).getDay(); let diasEnMes = new Date(grupo.anio, grupo.mesNum + 1, 0).getDate(); let dayCount = 1; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
                    for (let row = 0; row < 6; row++) { for (let col = 0; col < 7; col++) { let cellX = startX + (col * cellW); let cellY = currentY + (row * cellH); doc.rect(cellX, cellY, cellW, cellH, 'S'); if ((row === 0 && col < primerDiaMes) || dayCount > diasEnMes) continue; doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(dayCount.toString(), cellX + 2, cellY + 4); let evsDay = grupo.eventos.filter(e => { let cd = new Date(grupo.anio, grupo.mesNum, dayCount).getTime(); let eI = new Date(e.inicio); let eF = new Date(e.fin); let dI = new Date(eI.getFullYear(), eI.getMonth(), eI.getDate()).getTime(); let dF = new Date(eF.getFullYear(), eF.getMonth(), eF.getDate()).getTime(); return (cd >= dI && cd <= dF); }); let evY = cellY + 8; evsDay.slice(0, 4).forEach(e => { let titCorto = e.titulo.length > 20 ? e.titulo.substring(0, 18) + '...' : e.titulo; 
                    let rgb = this.obtenerColorEvento(e.tipo_evento).rgb; doc.setFillColor(rgb[0], rgb[1], rgb[2]); 
                    doc.rect(cellX + 2, evY - 2, 2, 2.5, 'F'); doc.setFontSize(6.5); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.text(titCorto, cellX + 5, evY); evY += 3.5; }); if (evsDay.length > 4) { doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('+', cellX + cellW - 3, cellY + cellH - 2); } dayCount++; } }
                }
            });
            const pgs = doc.internal.getNumberOfPages();
            for(let i=1; i<=pgs; i++) { doc.setPage(i); doc.setDrawColor(220,38,38); doc.setLineWidth(0.5); doc.line(m, pH-m-8, pW-m, pH-m-8); if (bMPPE) doc.addImage(bMPPE, 'PNG', m, pH-m-6, 35, 6); doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text(`Generado: ${new Date().toLocaleDateString('es-VE')}`, m+40, pH-m-1.5); doc.text(`Página ${i} de ${pgs}`, pW-m, pH-m-1.5, {align:"right"}); }
            doc.save(`Calendario_${this.filtroCalendario}_${this.periodoActivo.replace(/\s/g,'')}.pdf`); window.Aplicacion.ocultarCarga();
            
            window.Aplicacion.auditar('Calendario Escolar', 'Exportar Calendario PDF', `Se exportó el calendario ${this.filtroCalendario} en formato ${formatoExportacion}`);

        } catch(error) { console.error(error); window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'Fallo al exportar el cronograma.', 'error'); }
    }
};

window.init_Calendario_Escolar = function() { window.ModCalendario.init(); };