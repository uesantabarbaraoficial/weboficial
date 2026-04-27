/**
 * MÓDULO: DOCENTES Y PERSONAL (Carga Académica, Horarios Propios y Cargos)
 * ✨ INCLUYE AUDITORÍA ✨
 */

const ModDocentes = {
    listaPersonal: [], listaCargos: [], listaAsignaciones: [], 
    datosNiveles:[], datosGrados: [], datosAsignaturas: [], datosHorarios: [],
    cargaTemp:[], 

    // ==========================================
    // 1. ASIGNAR CARGA ACADÉMICA
    // ==========================================
    initCargaAcademica: function() {
        Aplicacion.peticion({ action: "get_school_config" }, (resCfg) => {
            this.datosNiveles = resCfg.niveles ||[];
            Aplicacion.peticion({ action: "get_grades" }, (resG) => {
                this.datosGrados = resG.grados ||[];
                Aplicacion.peticion({ action: "get_subjects" }, (resS) => {
                    this.datosAsignaturas = resS.asignaturas ||[];
                    Aplicacion.peticion({ action: "get_schedules" }, (resH) => {
                        this.datosHorarios = resH.horarios ||[];
                        Aplicacion.peticion({ action: "get_users" }, (resU) => {
                            this.listaPersonal = resU.users.filter(u => u.rol==='Docente' || u.rol==='Director');
                            
                            const sN = document.getElementById('ca-nivel');
                            if(sN) sN.innerHTML = '<option value="">-- Nivel Educativo --</option>' + 
                                this.datosNiveles.map(n => `<option value="${n.id}">${n.nombre}</option>`).join('');
                        });
                    });
                });
            });
        });
    },

    caSelectNivel: function() {
        const nId = document.getElementById('ca-nivel').value;
        const sG = document.getElementById('ca-grado');
        const sS = document.getElementById('ca-seccion');
        
        sS.innerHTML = '<option value="">-- Sección --</option>'; sS.disabled = true;
        document.getElementById('ca-grid').innerHTML = '<div class="text-center py-5 text-muted">Seleccione Grado y Sección</div>';
        document.getElementById('btn-guardar-ca').disabled = true;

        if(!nId) { sG.innerHTML = '<option value="">-- Grado/Año --</option>'; sG.disabled = true; return; }

        const nombreNivel = this.datosNiveles.find(x => String(x.id) === String(nId))?.nombre;
        const gradosFiltrados = this.datosGrados.filter(g => g.nivel === nombreNivel);
        
        sG.innerHTML = '<option value="">-- Grado/Año --</option>' + gradosFiltrados.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
        sG.disabled = false;
    },

    caSelectGrado: function() {
        const gId = document.getElementById('ca-grado').value;
        const sS = document.getElementById('ca-seccion');
        document.getElementById('ca-grid').innerHTML = '<div class="text-center py-5 text-muted">Seleccione Sección</div>';
        document.getElementById('btn-guardar-ca').disabled = true;

        if(!gId) { sS.innerHTML = '<option value="">-- Sección --</option>'; sS.disabled = true; return; }

        const grado = this.datosGrados.find(x => String(x.id) === String(gId));
        sS.innerHTML = '<option value="">-- Sección --</option>' + (grado.secciones ||[]).map(s => `<option value="${s}">Sección ${s}</option>`).join('');
        sS.disabled = false;
    },

    caDibujarGrid: function() {
        const nId = document.getElementById('ca-nivel').value;
        const gId = document.getElementById('ca-grado').value;
        const sec = document.getElementById('ca-seccion').value;
        const grid = document.getElementById('ca-grid');
        
        if(!nId || !gId || !sec) { grid.innerHTML = '<div class="text-center py-5">Selección incompleta</div>'; return; }

        const horarioObj = this.datosHorarios.find(h => String(h.nivel_id) === String(nId));
        if(!horarioObj || !horarioObj.bloques || horarioObj.bloques.length === 0) {
            grid.innerHTML = `<div class="alert alert-warning border-0"><i class="bi bi-exclamation-triangle-fill"></i> No hay estructura de horario creada para este Nivel en "Escuela -> Estructura de Horarios".</div>`;
            return;
        }

        grid.innerHTML = '<div class="spinner-border text-primary my-4"></div>';
        Aplicacion.peticion({ action: "get_carga", grado_id: gId, seccion: sec }, (res) => {
            this.cargaTemp = res.cargas ||[];
            
            const bloques = horarioObj.bloques.sort((a,b) => a.inicio.localeCompare(b.inicio));
            const formatH = (h) => { let [hh, mm] = h.split(':'); let ampm = hh>=12?'pm':'am'; hh=hh%12||12; return `${hh}:${mm} ${ampm}`; };
            const dias =['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

            let html = `<table class="w-100" style="border-collapse: separate; border-spacing: 4px;">
                <thead><tr class="text-center fw-bold text-white"><td style="width:12%;"></td>
                ${dias.map((d, i) => `<td class="py-2 rounded-3 shadow-sm" style="width:17%; background: ${['#0066FF','#00C3FF','#FF8D00','#FF007A','#00E676'][i]};">${d}</td>`).join('')}
                </tr></thead><tbody>`;

            bloques.forEach((b) => {
                const rango = `${formatH(b.inicio)} - ${formatH(b.fin)}`;
                if(b.tipo === 'Receso') {
                    html += `<tr><td class="text-center fw-bold small text-muted bg-light rounded-start">${rango}</td><td colspan="5" class="text-center fw-bold text-white rounded-end" style="background:#FF8D00; letter-spacing:5px;">R E C E S O</td></tr>`;
                } else if(b.tipo === 'Entrada' || b.tipo === 'Salida') {
                    html += `<tr><td class="text-center fw-bold small text-muted">${rango}</td><td colspan="5" class="text-center fw-bold text-white rounded-3" style="background:#2b3674;">${b.tipo.toUpperCase()}</td></tr>`;
                } else {
                    html += `<tr><td class="text-center fw-bold small text-dark bg-white border rounded-3">${rango}</td>`;
                    dias.forEach(dia => {
                        const cellData = this.cargaTemp.find(c => c.dia === dia && c.inicio === b.inicio);
                        if(cellData) {
                            html += `<td class="border border-primary rounded-3 bg-primary bg-opacity-10 p-2 cursor-pointer hover-efecto text-center" style="height:70px; font-size:0.85rem;" onclick="ModDocentes.caModalCelda('${dia}', '${b.inicio}', '${b.fin}')">
                                <div class="fw-bold text-primary text-truncate" title="${cellData.asignatura_nombre}">${cellData.asignatura_nombre}</div>
                                <div class="text-muted small mt-1 text-truncate" title="${cellData.docente_nombre}"><i class="bi bi-person-fill"></i> ${cellData.docente_nombre.split(' ')[0]} ${cellData.docente_nombre.split(' ')[1]||''}</div>
                            </td>`;
                        } else {
                            html += `<td class="border border-2 border-light bg-light rounded-3 cursor-pointer hover-efecto text-center text-muted small" style="height:70px;" onclick="ModDocentes.caModalCelda('${dia}', '${b.inicio}', '${b.fin}')"><i class="bi bi-plus-circle opacity-50 fs-4"></i></td>`;
                        }
                    });
                    html += `</tr>`;
                }
            });
            html += `</tbody></table>`;
            grid.innerHTML = html;
            document.getElementById('btn-guardar-ca').disabled = false;
        });
    },

    caModalCelda: function(dia, inicio, fin) {
        const nId = document.getElementById('ca-nivel').value;
        const celdaIndex = this.cargaTemp.findIndex(c => c.dia === dia && c.inicio === inicio);
        const existe = celdaIndex !== -1;
        const cellData = existe ? this.cargaTemp[celdaIndex] : { asignatura_id: '', docente_cedula: '' };

        const asigOpt = '<option value="">-- Asignatura --</option>' + 
            this.datosAsignaturas.filter(a => String(a.nivel_id)===String(nId)).map(a => `<option value="${a.id}" data-nom="${a.nombre}" ${cellData.asignatura_id===a.id?'selected':''}>${a.nombre}</option>`).join('');
        
        const docOpt = '<option value="">-- Docente --</option>' + 
            this.listaPersonal.map(d => `<option value="${d.cedula}" data-nom="${d.nombre}" ${cellData.docente_cedula===String(d.cedula)?'selected':''}>${d.nombre}</option>`).join('');

        let btns = `<button type="button" class="swal2-confirm swal2-styled" style="background-color: var(--color-primario);" onclick="Swal.clickConfirm()">Asignar</button>`;
        if(existe) btns += `<button type="button" class="swal2-deny swal2-styled" style="background-color: #FF3D00;" onclick="Swal.clickDeny()">Borrar Celda</button>`;

        Swal.fire({
            title: `Asignar: ${dia} (${inicio})`,
            html: `
                <div class="text-start mt-3">
                    <label class="small fw-bold text-muted mb-1">Asignatura / Materia</label>
                    <select id="md-asig" class="input-moderno mb-3">${asigOpt}</select>
                    <label class="small fw-bold text-muted mb-1">Docente Imparte</label>
                    <select id="md-doc" class="input-moderno mb-1">${docOpt}</select>
                </div>
            `,
            showConfirmButton: false, showDenyButton: false, showCancelButton: true, cancelButtonText: 'Cancelar',
            footer: btns,
            preConfirm: () => {
                const a = document.getElementById('md-asig'); const d = document.getElementById('md-doc');
                if(!a.value || !d.value) { Swal.showValidationMessage('Seleccione Asignatura y Docente'); return false; }
                return { a_id: a.value, a_nom: a.options[a.selectedIndex].getAttribute('data-nom'), d_ced: d.value, d_nom: d.options[d.selectedIndex].getAttribute('data-nom') };
            }
        }).then(res => {
            if(res.isConfirmed && res.value) {
                const nObj = { dia, inicio, fin, asignatura_id: res.value.a_id, asignatura_nombre: res.value.a_nom, docente_cedula: res.value.d_ced, docente_nombre: res.value.d_nom };
                if(existe) this.cargaTemp[celdaIndex] = nObj; else this.cargaTemp.push(nObj);
                this.caDibujarGrid();
            } else if (res.isDenied && existe) {
                this.cargaTemp.splice(celdaIndex, 1);
                this.caDibujarGrid();
            }
        });
    },

    caGuardar: function() {
        const gId = document.getElementById('ca-grado').value;
        const sec = document.getElementById('ca-seccion').value;
        if(!gId || !sec) return;

        Aplicacion.peticion({ action: "save_carga_seccion", grado_id: gId, seccion: sec, cargas: this.cargaTemp }, (res) => {
            if(res.status === 'success') {
                Swal.fire({toast:true, position:'top-end', icon:'success', title:'Horario Guardado', showConfirmButton:false, timer:1500});
                // ✨ AUDITORÍA ✨
                window.Aplicacion.auditar('Asignar Guiaturas', 'Actualizar Horario', `Se actualizó la carga académica para el grado ID: ${gId}, sección: ${sec}`);
            }
        });
    },

    // ==========================================
    // 2. VER HORARIO (DOCENTE)
    // ==========================================
    initVerHorario: function() {
        if(!Aplicacion.usuario) return;
        document.getElementById('lbl-nombre-docente-horario').innerText = Aplicacion.usuario.nombre;
        document.getElementById('pdf-docente-nombre').innerText = Aplicacion.usuario.nombre;

        const grid = document.getElementById('mi-horario-grid');
        grid.innerHTML = '<div class="spinner-border text-primary mx-auto d-block my-5"></div>';

        Aplicacion.peticion({ action: "get_carga_docente", docente_cedula: Aplicacion.usuario.cedula }, (res) => {
            const cargas = res.cargas ||[];
            if(cargas.length === 0) { grid.innerHTML = '<div class="text-center text-muted py-5">Usted no tiene carga académica asignada.</div>'; return; }

            let bloquesUnicos =[];
            cargas.forEach(c => {
                if(!bloquesUnicos.find(b => b.inicio === c.inicio)) bloquesUnicos.push({inicio: c.inicio, fin: c.fin});
            });
            bloquesUnicos.sort((a,b) => a.inicio.localeCompare(b.inicio));

            const formatH = (h) => { let [hh, mm] = h.split(':'); let ampm = hh>=12?'pm':'am'; hh=hh%12||12; return `${hh}:${mm} ${ampm}`; };
            const dias =['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

            let html = `<table class="w-100" style="border-collapse: separate; border-spacing: 5px;">
                <thead><tr class="text-center fw-bold text-white"><td style="width:15%;"></td>
                ${dias.map((d, i) => `<td class="py-2 rounded-3 shadow-sm" style="width:17%; background: ${['#0066FF','#00C3FF','#FF8D00','#FF007A','#00E676'][i]};">${d}</td>`).join('')}
                </tr></thead><tbody>`;

            bloquesUnicos.forEach(b => {
                const rango = `${formatH(b.inicio)} - ${formatH(b.fin)}`;
                html += `<tr><td class="text-center fw-bold small text-dark bg-light rounded-3 align-middle border">${rango}</td>`;
                
                dias.forEach(dia => {
                    const celdasDiaHora = cargas.filter(c => c.dia === dia && c.inicio === b.inicio);
                    if(celdasDiaHora.length > 0) {
                        html += `<td class="border border-primary rounded-3 bg-white p-2 text-center align-middle shadow-sm" style="height:70px;">`;
                        celdasDiaHora.forEach(cd => {
                            html += `<div class="fw-bold text-primary lh-sm" style="font-size:0.9rem;">${cd.asignatura_nombre}</div>
                                     <div class="badge bg-light text-dark border mt-1"><i class="bi bi-mortarboard-fill text-muted me-1"></i>${cd.grado_nombre} "${cd.seccion}"</div>`;
                        });
                        html += `</td>`;
                    } else {
                        html += `<td class="border border-2 border-light bg-light bg-opacity-50 rounded-3 text-center" style="height:70px;"></td>`;
                    }
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
            grid.innerHTML = html;
        });
    },

    descargarMiHorario: async function() {
        const elemento = document.getElementById('lienzo-mi-horario'); Aplicacion.mostrarCarga();
        await new Promise(r => setTimeout(r, 500));
        const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf; const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth(); const pdfH = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData); const ratio = imgProps.width / imgProps.height;
        let w = pdfW - 20; let h = w / ratio; if (h > pdfH - 20) { h = pdfH - 20; w = h * ratio; }
        pdf.addImage(imgData, 'PNG', (pdfW - w)/2, (pdfH - h)/2, w, h);
        pdf.save(`Horario_Clases_${Aplicacion.usuario.nombre.replace(/\s+/g,'_')}.pdf`); 
        
        // ✨ AUDITORÍA ✨
        window.Aplicacion.auditar('Asignar Guiaturas', 'Descargar Horario', 'El docente descargó su horario en formato PDF');

        Aplicacion.ocultarCarga(); Swal.fire('Descargado', '', 'success');
    },

    // ==========================================
    // 3. ASIGNAR CARGOS (Directivos/Admin)
    // ==========================================
    initAsignar: function() {
        Aplicacion.peticion({ action: "get_users" }, (resU) => { this.listaPersonal = resU.users ||[]; Aplicacion.peticion({ action: "get_positions" }, (resC) => { this.listaCargos = resC.cargos ||[]; Aplicacion.peticion({ action: "get_assigned_staff" }, (resA) => { this.listaAsignaciones = resA.assignments ||[]; this.renderizarSelectsAsignacion(); this.dibujarTablaAsignaciones(); }); }); });
    },
    renderizarSelectsAsignacion: function() {
        const selPer = document.getElementById('sel-personal'); const selCar = document.getElementById('sel-cargo');
        const personalAsignadoIds = this.listaAsignaciones.map(a => String(a.cedula));
        const pDisp = this.listaPersonal.filter(p => !personalAsignadoIds.includes(String(p.cedula)));
        if(selPer) selPer.innerHTML = '<option value="">-- Seleccionar Persona --</option>' + pDisp.map(p => `<option value="${p.cedula}" data-nombre="${p.nombre}">${p.nombre} (V-${p.cedula})</option>`).join('');
        if(selCar) selCar.innerHTML = '<option value="">-- Seleccionar Cargo --</option>' + this.listaCargos.map(c => `<option value="${c.id}" data-nombre="${c.nombre}">${c.nombre} (${c.tipo})</option>`).join('');
    },
    dibujarTablaAsignaciones: function() {
        const tbody = document.getElementById('tabla-asignaciones'); if(!tbody) return;
        if (this.listaAsignaciones.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Aún no hay cargos asignados.</td></tr>';
        else tbody.innerHTML = this.listaAsignaciones.map(a => `<tr><td class="fw-bold text-dark">${a.nombre}</td><td>V-${a.cedula}</td><td><span class="badge" style="background: rgba(0, 230, 118, 0.15); color: #008f4c; border: 1px solid #008f4c;">${a.cargoNombre}</span></td><td class="text-end celda-acciones"><button onclick="ModDocentes.eliminarAsignacion('${a.cedula}')" class="btn-circulo btn-peligro"><i class="bi bi-person-dash-fill"></i></button></td></tr>`).join('');
    },
    guardarAsignacion: function() {
        const sP = document.getElementById('sel-personal'), sC = document.getElementById('sel-cargo');
        if(!sP.value || !sC.value) return Swal.fire('Faltan Datos', 'Seleccione persona y cargo.', 'warning');
        Aplicacion.peticion({ action: "save_staff_assignment", cedula: sP.value, nombre: sP.options[sP.selectedIndex].getAttribute('data-nombre'), cargoId: sC.value, cargoNombre: sC.options[sC.selectedIndex].getAttribute('data-nombre') }, (res) => { 
            if(res.status === 'success') { 
                Swal.fire('Asignado', '', 'success'); 
                // ✨ AUDITORÍA ✨
                window.Aplicacion.auditar('Asignar Guiaturas', 'Asignar Cargo', `Se asignó el cargo ID: ${sC.value} a la cédula: ${sP.value}`);
                this.initAsignar(); 
            } 
        });
    },
    eliminarAsignacion: function(cedula) {
        Swal.fire({ title: '¿Liberar Cargo?', text: "Saldrá del organigrama.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#FF3D00' }).then(r => { 
            if(r.isConfirmed) Aplicacion.peticion({ action: "delete_staff_assignment", cedula }, (res) => { 
                if(res.status === 'success') {
                    // ✨ AUDITORÍA ✨
                    window.Aplicacion.auditar('Asignar Guiaturas', 'Liberar Cargo', `Se liberó el cargo de la cédula: ${cedula}`);
                    this.initAsignar(); 
                }
            }); 
        });
    }
};

window['init_Asignar_Carga_Académica'] = function() { ModDocentes.initCargaAcademica(); };
window['init_Ver_Horario'] = function() { ModDocentes.initVerHorario(); };
window['init_Asignar_Cargos'] = function() { ModDocentes.initAsignar(); };