/**
 * MÓDULO: EXPEDIENTE DOCENTE (VISTA DEL TRABAJADOR)
 * ✨ Wizard 7 Pasos con Auto-Guardado Silencioso Inteligente y Recuperación de Sesión ✨
 * Bloqueos de Solo Lectura aplicados en historial laboral.
 */

window.ModExpedienteDocente = {
    pasoActual: 1, totalPasos: 7,
    tituloCount: 0, cursoCount: 0, familiarCount: 0,
    posicionCount: 0, experienciaCount: 0, formacionCount: 0,
    expedienteId: null, 
    diccionarioVzla: {}, catalogoFormaciones: {},
    htmlOpcionesOrg: '<option value="">Cargando...</option>', htmlOpcionesNeg: '<option value="">Cargando...</option>',
    timeoutDireccion: null,
    intervaloAutoguardado: null,

    init: function() {
        if (!window.Aplicacion.usuario) { Swal.fire('Error', 'Debe iniciar sesión.', 'error'); return; }

        this.pasoActual = 1; this.tituloCount = 0; this.cursoCount = 0;
        this.familiarCount = 0; this.posicionCount = 0; this.experienciaCount = 0; this.formacionCount = 0;
        
        let formContenedor = document.getElementById('fase-formulario');
        if(formContenedor) formContenedor.style.display = 'flex';

        this.aplicarEventosAutomaticos();
        this.cargarDependenciasYMisDatos();

        // ⏰ ENCENDER AUTOGUARDADO (Cada 30 Segundos)
        if(this.intervaloAutoguardado) clearInterval(this.intervaloAutoguardado);
        this.intervaloAutoguardado = setInterval(() => {
            if(document.getElementById('fase-formulario').style.display !== 'none') {
                this.autoGuardarSilencioso();
            }
        }, 30000); 
    },

    cargarDependenciasYMisDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [resVzla, resEmpresa, resForm] = await Promise.all([ 
                window.supabaseDB.from('div_pol_vzla').select('*'), 
                window.supabaseDB.from('diccionarios_empresa').select('*'),
                window.supabaseDB.from('catalogo_formaciones').select('*')
            ]);
            
            this.diccionarioVzla = {};
            if (resVzla.data) {
                resVzla.data.forEach(fila => {
                    let e = String(fila.estado).trim(); let m = String(fila.municipio).trim(); let p = String(fila.parroquia).trim();
                    if(e && m && p) {
                        if(!this.diccionarioVzla[e]) this.diccionarioVzla[e] = {};
                        if(!this.diccionarioVzla[e][m]) this.diccionarioVzla[e][m] = [];
                        if(!this.diccionarioVzla[e][m].includes(p)) this.diccionarioVzla[e][m].push(p);
                    }
                });
            }
            this.cargarMunicipiosUI(); this.cargarMunicipiosElectoralUI();

            if (resEmpresa.data) {
                let orgs = resEmpresa.data.filter(d => d.categoria === 'Organización/Gerencia').map(d => d.valor);
                let negs = resEmpresa.data.filter(d => d.categoria === 'Negocio/Filial').map(d => d.valor);
                this.htmlOpcionesOrg = '<option value="">Seleccione...</option>' + orgs.map(o => `<option value="${o}">${o}</option>`).join('');
                this.htmlOpcionesNeg = '<option value="">Seleccione...</option>' + negs.map(n => `<option value="${n}">${n}</option>`).join('');
            }

            this.catalogoFormaciones = {};
            if (resForm.data) {
                resForm.data.forEach(f => {
                    let cat = f.categoria;
                    if (!this.catalogoFormaciones[cat]) this.catalogoFormaciones[cat] = [];
                    let duracionTxt = f.duracion ? ` | Duración: ${f.duracion}` : ''; let nivelTxt = f.nivel ? ` | Nivel Base: ${f.nivel}` : '';
                    this.catalogoFormaciones[cat].push({ titulo: f.titulo, desc: `${f.descripcion}${duracionTxt}${nivelTxt}` });
                });
            }

            let usr = window.Aplicacion.usuario;
            document.getElementById('doc-cedula').value = usr.cedula;
            document.getElementById('doc-nombres-apellidos').value = `${usr.nombres || usr.nombre || ''} ${usr.apellidos || usr.apellido || ''}`.trim();
            
            await this.cargarExpediente(usr.cedula);
            window.Aplicacion.ocultarCarga();
        } catch(e) { window.Aplicacion.ocultarCarga(); console.error(e); }
    },

    cargarMunicipiosUI: function() {
        let selMuni = document.getElementById('doc-municipio'); let selParr = document.getElementById('doc-parroquia');
        if(!selMuni) return; let html = '<option value="">Seleccione Municipio...</option>';
        if (this.diccionarioVzla['Monagas']) { Object.keys(this.diccionarioVzla['Monagas']).sort().forEach(muni => { html += `<option value="${muni}">${muni}</option>`; }); }
        selMuni.innerHTML = html; if(selParr) { selParr.disabled = true; selParr.innerHTML = '<option value="">Municipio primero...</option>'; }
    },
    cargarParroquiasUI: function() {
        let muni = document.getElementById('doc-municipio').value; let selParr = document.getElementById('doc-parroquia');
        if(!selParr) return; if(!muni) { selParr.disabled = true; selParr.innerHTML = '<option value="">Municipio primero...</option>'; return; }
        let html = '<option value="">Seleccione Parroquia...</option>';
        if (this.diccionarioVzla['Monagas'] && this.diccionarioVzla['Monagas'][muni]) { this.diccionarioVzla['Monagas'][muni].sort().forEach(parr => { html += `<option value="${parr}">${parr}</option>`; }); }
        selParr.innerHTML = html; selParr.disabled = false;
    },
    cargarMunicipiosElectoralUI: function() {
        let selMuni = document.getElementById('doc-electoral-municipio'); let selParr = document.getElementById('doc-electoral-parroquia');
        if(!selMuni) return; let html = '<option value="">Seleccione Municipio...</option>';
        if (this.diccionarioVzla['Monagas']) { Object.keys(this.diccionarioVzla['Monagas']).sort().forEach(muni => { html += `<option value="${muni}">${muni}</option>`; }); }
        selMuni.innerHTML = html; if(selParr) { selParr.disabled = true; selParr.innerHTML = '<option value="">Municipio primero...</option>'; }
    },
    cargarParroquiasElectoralUI: function() {
        let muni = document.getElementById('doc-electoral-municipio').value; let selParr = document.getElementById('doc-electoral-parroquia');
        if(!selParr) return; if(!muni) { selParr.disabled = true; selParr.innerHTML = '<option value="">Municipio primero...</option>'; return; }
        let html = '<option value="">Seleccione Parroquia...</option>';
        if (this.diccionarioVzla['Monagas'] && this.diccionarioVzla['Monagas'][muni]) { this.diccionarioVzla['Monagas'][muni].sort().forEach(parr => { html += `<option value="${parr}">${parr}</option>`; }); }
        selParr.innerHTML = html; selParr.disabled = false;
    },
    buscarDireccionWeb: function(query) {
        let lista = document.getElementById('lista-dir-doc');
        if (!query || query.length < 4) { lista.classList.add('d-none'); return; }
        lista.innerHTML = '<li class="list-group-item text-center text-muted small"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Buscando...</li>';
        lista.classList.remove('d-none'); clearTimeout(this.timeoutDireccion);
        this.timeoutDireccion = setTimeout(async () => {
            try {
                let r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query+', Monagas, Venezuela')}&limit=5`);
                let d = await r.json();
                if (d.features && d.features.length > 0) {
                    let html = '';
                    d.features.forEach(f => {
                        let p = f.properties; let nL = p.name ? `<b>${p.name}</b>, ` : ''; let c = p.street ? `${p.street}, ` : ''; let ci = p.city || p.town || p.village || p.county || '';
                        let t = `${nL}${c}${ci}`.replace(/,\s*$/, ''); let tP = `${p.name ? p.name+', ' : ''}${c}${ci}`.replace(/,\s*$/, '');
                        html += `<li class="list-group-item list-group-item-action hover-efecto" style="cursor:pointer; font-size: 0.9rem;" onclick="window.ModExpedienteDocente.seleccionarDireccionWeb('${tP}')"><i class="bi bi-geo-alt-fill text-danger me-2"></i>${t}</li>`;
                    });
                    lista.innerHTML = html;
                } else { lista.innerHTML = '<li class="list-group-item text-center text-muted small">Escriba manualmente.</li>'; setTimeout(() => lista.classList.add('d-none'), 3000); }
            } catch(e) { lista.classList.add('d-none'); }
        }, 600); 
    },
    seleccionarDireccionWeb: function(direccion) {
        let i = document.getElementById('doc-direccion'); i.value = direccion; this.formatearTexto(i);
        document.getElementById('lista-dir-doc').classList.add('d-none');
    },
    aplicarEventosAutomaticos: function() {
        let iI = document.getElementById('doc-fecha-ingreso');
        if (iI) { iI.addEventListener('change', function() {
            if (this.value) { let h = new Date(); let f = new Date(this.value); let a = h.getFullYear() - f.getFullYear(); let m = h.getMonth() - f.getMonth(); if (m < 0 || (m === 0 && h.getDate() < f.getDate())) { a--; } document.getElementById('doc-anios-servicio').value = a >= 0 ? a + (a === 1 ? ' Año' : ' Años') : '0 Años'; }
        });}
        let iN = document.getElementById('doc-fecha-nac');
        if (iN) { iN.addEventListener('change', function() {
            if (this.value) { let h = new Date(); let f = new Date(this.value); let e = h.getFullYear() - f.getFullYear(); let m = h.getMonth() - f.getMonth(); if (m < 0 || (m === 0 && h.getDate() < f.getDate())) { e--; } document.getElementById('doc-edad').value = e >= 0 ? e + ' Años' : '0 Años'; } else { document.getElementById('doc-edad').value = ''; }
        });}
        document.querySelectorAll('.txt-format').forEach(el => { el.addEventListener('blur', (e) => { this.formatearTexto(e.target); }); });
    },
    formatearTexto: function(inputElement) {
        if(!inputElement.value) return; let t = inputElement.value.trim().replace(/\s+/g, ' ');
        const c = ['de','del','la','las','el','los','y','e','o','u','a','ante','con','en','para','por','sin','un','una','unos','unas'];
        let p = t.split(' ');
        for(let i=0; i<p.length; i++) { if(p[i].length===0) continue; let pl=p[i].toLowerCase(); if(c.includes(pl) && i>0){p[i]=pl;}else{p[i]=pl.charAt(0).toUpperCase()+pl.slice(1);} }
        inputElement.value = p.join(' ');
    },
    toggleVivienda: function(selectEl) {
        let detalle = document.getElementById('contenedor-viv-detalle'); let inputDetalle = document.getElementById('doc-viv-detalle');
        if(selectEl.value.includes('8)')) { detalle.style.display = 'block'; } else { detalle.style.display = 'none'; inputDetalle.value = ''; }
    },
    toggleSolicitudUnica: function(selectEl) {
        let selEst = document.getElementById('cred-solicitud-est');
        if(selectEl.value !== '') { selEst.disabled = false; selEst.classList.remove('text-secondary'); selEst.classList.add('text-dark'); } 
        else { selEst.disabled = true; selEst.value = ''; selEst.classList.add('text-secondary'); selEst.classList.remove('text-dark'); }
    },
    cambioNeuroTrabajador: function(selectEl) {
        let divConapdis = document.getElementById('div-doc-conapdis'); let selConapdis = document.getElementById('doc-conapdis');
        if (selectEl.value === 'Neurodivergente') { divConapdis.style.display = 'block'; } 
        else { divConapdis.style.display = 'none'; selConapdis.value = 'No'; }
    },
    cambioNeuroFamiliar: function(selectElement) {
        let contenedor = selectElement.closest('.familiar-item'); let divConapdis = contenedor.querySelector('.div-fam-conapdis'); let selConapdis = contenedor.querySelector('.input-fam-conapdis');
        if (selectElement.value === 'Neurodivergente') { divConapdis.style.display = 'block'; } 
        else { divConapdis.style.display = 'none'; selConapdis.value = 'No'; }
    },
    cambioParentescoFamiliar: function(selectElement) {
        let contenedor = selectElement.closest('.familiar-item'); let divConyuge = contenedor.querySelector('.div-fam-conyuge'); let estatusInput = contenedor.querySelector('.input-fam-estatus-pdvsa');
        let val = selectElement.value;
        if (val === 'Esposo(a)' || val === 'Concubino(a)') { divConyuge.style.display = 'block'; } 
        else { divConyuge.style.display = 'none'; estatusInput.value = 'Nunca ha trabajado en PDVSA'; }
    },
    calcularEdadFamiliar: function(el) {
        let c = el.closest('.familiar-item'); let iE = c.querySelector('.input-fam-edad');
        if (el.value) { let h = new Date(); let n = new Date(el.value); let e = h.getFullYear() - n.getFullYear(); let m = h.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && h.getDate() < n.getDate())) { e--; } iE.value = e >= 0 ? e + ' Años' : '0 Años'; } 
        else { iE.value = ''; }
    },

    agregarFamiliar: function(datos = null) {
        this.familiarCount++; const c = document.getElementById('contenedor-familiares-dinamicos'); document.getElementById('msg-sin-familiares').style.display = 'none';
        let cd = datos ? datos.cedula||'' : ''; let n = datos ? datos.nombres||'' : ''; let p = datos ? datos.parentesco||'' : ''; let neuro = datos ? datos.condicion_neuro||'Neurotípico' : 'Neurotípico'; let conapdis = datos ? datos.conapdis||'No' : 'No'; let vive = datos ? datos.vive_con_trabajador||'Sí' : 'Sí'; let estatus = datos ? datos.estatus_pdvsa||'Nunca ha trabajado en PDVSA' : 'Nunca ha trabajado en PDVSA'; let f = datos ? datos.fecha_nacimiento||'' : ''; let e = datos ? datos.edad||'' : ''; let es = datos ? datos.estudiante_de||'' : '';
        let displayConyuge = (p === 'Esposo(a)' || p === 'Concubino(a)') ? 'block' : 'none'; let displayConapdis = (neuro === 'Neurodivergente') ? 'block' : 'none';
        let h = `
        <div class="caja-dinamica familiar-item animate__animated animate__fadeIn border-warning" style="background-color: #fffbeb;" id="fam-${this.familiarCount}"><button type="button" class="btn btn-danger btn-eliminar-item" onclick="window.ModExpedienteDocente.eliminarGenerico('fam-${this.familiarCount}', 'familiar-item', 'msg-sin-familiares')"><i class="bi bi-x-lg"></i></button>
            <div class="row g-3"><div class="col-md-2"><label class="form-label label-blue small mb-1">Cédula o C.E.</label><input type="text" class="input-moderno input-fam-cedula" value="${cd}"></div><div class="col-md-5"><label class="form-label label-blue small mb-1">Nombres y Apellidos</label><input type="text" class="input-moderno input-fam-nombres txt-format" value="${n}"></div><div class="col-md-3"><label class="form-label label-blue small mb-1">Parentesco</label><select class="input-moderno input-fam-parentesco" onchange="window.ModExpedienteDocente.cambioParentescoFamiliar(this)"><option value="">Sel...</option><option value="Hijo(a)" ${p==='Hijo(a)'?'selected':''}>Hijo(a)</option><option value="Esposo(a)" ${p==='Esposo(a)'?'selected':''}>Esposo(a)</option><option value="Concubino(a)" ${p==='Concubino(a)'?'selected':''}>Concubino(a)</option><option value="Padre" ${p==='Padre'?'selected':''}>Padre</option><option value="Madre" ${p==='Madre'?'selected':''}>Madre</option></select></div><div class="col-md-2"><label class="form-label label-blue small mb-1">¿Vive con usted?</label><select class="input-moderno input-fam-vive fw-bold text-primary"><option value="Sí" ${vive==='Sí'?'selected':''}>Sí</option><option value="No" ${vive==='No'?'selected':''}>No</option></select></div>
            <div class="col-md-3"><label class="form-label label-blue small mb-1">Condición Neurológica</label><select class="input-moderno input-fam-neuro" onchange="window.ModExpedienteDocente.cambioNeuroFamiliar(this)"><option value="Neurotípico" ${neuro==='Neurotípico'?'selected':''}>Neurotípico</option><option value="Neurodivergente" ${neuro==='Neurodivergente'?'selected':''}>Neurodivergente</option></select></div><div class="col-md-2 div-fam-conapdis" style="display: ${displayConapdis};"><label class="form-label label-blue small mb-1">Cert. CONAPDIS</label><select class="input-moderno input-fam-conapdis fw-bold text-danger"><option value="No" ${conapdis==='No'?'selected':''}>No</option><option value="Sí" ${conapdis==='Sí'?'selected':''}>Sí posee</option></select></div>
            <div class="col-md-3"><label class="form-label label-blue small mb-1">Fecha Nac.</label><input type="date" class="input-moderno input-fam-fecha" value="${f}" onchange="window.ModExpedienteDocente.calcularEdadFamiliar(this)"></div><div class="col-md-1"><label class="form-label label-blue small mb-1">Edad</label><input type="text" class="input-moderno input-fam-edad bg-light text-center fw-bold px-1" readonly value="${e}"></div><div class="col-md-3"><label class="form-label label-blue small mb-1">Nivel Educativo</label><select class="input-moderno input-fam-estudiante"><option value="">Sel...</option><option value="Educación Inicial" ${es==='Educación Inicial'?'selected':''}>Educación Inicial</option><option value="Educación Primaria" ${es==='Educación Primaria'?'selected':''}>Educación Primaria</option><option value="Educación Media General" ${es==='Educación Media General'?'selected':''}>Educación Media General</option><option value="Estudios de Pregrado" ${es==='Estudios de Pregrado'?'selected':''}>Estudios de Pregrado</option><option value="No Escolarizado" ${es==='No Escolarizado'?'selected':''}>No Escolarizado</option><option value="Graduado" ${es==='Graduado'?'selected':''}>Graduado</option></select></div>
            <div class="col-md-12 div-fam-conyuge mt-2" style="display: ${displayConyuge};"><div class="p-2 bg-info bg-opacity-10 border border-info rounded d-flex align-items-center"><i class="bi bi-briefcase-fill text-info fs-4 me-3"></i><div class="flex-grow-1"><label class="form-label text-dark fw-bold mb-1">Estatus Laboral del Cónyuge/Concubino(a) respecto a PDVSA:</label><select class="input-moderno input-fam-estatus-pdvsa border-info"><option value="Nunca ha trabajado en PDVSA" ${estatus==='Nunca ha trabajado en PDVSA'?'selected':''}>Nunca ha trabajado en PDVSA</option><option value="Trabajador(a) Activo(a)" ${estatus==='Trabajador(a) Activo(a)'?'selected':''}>Trabajador(a) Activo(a)</option><option value="Trabajó / Está Retirado(a)" ${estatus==='Trabajó / Está Retirado(a)'?'selected':''}>Trabajó / Está Retirado(a)</option></select></div></div></div></div></div>`;
        c.insertAdjacentHTML('beforeend', h); let ni = document.getElementById(`fam-${this.familiarCount}`).querySelector('.txt-format'); if(ni) ni.addEventListener('blur', (ev) => { this.formatearTexto(ev.target); });
    },

    // ✨ MODIFICACIÓN: POSICIONES INTERNAS BLOQUEADAS Y SIN BOTÓN DE BORRAR ✨
    agregarPosicion: function(datos = null) {
        this.posicionCount++; const c = document.getElementById('contenedor-posiciones-dinamicos'); document.getElementById('msg-sin-posiciones').style.display = 'none';
        let an = datos ? datos.anio||'' : ''; let or = datos ? datos.organizacion||'' : ''; let fi = datos ? datos.filial||'' : ''; let ne = datos ? datos.negocio||'' : '';
        let ho = this.htmlOpcionesOrg; if(or && !ho.includes(`value="${or}"`)) ho += `<option value="${or}">${or}</option>`;
        let hn = this.htmlOpcionesNeg; if(ne && !hn.includes(`value="${ne}"`)) hn += `<option value="${ne}">${ne}</option>`;
        
        let h = `<div class="caja-dinamica posicion-item animate__animated animate__fadeIn" id="pos-${this.posicionCount}">
            <div class="row g-3">
                <div class="col-md-2"><label class="form-label label-blue small mb-1">Año</label><input type="number" class="input-moderno input-pos-anio bg-light text-muted" value="${an}" readonly></div>
                <div class="col-md-4"><label class="form-label label-blue small mb-1">Organización</label><select class="input-moderno input-pos-org bg-light text-muted" disabled>${ho}</select></div>
                <div class="col-md-3"><label class="form-label label-blue small mb-1">Negocio</label><select class="input-moderno input-pos-neg bg-light text-muted" disabled>${hn}</select></div>
                <div class="col-md-3"><label class="form-label label-blue small mb-1">Filial</label><input type="text" class="input-moderno input-pos-filial txt-format bg-light text-muted" value="${fi}" readonly></div>
            </div></div>`;
        c.insertAdjacentHTML('beforeend', h); let cj = document.getElementById(`pos-${this.posicionCount}`); if(or) cj.querySelector('.input-pos-org').value = or; if(ne) cj.querySelector('.input-pos-neg').value = ne;
    },

    // ✨ MODIFICACIÓN: EXPERIENCIAS EXTERNAS BLOQUEADAS Y SIN BOTÓN DE BORRAR ✨
    agregarExperiencia: function(datos = null) {
        this.experienciaCount++; const c = document.getElementById('contenedor-experiencias-dinamicos'); document.getElementById('msg-sin-experiencias').style.display = 'none';
        let an = datos ? datos.anio||'' : ''; let em = datos ? datos.empresa||'' : ''; let ca = datos ? datos.cargo||'' : '';
        let h = `<div class="caja-dinamica experiencia-item animate__animated animate__fadeIn" id="exp-${this.experienciaCount}">
            <div class="row g-3">
                <div class="col-md-2"><label class="form-label label-blue small mb-1">Año</label><input type="number" class="input-moderno input-exp-anio bg-light text-muted" value="${an}" readonly></div>
                <div class="col-md-5"><label class="form-label label-blue small mb-1">Empresa</label><input type="text" class="input-moderno input-exp-emp txt-format bg-light text-muted" value="${em}" readonly></div>
                <div class="col-md-5"><label class="form-label label-blue small mb-1">Cargo</label><input type="text" class="input-moderno input-exp-car txt-format bg-light text-muted" value="${ca}" readonly></div>
            </div></div>`;
        c.insertAdjacentHTML('beforeend', h);
    },

    agregarTitulo: function(datos = null) {
        this.tituloCount++; const c = document.getElementById('contenedor-titulos-dinamicos'); document.getElementById('msg-sin-titulos').style.display = 'none';
        let ni = datos ? datos.nivel||'' : ''; let ti = datos ? datos.titulo||'' : ''; let ins = datos ? datos.institucion||'' : ''; let an = datos ? datos.anio||'' : '';
        let h = `<div class="caja-dinamica titulo-item animate__animated animate__fadeIn" id="titulo-${this.tituloCount}"><button type="button" class="btn btn-danger btn-eliminar-item" onclick="window.ModExpedienteDocente.eliminarGenerico('titulo-${this.tituloCount}', 'titulo-item', 'msg-sin-titulos')"><i class="bi bi-x-lg"></i></button>
            <div class="row g-3"><div class="col-md-4"><label class="form-label label-blue small mb-1">Nivel Educativo</label><select class="input-moderno input-tit-nivel"><option value="">Sel...</option><option value="TSU" ${ni==='TSU'?'selected':''}>TSU</option><option value="Licenciatura / Profesorado" ${ni==='Licenciatura / Profesorado'?'selected':''}>Licenciatura / Profesorado</option><option value="Postgrado / Especialización" ${ni==='Postgrado / Especialización'?'selected':''}>Postgrado / Especialización</option><option value="Maestría" ${ni==='Maestría'?'selected':''}>Maestría</option><option value="Doctorado" ${ni==='Doctorado'?'selected':''}>Doctorado</option></select></div><div class="col-md-8"><label class="form-label label-blue small mb-1">Título</label><input type="text" class="input-moderno input-tit-nombre txt-format" value="${ti}"></div><div class="col-md-8"><label class="form-label label-blue small mb-1">Universidad</label><input type="text" class="input-moderno input-tit-inst txt-format" value="${ins}"></div><div class="col-md-4"><label class="form-label label-blue small mb-1">Año Egreso</label><input type="number" class="input-moderno input-tit-anio" value="${an}"></div></div></div>`;
        c.insertAdjacentHTML('beforeend', h); document.getElementById(`titulo-${this.tituloCount}`).querySelectorAll('.txt-format').forEach(el => { el.addEventListener('blur', (ev) => { this.formatearTexto(ev.target); }); });
    },

    agregarCurso: function(datos = null) {
        this.cursoCount++; const c = document.getElementById('contenedor-cursos-dinamicos'); document.getElementById('msg-sin-cursos').style.display = 'none';
        let ti = datos ? datos.titulo||'' : ''; let fe = datos ? datos.fecha||'' : ''; let lu = datos ? datos.lugar||'' : ''; let ho = datos ? datos.horas||'' : '';
        let h = `<div class="caja-dinamica curso-item animate__animated animate__fadeIn" id="curso-${this.cursoCount}"><button type="button" class="btn btn-danger btn-eliminar-item" onclick="window.ModExpedienteDocente.eliminarGenerico('curso-${this.cursoCount}', 'curso-item', 'msg-sin-cursos')"><i class="bi bi-x-lg"></i></button>
            <div class="row g-3"><div class="col-md-12"><label class="form-label label-blue small mb-1">Nombre del Curso</label><input type="text" class="input-moderno input-curso-titulo txt-format" value="${ti}"></div><div class="col-md-4"><label class="form-label label-blue small mb-1">Fecha</label><input type="text" class="input-moderno input-curso-fecha" value="${fe}"></div><div class="col-md-5"><label class="form-label label-blue small mb-1">Institución</label><input type="text" class="input-moderno input-curso-lugar txt-format" value="${lu}"></div><div class="col-md-3"><label class="form-label label-blue small mb-1">Horas</label><input type="number" class="input-moderno input-curso-horas" value="${ho}"></div></div></div>`;
        c.insertAdjacentHTML('beforeend', h); document.getElementById(`curso-${this.cursoCount}`).querySelectorAll('.txt-format').forEach(el => { el.addEventListener('blur', (ev) => { this.formatearTexto(ev.target); }); });
    },

    agregarFormacion: function(datos = null) {
        if (document.querySelectorAll('.formacion-item').length >= 5) return Swal.fire('Límite', 'Máximo 5 formaciones.', 'warning');
        this.formacionCount++; const c = document.getElementById('contenedor-formaciones-dinamicos'); document.getElementById('msg-sin-formaciones').style.display = 'none';
        let catGuardada = datos ? datos.categoria : ''; let titGuardado = datos ? datos.titulo : ''; let nivGuardado = datos ? datos.nivel : ''; let descGuardada = '';
        let optsCat = '<option value="">Seleccione Área...</option>'; Object.keys(this.catalogoFormaciones).forEach(cat => { optsCat += `<option value="${cat}" ${cat === catGuardada ? 'selected' : ''}>${cat}</option>`; });
        let optsTit = '<option value="">Primero seleccione un área...</option>'; let dispDesc = 'none';
        if (catGuardada && this.catalogoFormaciones[catGuardada]) { optsTit = '<option value="">Seleccione Curso...</option>'; this.catalogoFormaciones[catGuardada].forEach(form => { optsTit += `<option value="${form.titulo}" ${form.titulo === titGuardado ? 'selected' : ''}>${form.titulo}</option>`; if(form.titulo === titGuardado) { descGuardada = form.desc; dispDesc = 'block'; } }); }
        let h = `<div class="caja-dinamica formacion-item animate__animated animate__fadeIn border-warning" style="background-color: #fffbeb;" id="formacion-${this.formacionCount}"><button type="button" class="btn btn-danger btn-eliminar-item" onclick="window.ModExpedienteDocente.eliminarGenerico('formacion-${this.formacionCount}', 'formacion-item', 'msg-sin-formaciones')"><i class="bi bi-x-lg"></i></button>
            <div class="row g-3"><div class="col-md-5"><label class="form-label label-blue small mb-1">Área de Formación</label><select class="input-moderno input-form-cat" onchange="window.ModExpedienteDocente.cambiarCategoriaFormacion(this, ${this.formacionCount})">${optsCat}</select></div><div class="col-md-7"><label class="form-label label-blue small mb-1">Título del Curso Solicitado</label><select class="input-moderno input-form-tit fw-bold text-dark" ${!catGuardada ? 'disabled' : ''} onchange="window.ModExpedienteDocente.cambiarTituloFormacion(this, ${this.formacionCount})">${optsTit}</select></div><div class="col-12"><div class="caja-descripcion-curso" id="desc-formacion-${this.formacionCount}" style="display: ${dispDesc};">${descGuardada}</div></div><div class="col-md-4 mt-3"><label class="form-label label-blue small mb-1">Nivel Deseado</label><select class="input-moderno input-form-niv border-info bg-white"><option value="">Seleccione Nivel...</option><option value="Básico" ${nivGuardado === 'Básico' ? 'selected' : ''}>Básico</option><option value="Intermedio" ${nivGuardado === 'Intermedio' ? 'selected' : ''}>Intermedio</option><option value="Avanzado" ${nivGuardado === 'Avanzado' ? 'selected' : ''}>Avanzado</option></select></div></div></div>`;
        c.insertAdjacentHTML('beforeend', h);
    },

    cambiarCategoriaFormacion: function(selElement, idForm) {
        let cat = selElement.value; let selTit = document.getElementById(`formacion-${idForm}`).querySelector('.input-form-tit'); let divDesc = document.getElementById(`desc-formacion-${idForm}`);
        divDesc.style.display = 'none'; divDesc.innerText = '';
        if (!cat) { selTit.disabled = true; selTit.innerHTML = '<option value="">Primero seleccione un área...</option>'; return; }
        let opts = '<option value="">Seleccione Curso...</option>'; this.catalogoFormaciones[cat].forEach(form => { opts += `<option value="${form.titulo}">${form.titulo}</option>`; });
        selTit.innerHTML = opts; selTit.disabled = false;
    },
    cambiarTituloFormacion: function(selElement, idForm) {
        let tit = selElement.value; let cat = document.getElementById(`formacion-${idForm}`).querySelector('.input-form-cat').value; let divDesc = document.getElementById(`desc-formacion-${idForm}`);
        if (tit && cat && this.catalogoFormaciones[cat]) { let obj = this.catalogoFormaciones[cat].find(f => f.titulo === tit); if (obj) { divDesc.innerText = obj.desc; divDesc.style.display = 'block'; return; } }
        divDesc.style.display = 'none'; divDesc.innerText = '';
    },
    eliminarGenerico: function(idEl, claseItems, idMsg) {
        let el = document.getElementById(idEl);
        if (el) { el.classList.remove('animate__fadeIn'); el.classList.add('animate__fadeOut'); setTimeout(() => { el.remove(); if (document.querySelectorAll(`.${claseItems}`).length === 0) document.getElementById(idMsg).style.display = 'block'; }, 300); }
    },

    irAPaso: function(paso) {
        if (paso === this.pasoActual) return;
        document.getElementById(`paso-${this.pasoActual}`).style.display = 'none';
        for(let i=1; i<=this.totalPasos; i++) {
            let w = document.getElementById(`ind-wrapper-${i}`); let s = document.getElementById(`ind-${i}`);
            if(w && s) {
                if(i < paso) { s.classList.add('completado'); s.classList.remove('activo'); w.classList.remove('activo'); } 
                else if (i === paso) { s.classList.add('activo'); s.classList.remove('completado'); w.classList.add('activo'); } 
                else { s.classList.remove('activo', 'completado'); w.classList.remove('activo'); }
            }
        }
        this.pasoActual = paso; let el = document.getElementById(`paso-${this.pasoActual}`); if(el) el.style.display = 'block'; this.actualizarUI();
    },

    cambiarPaso: function(dir) { 
        let d = this.pasoActual + dir; 
        if(d >= 1 && d <= this.totalPasos) {
            this.autoGuardarSilencioso(); 
            this.irAPaso(d); 
        }
    },

    actualizarUI: function() {
        let p = document.getElementById('btn-prev'); let n = document.getElementById('btn-next'); let s = document.getElementById('btn-save');
        if(p) p.style.display = this.pasoActual === 1 ? 'none' : 'block';
        if(n && s) { if (this.pasoActual === this.totalPasos) { n.style.display = 'none'; s.style.display = 'block'; } else { n.style.display = 'block'; s.style.display = 'none'; } }
    },

    obtenerPayloadActual: function(esFinal = false) {
        let cedula = document.getElementById('doc-cedula').value; 
        let nombreCompleto = document.getElementById('doc-nombres-apellidos').value.trim(); 
        let fechaIngreso = document.getElementById('doc-fecha-ingreso').value || null;
        let parts = nombreCompleto.split(' '); 
        let nombresBD = parts.length > 1 ? parts.slice(0, Math.ceil(parts.length/2)).join(' ') : nombreCompleto; 
        let apellidosBD = parts.length > 1 ? parts.slice(Math.ceil(parts.length/2)).join(' ') : '.';

        let arrayFamilia = []; 
        document.querySelectorAll('.familiar-item').forEach(item => { 
            let fn = item.querySelector('.input-fam-nombres').value.trim(); 
            if (fn) { 
                arrayFamilia.push({ 
                    cedula: item.querySelector('.input-fam-cedula').value.trim(), 
                    nombres: fn, 
                    parentesco: item.querySelector('.input-fam-parentesco').value, 
                    vive_con_trabajador: item.querySelector('.input-fam-vive').value,
                    condicion_neuro: item.querySelector('.input-fam-neuro').value, 
                    conapdis: item.querySelector('.input-fam-conapdis').value,
                    estatus_pdvsa: item.querySelector('.input-fam-estatus-pdvsa') ? item.querySelector('.input-fam-estatus-pdvsa').value : 'Nunca ha trabajado en PDVSA',
                    fecha_nacimiento: item.querySelector('.input-fam-fecha').value, 
                    edad: item.querySelector('.input-fam-edad').value, 
                    estudiante_de: item.querySelector('.input-fam-estudiante').value 
                }); 
            } 
        });
        
        let jsonDatosFicha = {
            fecha_nacimiento: document.getElementById('doc-fecha-nac').value, edad_guardada: document.getElementById('doc-edad').value, genero: document.getElementById('doc-genero').value, estado_civil: document.getElementById('doc-estado-civil').value, nacionalidad: document.getElementById('doc-nacionalidad').value,
            estado_hab: 'Monagas', municipio_hab: document.getElementById('doc-municipio').value, parroquia_hab: document.getElementById('doc-parroquia').value, direccion: document.getElementById('doc-direccion').value,
            telefonos: { movil: document.getElementById('doc-tel-movil').value, local: document.getElementById('doc-tel-local').value }, correos: { personal: document.getElementById('doc-correo-per').value, institucional: document.getElementById('doc-correo-inst').value },
            salud: { 
                talla_camisa: document.getElementById('doc-talla-camisa').value, talla_chemise: document.getElementById('doc-talla-chemise').value, talla_braga: document.getElementById('doc-talla-braga').value, talla_pantalon: document.getElementById('doc-talla-pantalon').value, talla_calzado: document.getElementById('doc-talla-calzado').value, talla_botas: document.getElementById('doc-talla-botas').value, 
                grupo_sanguineo: document.getElementById('doc-sangre').value, 
                condicion_medica: document.getElementById('doc-condicion-medica').value, 
                condicion_neuro: document.getElementById('doc-neuro') ? document.getElementById('doc-neuro').value : 'Neurotípico',
                conapdis: document.getElementById('doc-conapdis') ? document.getElementById('doc-conapdis').value : 'No',
                emergencia_nombre: document.getElementById('doc-emergencia-nombre').value, emergencia_tel: document.getElementById('doc-emergencia-tel').value 
            },
            carga_familiar: arrayFamilia,
            corporativo: { 
                anios_servicio: document.getElementById('doc-anios-servicio').value, 
                grupo_salarial: document.getElementById('doc-grupo-salarial').value, 
                posicion_actual: document.getElementById('doc-posicion-actual').value, 
                gerencia: document.getElementById('doc-gerencia').value, 
                organizacion: document.getElementById('doc-organizacion').value,
                desarrollo_carrera: document.getElementById('doc-desarrollo') ? document.getElementById('doc-desarrollo').value : '',
                observaciones: document.getElementById('doc-observaciones') ? document.getElementById('doc-observaciones').value : ''
            },
            electoral: { estado: 'Monagas', municipio: document.getElementById('doc-electoral-municipio').value, parroquia: document.getElementById('doc-electoral-parroquia').value, centro_votacion: document.getElementById('doc-electoral-centro').value },
            vivienda_creditos: { 
                tipo: document.getElementById('doc-viv-tipo').value, 
                condicion: document.getElementById('doc-viv-condicion').value, 
                detalle_otra: document.getElementById('doc-viv-detalle') ? document.getElementById('doc-viv-detalle').value : '',
                solicitud_unica: {
                    tipo: document.getElementById('cred-solicitud-tipo') ? document.getElementById('cred-solicitud-tipo').value : '',
                    estado: document.getElementById('cred-solicitud-est') ? document.getElementById('cred-solicitud-est').value : ''
                },
                credito_5_sueldos: document.getElementById('cred-5-sueldos-est') ? document.getElementById('cred-5-sueldos-est').value : 'No Solicitado'
            }
        };

        let arrayTitulos = []; document.querySelectorAll('.titulo-item').forEach(item => { let n = item.querySelector('.input-tit-nombre').value.trim(); if (n) { arrayTitulos.push({ nivel: item.querySelector('.input-tit-nivel').value, titulo: n, institucion: item.querySelector('.input-tit-inst').value.trim(), anio: item.querySelector('.input-tit-anio').value.trim() }); } });
        let arrayCursos = []; document.querySelectorAll('.curso-item').forEach(item => { let t = item.querySelector('.input-curso-titulo').value.trim(); if (t) { arrayCursos.push({ titulo: t, fecha: item.querySelector('.input-curso-fecha').value.trim(), lugar: item.querySelector('.input-curso-lugar').value.trim(), horas: item.querySelector('.input-curso-horas').value.trim() }); } });
        
        let arrayPosiciones = []; document.querySelectorAll('.posicion-item').forEach(item => { let y = item.querySelector('.input-pos-anio').value.trim(); if(y) { arrayPosiciones.push({ anio: y, organizacion: item.querySelector('.input-pos-org').value, negocio: item.querySelector('.input-pos-neg').value, filial: item.querySelector('.input-pos-filial').value.trim() }); } });
        let arrayExperiencias = []; document.querySelectorAll('.experiencia-item').forEach(item => { let y = item.querySelector('.input-exp-anio').value.trim(); if(y) { arrayExperiencias.push({ anio: y, empresa: item.querySelector('.input-exp-emp').value.trim(), cargo: item.querySelector('.input-exp-car').value.trim() }); } });
        
        let jsonCV = { 
            titulos_universitarios: arrayTitulos, 
            cursos_realizados: arrayCursos, 
            historico_posiciones: arrayPosiciones, 
            experiencia_externa: arrayExperiencias,
            otros_idiomas: document.getElementById('doc-idiomas') ? document.getElementById('doc-idiomas').value : ''
        };

        let arrayFormaciones = []; document.querySelectorAll('.formacion-item').forEach(item => { let cat = item.querySelector('.input-form-cat').value; let tit = item.querySelector('.input-form-tit').value; let niv = item.querySelector('.input-form-niv').value; if (cat && tit) { arrayFormaciones.push({ categoria: cat, titulo: tit, nivel: niv }); } });
        let jsonPlanificacion = { plan_formacion: arrayFormaciones, necesidades_extra: document.getElementById('plan-necesidades-extra').value };

        return { 
            cedula: cedula, 
            nombres: nombresBD, 
            apellidos: apellidosBD, 
            fecha_ingreso: fechaIngreso, 
            datos_ficha: jsonDatosFicha, 
            curriculum_vitae: jsonCV, 
            planificacion_estrategica: jsonPlanificacion, 
            ficha_actualizada: esFinal, 
            updated_at: new Date().toISOString() 
        };
    },

    autoGuardarSilencioso: async function() {
        let cedula = document.getElementById('doc-cedula').value; 
        if(!cedula) return;

        let ind = document.getElementById('indicador-autoguardado');
        let icn = document.getElementById('icono-autoguardado');
        let txt = document.getElementById('texto-autoguardado');
        
        if(ind) {
            ind.classList.remove('bg-light', 'd-none'); 
            ind.classList.add('bg-warning', 'bg-opacity-10');
            icn.className = 'bi bi-arrow-repeat text-warning spinner-border spinner-border-sm me-2';
            txt.className = 'text-warning fw-bold';
            txt.innerText = 'Guardando...';
        }

        let payload = this.obtenerPayloadActual(false);

        try {
            if (this.expedienteId) { 
                const { error } = await window.supabaseDB.from('expedientes_docentes').update(payload).eq('id', this.expedienteId); 
                if (error) throw error;
            } else { 
                const { data, error } = await window.supabaseDB.from('expedientes_docentes').insert([payload]).select(); 
                if (error) throw error;
                if (data && data.length > 0) this.expedienteId = data[0].id; 
            }
            
            localStorage.setItem('sigae_paso_exp_' + payload.cedula, this.pasoActual);
            
            if(ind) {
                ind.classList.remove('bg-warning', 'bg-opacity-10'); 
                ind.classList.add('bg-success', 'bg-opacity-10');
                icn.className = 'bi bi-cloud-check-fill text-success me-2 fs-6';
                txt.className = 'text-success fw-bold';
                let hora = new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});
                txt.innerText = 'Guardado ' + hora;
                
                setTimeout(() => {
                    ind.classList.remove('bg-success', 'bg-opacity-10'); 
                    ind.classList.add('bg-light');
                    icn.className = 'bi bi-cloud-check text-secondary me-2 fs-6';
                    txt.className = 'text-secondary fw-bold';
                    txt.innerText = 'Sincronizado';
                }, 3000);
            }
        } catch(e) {
            console.error("Fallo Autoguardado:", e);
            if(ind) {
                ind.classList.remove('bg-warning', 'bg-opacity-10', 'bg-success'); 
                ind.classList.add('bg-danger', 'bg-opacity-10');
                icn.className = 'bi bi-cloud-slash-fill text-danger me-2 fs-6';
                txt.className = 'text-danger fw-bold';
                txt.innerText = 'Sin conexión';
            }
        }
    },

    guardarExpediente: async function() {
        let payload = this.obtenerPayloadActual(true); 
        window.Aplicacion.mostrarCarga();
        
        try {
            let errorBD;
            if (this.expedienteId) { 
                const { error } = await window.supabaseDB.from('expedientes_docentes').update(payload).eq('id', this.expedienteId); 
                errorBD = error; 
            } else { 
                const { data, error } = await window.supabaseDB.from('expedientes_docentes').insert([payload]).select(); 
                errorBD = error; 
                if (data && data.length > 0) this.expedienteId = data[0].id; 
            }
            
            window.Aplicacion.ocultarCarga(); 
            if (errorBD) throw errorBD;
            
            localStorage.removeItem('sigae_paso_exp_' + payload.cedula);
            if (window._alertaExpedienteMostrada !== undefined) window._alertaExpedienteMostrada = true;
            
            window.Aplicacion.auditar('Mi Expediente', 'Actualización de Perfil', `El trabajador ${payload.cedula} completó y finalizó su perfil corporativo`);
            Swal.fire({ title: '¡Datos Guardados!', text: 'Tu expediente se ha finalizado y registrado exitosamente.', icon: 'success', confirmButtonColor: '#0ea5e9' });
            
            let icn = document.getElementById('icono-autoguardado');
            let txt = document.getElementById('texto-autoguardado');
            if(txt) {
                icn.className = 'bi bi-cloud-check-fill text-success me-2 fs-6';
                txt.className = 'text-success fw-bold';
                txt.innerText = 'Borrador Finalizado';
            }
        } catch (e) { 
            window.Aplicacion.ocultarCarga(); 
            Swal.fire('Error', 'Hubo un problema al guardar tus datos en el servidor.', 'error'); 
        }
    },

    cargarExpediente: async function(cedulaBuscar) {
        try {
            const { data, error } = await window.supabaseDB.from('expedientes_docentes').select('*').eq('cedula', cedulaBuscar);
            if (error) throw error;

            if (data && data.length > 0) {
                let exp = data[0]; 
                this.expedienteId = exp.id;

                const setVal = (id, val) => { let el = document.getElementById(id); if(el && val !== undefined) el.value = val; };
                
                const parseSeguro = (obj) => {
                    if (!obj) return null;
                    if (typeof obj === 'string') { try { return JSON.parse(obj); } catch(e) { return null; } }
                    return obj;
                };
                
                setVal('doc-fecha-ingreso', exp.fecha_ingreso); let iI = document.getElementById('doc-fecha-ingreso'); if(iI) iI.dispatchEvent(new Event('change'));

                let df = parseSeguro(exp.datos_ficha);
                if (df) {
                    setVal('doc-fecha-nac', df.fecha_nacimiento); let iN = document.getElementById('doc-fecha-nac'); if(iN) iN.dispatchEvent(new Event('change'));
                    setVal('doc-genero', df.genero); setVal('doc-estado-civil', df.estado_civil); setVal('doc-nacionalidad', df.nacionalidad);
                    
                    setVal('doc-municipio', df.municipio_hab); this.cargarParroquiasUI(); setTimeout(() => { setVal('doc-parroquia', df.parroquia_hab); }, 100);
                    setVal('doc-direccion', df.direccion);
                    if(df.telefonos) { setVal('doc-tel-movil', df.telefonos.movil); setVal('doc-tel-local', df.telefonos.local); }
                    if(df.correos) { setVal('doc-correo-per', df.correos.personal); setVal('doc-correo-inst', df.correos.institucional); }
                    
                    if(df.salud) {
                        setVal('doc-talla-camisa', df.salud.talla_camisa); setVal('doc-talla-chemise', df.salud.talla_chemise); setVal('doc-talla-braga', df.salud.talla_braga);
                        setVal('doc-talla-pantalon', df.salud.talla_pantalon); setVal('doc-talla-calzado', df.salud.talla_calzado); setVal('doc-talla-botas', df.salud.talla_botas);
                        setVal('doc-sangre', df.salud.grupo_sanguineo); setVal('doc-condicion-medica', df.salud.condicion_medica); 
                        
                        setVal('doc-neuro', df.salud.condicion_neuro || 'Neurotípico');
                        let elNeuro = document.getElementById('doc-neuro');
                        if (elNeuro) this.cambioNeuroTrabajador(elNeuro);
                        
                        setVal('doc-conapdis', df.salud.conapdis || 'No');
                        setVal('doc-emergencia-nombre', df.salud.emergencia_nombre); setVal('doc-emergencia-tel', df.salud.emergencia_tel);
                    }
                    if(df.carga_familiar && Array.isArray(df.carga_familiar)) { df.carga_familiar.forEach(fam => { this.agregarFamiliar(fam); }); }
                    
                    if(df.corporativo) {
                        if(!document.getElementById('doc-anios-servicio').value) setVal('doc-anios-servicio', df.corporativo.anios_servicio);
                        setVal('doc-grupo-salarial', df.corporativo.grupo_salarial); setVal('doc-posicion-actual', df.corporativo.posicion_actual);
                        setVal('doc-gerencia', df.corporativo.gerencia); setVal('doc-organizacion', df.corporativo.organizacion);
                        setVal('doc-desarrollo', df.corporativo.desarrollo_carrera || ''); setVal('doc-observaciones', df.corporativo.observaciones || '');
                    }
                    if(df.electoral) {
                        setVal('doc-electoral-municipio', df.electoral.municipio); this.cargarParroquiasElectoralUI();
                        setTimeout(() => { setVal('doc-electoral-parroquia', df.electoral.parroquia); }, 100); setVal('doc-electoral-centro', df.electoral.centro_votacion);
                    }
                    if(df.vivienda_creditos) {
                        setVal('doc-viv-tipo', df.vivienda_creditos.tipo); setVal('doc-viv-condicion', df.vivienda_creditos.condicion); setVal('doc-viv-detalle', df.vivienda_creditos.detalle_otra);
                        let selCond = document.getElementById('doc-viv-condicion'); if(selCond) this.toggleVivienda(selCond);
                        if(df.vivienda_creditos.solicitud_unica) {
                            setVal('cred-solicitud-tipo', df.vivienda_creditos.solicitud_unica.tipo || ''); setVal('cred-solicitud-est', df.vivienda_creditos.solicitud_unica.estado || '');
                            let selSol = document.getElementById('cred-solicitud-tipo'); if(selSol) this.toggleSolicitudUnica(selSol);
                        }
                        setVal('cred-5-sueldos-est', df.vivienda_creditos.credito_5_sueldos || 'No Solicitado');
                    }
                }

                let cv = parseSeguro(exp.curriculum_vitae);
                if (cv) {
                    if(cv.titulos_universitarios && Array.isArray(cv.titulos_universitarios)) { cv.titulos_universitarios.forEach(tit => { this.agregarTitulo(tit); }); }
                    if(cv.cursos_realizados && Array.isArray(cv.cursos_realizados)) cv.cursos_realizados.forEach(curso => { this.agregarCurso(curso); });
                    if(cv.historico_posiciones && Array.isArray(cv.historico_posiciones)) cv.historico_posiciones.forEach(pos => { this.agregarPosicion(pos); });
                    if(cv.experiencia_externa && Array.isArray(cv.experiencia_externa)) cv.experiencia_externa.forEach(expEx => { this.agregarExperiencia(expEx); });
                    setVal('doc-idiomas', cv.otros_idiomas || '');
                }

                let plan = parseSeguro(exp.planificacion_estrategica);
                if (plan) {
                    if(plan.plan_formacion && Array.isArray(plan.plan_formacion)) { plan.plan_formacion.forEach(form => { this.agregarFormacion(form); }); }
                    setVal('plan-necesidades-extra', plan.necesidades_extra || '');
                }

                let pasoGuardado = localStorage.getItem('sigae_paso_exp_' + cedulaBuscar);
                if (pasoGuardado && !exp.ficha_actualizada) {
                    setTimeout(() => { this.irAPaso(parseInt(pasoGuardado)); }, 500);
                }

            } else { 
                this.expedienteId = null; 
            }

        } catch (e) { console.error("Error cargando:", e); }
    }
};

window.init_Expediente_Docente = function() { if(window.ModExpedienteDocente) window.ModExpedienteDocente.init(); };