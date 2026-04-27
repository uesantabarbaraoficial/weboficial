/**
 * MÓDULO: GESTIÓN DE MATRÍCULA (Supabase Edition)
 * ✨ Drag & Drop Virtual, Semáforo de Capacidad y Exportación a EXCEL ✨
 */

window.ModMatricula = {
    salones: [],
    espacios: [],
    expedientes: [],
    docentes: [],
    salonActivo: null,
    
    listaDisponibles: [],
    listaMatriculados: [],
    capacidadMaxima: 0,

    init: function() {
        if (!window.Aplicacion.permiso('Gestión de Matrícula', 'ver')) { 
            let vista = document.getElementById('vista-dashboard-matricula');
            if(vista) vista.innerHTML = `<div class="alert alert-danger p-5 text-center mt-4 rounded-4 shadow-sm border-0"><i class="bi bi-shield-lock-fill fs-1 d-block mb-3 text-danger"></i><h4 class="fw-bold">Acceso Denegado</h4><p class="text-muted">No tienes permisos asignados para gestionar matrículas.</p></div>`;
            return;
        }
        this.cargarDatosMaestros();
    },

    cargarDatosMaestros: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [resSalones, resEspacios, resExpedientes, resUsers] = await Promise.all([
                window.supabaseDB.from('salones').select('*').order('nivel_educativo', { ascending: true }),
                window.supabaseDB.from('espacios').select('*'),
                window.supabaseDB.from('expedientes').select('*').eq('estatus', 'Activo'),
                window.supabaseDB.from('usuarios').select('cedula, nombre_completo')
            ]);

            window.Aplicacion.ocultarCarga();

            if (resSalones.error) throw resSalones.error;

            this.salones = resSalones.data || [];
            this.espacios = resEspacios.data || [];
            this.expedientes = resExpedientes.data || [];
            this.docentes = resUsers.data || [];

            this.renderizarDashboard();
        } catch(e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        }
    },

    obtenerNombreDocente: function(cedula) {
        if (!cedula) return 'No asignado';
        let doc = this.docentes.find(d => d.cedula === cedula);
        return doc ? doc.nombre_completo : 'Docente Desconocido';
    },

    filtrarSalones: function() {
        let txt = document.getElementById('buscador-salones-mat').value.toLowerCase();
        let tarjetas = document.querySelectorAll('.tarjeta-salon-item');
        tarjetas.forEach(t => {
            let contenido = t.innerText.toLowerCase();
            t.style.display = contenido.includes(txt) ? 'block' : 'none';
        });
    },

    renderizarDashboard: function() {
        const contenedor = document.getElementById('contenedor-tarjetas-matricula');
        if (this.salones.length === 0) {
            contenedor.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-door-closed fs-1 d-block mb-3"></i><span class="fw-bold">No hay salones aperturados en el sistema.</span></div>`;
            return;
        }

        let html = '';
        this.salones.forEach(salon => {
            let alumnosEnSalon = this.expedientes.filter(e => e.grado_actual === salon.grado_anio && e.seccion_actual === salon.seccion).length;
            let espacio = this.espacios.find(e => e.id === salon.id_espacio);
            let capacidad = espacio ? (espacio.capacidad || 0) : 0;
            let porcentaje = capacidad > 0 ? Math.round((alumnosEnSalon / capacidad) * 100) : 0;
            let colorBarra = porcentaje >= 100 ? 'bg-danger' : (porcentaje >= 80 ? 'bg-warning' : 'bg-primary');
            
            let selectEspacioHtml = '';
            if (!espacio) {
                let opciones = '<option value="">Asigne un espacio físico...</option>';
                this.espacios.forEach(e => opciones += `<option value="${e.id}">${e.nombre} (Cap: ${e.capacidad || 0})</option>`);
                selectEspacioHtml = `
                    <div class="input-group input-group-sm mt-3 shadow-sm">
                        <span class="input-group-text bg-light"><i class="bi bi-geo-alt-fill text-danger"></i></span>
                        <select class="form-select border-secondary text-dark fw-bold" id="sel-espacio-${salon.id_salon}" onchange="window.ModMatricula.asignarEspacio('${salon.id_salon}', this.value)">${opciones}</select>
                    </div>`;
            } else {
                selectEspacioHtml = `<div class="mt-3 small fw-bold text-dark border p-2 rounded bg-light"><i class="bi bi-geo-alt-fill text-success me-1"></i>${espacio.nombre} <span class="badge bg-secondary ms-1">Cap: ${capacidad}</span></div>`;
            }

            let guiaPrincipal = this.obtenerNombreDocente(salon.docente_guia_1);

            html += `
            <div class="col-md-6 col-xl-4 tarjeta-salon-item animate__animated animate__zoomIn">
                <div class="card tarjeta-salon bg-white rounded-4 shadow-sm h-100 border-0">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 shadow-sm">${salon.nivel_educativo}</span>
                            <h4 class="mb-0 fw-bolder text-dark">${salon.seccion}</h4>
                        </div>
                        <h4 class="fw-bold text-dark text-truncate" title="${salon.grado_anio}">${salon.grado_anio}</h4>
                        <p class="small text-muted mb-2 fw-bold"><i class="bi bi-person-video3 me-1 text-secondary"></i>Guía: ${guiaPrincipal}</p>
                        
                        <div class="mt-3">
                            <div class="d-flex justify-content-between small fw-bold mb-1">
                                <span class="text-muted">Matrícula Actual:</span>
                                <span class="${porcentaje >= 100 ? 'text-danger' : 'text-primary'}">${alumnosEnSalon} / ${capacidad || '?'}</span>
                            </div>
                            <div class="progress" style="height: 6px; border-radius: 10px;">
                                <div class="progress-bar ${colorBarra}" role="progressbar" style="width: ${porcentaje}%;"></div>
                            </div>
                        </div>

                        ${selectEspacioHtml}

                        <div class="d-flex gap-2 mt-4 pt-3 border-top">
                            <button class="btn btn-primary btn-sm flex-fill fw-bold shadow-sm rounded-pill hover-efecto" onclick="window.ModMatricula.abrirGestor('${salon.id_salon}')"><i class="bi bi-people-fill me-1"></i> Gestionar</button>
                            <button class="btn btn-outline-danger btn-sm border-2 fw-bold shadow-sm rounded-pill hover-efecto" onclick="window.ModMatricula.generarPDFMatricula('${salon.id_salon}')" title="Descargar Lista"><i class="bi bi-file-earmark-pdf-fill"></i></button>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    asignarEspacio: async function(id_salon, id_espacio) {
        if (!id_espacio) return;
        window.Aplicacion.mostrarCarga();
        try {
            const { error } = await window.supabaseDB.from('salones').update({ id_espacio: id_espacio }).eq('id_salon', id_salon);
            if (error) throw error;
            
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Espacio Asignado', showConfirmButton:false, timer:1500});
            await this.cargarDatosMaestros(); 
        } catch(e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo asignar el espacio.', 'error');
        }
    },

    abrirGestor: function(id_salon) {
        let salon = this.salones.find(s => s.id_salon === id_salon);
        if (!salon) return;

        if (!salon.id_espacio) {
            return Swal.fire('Acción Requerida', 'Debe asignarle un Espacio Físico a este salón en la tarjeta antes de gestionar su matrícula (para conocer el límite de capacidad).', 'warning');
        }

        this.salonActivo = salon;
        
        let espacio = this.espacios.find(e => e.id === salon.id_espacio);
        this.capacidadMaxima = espacio ? (espacio.capacidad || 0) : 0;

        document.getElementById('lbl-mat-salon-nombre').innerText = `${salon.grado_anio} Sección "${salon.seccion}"`;
        document.getElementById('lbl-mat-docente').innerText = this.obtenerNombreDocente(salon.docente_guia_1);
        
        this.listaDisponibles = this.expedientes.filter(e => e.grado_actual === salon.grado_anio && (!e.seccion_actual || e.seccion_actual === 'Por Asignar'));
        this.listaMatriculados = this.expedientes.filter(e => e.grado_actual === salon.grado_anio && e.seccion_actual === salon.seccion);

        this.actualizarUIListas();

        document.getElementById('vista-dashboard-matricula').style.display = 'none';
        document.getElementById('vista-gestor-matricula').style.display = 'block';
    },

    cerrarGestor: function() {
        this.salonActivo = null;
        document.getElementById('vista-gestor-matricula').style.display = 'none';
        document.getElementById('vista-dashboard-matricula').style.display = 'block';
    },

    moverEstudiante: function(id_exp, direccion) {
        if (direccion === 1) {
            if (this.listaMatriculados.length >= this.capacidadMaxima) {
                return Swal.fire('Capacidad Excedida', `El salón ya alcanzó su límite máximo de ${this.capacidadMaxima} estudiantes.`, 'error');
            }
            let index = this.listaDisponibles.findIndex(e => e.id === id_exp);
            if (index > -1) {
                let est = this.listaDisponibles.splice(index, 1)[0];
                this.listaMatriculados.push(est);
            }
        } else {
            let index = this.listaMatriculados.findIndex(e => e.id === id_exp);
            if (index > -1) {
                let est = this.listaMatriculados.splice(index, 1)[0];
                this.listaDisponibles.push(est);
            }
        }
        
        this.listaDisponibles.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
        this.listaMatriculados.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
        
        this.actualizarUIListas();
    },

    actualizarUIListas: function() {
        const cDisp = document.getElementById('lista-estudiantes-disponibles');
        const cMatr = document.getElementById('lista-estudiantes-matriculados');
        
        let htmlDisp = '';
        if (this.listaDisponibles.length === 0) {
            htmlDisp = `<div class="text-center py-5 text-muted small fw-bold"><i class="bi bi-emoji-smile fs-3 d-block mb-2"></i>No hay estudiantes esperando cupo en este grado.</div>`;
        } else {
            this.listaDisponibles.forEach(e => {
                htmlDisp += `
                <div class="item-estudiante">
                    <div><div class="fw-bold text-dark" style="font-size:0.85rem;">${e.apellidos}, ${e.nombres}</div><span class="small text-muted">CI: ${e.cedula_escolar}</span></div>
                    <button class="btn btn-sm btn-primary rounded-circle shadow-sm" onclick="window.ModMatricula.moverEstudiante('${e.id}', 1)" title="Añadir al Salón"><i class="bi bi-arrow-right"></i></button>
                </div>`;
            });
        }
        cDisp.innerHTML = htmlDisp;
        document.getElementById('lbl-total-disponibles').innerText = this.listaDisponibles.length;

        let htmlMatr = '';
        if (this.listaMatriculados.length === 0) {
            htmlMatr = `<div class="text-center py-5 text-muted small fw-bold"><i class="bi bi-inbox fs-3 d-block mb-2"></i>El salón está vacío. Añada estudiantes desde la lista izquierda.</div>`;
        } else {
            this.listaMatriculados.forEach(e => {
                htmlMatr += `
                <div class="item-estudiante border-primary" style="background-color: #f8fafc;">
                    <button class="btn btn-sm btn-outline-danger rounded-circle me-2 border-0" onclick="window.ModMatricula.moverEstudiante('${e.id}', -1)" title="Retirar del Salón"><i class="bi bi-x-lg"></i></button>
                    <div class="flex-grow-1"><div class="fw-bold text-dark" style="font-size:0.85rem;">${e.apellidos}, ${e.nombres}</div><span class="small text-muted">CI: ${e.cedula_escolar}</span></div>
                    <i class="bi bi-check-circle-fill text-success fs-5"></i>
                </div>`;
            });
        }
        cMatr.innerHTML = htmlMatr;
        document.getElementById('lbl-total-matriculados').innerText = this.listaMatriculados.length;

        let total = this.listaMatriculados.length;
        document.getElementById('lbl-mat-capacidad').innerHTML = `<span class="${total >= this.capacidadMaxima ? 'text-danger' : 'text-primary'}">${total}</span> / ${this.capacidadMaxima}`;
        
        let porcentaje = this.capacidadMaxima > 0 ? Math.round((total / this.capacidadMaxima) * 100) : 0;
        let colorBarra = porcentaje >= 100 ? 'bg-danger' : (porcentaje >= 80 ? 'bg-warning' : 'bg-primary');
        let barra = document.getElementById('barra-capacidad');
        barra.style.width = `${porcentaje}%`;
        barra.className = `progress-bar progress-bar-striped progress-bar-animated ${colorBarra}`;
    },

    guardarMatricula: async function() {
        Swal.fire({
            title: '¿Guardar Matrícula Oficial?',
            text: `Se asignarán ${this.listaMatriculados.length} estudiantes a la sección "${this.salonActivo.seccion}".`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, guardar en base de datos', confirmButtonColor: '#3b82f6'
        }).then(async r => {
            if(r.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const updatesMatriculados = this.listaMatriculados.map(e => window.supabaseDB.from('expedientes').update({ seccion_actual: this.salonActivo.seccion }).eq('id', e.id));
                    const updatesDisponibles = this.listaDisponibles.map(e => window.supabaseDB.from('expedientes').update({ seccion_actual: 'Por Asignar' }).eq('id', e.id));

                    await Promise.all([...updatesMatriculados, ...updatesDisponibles]);

                    window.Aplicacion.ocultarCarga();
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Matrícula Oficializada', showConfirmButton: false, timer: 2000});
                    
                    window.Aplicacion.auditar('Gestión de Matrícula', 'Oficializar Salón', `Se estructuró la matrícula del salón: ${this.salonActivo.nombre_salon}`);
                    
                    await this.cargarDatosMaestros();
                    this.cerrarGestor();

                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    console.error(e);
                    Swal.fire('Error Crítico', 'Falla al procesar la inserción en Supabase.', 'error');
                }
            }
        });
    },

    generarPDFMatricula: async function(id_salon) {
        let salon = this.salones.find(s => s.id_salon === id_salon);
        let alumnos = this.expedientes.filter(e => e.grado_actual === salon.grado_anio && e.seccion_actual === salon.seccion);
        
        if (alumnos.length === 0) return Swal.fire('Vacío', 'Este salón aún no tiene estudiantes matriculados.', 'info');
        
        alumnos.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
        Swal.fire({ title: 'Generando PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        setTimeout(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("U.E. Libertador Bolívar", 105, 20, { align: "center" });
            doc.setFontSize(12); doc.setTextColor(100);
            doc.text("Matrícula Oficial de Estudiantes", 105, 27, { align: "center" });
            
            doc.setTextColor(0); doc.setFontSize(10);
            doc.text(`Grado: ${salon.grado_anio}`, 14, 40);
            doc.text(`Sección: "${salon.seccion}"`, 14, 46);
            doc.text(`Docente Guía: ${this.obtenerNombreDocente(salon.docente_guia_1)}`, 100, 40);
            doc.text(`Total Alumnos: ${alumnos.length}`, 100, 46);

            doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(14, 50, 196, 50);

            doc.setFont("helvetica", "bold");
            doc.text("Nº", 14, 58);
            doc.text("Cédula / Escolar", 25, 58);
            doc.text("Apellidos y Nombres", 65, 58);
            doc.text("Género", 160, 58);
            doc.text("Firma", 180, 58);
            doc.line(14, 61, 196, 61);

            doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            let y = 68;
            
            alumnos.forEach((al, index) => {
                if (y > 270) { doc.addPage(); y = 20; }
                
                doc.text(`${index + 1}`, 14, y);
                doc.text(al.cedula_escolar, 25, y);
                doc.text(`${al.apellidos}, ${al.nombres}`, 65, y);
                doc.text(al.genero ? String(al.genero).substring(0,1) : 'N/A', 162, y);
                doc.line(175, y+1, 196, y+1); 

                y += 8;
            });

            doc.save(`Matricula_${salon.grado_anio.replace(/ /g,'_')}_Seccion_${salon.seccion}.pdf`);
            Swal.close();
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'PDF Descargado', showConfirmButton:false, timer:2000});
        }, 500);
    },

    // ✨ MOTOR DE EXPORTACIÓN A EXCEL (CSV UTF-8) ✨
    generarExcel: function(modo) {
        let listaAExportar = [];
        let nombreArchivo = "Matricula";

        if (modo === 'general') {
            // Filtra solo a los que están formalmente en un salón y activos
            listaAExportar = this.expedientes.filter(e => e.seccion_actual && e.seccion_actual !== 'Por Asignar');
            nombreArchivo = "Matricula_General_Completa";
        } else if (modo === 'seccion') {
            if (!this.salonActivo) return;
            // Solo los que están en la columna derecha de este salón específico
            listaAExportar = [...this.listaMatriculados];
            nombreArchivo = `Matricula_${this.salonActivo.grado_anio.replace(/ /g, '_')}_Seccion_${this.salonActivo.seccion}`;
        }

        if (listaAExportar.length === 0) {
            return Swal.fire('Tabla Vacía', 'No hay estudiantes matriculados para generar el Excel.', 'info');
        }

        Swal.fire({ title: 'Procesando Datos...', text: 'Generando archivo de Excel.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        // 1. REGLA DE ORDENAMIENTO (Grado -> Sección -> Cédula)
        listaAExportar.sort((a, b) => {
            let gradoA = a.grado_actual || ''; let gradoB = b.grado_actual || '';
            if (gradoA < gradoB) return -1;
            if (gradoA > gradoB) return 1;
            
            let secA = a.seccion_actual || ''; let secB = b.seccion_actual || '';
            if (secA < secB) return -1;
            if (secA > secB) return 1;
            
            let cedA = parseInt(String(a.cedula_escolar).replace(/\D/g, '') || '0');
            let cedB = parseInt(String(b.cedula_escolar).replace(/\D/g, '') || '0');
            return cedA - cedB;
        });

        // 2. CONSTRUIR ENCABEZADOS DE LAS 60 COLUMNAS
        const headers = [
            "Nivel Educativo", "Grado o Año", "Sección", 
            "Cédula Estudiante", "Apellidos", "Nombres", "Género", "Fecha Nacimiento", "Nacionalidad", "Lugar Nacimiento",
            "Estado Nac.", "Municipio Nac.", "Parroquia Nac.", "País Origen", "Ciudad Origen", "Folio", "Acta", "Fecha Acta",
            "Estado Hab.", "Municipio Hab.", "Parroquia Hab.", "Dirección Exacta", "Vive Con",
            "Talla Franela", "Talla Pantalón", "Talla Calzado", "Estatura", "Peso", "Alergias", "Condición Médica",
            "Posee PC", "Posee Internet", "Posee Celular",
            "Cédula Representante", "Parentesco Rep.", "Relación PDVSA Rep.", "Teléfono Rep.", "Correo Rep.", "Dirección Rep.", "Nómina Corp.", "Filial Corp.", "Gerencia Corp.", "Localidad Rep.",
            "Reconocido Por",
            "Cédula Madre", "Nombres Madre", "Nacionalidad Madre", "Fecha Nac. Madre", "Lugar Nac. Madre", "Teléfono Madre", "Correo Madre", "Dirección Madre", "Nivel Acad. Madre", "Profesión Madre", "Trabaja PDVSA Madre", "Form. Hidro Madre", "Docente Madre",
            "Cédula Padre", "Nombres Padre", "Nacionalidad Padre", "Fecha Nac. Padre", "Lugar Nac. Padre", "Teléfono Padre", "Correo Padre", "Dirección Padre", "Nivel Acad. Padre", "Profesión Padre", "Trabaja PDVSA Padre", "Form. Hidro Padre", "Docente Padre",
            "Ruta Transporte", "Parada Transporte"
        ];

        // Función para escapar comillas y evitar que Excel rompa las columnas
        const escapeCSV = (str) => '"' + String(str || '').replace(/"/g, '""') + '"';
        
        // \uFEFF es el BOM de UTF-8, le dice a Excel que respete los acentos (ñ, á, é)
        let csvContent = "\uFEFF" + headers.join(';') + '\n';
        
        // 3. LLENADO DE FILAS
        listaAExportar.forEach(e => {
            let row = [
                e.nivel_educativo, e.grado_actual, e.seccion_actual,
                e.cedula_escolar, e.apellidos, e.nombres, e.genero, e.fecha_nac, e.nacionalidad, e.lugar_nac,
                e.estado_nac, e.municipio_nac, e.parroquia_nac, e.pais_origen, e.ciudad_origen, e.folio, e.acta, e.fecha_acta,
                e.estado_hab, e.municipio_hab, e.parroquia_hab, e.direccion_origen, e.vive_con,
                e.talla_franela, e.talla_pantalon, e.talla_zapato, e.estatura, e.peso, e.alergias, e.condicion_medica,
                e.pc, e.internet, e.celular,
                e.rep_cedula, e.rep_parentesco, e.rep_relacion, e.rep_telefono, e.rep_correo, e.rep_direccion, e.corp_nomina, e.corp_filial, e.corp_gerencia, e.rep_localidad,
                e.reconocido_por,
                e.madre_cedula, e.madre_nombres, e.madre_nacionalidad, e.madre_fecha_nac, e.madre_lugar_nac, e.madre_telefono, e.madre_correo, e.madre_direccion, e.madre_nivel_acad, e.madre_profesion, e.madre_pdvsa, e.madre_hidro, e.madre_docente,
                e.padre_cedula, e.padre_nombres, e.padre_nacionalidad, e.padre_fecha_nac, e.padre_lugar_nac, e.padre_telefono, e.padre_correo, e.padre_direccion, e.padre_nivel_acad, e.padre_profesion, e.padre_pdvsa, e.padre_hidro, e.padre_docente,
                e.id_ruta_transporte, e.id_parada_transporte
            ];
            // Se usa ; en lugar de , para que el Excel en español separe bien las columnas
            csvContent += row.map(escapeCSV).join(';') + '\n';
        });

        // 4. DESCARGA SILENCIOSA
        setTimeout(() => {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", nombreArchivo + ".csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Swal.close();
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Excel Descargado', showConfirmButton: false, timer: 2000});
        }, 500);
    }
};

window.init_Gestion_de_Matricula = function() { if(window.ModMatricula) window.ModMatricula.init(); };
window.init_Gestión_de_Matrícula = function() { if(window.ModMatricula) window.ModMatricula.init(); };
window.init_Gestion_de_Matriculas = function() { if(window.ModMatricula) window.ModMatricula.init(); };
window.init_Gestión_de_Matrículas = function() { if(window.ModMatricula) window.ModMatricula.init(); };