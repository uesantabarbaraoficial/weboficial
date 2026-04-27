/**
 * MÓDULO: CADENA SUPERVISORIA (COMPACTADO PARA PDF Y MÓVIL)
 */

window.ModJerarquia = {
    cargos: [], usuarios: [], vistaActualOculta: null,
    
    init: function() {
        this.dibujarDashboardTarjetas();
        this.cargarDatosMaestros();
    },

    dibujarDashboardTarjetas: function() {
        let pVer = window.Aplicacion.permiso('Cadena Supervisoria', 'ver');
        let html = `
        <div class="col-md-6 col-xl-4">
            <div class="tarjeta-btn p-4 text-center h-100 shadow-sm ${pVer ? '' : 'bloqueado'}" onclick="window.ModJerarquia.abrirVistaSegura('Constructor')">
                <div class="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3"><i class="bi bi-diagram-3-fill text-primary fs-1"></i></div>
                <h5 class="fw-bold text-dark">Estructurar Cadena</h5>
                <p class="small text-muted mb-2">Conectar jefes y subordinados.</p>
                ${!pVer ? '<span class="badge bg-danger"><i class="bi bi-lock-fill"></i> Bloqueado</span>' : ''}
            </div>
        </div>
        <div class="col-md-6 col-xl-4">
            <div class="tarjeta-btn p-4 text-center h-100 shadow-sm ${pVer ? '' : 'bloqueado'}" onclick="window.ModJerarquia.abrirVistaSegura('Mapa')">
                <div class="bg-dark bg-opacity-10 d-inline-block p-3 rounded-circle mb-3"><i class="bi bi-bezier2 text-dark fs-1"></i></div>
                <h5 class="fw-bold text-dark">Ver Mapa / Exportar</h5>
                <p class="small text-muted mb-2">Filtros, nombres y PDF oficial.</p>
            </div>
        </div>`;
        document.getElementById('jerarquia-dashboard').innerHTML = html;

        if(!window.Aplicacion.permiso('Función: Estructurar Cadena', 'crear')) {
            document.getElementById('btn-guardar-jerarquia-area').innerHTML = `<div class="text-center text-danger fw-bold"><i class="bi bi-lock me-1"></i> Sin permisos para modificar estructura.</div>`;
        }
    },

    abrirVistaSegura: function(vista) {
        if(!window.Aplicacion.permiso('Cadena Supervisoria', 'ver')) return;
        let dash = document.getElementById('jerarquia-dashboard');
        dash.classList.add('animate__fadeOutLeft');
        setTimeout(() => {
            dash.classList.add('d-none'); dash.classList.remove('animate__fadeOutLeft');
            let panel = document.getElementById(`vista-${vista.toLowerCase()}`);
            panel.classList.remove('d-none'); panel.classList.add('animate__fadeInRight');
            document.getElementById('btn-volver-dashboard').classList.remove('d-none');
            document.getElementById('titulo-jerarquia-main').innerText = vista === 'Mapa' ? 'Organigrama Oficial' : 'Estructurar Cadena';
            this.vistaActualOculta = vista;
            
            if(vista === 'Mapa') this.dibujarOrganigrama();
        }, 300);
    },

    volverDashboard: function() {
        if(!this.vistaActualOculta) return;
        let panel = document.getElementById(`vista-${this.vistaActualOculta.toLowerCase()}`);
        panel.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
        document.getElementById('btn-volver-dashboard').classList.add('d-none');
        setTimeout(() => {
            panel.classList.add('d-none'); panel.classList.remove('animate__fadeOutRight');
            let dash = document.getElementById('jerarquia-dashboard');
            dash.classList.remove('d-none'); dash.classList.add('animate__fadeInLeft');
            document.getElementById('titulo-jerarquia-main').innerText = "Cadena Supervisoria";
            this.vistaActualOculta = null;
        }, 300);
    },

    cargarDatosMaestros: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [resCargos, resUsers] = await Promise.all([
                window.supabaseDB.from('cargos').select('*').order('nombre_cargo', { ascending: true }),
                window.supabaseDB.from('usuarios').select('id_usuario, cedula, nombre_completo, cargo')
            ]);

            if (resCargos.error) throw resCargos.error;
            if (resUsers.error) throw resUsers.error;

            this.cargos = resCargos.data || [];
            this.usuarios = resUsers.data || [];
            
            this.poblarSelectores();
            window.Aplicacion.ocultarCarga();
        } catch (e) {
            console.error("Error cargando jerarquía:", e);
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "No se pudo conectar con la base de datos Supabase.", "error");
        }
    },

    poblarSelectores: function() {
        let sel1 = document.getElementById('sel-supervisor');
        let sel2 = document.getElementById('filtro-rama');
        let html = '<option value="">-- Elija un Cargo --</option>';
        let htmlFiltro = '<option value="">Mostrar Toda la Escuela</option>';
        
        this.cargos.forEach(c => {
            let opt = `<option value="${c.id_cargo}">${c.nombre_cargo}</option>`;
            html += opt; htmlFiltro += opt;
        });
        
        if(sel1) sel1.innerHTML = html;
        if(sel2) sel2.innerHTML = htmlFiltro;
    },

    alCambiarSupervisor: function() {
        const idSup = document.getElementById('sel-supervisor').value;
        const lista = document.getElementById('lista-cargos-check');
        const info = document.getElementById('info-supervisor');
        
        if (!idSup) {
            lista.innerHTML = '<div class="col-12 text-center text-muted py-4">Esperando selección...</div>';
            info.innerHTML = '<i class="bi bi-info-circle-fill text-info me-2"></i>Seleccione un cargo arriba.';
            return;
        }

        let sup = this.cargos.find(c => c.id_cargo === idSup);
        info.innerHTML = `<h6 class="fw-bold mb-1 text-primary">${sup.nombre_cargo}</h6><span class="badge bg-secondary">${sup.tipo_cargo}</span>`;

        let htmlLista = '';
        this.cargos.forEach(c => {
            if (c.id_cargo === idSup) return;
            if (String(sup.depende_de) === String(c.id_cargo)) return; 
            
            let isChecked = String(c.depende_de) === String(idSup) ? 'checked' : '';
            let yaTieneJefe = (c.depende_de && c.depende_de !== idSup) ? `(Depende de: ${this.obtenerNombre(c.depende_de)})` : '';
            let colorClase = yaTieneJefe ? 'text-warning' : 'text-dark';

            htmlLista += `
            <div class="col-md-6 col-lg-4">
                <div class="form-check bg-white border p-3 rounded shadow-sm hover-efecto" style="cursor: pointer;" onclick="document.getElementById('chk-${c.id_cargo}').click()">
                    <input class="form-check-input ms-0 me-2 border-secondary" type="checkbox" value="${c.id_cargo}" id="chk-${c.id_cargo}" ${isChecked} onclick="event.stopPropagation()">
                    <label class="form-check-label fw-bold ${colorClase}" for="chk-${c.id_cargo}" style="font-size: 0.9rem; cursor: pointer;">
                        ${c.nombre_cargo} <br><small class="text-muted fw-normal">${yaTieneJefe}</small>
                    </label>
                </div>
            </div>`;
        });
        lista.innerHTML = htmlLista || '<div class="col-12 text-center text-muted py-4">No hay más cargos disponibles.</div>';
    },

    obtenerNombre: function(id) { 
        let c = this.cargos.find(x => x.id_cargo === id); 
        return c ? c.nombre_cargo : 'Desconocido'; 
    },

    guardarJerarquia: async function() {
        if(!window.Aplicacion.permiso('Función: Estructurar Cadena', 'crear')) return Swal.fire('Aviso', 'Sin permisos para editar la jerarquía.', 'error');

        const idSup = document.getElementById('sel-supervisor').value;
        if (!idSup) return Swal.fire('Aviso', 'Seleccione el supervisor primero.', 'warning');
        
        let seleccionados = [];
        document.querySelectorAll('input[type="checkbox"][id^="chk-"]:checked').forEach(chk => seleccionados.push(chk.value));
        
        window.Aplicacion.mostrarCarga();
        
        try {
            let cargosPrevios = this.cargos.filter(c => String(c.depende_de) === String(idSup));
            let removidos = cargosPrevios.filter(c => !seleccionados.includes(c.id_cargo));
            
            let promesas = [];
            removidos.forEach(c => promesas.push(window.supabaseDB.from('cargos').update({ depende_de: null }).eq('id_cargo', c.id_cargo)));
            seleccionados.forEach(idC => promesas.push(window.supabaseDB.from('cargos').update({ depende_de: idSup }).eq('id_cargo', idC)));

            if(promesas.length > 0) await Promise.all(promesas);

            window.Aplicacion.ocultarCarga();
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Estructura actualizada', showConfirmButton: false, timer: 3000});
            
            let nombreSup = this.obtenerNombre(idSup);
            window.Aplicacion.auditar('Cadena Supervisoria', 'Estructurar Cadena', `Se actualizaron los subordinados directos de: ${nombreSup}`);
            
            this.cargarDatosMaestros();
            document.getElementById('lista-cargos-check').innerHTML = '<div class="col-12 text-center text-muted py-4">Actualizado. Seleccione otro supervisor para continuar.</div>';
            document.getElementById('sel-supervisor').value = ''; 
            document.getElementById('info-supervisor').innerHTML = '';

        } catch (e) {
            console.error("Error actualizando jerarquía:", e);
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'Falla al actualizar la estructura en Supabase.', 'error');
        }
    },

    // ✨ GENERADOR DE NODO HTML COMPACTO ✨
    construirNodoHTML: function(cargo, mostrarNombres) {
        let tipo = (cargo.tipo_cargo || '').toLowerCase();
        let cBg = '#ffffff', cBorde = '#0066FF', cTexto = '#0066FF';
        
        if(tipo.includes('directiv')) { cBg = '#f5f3ff'; cBorde = '#7c3aed'; cTexto = '#5b21b6'; } 
        else if(tipo.includes('coord') || tipo.includes('superv')) { cBg = '#eff6ff'; cBorde = '#2563eb'; cTexto = '#1d4ed8'; } 
        else if(tipo.includes('docen') || tipo.includes('pedag')) { cBg = '#f0fdf4'; cBorde = '#16a34a'; cTexto = '#14532d'; } 
        else if(tipo.includes('admin')) { cBg = '#fffbeb'; cBorde = '#d97706'; cTexto = '#78350f'; } 
        else if(tipo.includes('obrer') || tipo.includes('apoyo')) { cBg = '#f8fafc'; cBorde = '#475569'; cTexto = '#0f172a'; } 
        else { cBg = '#ffffff'; cBorde = '#0ea5e9'; cTexto = '#0369a1'; } 

        let htmlNombres = '';
        if(mostrarNombres) {
            let dueños = this.usuarios.filter(u => String(u.cargo) === String(cargo.nombre_cargo));
            if(dueños.length > 0) {
                let lista = dueños.map(d => `<div style="font-weight:bold; color:#1e293b; margin-top:2px;">${d.nombre_completo}</div>`).join('');
                htmlNombres = `<div style="margin-top:6px; padding-top:4px; border-top:1px dashed ${cBorde}; font-size:9px;">${lista}</div>`;
            } else {
                htmlNombres = `<div style="margin-top:6px; padding-top:4px; border-top:1px dashed ${cBorde}; font-size:9px; color:#ef4444; font-weight:bold; font-style:italic;">Vacante</div>`;
            }
        }

        let nodoCuerpo = `
            <div class="nodo-cargo-custom" style="border-color:${cBorde}; background:${cBg};">
                <div style="color:${cTexto}; font-weight:900; font-size:11px; font-family:sans-serif; text-transform:uppercase; margin-bottom:3px; line-height: 1.2;">${cargo.nombre_cargo}</div>
                <div style="color:#475569; font-size:9px; font-family:sans-serif; font-weight:600;">${cargo.tipo_cargo}</div>
                ${htmlNombres}
            </div>
        `;

        let hijos = this.cargos.filter(c => String(c.depende_de) === String(cargo.id_cargo));
        hijos.sort((a, b) => a.nombre_cargo.localeCompare(b.nombre_cargo));

        let htmlHijos = '';
        if (hijos.length > 0) {
            htmlHijos += '<ul>';
            hijos.forEach(h => {
                htmlHijos += this.construirNodoHTML(h, mostrarNombres);
            });
            htmlHijos += '</ul>';
        }

        return `<li>${nodoCuerpo}${htmlHijos}</li>`;
    },

    dibujarOrganigrama: function() {
        let div = document.getElementById('chart_div');
        if (!div) return;
        if (this.cargos.length === 0) { div.innerHTML = "<div class='text-muted fs-5'>No hay cargos creados en el sistema.</div>"; return; }

        let idFiltro = document.getElementById('filtro-rama').value;
        let mostrarNombres = document.getElementById('chk-nombres').checked;
        
        let raices = [];
        if (idFiltro) {
            let r = this.cargos.find(c => c.id_cargo === idFiltro);
            if (r) raices.push(r);
        } else {
            raices = this.cargos.filter(c => !c.depende_de); 
            raices.sort((a, b) => a.nombre_cargo.localeCompare(b.nombre_cargo));
        }

        if (raices.length === 0) { div.innerHTML = "<div class='text-muted fs-5 text-danger'>Advertencia: No hay ningún director o jefe principal asignado.</div>"; return; }

        let htmlEstructura = '<div class="mi-organigrama"><ul>';
        raices.forEach(raiz => {
            htmlEstructura += this.construirNodoHTML(raiz, mostrarNombres);
        });
        htmlEstructura += '</ul></div>';

        div.innerHTML = htmlEstructura;
    },

    prepararPDF: function() {
        if(!window.Aplicacion.permiso('Función: Imprimir Organigrama', 'imprimir')) return Swal.fire('Acceso Denegado', 'No tiene permisos para exportar.', 'error');

        Swal.fire({
            title: 'Exportar Organigrama',
            text: '¿Cómo desea orientar la hoja PDF?',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-aspect-ratio me-1"></i> Horizontal',
            denyButtonText: '<i class="bi bi-file-earmark-pdf me-1"></i> Vertical',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0066FF',
            denyButtonColor: '#455A64'
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
        let div = document.getElementById('chart_div');
        if(!div || div.innerHTML === '' || this.cargos.length === 0) return Swal.fire('Atención', 'No hay organigrama para exportar.', 'warning');
        
        window.Aplicacion.mostrarCarga();
        try {
            const base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
            const base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png'); 

            let clon = div.cloneNode(true);
            clon.style.width = "max-content"; 
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

            doc.setTextColor(109, 40, 217); doc.setFontSize(16);
            doc.text("ORGANIGRAMA INSTITUCIONAL", pageWidth / 2, margin + 22, { align: "center" });
            
            let anioEscolar = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
            doc.setTextColor(100, 116, 139); doc.setFontSize(10);
            doc.text(`Período Escolar: ${anioEscolar}`, pageWidth / 2, margin + 28, { align: "center" });

            doc.setDrawColor(109, 40, 217); doc.setLineWidth(1.5); 
            doc.line(margin, margin + 33, pageWidth - margin, margin + 33);

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

            doc.save('Organigrama_Institucional.pdf');
            window.Aplicacion.ocultarCarga();
            
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'PDF Exportado con Éxito', showConfirmButton: false, timer: 3000});
            window.Aplicacion.auditar('Cadena Supervisoria', 'Imprimir Organigrama', `Se exportó el mapa institucional en formato PDF.`);

        } catch(error) {
            console.error(error); window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'Fallo al generar el PDF.', 'error');
        }
    }
};

window.init_Cadena_Supervisoria = function() { window.ModJerarquia.init(); };