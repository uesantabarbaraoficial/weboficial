/**
 * MÓDULO: GESTIÓN DE COLECTIVOS (Supabase Edition)
 * Pestañas, Distribución UX mejorada, Auditoría Total y Exportación PDF
 */

window.ModColectivos = {
    colectivos: [],
    personal: [],
    colectivoActual: null,

    init: function() {
        if (!window.Aplicacion.permiso('Gestión de Colectivos', 'ver')) {
            let contenedor = document.querySelector('.row.g-4.animate__animated.animate__fadeInUp');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar las organizaciones escolares.</p>
                </div>`;
            }
            return; 
        }

        // Permisos de botones
        if (!window.Aplicacion.permiso('Gestión de Colectivos', 'crear')) {
            let btnNuevo = document.querySelector('button[onclick="window.ModColectivos.nuevoColectivo()"]');
            if (btnNuevo) btnNuevo.style.display = 'none';
        }

        this.cargarDatos();
    },

    cambiarPestana: function(pestana) {
        document.getElementById('tab-gestion').classList.remove('activo');
        document.getElementById('tab-visor').classList.remove('activo');
        document.getElementById('seccion-gestion').classList.add('d-none');
        document.getElementById('seccion-visor').classList.add('d-none');

        document.getElementById(`tab-${pestana}`).classList.add('activo');
        document.getElementById(`seccion-${pestana}`).classList.remove('d-none');

        if (pestana === 'visor') {
            this.renderizarVisorPDF();
        }
    },

    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [resCol, resUsers] = await Promise.all([
                window.supabaseDB.from('colectivos').select('*').order('nombre', { ascending: true }),
                window.supabaseDB.from('usuarios').select('id_usuario, cedula, nombre_completo, rol')
            ]);

            if (resCol.error) throw resCol.error;
            if (resUsers.error) throw resUsers.error;

            this.colectivos = resCol.data || [];
            
            // Excluimos alumnos y representantes para el personal
            const rolesExcluidos = ["Estudiante", "Representante", "Invitado"];
            this.personal = (resUsers.data || []).filter(u => !rolesExcluidos.includes(u.rol)).sort((a,b) => a.nombre_completo.localeCompare(b.nombre_completo));
            
            this.renderizarLista();
            this.dibujarSelectPersonal();
            this.dibujarCheckboxesIntegrantes();
            
            document.getElementById('panel-gestion').style.display = 'none';
            document.getElementById('panel-vacio').style.display = 'flex';

            window.Aplicacion.ocultarCarga();
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "Falla al conectar con Supabase.", "error");
        }
    },

    renderizarLista: function() {
        const lista = document.getElementById('lista-colectivos');
        if (this.colectivos.length === 0) {
            lista.innerHTML = `<div class="p-4 text-center text-muted"><i class="bi bi-inbox fs-2"></i><p class="mb-0 mt-2 small">No hay colectivos registrados</p></div>`;
            return;
        }

        let html = '';
        this.colectivos.forEach(col => {
            let numIntegrantes = col.integrantes ? col.integrantes.split(',').length : 0;
            html += `
            <a href="javascript:void(0)" class="list-group-item list-group-item-action p-3 border-0 border-bottom d-flex align-items-center hover-efecto" onclick="window.ModColectivos.verDetalles('${col.id}')">
                <div class="bg-danger bg-opacity-10 text-danger p-2 rounded-3 me-3"><i class="bi bi-diagram-3-fill"></i></div>
                <div>
                    <div class="fw-bold text-dark">${col.nombre}</div>
                    <div class="small text-muted" style="font-size: 0.75rem;"><i class="bi bi-people me-1"></i>${numIntegrantes} Miembros</div>
                </div>
            </a>`;
        });
        lista.innerHTML = html;
    },

    dibujarSelectPersonal: function() {
        const selectAsesor = document.getElementById('col-asesor');
        const selectVocero = document.getElementById('col-vocero');
        let html = '<option value="">Seleccione personal...</option>';
        
        this.personal.forEach(p => {
            html += `<option value="${p.nombre_completo}">${p.nombre_completo} (${p.rol})</option>`;
        });
        
        if(selectAsesor) selectAsesor.innerHTML = html;
        if(selectVocero) selectVocero.innerHTML = html;
    },

    dibujarCheckboxesIntegrantes: function() {
        const contenedor = document.getElementById('contenedor-integrantes');
        if(!contenedor) return;
        
        let html = '';
        this.personal.forEach(p => {
            html += `
            <div class="col-md-6 col-xl-4">
                <div class="form-check bg-white p-2 rounded border shadow-sm" style="padding-left: 2.2rem !important;">
                    <input class="form-check-input chk-integrante border-danger" type="checkbox" value="${p.nombre_completo}" id="chk-${p.id_usuario}" style="cursor: pointer;">
                    <label class="form-check-label small fw-bold text-dark w-100" for="chk-${p.id_usuario}" style="cursor: pointer;">
                        ${p.nombre_completo} <br><span class="text-muted fw-normal" style="font-size: 0.7rem;">${p.rol}</span>
                    </label>
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    nuevoColectivo: function() {
        if (!window.Aplicacion.permiso('Gestión de Colectivos', 'crear')) return Swal.fire('Acceso Denegado', 'No posees privilegios de creación.', 'error');

        this.colectivoActual = null;
        document.getElementById('form-colectivo').reset();
        document.getElementById('col-id').value = '';
        
        document.getElementById('titulo-panel').innerText = 'Nuevo Colectivo';
        document.getElementById('btn-eliminar-col').style.display = 'none';
        
        document.querySelectorAll('.chk-integrante').forEach(chk => chk.checked = false);
        
        document.getElementById('panel-vacio').style.display = 'none';
        document.getElementById('panel-gestion').style.display = 'block';

        this.gestionarBotonesFormulario();
    },

    verDetalles: function(id) {
        const col = this.colectivos.find(c => String(c.id) === String(id));
        if (!col) return;
        
        this.colectivoActual = col;
        
        document.getElementById('titulo-panel').innerText = 'Editar: ' + col.nombre;
        
        document.getElementById('col-id').value = col.id;
        document.getElementById('col-nombre').value = col.nombre || '';
        document.getElementById('col-descripcion').value = col.descripcion || '';
        document.getElementById('col-asesor').value = col.asesor || '';
        document.getElementById('col-vocero').value = col.vocero || '';
        
        let integrantesActuales = (col.integrantes || "").split(',').map(s => s.trim());
        document.querySelectorAll('.chk-integrante').forEach(chk => {
            chk.checked = integrantesActuales.includes(chk.value);
        });
        
        document.getElementById('btn-eliminar-col').style.display = window.Aplicacion.permiso('Gestión de Colectivos', 'eliminar') ? 'inline-block' : 'none';
        
        document.getElementById('panel-vacio').style.display = 'none';
        document.getElementById('panel-gestion').style.display = 'block';

        this.gestionarBotonesFormulario();
    },

    gestionarBotonesFormulario: function() {
        let pCrear = window.Aplicacion.permiso('Gestión de Colectivos', 'crear');
        let btnGuardar = document.getElementById('btn-guardar-col');

        if (btnGuardar) btnGuardar.style.display = pCrear ? 'inline-block' : 'none';

        document.querySelectorAll('#form-colectivo input, #form-colectivo select, #form-colectivo textarea').forEach(el => {
            el.disabled = !pCrear;
        });
    },

    // ✨ GUARDADO UNIFICADO CON DETECTOR DE ERRORES ✨
    guardarColectivo: async function() {
        if (!window.Aplicacion.permiso('Gestión de Colectivos', 'crear')) return Swal.fire('Error', 'Privilegios insuficientes.', 'error');

        const id = document.getElementById('col-id').value;
        const nombre = document.getElementById('col-nombre').value.trim();
        const descripcion = document.getElementById('col-descripcion').value.trim();
        const asesor = document.getElementById('col-asesor').value;
        const vocero = document.getElementById('col-vocero').value;

        if (!nombre) return Swal.fire("Campo Obligatorio", "Debe ingresar el Nombre de la organización.", "warning");

        let seleccionados = [];
        document.querySelectorAll('.chk-integrante:checked').forEach(chk => seleccionados.push(chk.value));
        const integrantes = seleccionados.join(', ');

        window.Aplicacion.mostrarCarga();
        try {
            const payload = { nombre, descripcion, asesor, vocero, integrantes };
            let accion = id ? 'Editar Organización' : 'Nueva Organización';
            let errorGuardado;

            if (id) {
                const { error } = await window.supabaseDB.from('colectivos').update(payload).eq('id', id);
                errorGuardado = error;
            } else {
                payload.id = 'COL-' + new Date().getTime();
                const { error } = await window.supabaseDB.from('colectivos').insert([payload]);
                errorGuardado = error;
            }

            // ✨ DETECTOR EXACTO DE ERRORES ✨
            if (errorGuardado) {
                console.error("Error devuelto por Supabase:", errorGuardado);
                window.Aplicacion.ocultarCarga();
                return Swal.fire("Bloqueo de Supabase", `Detalle: ${errorGuardado.message || errorGuardado.details}`, "error");
            }

            window.Aplicacion.ocultarCarga();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Colectivo Guardado', showConfirmButton: false, timer: 2000 });
            
            // ✨ AUDITORÍA ✨
            window.Aplicacion.auditar('Gestión de Colectivos', accion, `Se guardó la información e integrantes de: ${nombre}`);
            
            this.nuevoColectivo(); // Limpia la pantalla para un nuevo ingreso
            this.cargarDatos(); 

        } catch(e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire("Error", `Falla de código JS: ${e.message}`, "error");
        }
    },

    eliminarColectivo: function() {
        if (!window.Aplicacion.permiso('Gestión de Colectivos', 'eliminar')) return Swal.fire('Error', 'No tienes permiso para eliminar.', 'error');

        const id = document.getElementById('col-id').value;
        if (!id) return;

        Swal.fire({
            title: '¿Eliminar Organización?',
            text: "Se borrará este colectivo y todas sus asignaciones.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('colectivos').delete().eq('id', id);
                    
                    if(error) {
                        window.Aplicacion.ocultarCarga();
                        return Swal.fire("Error BD", `Detalle: ${error.message}`, "error");
                    }

                    window.Aplicacion.ocultarCarga();
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500 });
                    
                    window.Aplicacion.auditar('Gestión de Colectivos', 'Eliminar Organización', `Se eliminó el colectivo: ${this.colectivoActual?.nombre || id}`);
                    
                    this.nuevoColectivo();
                    this.cargarDatos();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire("Error", "Falla de conexión al eliminar.", "error");
                }
            }
        });
    },

    // ==========================================
    // SECCIÓN 2: VISOR Y EXPORTACIÓN PDF
    // ==========================================
    renderizarVisorPDF: function() {
        const contenedor = document.getElementById('visor-colectivos-exportar');
        if (!contenedor) return;

        if (this.colectivos.length === 0) {
            contenedor.innerHTML = `<div class="text-center text-muted p-5 w-100">No hay colectivos para mostrar en el reporte.</div>`;
            return;
        }

        let html = '';
        this.colectivos.forEach(c => {
            let desc = c.descripcion ? `<p class="small text-muted mb-3" style="font-size: 0.8rem; border-left: 2px solid #e2e8f0; padding-left: 8px;">${c.descripcion}</p>` : '';
            let asesor = c.asesor ? `<div class="mb-1"><span class="fw-bold text-dark" style="font-size: 0.85rem;">Asesor/Enlace:</span> <span class="text-danger small">${c.asesor}</span></div>` : '';
            let vocero = c.vocero ? `<div class="mb-3"><span class="fw-bold text-dark" style="font-size: 0.85rem;">Vocero:</span> <span class="text-primary small">${c.vocero}</span></div>` : '';
            
            let listaMiembros = '';
            if(c.integrantes) {
                let arr = c.integrantes.split(',');
                arr.forEach(i => { listaMiembros += `<div style="font-size: 0.8rem; border-bottom: 1px dashed #e2e8f0; padding: 3px 0;">• ${i.trim()}</div>`; });
            } else {
                listaMiembros = `<div class="text-muted" style="font-size: 0.8rem; font-style: italic;">Sin integrantes asignados</div>`;
            }

            html += `
            <div class="tarjeta-visor">
                <h6 class="fw-bolder text-danger mb-2 text-uppercase" style="border-bottom: 2px solid #e11d48; padding-bottom: 5px;">${c.nombre}</h6>
                ${desc}
                <div class="bg-light p-2 rounded mb-2 border">
                    ${asesor}
                    ${vocero}
                </div>
                <div class="fw-bold text-dark mb-1" style="font-size: 0.85rem;"><i class="bi bi-people-fill me-1"></i> Integrantes:</div>
                <div class="ps-2 text-dark">${listaMiembros}</div>
            </div>`;
        });

        contenedor.innerHTML = html;
    },

    prepararPDF: function() {
        if(!window.Aplicacion.permiso('Gestión de Colectivos', 'exportar') && !window.Aplicacion.permiso('Gestión de Colectivos', 'ver')) return Swal.fire('Acceso Denegado', 'No tiene permisos para exportar.', 'error');

        Swal.fire({
            title: 'Reporte de Organizaciones',
            text: '¿Cómo desea orientar la hoja PDF?',
            icon: 'question',
            showDenyButton: true, showCancelButton: true,
            confirmButtonText: '<i class="bi bi-aspect-ratio me-1"></i> Horizontal',
            denyButtonText: '<i class="bi bi-file-earmark-pdf me-1"></i> Vertical',
            cancelButtonText: 'Cancelar', confirmButtonColor: '#e11d48', denyButtonColor: '#455A64'
        }).then((result) => {
            if (result.isConfirmed) { this.generarPDFOficial('landscape'); } 
            else if (result.isDenied) { this.generarPDFOficial('portrait'); }
        });
    },

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

    generarPDFOficial: async function(orientacion) {
        let div = document.getElementById('visor-colectivos-exportar');
        if(!div || div.innerHTML === '' || this.colectivos.length === 0) return Swal.fire('Atención', 'No hay datos para exportar.', 'warning');
        
        window.Aplicacion.mostrarCarga();
        try {
            const base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
            const base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png'); 

            let clon = div.cloneNode(true);
            clon.style.width = orientacion === 'landscape' ? "1200px" : "800px"; 
            clon.style.height = "max-content"; 
            clon.style.padding = "20px"; 
            clon.style.position = "absolute"; 
            clon.style.top = "-9999px"; 
            clon.style.left = "-9999px"; 
            clon.style.background = "#ffffff";
            document.body.appendChild(clon);

            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(clon, { scale: 2, backgroundColor: '#ffffff', logging: false });
            document.body.removeChild(clon);
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'letter' });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;

            // --- ENCABEZADO OFICIAL ---
            let textX = margin; 
            if (base64LogoEscuela) { doc.addImage(base64LogoEscuela, 'PNG', margin, margin, 16, 16); textX = margin + 20; }

            doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text("República Bolivariana de Venezuela", textX, margin + 5);
            doc.text("Ministerio del Poder Popular para la Educación", textX, margin + 10);
            doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", textX, margin + 15);

            doc.setTextColor(225, 29, 72); doc.setFontSize(16);
            doc.text("COLECTIVOS Y ORGANIZACIONES", pageWidth / 2, margin + 22, { align: "center" });
            
            let anioEscolar = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
            doc.setTextColor(100, 116, 139); doc.setFontSize(10);
            doc.text(`Período Escolar: ${anioEscolar}`, pageWidth / 2, margin + 28, { align: "center" });

            doc.setDrawColor(225, 29, 72); doc.setLineWidth(1.5); 
            doc.line(margin, margin + 33, pageWidth - margin, margin + 33);

            // --- MATEMÁTICA ESTRICTA (CAJA DE SEGURIDAD) ---
            const topSpace = margin + 40; 
            const bottomSpace = 35; 
            
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - topSpace - bottomSpace; 
            
            const imgProps = doc.getImageProperties(imgData);
            
            const ratio = Math.min(availableWidth / imgProps.width, availableHeight / imgProps.height);
            let finalWidth = imgProps.width * ratio;
            let finalHeight = imgProps.height * ratio;

            const x = margin + ((availableWidth - finalWidth) / 2);
            const y = topSpace;

            doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

            // --- PIE DE PÁGINA ---
            const footerY = pageHeight - bottomSpace + 15;
            doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.5); 
            doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
            
            if (base64CintilloMPPE) { doc.addImage(base64CintilloMPPE, 'PNG', margin, footerY - 2, 35, 10); }

            doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont("helvetica", "normal");
            const fechaHoy = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            doc.text(`Generado: ${fechaHoy}`, margin + 40, footerY + 5);
            doc.text("Sistema SIGAE v1.0", pageWidth - margin, footerY + 5, { align: "right" });

            doc.save(`Reporte_Colectivos_${fechaHoy.replace(/\//g, '-')}.pdf`);
            window.Aplicacion.ocultarCarga();
            
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'PDF Exportado con Éxito', showConfirmButton: false, timer: 3000});
            window.Aplicacion.auditar('Gestión de Colectivos', 'Imprimir Reporte', `Se exportó el reporte de colectivos en formato PDF.`);

        } catch(error) {
            console.error(error); window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'Fallo al generar el PDF.', 'error');
        }
    }
};

window.init_Gestión_de_Colectivos = function() { window.ModColectivos.init(); };
window.init_Gestion_de_Colectivos = function() { window.ModColectivos.init(); };