/**
 * MÓDULO: ACTUALIZACIÓN DE DATOS (WIZARD ESTUDIANTES)
 * Actualiza directamente las columnas de la tabla 'expedientes'.
 * ✨ INCLUYE AUTO-COPIADO, LÓGICA DEPORTIVA INTELIGENTE Y NUEVOS CAMPOS ✨
 */

window.ModActualizacion = {
    pasoActual: 1,
    totalPasos: 7, 
    datosEmpresa: [],
    rutasTransporte: [],
    paradasTransporte: [],
    diccionarioVzla: {},
    misEstudiantes: [],
    estudianteActivo: null,
    timeoutDireccion: null,

    init: function() {
        if (!window.Aplicacion.permiso('Actualización de Datos', 'ver')) {
            let contenedor = document.getElementById('fase-selector');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn mt-5">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar el módulo de Actualización de Datos.</p>
                </div>`;
            }
            return;
        }

        document.getElementById('fase-selector').style.display = 'block';
        document.getElementById('fase-formulario').style.display = 'none';

        this.aplicarMascaraFlotante();
        this.aplicarEventosAutomaticos();
        this.cargarMisEstudiantes();
    },

    aplicarMascaraFlotante: function() {
        document.querySelectorAll('.float-mask').forEach(input => {
            input.addEventListener('input', function(e) {
                let val = this.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].substring(0, 2);
                this.value = val;
            });
        });
        document.querySelectorAll('.num-only').forEach(input => {
            input.addEventListener('input', function(e) { this.value = this.value.replace(/[^0-9]/g, ''); });
        });
        document.querySelectorAll('.txt-format').forEach(input => {
            input.addEventListener('input', function(e) {
                let v = this.value.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
                this.value = v;
            });
        });
    },

    aplicarEventosAutomaticos: function() {
        const setupAutoFill = (tipo) => {
            const campos = ['nombres', 'cedula', 'cod-tel', 'tel', 'correo', 'dir', 'profesion'];
            campos.forEach(campo => {
                let cID = tipo === 'rep' ? `rep-${campo === 'cod-tel' ? 'cod-tel' : (campo === 'tel' ? 'telefono' : campo)}` : `${tipo}-${campo}`;
                let el = document.getElementById(cID);
                if (el) {
                    el.addEventListener('input', () => {
                        let chk = document.getElementById(`chk-rep-es-${tipo}`);
                        if (chk && chk.checked) this.copiarDatosRepresentante(tipo, true);
                    });
                }
            });
        };
        setupAutoFill('madre');
        setupAutoFill('padre');

        ['rep', 'madre', 'padre'].forEach(tipo => {
            let el = document.getElementById(`${tipo}-direccion`);
            if (!el) el = document.getElementById(`${tipo}-dir`);
            if (el) {
                el.addEventListener('input', () => {
                    clearTimeout(this.timeoutDireccion);
                    this.timeoutDireccion = setTimeout(() => {
                        if (tipo === 'rep') {
                            if (document.getElementById('chk-dir-madre')?.checked) this.copiarDireccionRepresentante('madre');
                            if (document.getElementById('chk-dir-padre')?.checked) this.copiarDireccionRepresentante('padre');
                        }
                    }, 300);
                });
            }
        });
    },

    // ✨ FUNCIONES INTELIGENTES PARA DEPORTE Y CULTURA ✨
    evaluarDeporte: function() {
        let dep = document.getElementById('est-deporte').value;
        let acad = document.getElementById('est-academia-deporte');
        let otro = document.getElementById('est-deporte-otro');
        
        if (dep === 'Ninguna') {
            acad.value = 'No';
            acad.disabled = true; 
            otro.style.display = 'none';
            otro.value = '';
        } else if (dep === 'Otra') {
            acad.disabled = false;
            otro.style.display = 'block';
        } else {
            acad.disabled = false;
            otro.style.display = 'none';
            otro.value = '';
        }
    },

    evaluarCultura: function() {
        let cult = document.getElementById('est-cultura').value;
        let acad = document.getElementById('est-academia-cultura');
        let otro = document.getElementById('est-cultura-otro');
        
        if (cult === 'Ninguno') {
            acad.value = 'No';
            acad.disabled = true;
            otro.style.display = 'none';
            otro.value = '';
        } else if (cult === 'Otro') {
            acad.disabled = false;
            otro.style.display = 'block';
        } else {
            acad.disabled = false;
            otro.style.display = 'none';
            otro.value = '';
        }
    },

    cargarMisEstudiantes: async function() {
        if (!window.Aplicacion.usuario) return;
        let contenedor = document.getElementById('contenedor-mis-estudiantes');
        const cedulaRep = String(window.Aplicacion.usuario.cedula).trim();

        try {
            const { data: expedientes, error } = await window.supabaseDB
                .from('expedientes')
                .select('id, cedula_escolar, nombres, apellidos, nivel_educativo, grado_actual, estatus, rep_parentesco, ficha_actualizada')
                .eq('rep_cedula', cedulaRep)
                .order('nombres', { ascending: true });

            if (error) throw error;
            this.misEstudiantes = expedientes || [];

            if (this.misEstudiantes.length === 0) {
                contenedor.innerHTML = `<div class="text-center py-5"><div class="bg-light d-inline-block p-4 rounded-circle mb-3"><i class="bi bi-person-x text-muted fs-1"></i></div><h4 class="text-dark fw-bold">Sin Estudiantes Vinculados</h4><p class="text-muted">No se encontraron estudiantes asociados a su cédula. Si es representante nuevo, debe vincular al estudiante primero.</p></div>`;
                return;
            }

            let html = '<div class="row g-3">';
            this.misEstudiantes.forEach((est, index) => {
                let badge = est.ficha_actualizada 
                    ? `<span class="badge bg-success shadow-sm rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Ficha 2026</span>`
                    : `<span class="badge bg-danger shadow-sm rounded-pill animate__animated animate__pulse animate__infinite"><i class="bi bi-exclamation-circle-fill me-1"></i>Actualización Requerida</span>`;
                
                let inactivo = est.estatus !== 'Activo' ? `<span class="badge bg-secondary ms-2">${est.estatus}</span>` : '';

                html += `
                <div class="col-md-6 col-lg-4 animate__animated animate__fadeInUp" style="animation-delay: ${index * 0.1}s">
                    <div class="btn-estudiante-sel h-100" onclick="window.ModActualizacion.iniciarActualizacion('${est.id}')">
                        <div class="d-flex align-items-center mb-2">
                            <div class="icono-est shadow-sm"><i class="bi bi-person-bounding-box"></i></div>
                            <div>
                                <h6 class="fw-bold text-dark mb-0 lh-sm">${est.nombres} ${est.apellidos}</h6>
                                <small class="text-muted fw-bold" style="font-size: 0.75rem;">${est.grado_actual}</small>
                            </div>
                        </div>
                        <div class="text-end mt-3">${badge}${inactivo}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
            contenedor.innerHTML = html;

        } catch (e) {
            contenedor.innerHTML = `<div class="alert alert-danger shadow-sm"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error al cargar los datos: ${e.message}</div>`;
        }
    },

    iniciarActualizacion: async function(idExpediente) {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB.from('expedientes').select('*').eq('id', idExpediente).single();
            if (error) throw error;
            this.estudianteActivo = data;
            
            document.getElementById('lbl-nombre-est-top').innerText = `${data.nombres} ${data.apellidos}`;
            document.getElementById('lbl-cedula-est-top').innerText = data.cedula_escolar;
            document.getElementById('lbl-nivel-est-top').innerText = data.grado_actual;

            await this.cargarDiccionarios();
            this.llenarFormularioDesdeFicha(data);

            document.getElementById('fase-selector').style.display = 'none';
            document.getElementById('fase-formulario').style.display = 'block';
            this.irAPaso(1);
            window.Aplicacion.ocultarCarga();

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo cargar el expediente.', 'error');
        }
    },

    volverAlSelector: function() {
        this.estudianteActivo = null;
        document.getElementById('fase-formulario').style.display = 'none';
        document.getElementById('fase-selector').style.display = 'block';
        this.cargarMisEstudiantes(); 
    },

    cargarDiccionarios: async function() {
        try {
            const [rutasReq, dicVzlaReq, empresReq] = await Promise.all([
                window.supabaseDB.from('rutas').select('id_ruta, nombre_ruta, paradas_json').order('nombre_ruta', { ascending: true }),
                window.supabaseDB.from('div_pol_vzla').select('*').order('estado', { ascending: true }),
                window.supabaseDB.from('diccionarios_empresa').select('*')
            ]);
            
            this.rutasTransporte = rutasReq.data || [];
            this.datosEmpresa = empresReq.data || [];
            
            this.diccionarioVzla = {};
            (dicVzlaReq.data || []).forEach(row => {
                if (!this.diccionarioVzla[row.estado]) this.diccionarioVzla[row.estado] = {};
                if (!this.diccionarioVzla[row.estado][row.municipio]) this.diccionarioVzla[row.estado][row.municipio] = [];
                if (!this.diccionarioVzla[row.estado][row.municipio].includes(row.parroquia)) {
                    this.diccionarioVzla[row.estado][row.municipio].push(row.parroquia);
                }
            });

            this.llenarSelect('est-estado-nac', Object.keys(this.diccionarioVzla), 'Seleccione Estado');
            
            let filiales = this.datosEmpresa.filter(e => e.categoria === 'Filial').map(e => e.valor);
            this.llenarSelect('corp-filial', filiales, 'Seleccione Filial');

            let htmlRutas = '<option value="">Seleccione Ruta</option>';
            this.rutasTransporte.forEach(r => { htmlRutas += `<option value="${r.id_ruta}">${r.nombre_ruta}</option>`; });
            document.getElementById('est-ruta').innerHTML = htmlRutas;

        } catch (e) { console.error("Error cargando diccionarios:", e); }
    },

    llenarSelect: function(idSelect, arrValues, placeholder) {
        let select = document.getElementById(idSelect);
        if(!select) return;
        let html = `<option value="">${placeholder}</option>`;
        arrValues.sort().forEach(val => { html += `<option value="${val}">${val}</option>`; });
        select.innerHTML = html;
    },

    cargarMunicipios: function(tipo) {
        let estSel = document.getElementById(`est-estado-${tipo}`).value;
        let munSelect = document.getElementById(`est-municipio-${tipo}`);
        let parrSelect = document.getElementById(`est-parroquia-${tipo}`);
        
        munSelect.innerHTML = '<option value="">Seleccione Municipio</option>';
        parrSelect.innerHTML = '<option value="">Seleccione Parroquia</option>';
        parrSelect.disabled = true;

        if (estSel && this.diccionarioVzla[estSel]) {
            this.llenarSelect(`est-municipio-${tipo}`, Object.keys(this.diccionarioVzla[estSel]), 'Seleccione Municipio');
            munSelect.disabled = false;
        } else {
            munSelect.disabled = true;
        }
    },

    cargarParroquias: function(tipo) {
        let estSel = document.getElementById(`est-estado-${tipo}`).value;
        let munSel = document.getElementById(`est-municipio-${tipo}`).value;
        let parrSelect = document.getElementById(`est-parroquia-${tipo}`);

        parrSelect.innerHTML = '<option value="">Seleccione Parroquia</option>';

        if (estSel && munSel && this.diccionarioVzla[estSel] && this.diccionarioVzla[estSel][munSel]) {
            this.llenarSelect(`est-parroquia-${tipo}`, this.diccionarioVzla[estSel][munSel], 'Seleccione Parroquia');
            parrSelect.disabled = false;
        } else {
            parrSelect.disabled = true;
        }
    },

    cargarGerencias: function() {
        let filial = document.getElementById('corp-filial').value;
        let select = document.getElementById('corp-gerencia');
        
        if (filial) {
            let gerencias = this.datosEmpresa.filter(e => e.categoria === 'Gerencia' && e.valor.includes(filial) || e.categoria === 'Gerencia').map(e => e.valor);
            this.llenarSelect('corp-gerencia', gerencias, 'Seleccione Gerencia');
            select.disabled = false;
        } else {
            select.innerHTML = '<option value="">Seleccione Gerencia</option>';
            select.disabled = true;
        }
    },

    toggleNacionalidad: function() {
        let pais = document.getElementById('est-pais').value;
        let dEst = document.getElementById('div-estado-nac');
        let dMun = document.getElementById('div-municipio-nac');
        let dPar = document.getElementById('div-parroquia-nac');
        let dCiu = document.getElementById('div-ciudad-extranjera');

        if (pais === 'Extranjero') {
            dEst.classList.add('d-none'); dMun.classList.add('d-none'); dPar.classList.add('d-none');
            dCiu.classList.remove('d-none');
        } else {
            dEst.classList.remove('d-none'); dMun.classList.remove('d-none'); dPar.classList.remove('d-none');
            dCiu.classList.add('d-none');
        }
    },

    evaluarCorporativo: function() {
        let rel = document.getElementById('rep-relacion').value;
        let bCorp = document.getElementById('bloque-corporativo');
        
        if (rel === 'Activo' || rel === 'Jubilado' || rel === 'Fallecido') {
            bCorp.style.display = 'block';
        } else {
            bCorp.style.display = 'none';
            document.getElementById('corp-red').value = '';
            document.getElementById('corp-correo').value = '';
            document.getElementById('corp-nomina').value = '';
            document.getElementById('corp-filial').value = '';
            document.getElementById('corp-gerencia').value = '';
            document.getElementById('corp-reconocido').value = '';
            document.getElementById('corp-gerencia').disabled = true;
        }
    },

    toggleTransporte: function() {
        let req = document.getElementById('est-req-transporte').value;
        let selRuta = document.getElementById('est-ruta');
        let selParada = document.getElementById('est-parada');
        
        if (req === 'Si') {
            selRuta.disabled = false;
            if(selRuta.value) selParada.disabled = false;
        } else {
            selRuta.disabled = true;
            selParada.disabled = true;
            selRuta.value = '';
            selParada.innerHTML = '<option value="">Seleccione Parada</option>';
        }
    },

    cargarParadas: function() {
        let rutaId = document.getElementById('est-ruta').value;
        let paradaSelect = document.getElementById('est-parada');
        paradaSelect.innerHTML = '<option value="">Seleccione Parada</option>';
        
        if (!rutaId) { paradaSelect.disabled = true; return; }
        
        let rutaObj = this.rutasTransporte.find(r => r.id_ruta === rutaId);
        if (rutaObj && rutaObj.paradas_json) {
            try {
                let paradasArr = JSON.parse(rutaObj.paradas_json);
                paradasArr.forEach(p => { paradaSelect.innerHTML += `<option value="${p.id_parada}">${p.nombre_parada}</option>`; });
                paradaSelect.disabled = false;
            } catch(e) { paradaSelect.disabled = true; }
        } else {
            paradaSelect.disabled = true;
        }
    },

    copiarDatosRepresentante: function(tipo, modoCarga = false) {
        let chk = document.getElementById(`chk-rep-es-${tipo}`);
        if(!chk) return;

        let repNom = document.getElementById('rep-nombres').value;
        let repCed = document.getElementById('rep-cedula').value;
        let repCodTel = document.getElementById('rep-cod-tel').value;
        let repTel = document.getElementById('rep-telefono').value;
        let repCor = document.getElementById('rep-correo').value;
        let repDir = document.getElementById('rep-direccion').value;
        let repRel = document.getElementById('rep-relacion').value;
        let repProf = document.getElementById('rep-profesion').value;
        
        let isPdvsa = (repRel === 'Activo' || repRel === 'Jubilado' || repRel === 'Fallecido') ? 'Si' : 'No';

        let fieldsText = [`${tipo}-nombres`, `${tipo}-cedula`, `${tipo}-tel`, `${tipo}-correo`, `${tipo}-dir`, `${tipo}-profesion`]; 
        let fieldsSelect = [`${tipo}-cod-tel`, `${tipo}-pdvsa`];

        if (chk.checked) {
            if (!modoCarga && (!repTel || !repDir)) {
                Swal.fire({toast: true, position: 'top-end', icon: 'warning', title: 'Complete los datos del Representante primero (Paso 4)', showConfirmButton: false, timer: 3500});
                chk.checked = false;
                return;
            }

            document.getElementById(`${tipo}-nombres`).value = repNom;
            document.getElementById(`${tipo}-cedula`).value = repCed;
            document.getElementById(`${tipo}-cod-tel`).value = repCodTel;
            document.getElementById(`${tipo}-tel`).value = repTel;
            document.getElementById(`${tipo}-correo`).value = repCor;
            document.getElementById(`${tipo}-dir`).value = repDir;
            document.getElementById(`${tipo}-pdvsa`).value = isPdvsa;
            document.getElementById(`${tipo}-profesion`).value = repProf;

            fieldsText.forEach(id => { let el = document.getElementById(id); if(el) { el.setAttribute('readonly', 'true'); el.classList.add('bg-light'); } });
            fieldsSelect.forEach(id => { let el = document.getElementById(id); if(el) { el.setAttribute('disabled', 'true'); el.classList.add('bg-light'); } });
            
            let dirChk = document.getElementById(`chk-dir-${tipo}`);
            if (dirChk) { dirChk.checked = true; dirChk.disabled = true; }
        } else {
            if (!modoCarga) {
                document.getElementById(`${tipo}-nombres`).value = '';
                document.getElementById(`${tipo}-cedula`).value = '';
                document.getElementById(`${tipo}-tel`).value = '';
                document.getElementById(`${tipo}-correo`).value = '';
                document.getElementById(`${tipo}-dir`).value = '';
                document.getElementById(`${tipo}-pdvsa`).value = '';
                document.getElementById(`${tipo}-profesion`).value = '';
            }
            fieldsText.forEach(id => { let el = document.getElementById(id); if(el) { el.removeAttribute('readonly'); el.classList.remove('bg-light'); } });
            fieldsSelect.forEach(id => { let el = document.getElementById(id); if(el) { el.removeAttribute('disabled'); el.classList.remove('bg-light'); } });
            
            let dirChk = document.getElementById(`chk-dir-${tipo}`);
            if (dirChk) { dirChk.disabled = false; }
        }
    },

    copiarDireccionRepresentante: function(tipo) {
        let chk = document.getElementById(`chk-dir-${tipo}`);
        let dirBox = document.getElementById(`${tipo}-dir`);
        if (chk && chk.checked) {
            dirBox.value = document.getElementById('rep-direccion').value;
            dirBox.setAttribute('readonly', 'true');
            dirBox.classList.add('bg-light');
        } else if (chk) {
            dirBox.value = '';
            dirBox.removeAttribute('readonly');
            dirBox.classList.remove('bg-light');
        }
    },

    llenarFormularioDesdeFicha: function(ficha) {
        if (!ficha) return;
        const setVal = (id, val) => { if(document.getElementById(id) && val) document.getElementById(id).value = val; };

        // Identidad
        setVal('est-nombres', `${ficha.nombres} ${ficha.apellidos}`);
        setVal('est-cedula', ficha.cedula_escolar);
        setVal('est-genero', ficha.genero);

        // Nacimiento
        setVal('est-fecha-nac', ficha.fecha_nac);
        setVal('est-nacionalidad', ficha.nacionalidad);
        if (ficha.pais_origen) {
            setVal('est-pais', ficha.pais_origen);
            this.toggleNacionalidad();
            if (ficha.pais_origen === 'Venezuela') {
                setVal('est-estado-nac', ficha.estado_nac);
                this.cargarMunicipios('nac');
                setTimeout(() => {
                    setVal('est-municipio-nac', ficha.municipio_nac);
                    this.cargarParroquias('nac');
                    setTimeout(() => setVal('est-parroquia-nac', ficha.parroquia_nac), 150);
                }, 150);
            } else {
                setVal('est-ciudad-ext', ficha.ciudad_origen);
            }
        }
        setVal('est-lugar-nac', ficha.lugar_nac);
        setVal('est-folio', ficha.folio);
        setVal('est-acta', ficha.acta);
        setVal('est-fecha-acta', ficha.fecha_acta);

        // Salud y Físico
        setVal('est-talla-f', ficha.talla_franela);
        setVal('est-talla-p', ficha.talla_pantalon);
        setVal('est-talla-z', ficha.talla_zapato);
        setVal('est-estatura', ficha.estatura);
        setVal('est-peso', ficha.peso);
        setVal('est-alergias', ficha.alergias);
        setVal('est-condicion', ficha.condicion_medica);
        setVal('est-pc', ficha.pc);
        setVal('est-internet', ficha.internet);
        setVal('est-celular', ficha.celular);
        
        // ✨ LECTURA INTELIGENTE DE DEPORTES Y CULTURA ✨
        let valDep = ficha.actividad_deportiva;
        let selDep = document.getElementById('est-deporte');
        if (valDep && selDep) {
            let optsDep = Array.from(selDep.options).map(o => o.value);
            if (optsDep.includes(valDep)) {
                setVal('est-deporte', valDep);
            } else {
                setVal('est-deporte', 'Otra');
                document.getElementById('est-deporte-otro').style.display = 'block';
                setVal('est-deporte-otro', valDep);
            }
        }
        this.evaluarDeporte();
        setVal('est-academia-deporte', ficha.academia_deportiva);

        let valCul = ficha.actividad_cultural;
        let selCul = document.getElementById('est-cultura');
        if (valCul && selCul) {
            let optsCul = Array.from(selCul.options).map(o => o.value);
            if (optsCul.includes(valCul)) {
                setVal('est-cultura', valCul);
            } else {
                setVal('est-cultura', 'Otro');
                document.getElementById('est-cultura-otro').style.display = 'block';
                setVal('est-cultura-otro', valCul);
            }
        }
        this.evaluarCultura();
        setVal('est-academia-cultura', ficha.academia_cultural);

        // Representante
        setVal('rep-cedula', ficha.rep_cedula);
        
        if (window.Aplicacion.usuario.cedula === ficha.rep_cedula) {
             setVal('rep-nombres', window.Aplicacion.usuario.nombre);
        }

        setVal('rep-parentesco', ficha.rep_parentesco);
        setVal('rep-relacion', ficha.rep_relacion);
        if(ficha.rep_telefono && ficha.rep_telefono.length > 4) {
            setVal('rep-cod-tel', ficha.rep_telefono.substring(0,4));
            setVal('rep-telefono', ficha.rep_telefono.substring(4));
        }
        setVal('rep-correo', ficha.rep_correo);
        setVal('rep-direccion', ficha.rep_direccion);
        setVal('rep-profesion', ficha.rep_profesion);
        this.evaluarCorporativo();
        
        if (ficha.rep_relacion === 'Activo' || ficha.rep_relacion === 'Jubilado' || ficha.rep_relacion === 'Fallecido') {
            setVal('corp-red', ficha.corp_red || ''); 
            setVal('corp-correo', ficha.rep_correo_pdvsa);
            setVal('corp-nomina', ficha.corp_nomina);
            setVal('corp-filial', ficha.corp_filial);
            this.cargarGerencias();
            setTimeout(() => setVal('corp-gerencia', ficha.corp_gerencia), 150);
            setVal('corp-reconocido', ficha.reconocido_por);
        }

        // Madre
        setVal('madre-nombres', ficha.madre_nombres);
        setVal('madre-cedula', ficha.madre_cedula);
        if(ficha.madre_telefono && ficha.madre_telefono.length > 4) {
            setVal('madre-cod-tel', ficha.madre_telefono.substring(0,4));
            setVal('madre-tel', ficha.madre_telefono.substring(4));
        }
        setVal('madre-correo', ficha.madre_correo);
        setVal('madre-pdvsa', ficha.madre_pdvsa);
        setVal('madre-dir', ficha.madre_direccion);
        setVal('madre-profesion', ficha.madre_profesion);

        if (ficha.madre_cedula && ficha.madre_cedula === ficha.rep_cedula) {
            document.getElementById('chk-rep-es-madre').checked = true;
            this.copiarDatosRepresentante('madre', true);
        } else if (ficha.madre_direccion && ficha.madre_direccion === ficha.rep_direccion) {
            let chkDirM = document.getElementById('chk-dir-madre');
            if(chkDirM) { chkDirM.checked = true; this.copiarDireccionRepresentante('madre'); }
        }

        // Padre
        setVal('padre-nombres', ficha.padre_nombres);
        setVal('padre-cedula', ficha.padre_cedula);
        if(ficha.padre_telefono && ficha.padre_telefono.length > 4) {
            setVal('padre-cod-tel', ficha.padre_telefono.substring(0,4));
            setVal('padre-tel', ficha.padre_telefono.substring(4));
        }
        setVal('padre-correo', ficha.padre_correo);
        setVal('padre-pdvsa', ficha.padre_pdvsa);
        setVal('padre-dir', ficha.padre_direccion);
        setVal('padre-profesion', ficha.padre_profesion);

        if (ficha.padre_cedula && ficha.padre_cedula === ficha.rep_cedula) {
            document.getElementById('chk-rep-es-padre').checked = true;
            this.copiarDatosRepresentante('padre', true);
        } else if (ficha.padre_direccion && ficha.padre_direccion === ficha.rep_direccion) {
            let chkDirP = document.getElementById('chk-dir-padre');
            if(chkDirP) { chkDirP.checked = true; this.copiarDireccionRepresentante('padre'); }
        }

        // Transporte
        let idRuta = ficha.id_ruta_transporte;
        if (idRuta) {
            setVal('est-req-transporte', 'Si');
            this.toggleTransporte();
            setTimeout(() => {
                setVal('est-ruta', idRuta);
                this.cargarParadas();
                setTimeout(() => setVal('est-parada', ficha.id_parada_transporte), 150);
            }, 150);
        } else {
            setVal('est-req-transporte', 'No');
            this.toggleTransporte();
        }
    },

    irAPaso: function(paso) {
        if (paso < 1 || paso > this.totalPasos) return;
        
        let validado = true;
        if (paso > this.pasoActual) {
            for(let i=this.pasoActual; i<paso; i++){
                if(!this.validarPaso(i)) { validado = false; break; }
            }
        }
        if (!validado) return;

        document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('activo'));
        document.getElementById(`paso-${paso}`).classList.add('activo');
        
        document.querySelectorAll('.wizard-step').forEach((s, index) => {
            s.classList.remove('activo', 'completado');
            if (index + 1 < paso) s.classList.add('completado');
            if (index + 1 === paso) s.classList.add('activo');
        });
        
        const spanMovil = document.getElementById('lbl-paso-movil');
        if(spanMovil) spanMovil.innerText = paso;

        this.pasoActual = paso;
        document.getElementById('btn-prev').style.display = paso === 1 ? 'none' : 'inline-block';
        document.getElementById('btn-next').style.display = paso === this.totalPasos ? 'none' : 'inline-block';
        document.getElementById('btn-save').style.display = paso === this.totalPasos ? 'inline-block' : 'none';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    cambiarPaso: function(delta) {
        if (delta === 1 && !this.validarPaso(this.pasoActual)) return;
        this.irAPaso(this.pasoActual + delta);
    },

    validarPaso: function(paso) {
        let valid = true;
        let pAct = document.getElementById(`paso-${paso}`);
        let reqs = pAct.querySelectorAll('.req');
        
        pAct.querySelectorAll('.input-moderno').forEach(el => el.classList.remove('border-danger'));
        
        reqs.forEach(req => {
            let label = req.parentElement;
            let container = label.parentElement;
            let inputs = container.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])');
            
            inputs.forEach(input => {
                if (!input.value.trim() && input.style.display !== 'none' && container.style.display !== 'none' && !container.classList.contains('d-none')) {
                    valid = false;
                    input.classList.add('border-danger');
                }
            });
        });

        if (!valid) Swal.fire({toast: true, position: 'top-end', icon: 'warning', title: 'Complete los campos obligatorios (*)', showConfirmButton: false, timer: 3000});
        return valid;
    },

    guardarActualizacion: async function() {
        if (!this.validarPaso(this.pasoActual)) return;

        const idExpediente = this.estudianteActivo.id;
        const cedula = this.estudianteActivo.cedula_escolar;

        let tR = document.getElementById('rep-telefono').value.trim();
        let telRepLimpio = tR ? document.getElementById('rep-cod-tel').value + tR.replace(/[^0-9]/g,'') : null;
        
        let tM = document.getElementById('madre-tel').value.trim();
        let telMadreLimpio = tM ? document.getElementById('madre-cod-tel').value + tM.replace(/[^0-9]/g,'') : null;
        
        let tP = document.getElementById('padre-tel').value.trim();
        let telPadreLimpio = tP ? document.getElementById('padre-cod-tel').value + tP.replace(/[^0-9]/g,'') : null;

        // ✨ SELECCIÓN FINAL DE DEPORTE Y CULTURA ✨
        let finalDep = document.getElementById('est-deporte').value;
        if (finalDep === 'Otra') finalDep = document.getElementById('est-deporte-otro').value || 'Otra';
        
        let finalCul = document.getElementById('est-cultura').value;
        if (finalCul === 'Otro') finalCul = document.getElementById('est-cultura-otro').value || 'Otro';

        let payloadExpediente = {
            genero: document.getElementById('est-genero').value,
            fecha_nac: document.getElementById('est-fecha-nac').value,
            pais_origen: document.getElementById('est-pais').value,
            nacionalidad: document.getElementById('est-nacionalidad').value,
            estado_nac: document.getElementById('est-estado-nac').value,
            municipio_nac: document.getElementById('est-municipio-nac').value,
            parroquia_nac: document.getElementById('est-parroquia-nac').value,
            ciudad_origen: document.getElementById('est-ciudad-ext').value,
            lugar_nac: document.getElementById('est-lugar-nac').value,
            folio: document.getElementById('est-folio').value,
            acta: document.getElementById('est-acta').value,
            fecha_acta: document.getElementById('est-fecha-acta').value || null,
            
            talla_franela: document.getElementById('est-talla-f').value,
            talla_pantalon: document.getElementById('est-talla-p').value,
            talla_zapato: document.getElementById('est-talla-z').value,
            estatura: document.getElementById('est-estatura').value,
            peso: document.getElementById('est-peso').value,
            alergias: document.getElementById('est-alergias').value,
            condicion_medica: document.getElementById('est-condicion').value,
            pc: document.getElementById('est-pc').value,
            internet: document.getElementById('est-internet').value,
            celular: document.getElementById('est-celular').value,
            
            actividad_deportiva: finalDep,
            academia_deportiva: document.getElementById('est-academia-deporte').value,
            actividad_cultural: finalCul,
            academia_cultural: document.getElementById('est-academia-cultura').value,

            rep_parentesco: document.getElementById('rep-parentesco').value,
            rep_relacion: document.getElementById('rep-relacion').value,
            rep_telefono: telRepLimpio,
            rep_correo: document.getElementById('rep-correo').value,
            rep_profesion: document.getElementById('rep-profesion').value, 
            rep_direccion: document.getElementById('rep-direccion').value,
            
            rep_correo_pdvsa: document.getElementById('corp-correo').value,
            corp_nomina: document.getElementById('corp-nomina').value,
            corp_filial: document.getElementById('corp-filial').value,
            corp_gerencia: document.getElementById('corp-gerencia').value,
            reconocido_por: document.getElementById('corp-reconocido').value,
            
            madre_nombres: document.getElementById('madre-nombres').value,
            madre_cedula: document.getElementById('madre-cedula').value,
            madre_telefono: telMadreLimpio,
            madre_correo: document.getElementById('madre-correo').value,
            madre_pdvsa: document.getElementById('madre-pdvsa').value,
            madre_direccion: document.getElementById('madre-dir').value,
            madre_profesion: document.getElementById('madre-profesion').value, 

            padre_nombres: document.getElementById('padre-nombres').value,
            padre_cedula: document.getElementById('padre-cedula').value,
            padre_telefono: telPadreLimpio,
            padre_correo: document.getElementById('padre-correo').value,
            padre_pdvsa: document.getElementById('padre-pdvsa').value,
            padre_direccion: document.getElementById('padre-dir').value,
            padre_profesion: document.getElementById('padre-profesion').value, 

            id_ruta_transporte: document.getElementById('est-req-transporte').value === 'Si' ? document.getElementById('est-ruta').value : null,
            id_parada_transporte: document.getElementById('est-req-transporte').value === 'Si' ? document.getElementById('est-parada').value : null,

            enc_metodologia: document.getElementById('enc-metodologia').value,
            enc_recursos: document.getElementById('enc-recursos').value,
            enc_medios: document.getElementById('enc-medios').value,
            enc_boletines: document.getElementById('enc-boletines').value,
            enc_actualizacion: document.getElementById('enc-actualizacion').value,
            enc_aportes: document.getElementById('enc-aportes').value,
            
            ficha_actualizada: true,
            updated_at: new Date().toISOString()
        };

        window.Aplicacion.mostrarCarga();
        
        try {
            const { error } = await window.supabaseDB.from('expedientes')
                .update(payloadExpediente)
                .eq('id', idExpediente);

            window.Aplicacion.ocultarCarga();
            
            if (error) throw error;
            
            window.Aplicacion.auditar('Actualización de Datos', 'Actualizar Expediente', `Se actualizó la ficha estructurada del estudiante: ${cedula}`);

            Swal.fire({
                title: '¡Actualización Exitosa!',
                text: 'El expediente ha sido procesado y guardado en la base de datos.',
                icon: 'success',
                confirmButtonColor: '#8b5cf6'
            }).then(() => {
                this.volverAlSelector();
            });

        } catch (err) {
            window.Aplicacion.ocultarCarga();
            console.error(err);
            Swal.fire('Error de Servidor', `No se guardó. Revise que creó las columnas nuevas en la base de datos. Detalle: ${err.message}`, 'error');
        }
    }
};

window.init_Actualizacion_de_Datos = function() { window.ModActualizacion.init(); };