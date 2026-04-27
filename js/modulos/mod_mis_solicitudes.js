/**
 * MÓDULO: MIS SOLICITUDES
 * Panel del Representante para verificar el estatus y descargar la Carta de Aceptación.
 */

window.ModMisSolicitudes = {
    solicitudesList: [], // Guardamos las solicitudes localmente para el PDF

    init: function() {
        if (!window.Aplicacion.usuario) {
            document.getElementById('contenedor-mis-solicitudes').innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 4rem;"></i>
                    <h4 class="mt-3 fw-bold">Sesión no detectada</h4>
                    <p class="text-muted">Debe iniciar sesión para ver sus solicitudes.</p>
                </div>`;
            return;
        }
        this.cargarMisSolicitudes();
    },

    cargarMisSolicitudes: async function() {
        const miCedula = String(window.Aplicacion.usuario.cedula).trim();
        
        try {
            const { data, error } = await window.supabaseDB
                .from('solicitudes')
                .select('*')
                .ilike('rep_cedula', `%${miCedula}%`) 
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.solicitudesList = data || [];
            this.renderizarTarjetas(this.solicitudesList);
        } catch (e) {
            console.error(e);
            let cont = document.getElementById('contenedor-mis-solicitudes');
            if(cont) cont.innerHTML = `<div class="col-12"><div class="alert alert-danger fw-bold"><i class="bi bi-x-circle-fill me-2"></i>Error de conexión al buscar sus solicitudes.</div></div>`;
        }
    },

    renderizarTarjetas: function(lista) {
        const contenedor = document.getElementById('contenedor-mis-solicitudes');
        if(!contenedor) return;

        if (lista.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-5 opacity-50 animate__animated animate__fadeIn">
                    <i class="bi bi-inbox-fill" style="font-size: 5rem;"></i>
                    <h4 class="mt-3 fw-bold text-muted">No tienes solicitudes registradas</h4>
                    <p>Las solicitudes de cupo u otros trámites que realice aparecerán en esta bandeja.</p>
                    <button class="btn btn-primary rounded-pill mt-3 fw-bold px-4 shadow-sm" onclick="Enrutador.navegar('Solicitud de Cupos')">
                        <i class="bi bi-plus-circle-fill me-2"></i> Crear Nueva Solicitud
                    </button>
                </div>`;
            return;
        }

        let html = '';
        lista.forEach(sol => {
            let colorBadge = 'bg-secondary';
            let iconEstatus = 'bi-clock-history';
            let textoEstatus = sol.estatus || 'Pendiente';
            
            if (textoEstatus === 'Aprobado') { colorBadge = 'bg-success'; iconEstatus = 'bi-check-circle-fill'; }
            else if (textoEstatus === 'Rechazado') { colorBadge = 'bg-danger'; iconEstatus = 'bi-x-circle-fill'; }
            else if (textoEstatus === 'En Revisión') { colorBadge = 'bg-warning text-dark'; iconEstatus = 'bi-hourglass-split'; }
            else { colorBadge = 'bg-primary'; }

            let fecha = new Date(sol.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

            // ✨ BOTÓN INTELIGENTE: Carta de Aceptación vs Comprobante Simple ✨
            let btnAccion = '';
            if (textoEstatus === 'Aprobado') {
                btnAccion = `
                <button class="btn btn-outline-success w-100 rounded-pill fw-bold shadow-sm" onclick="window.ModMisSolicitudes.descargarCartaAceptacion('${sol.codigo}')">
                    <i class="bi bi-file-earmark-pdf-fill me-1"></i> Descargar Carta de Aceptación
                </button>`;
            } else {
                btnAccion = `
                <button class="btn btn-outline-primary w-100 rounded-pill fw-bold shadow-sm" onclick="Enrutador.navegar('Verificaciones'); setTimeout(()=> { document.getElementById('verif-codigo').value='${sol.codigo}'; window.ModVerificaciones.buscarComprobante(); }, 600)">
                    <i class="bi bi-file-earmark-text-fill me-1"></i> Descargar Comprobante
                </button>`;
            }

            html += `
            <div class="col-md-6 col-xl-4 animate__animated animate__fadeInUp">
                <div class="card h-100 border-0 shadow-sm rounded-4 hover-efecto" style="border-top: 5px solid transparent !important; border-top-color: var(--bs-${colorBadge.replace('bg-','').replace(' text-dark','')} ) !important;">
                    <div class="card-header bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                        <span class="badge bg-light text-secondary border shadow-sm"><i class="bi bi-hash"></i> ${sol.codigo}</span>
                        <span class="badge ${colorBadge} px-3 py-2 shadow-sm" style="font-size:0.8rem;"><i class="bi ${iconEstatus} me-1"></i> ${textoEstatus}</span>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-light p-3 rounded-circle me-3 text-primary border shadow-sm">
                                <i class="bi bi-person-bounding-box fs-4"></i>
                            </div>
                            <div>
                                <h5 class="fw-bold mb-0 text-dark lh-sm" style="font-size: 1.1rem;">${sol.est_nombre}</h5>
                                <span class="text-muted small fw-bold"><i class="bi bi-mortarboard-fill me-1 text-primary"></i> ${sol.est_grado}</span>
                            </div>
                        </div>
                        
                        <div class="bg-slate-50 rounded-3 p-3 mb-3 small border" style="background-color: #f8fafc;">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="text-muted fw-bold">Fecha de solicitud:</span>
                                <span class="text-dark fw-bold text-end">${fecha}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span class="text-muted fw-bold">Estudiante C.I:</span>
                                <span class="text-dark fw-bold text-end">${sol.est_cedula}</span>
                            </div>
                            
                            ${textoEstatus === 'Rechazado' && sol.motivo_respuesta ? `
                            <div class="mt-3 pt-2 border-top border-danger border-opacity-25">
                                <span class="text-danger fw-bold d-block mb-1"><i class="bi bi-info-circle-fill me-1"></i> Motivo del rechazo:</span>
                                <span class="text-dark">${sol.motivo_respuesta}</span>
                            </div>` : ''}
                            
                            ${textoEstatus === 'Aprobado' && sol.cita_fecha ? `
                            <div class="mt-3 pt-2 border-top border-success border-opacity-25">
                                <span class="text-success fw-bold d-block mb-1"><i class="bi bi-calendar-check-fill me-1"></i> Cita de Inscripción:</span>
                                <span class="text-dark d-block mb-1"><b>Día:</b> ${sol.cita_fecha}</span>
                                <span class="text-dark d-block"><b>Lugar:</b> ${sol.cita_lugar}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0 pb-4 pt-0 text-center">
                        ${btnAccion}
                    </div>
                </div>
            </div>`;
        });
        
        contenedor.innerHTML = html;
    },

    // =======================================================
    // ✨ MOTOR DE PDF INTELIGENTE (VERSIÓN PADRES) ✨
    // =======================================================

    obtenerImagenBase64: function(url) { 
        return new Promise((resolve) => { 
            let img = new Image(); img.crossOrigin = 'Anonymous'; 
            img.onload = () => { 
                let canvas = document.createElement('canvas'); 
                canvas.width = img.width; canvas.height = img.height; 
                let ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); 
                resolve(canvas.toDataURL('image/png')); 
            }; 
            img.onerror = () => resolve(null); img.src = url; 
        }); 
    },

    calcularProximoPeriodo: function(periodoActual) {
        if (!periodoActual || periodoActual === "No definido") return "2025 - 2026";
        let partes = periodoActual.split('-');
        if (partes.length === 2) {
            let y1 = parseInt(partes[0].trim());
            let y2 = parseInt(partes[1].trim());
            if (!isNaN(y1) && !isNaN(y2)) return `${y1 + 1} - ${y2 + 1}`;
        }
        return periodoActual; 
    },

    descargarCartaAceptacion: async function(codigo) {
        let sol = this.solicitudesList.find(s => s.codigo === codigo);
        if (!sol) return;

        Swal.fire({ title: 'Firmando Documento...', text: 'Generando Carta de Aceptación Oficial. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        
        // Creamos un contenedor temporal para el QR dinámicamente
        let qrContainer = document.getElementById('qr-temp-mis-solicitudes');
        if(!qrContainer) {
            qrContainer = document.createElement('div');
            qrContainer.id = 'qr-temp-mis-solicitudes';
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);
        }
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: sol.codigo, width: 120, height: 120, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
        });

        // Firmante predeterminado institucional (Ya que el padre no configura esto, viene pre-firmada por la autoridad)
        let nombreFirmante = 'Prof. José Vicente Millán Montaño';
        let cargoFirmante = 'Líder de Escuela de la DEP Oriente';

        let base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
        let base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');

        let recaudosDin = [];
        let nivel = (sol.est_nivel || "").toLowerCase();
        let grado = (sol.est_grado || "").toLowerCase();
        let parentesco = (sol.est_parentesco || "").toLowerCase();
        let esHijo = parentesco.includes("hijo") || parentesco.includes("hija");

        // Base obligatoria
        recaudosDin.push("- Carpeta marrón brillante tamaño oficio (nueva y con gancho).");
        if(sol.rep_nomina && !sol.rep_nomina.toLowerCase().includes("comunidad")) {
            recaudosDin.push("- Copia del carnet del trabajador(a) responsable.");
        }
        recaudosDin.push("- Copia de la Cédula de Identidad de la madre y del padre.");
        recaudosDin.push("- Copia legible de la Partida de Nacimiento del estudiante (vista al original).");
        recaudosDin.push("- Dos (2) fotos tipo carnet del estudiante.");
        recaudosDin.push("- Informe médico de especialista (Solo en caso de tener alguna condición de salud).");

        // Reglas de Parentesco
        if (!esHijo && !sol.rep_nomina.toLowerCase().includes("comunidad")) {
            recaudosDin.push("- Copia legible de la Partida de Nacimiento del trabajador(a).");
            recaudosDin.push("- Documento probatorio de filiación (ej. Partida de Nacimiento del padre/madre).");
        }

        // Reglas por Nivel
        if (nivel.includes("inicial")) {
            recaudosDin.push("- Copia de la tarjeta de vacunas actualizada.");
            recaudosDin.push("- Constancia de retiro (solo si cursó estudios en otra institución).");
        } else if (nivel.includes("primaria")) {
            recaudosDin.push("- Copia de la Cédula de Identidad del estudiante (obligatorio a partir de los 9 años).");
            recaudosDin.push("- Constancia de prosecución de estudios del año escolar anterior.");
            recaudosDin.push("- Boletín descriptivo del año anterior.");
            recaudosDin.push("- Constancia de retiro de la institución de origen.");
        } else if (nivel.includes("media") || grado.includes("año")) {
            recaudosDin.push("- Copia ampliada de la Cédula de Identidad del estudiante.");
            if (grado.includes("1er") || grado.includes("primer")) {
                recaudosDin.push("- Certificado de promoción de educación primaria.");
                recaudosDin.push("- Informe descriptivo de 6to grado.");
            } else {
                recaudosDin.push("- Notas certificadas del último año cursado (formato original).");
            }
            recaudosDin.push("- Carta de retiro de la institución de origen.");
        }

        setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            const qrDataUrl = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            
            const margin = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const centro = pageWidth / 2;
            let y = 15;
            
            const checkOverflow = (espacio) => { 
                if (y + espacio > pageHeight - 25) { doc.addPage(); y = 20; } 
            };

            // ENCABEZADO
            if (base64LogoEscuela) doc.addImage(base64LogoEscuela, 'PNG', margin, y, 20, 20);
            doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text("República Bolivariana de Venezuela", margin + 25, y+5);
            doc.text("Ministerio del Poder Popular para la Educación", margin + 25, y+10);
            doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", margin + 25, y+15);
            y += 25;
            
            doc.setDrawColor(0, 102, 255); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y);
            y += 15;

            // TÍTULO
            doc.setFontSize(14); doc.setTextColor(0, 102, 255);
            doc.text("CARTA DE ACEPTACIÓN", centro, y, { align: "center" });
            y += 12;

            // CUERPO 1
            doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
            let anioEscolarActual = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
            let anioEscolarProximo = window.ModMisSolicitudes.calcularProximoPeriodo(anioEscolarActual);
            
            let p1 = `Quien suscribe, ${cargoFirmante}, hace constar por medio de la presente que, tras haber evaluado la solicitud de inscripción bajo el código único ${sol.codigo} para el año escolar ${anioEscolarProximo}, se declara PROCEDENTE y se aprueba la asignación de cupo.`;
            let splitP1 = doc.splitTextToSize(p1, pageWidth - (margin*2));
            doc.text(splitP1, margin, y);
            y += (splitP1.length * 5) + 5;

            // CAJA DE DATOS
            doc.setFillColor(248, 250, 252); doc.setDrawColor(200, 200, 200);
            doc.roundedRect(margin, y, pageWidth - (margin*2), 35, 3, 3, 'FD');
            y += 8;
            doc.setFont("helvetica", "bold");
            doc.text(`Aspirante Aprobado:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(sol.est_nombre, margin + 45, y); y+=7;
            doc.setFont("helvetica", "bold");
            doc.text(`Cédula / Escolar:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(sol.est_cedula, margin + 45, y); y+=7;
            doc.setFont("helvetica", "bold");
            doc.text(`Nivel Asignado:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(`${sol.est_grado} (${sol.est_nivel})`, margin + 45, y); y+=7;
            doc.setFont("helvetica", "bold");
            doc.text(`Representante Legal:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(`${sol.rep_nombre} (C.I: ${sol.rep_cedula})`, margin + 45, y);
            y += 15;

            // CUERPO 2 (Fases)
            let p2 = `El proceso de matriculación de su representado(a) se realizará obligatoriamente en tres (3) fases continuas, detalladas a continuación:`;
            let splitP2 = doc.splitTextToSize(p2, pageWidth - (margin*2));
            doc.text(splitP2, margin, y);
            y += (splitP2.length * 5) + 5;

            doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
            doc.text("Fase 1: Respaldo Documental", margin, y); y+=5;
            doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
            doc.text("Imprima esta Carta de Aceptación para su respectiva consignación en físico.", margin + 5, y); y+=8;

            doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
            doc.text("Fase 2: Registro Electrónico Institucional", margin, y); y+=5;
            doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
            let txtF2 = "Ingrese al módulo de 'Actualización de Datos' dentro del sistema SIGAE para asentar formalmente el expediente digital del estudiante. Al finalizar, el sistema le emitirá una Constancia de Inscripción que debe imprimir.";
            let splitF2 = doc.splitTextToSize(txtF2, pageWidth - (margin*2) - 5);
            doc.text(splitF2, margin + 5, y); y+= (splitF2.length * 5) + 5;

            doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
            doc.text("Fase 3: Formalización Presencial", margin, y); y+=5;
            doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
            
            let fechaImprimir = sol.cita_fecha ? sol.cita_fecha : 'la fecha asignada';
            let lugarImprimir = sol.cita_lugar ? sol.cita_lugar : 'la institución';
            let txtCita = `Preséntese el día ${fechaImprimir} en ${lugarImprimir} con los siguientes recaudos obligatorios:`;
            let splitCita = doc.splitTextToSize(txtCita, pageWidth - (margin*2) - 5);
            doc.text(splitCita, margin + 5, y); y+= (splitCita.length * 5) + 3;

            // IMPRESIÓN DINÁMICA DE RECAUDOS
            doc.setFontSize(9);
            recaudosDin.forEach(req => {
                checkOverflow(10);
                let splitReq = doc.splitTextToSize(req, pageWidth - (margin*2) - 10);
                doc.text(splitReq, margin + 10, y);
                y += (splitReq.length * 4) + 2;
            });
            y+=5;
            
            // ORIENTACIONES FINALES
            checkOverflow(40);
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
            doc.text("Orientaciones Generales:", margin, y); y+=6;
            doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            let orientaciones = [
                "1. Si cursó estudios en otro estado, la Certificación de Notas debe tener sello y firma de la Zona Educativa.",
                "2. El trabajador(a) es el único responsable ante la Institución de la inscripción y seguimiento del estudiante.",
                "3. Al inscribirse, asume el compromiso de cumplir las normativas y asistir a las convocatorias institucionales."
            ];
            orientaciones.forEach(ori => {
                let splitOri = doc.splitTextToSize(ori, pageWidth - (margin*2));
                doc.text(splitOri, margin, y);
                y += (splitOri.length * 4) + 1;
            });

            // FIRMA ELECTRÓNICA
            checkOverflow(60);
            y += 15;
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.line(centro - 35, y, centro + 35, y); y+=5;
            
            doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text(nombreFirmante, centro, y, { align: "center" }); y+=5;
            doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            doc.text(cargoFirmante, centro, y, { align: "center" }); y+=10;

            doc.addImage(qrDataUrl, 'PNG', centro - 12.5, y, 25, 25); y+=28;
            doc.setFontSize(8); doc.setTextColor(100, 116, 139);
            doc.text("Documento avalado mediante Firma Electrónica.", centro, y, { align: "center" }); y+=4;
            doc.text(`Código de Verificación SIGAE: ${sol.codigo}`, centro, y, { align: "center" });

            // PIE DE PÁGINA GLOBAL
            const pgs = doc.internal.getNumberOfPages();
            const fFormat = new Date().toLocaleString('es-VE', { dateStyle: 'long' });
            for(let i=1; i<=pgs; i++) {
                doc.setPage(i);
                doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.8); doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
                if (base64CintilloMPPE) { doc.addImage(base64CintilloMPPE, 'PNG', margin, pageHeight - 13, 30, 8); }
                doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont("helvetica", "normal");
                doc.text(`Maturín, Edo. Monagas. Expedido el ${fFormat}`, margin + 35, pageHeight - 8);
                doc.text(`Página ${i} de ${pgs}`, pageWidth - margin, pageHeight - 8, { align: "right" });
            }

            doc.save(`Carta_Aceptacion_${sol.codigo}.pdf`);
            
            Swal.close();
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Carta Descargada Exitosamente', showConfirmButton:false, timer:2500});
            
        }, 500); 
    }
};

window.init_Mis_Solicitudes = function() { window.ModMisSolicitudes.init(); };