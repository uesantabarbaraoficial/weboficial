/**
 * MÓDULO: VERIFICACIONES (Supabase Edition)
 * Consulta de solicitudes y re-impresión de comprobantes PDF con diseño Institucional.
 * ✨ INCLUYE AUDITORÍA ✨
 */

window.ModVerificaciones = {
    rutasTransporte: [],
    paradasTransporte: [],
    html5QrcodeScanner: null,

    init: function() {
        this.cargarDiccionariosTransporte();
        const inputCod = document.getElementById('verif-codigo');
        if(inputCod) { inputCod.value = ''; inputCod.focus(); }
        const divRes = document.getElementById('verif-resultado');
        if(divRes) divRes.style.display = 'none';
    },

    // ✨ ACTUALIZADO: AHORA DESCARGA RUTAS Y PARADAS DESDE SUPABASE ✨
    cargarDiccionariosTransporte: async function() {
        try {
            const [rutasRes, paradasRes] = await Promise.all([
                window.supabaseDB.from('rutas').select('*'),
                window.supabaseDB.from('paradas').select('*')
            ]);
            
            if (rutasRes.data) this.rutasTransporte = rutasRes.data;
            if (paradasRes.data) this.paradasTransporte = paradasRes.data;
        } catch (e) {
            console.error("Error cargando diccionarios de transporte en Verificaciones:", e);
        }
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

    iniciarEscaner: function() {
        const contenedorLector = document.getElementById('lector-qr-container');
        const contenedorInput = document.getElementById('input-busqueda-container');
        const divRes = document.getElementById('verif-resultado');

        contenedorLector.style.display = 'block';
        contenedorInput.style.display = 'none';
        if(divRes) divRes.style.display = 'none';

        this.html5QrcodeScanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        this.html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            (textoDecodificado) => {
                this.detenerEscaner();
                document.getElementById('verif-codigo').value = textoDecodificado;
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Código detectado', showConfirmButton: false, timer: 1500 });
                setTimeout(() => { this.buscarComprobante(); }, 500);
            },
            (msjError) => { }
        ).catch(err => {
            Swal.fire('Acceso Denegado', 'No se pudo acceder a la cámara. Asegúrese de otorgar los permisos en su navegador.', 'error');
            this.detenerEscaner();
        });
    },

    detenerEscaner: function() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.stop().then(() => {
                this.html5QrcodeScanner.clear();
                document.getElementById('lector-qr-container').style.display = 'none';
                document.getElementById('input-busqueda-container').style.display = 'block';
            }).catch(err => {
                document.getElementById('lector-qr-container').style.display = 'none';
                document.getElementById('input-busqueda-container').style.display = 'block';
            });
        } else {
            document.getElementById('lector-qr-container').style.display = 'none';
            document.getElementById('input-busqueda-container').style.display = 'block';
        }
    },

    // ✨ ACTUALIZADO: BÚSQUEDA DIRECTA EN SUPABASE ✨
    buscarComprobante: async function() {
        const codigo = document.getElementById('verif-codigo').value.trim().toUpperCase();
        if(!codigo) return Swal.fire('Atención', 'Debe ingresar un código válido.', 'warning');

        window.Aplicacion.mostrarCarga();
        
        try {
            // Consultamos a Supabase la solicitud que coincida con el código
            const { data: sol, error } = await window.supabaseDB
                .from('solicitudes')
                .select('*')
                .eq('codigo', codigo)
                .single();

            window.Aplicacion.ocultarCarga();
            const divRes = document.getElementById('verif-resultado');
            
            if (error || !sol) {
                divRes.style.display = 'none';
                return Swal.fire({
                    title: '<span class="text-danger">Documento Inválido</span>',
                    text: 'El código no existe en el sistema. Podría tratarse de un documento adulterado o mal escrito.',
                    icon: 'error',
                    confirmButtonColor: '#1e293b'
                });
            }

            // Mapeamos el estatus (Pendiente, En Revisión, Aprobado, Rechazado)
            let estatusActual = sol.estatus || 'Pendiente';
            let colorEstatus = 'secondary';
            if (estatusActual === 'En Revisión') colorEstatus = 'warning text-dark';
            else if (estatusActual === 'Aprobado') colorEstatus = 'success';
            else if (estatusActual === 'Rechazado') colorEstatus = 'danger';
            
            // Auditoría
            if(window.Aplicacion && typeof window.Aplicacion.auditar === 'function') {
                window.Aplicacion.auditar('Verificaciones', 'Búsqueda Exitosa', `Se visualizó el estatus de la solicitud: ${codigo}`);
            }
            
            divRes.innerHTML = `
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-check-circle-fill text-success fs-1 me-3"></i>
                    <div>
                        <h5 class="fw-bold mb-1 text-dark">Documento Válido</h5>
                        <p class="text-muted small mb-0">Estudiante: <span class="fw-bold">${sol.est_nombre}</span></p>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center bg-white p-3 rounded border shadow-sm mb-3">
                    <span class="text-muted fw-bold small">Estatus Actual:</span>
                    <span class="badge bg-${colorEstatus} px-3 py-2 border shadow-sm">${estatusActual}</span>
                </div>
                <button class="btn w-100 fw-bold shadow-sm py-2 hover-efecto rounded-pill text-white" style="background-color: #8B5CF6;" onclick='window.ModVerificaciones.iniciarDescargaPDF(${JSON.stringify(sol).replace(/'/g, "\\'")})'>
                    <i class="bi bi-file-earmark-pdf-fill me-2"></i> Descargar Comprobante PDF
                </button>
            `;
            divRes.style.display = 'block';

        } catch (error) {
            window.Aplicacion.ocultarCarga();
            console.error(error);
            Swal.fire('Error', 'Falla de conexión al consultar la base de datos.', 'error');
        }
    },

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

    iniciarDescargaPDF: function(solicitudObj) {
        if(window.Aplicacion && typeof window.Aplicacion.auditar === 'function') {
            window.Aplicacion.auditar('Verificaciones', 'Descargar Comprobante', `Se re-imprimió el comprobante: ${solicitudObj.codigo}`);
        }
        this.generarPDFResumen(solicitudObj);
    },

    generarPDFResumen: async function(datosPDF) {
        Swal.fire({ title: 'Generando Documento...', text: 'Construyendo comprobante PDF. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        
        const qrContainer = document.getElementById('qr-temp-verif');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: datosPDF.codigo, width: 120, height: 120,
            colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
        });

        let base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
        let base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');

        setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            const qrDataUrl = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            let y = 60; 
            const checkOverflow = (espacio) => { if (y + espacio > pageHeight - 30) { doc.addPage(); y = 60; } };

            const secTitle = (txt) => {
                checkOverflow(15);
                doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
                doc.text(txt, margin, y); y += 6;
                doc.setTextColor(0, 0, 0); doc.setFontSize(10);
            };

            const col1X = margin; const val1X = margin + 35;
            const col2X = margin + 100; const val2X = margin + 135;

            const row = (lbl1, val1, lbl2, val2) => {
                checkOverflow(8);
                doc.setFont("helvetica", "bold"); doc.text(lbl1+":", col1X, y); 
                doc.setFont("helvetica", "normal"); doc.text(String(val1||'N/A'), val1X, y);
                if (lbl2) {
                    doc.setFont("helvetica", "bold"); doc.text(lbl2+":", col2X, y); 
                    doc.setFont("helvetica", "normal"); doc.text(String(val2||'N/A'), val2X, y);
                }
                y += 6;
            };

            const rowFull = (lbl, val) => {
                checkOverflow(8);
                doc.setFont("helvetica", "bold"); doc.text(lbl+":", col1X, y); 
                doc.setFont("helvetica", "normal"); 
                let splitText = doc.splitTextToSize(String(val||'N/A'), pageWidth - val1X - margin);
                doc.text(splitText, val1X, y);
                y += 6 * splitText.length;
            };

            secTitle("I. DATOS DEL ASPIRANTE");
            row("Cédula/Escolar", datosPDF.est_cedula, "Nombres", datosPDF.est_nombre);
            row("Fecha Nac.", datosPDF.est_fecha_nac, "Género", datosPDF.est_genero);
            row("Orden de Hijo", datosPDF.est_num_hijo, "Parentesco Rep.", datosPDF.est_parentesco);
            y += 2;
            
            secTitle("II. UBICACIÓN Y TRANSPORTE");
            row("Estado", datosPDF.est_estado, "Municipio", datosPDF.est_municipio);
            
            let nombreRuta = datosPDF.est_ruta;
            let nombreParada = datosPDF.est_parada;
            if (datosPDF.est_ruta !== "No requiere" && this.rutasTransporte.length > 0) {
                let rObj = this.rutasTransporte.find(r => String(r.id_ruta) === String(datosPDF.est_ruta));
                if (rObj) nombreRuta = rObj.nombre_ruta;
                let pObj = this.paradasTransporte.find(p => String(p.id_parada) === String(datosPDF.est_parada));
                if (pObj) nombreParada = pObj.nombre_parada;
            }

            row("Parroquia", datosPDF.est_parroquia, "Ruta", nombreRuta);
            if (datosPDF.est_ruta !== "No requiere") { rowFull("Parada", nombreParada); }
            rowFull("Dirección", datosPDF.est_direccion);
            y += 2;

            secTitle("III. DATOS ACADÉMICOS");
            row("Grado", datosPDF.est_grado, "Nivel Educativo", datosPDF.est_nivel);
            rowFull("Escuela Anterior", datosPDF.est_procedencia);
            rowFull("Motivo Cambio", datosPDF.est_razon_cambio);
            y += 2;

            secTitle("IV. REPRESENTANTE LEGAL");
            row("Cédula", datosPDF.rep_cedula, "Nombres", datosPDF.rep_nombre);
            row("Teléfono", datosPDF.rep_telefono, "Correo", datosPDF.rep_correo);
            if (datosPDF.rep_nomina && !datosPDF.rep_nomina.toLowerCase().includes("comunidad")) {
                row("Nómina", datosPDF.rep_nomina, "Filial", datosPDF.rep_filial);
                rowFull("Gerencia", datosPDF.rep_gerencia);
            } else {
                row("Nómina", datosPDF.rep_nomina);
            }
            y += 2;

            secTitle(`V. DATOS DE LOS PADRES (Reconocido por: ${datosPDF.reconocido_por})`);
            if (datosPDF.reconocido_por === "Ambos Padres" || datosPDF.reconocido_por === "Solo la Madre") {
                doc.setFont("helvetica", "bold"); doc.text("- MADRE:", margin, y); y+=6; doc.setFont("helvetica", "normal");
                row("Cédula", datosPDF.madre_cedula, "Nombres", datosPDF.madre_nombre);
                row("Est. Vital", datosPDF.madre_estatus, "Trabaja PDVSA", datosPDF.madre_pdvsa);
                row("Teléfono", datosPDF.madre_telefono, "Correo", datosPDF.madre_correo);
                rowFull("Dirección", datosPDF.madre_direccion); 
                y += 2;
            }
            if (datosPDF.reconocido_por === "Ambos Padres" || datosPDF.reconocido_por === "Solo el Padre") {
                doc.setFont("helvetica", "bold"); doc.text("- PADRE:", margin, y); y+=6; doc.setFont("helvetica", "normal");
                row("Cédula", datosPDF.padre_cedula, "Nombres", datosPDF.padre_nombre);
                row("Est. Vital", datosPDF.padre_estatus, "Trabaja PDVSA", datosPDF.padre_pdvsa);
                row("Teléfono", datosPDF.padre_telefono, "Correo", datosPDF.padre_correo);
                rowFull("Dirección", datosPDF.padre_direccion);
            }

            if (datosPDF.observaciones) {
                y += 2;
                secTitle("VI. OBSERVACIONES ADICIONALES");
                rowFull("Detalle", datosPDF.observaciones);
            }

            checkOverflow(45); y += 5;
            doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, y, pageWidth - (margin*2), 35, 3, 3, 'FD');
            doc.addImage(qrDataUrl, 'PNG', margin + 5, y + 2.5, 30, 30);
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
            doc.text("COMPROBANTE DE REGISTRO EN LÍNEA", margin + 40, y + 10);
            doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
            doc.text("Código de Solicitud:", margin + 40, y + 16);
            doc.setFont("helvetica", "bold"); doc.setTextColor(0, 102, 255);
            doc.text(datosPDF.codigo, margin + 40 + doc.getTextWidth("Código de Solicitud: "), y + 16);
            const fechaHoyFormat = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'long', timeStyle: 'short' });
            doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
            doc.text(`Lugar y Fecha: Maturín, Edo. Monagas. ${fechaHoyFormat}`, margin + 40, y + 22);
            doc.text("Conserve este comprobante digital. No requiere firma para ser válido.", margin + 40, y + 28);

            const pgs = doc.internal.getNumberOfPages();
            let anioEscolarActual = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
            let anioEscolarProximo = window.ModVerificaciones.calcularProximoPeriodo(anioEscolarActual);

            for(let i=1; i<=pgs; i++) {
                doc.setPage(i);
                if (base64LogoEscuela) doc.addImage(base64LogoEscuela, 'PNG', margin, 12, 18, 18);
                doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont("helvetica", "normal");
                doc.text("República Bolivariana de Venezuela", margin + 22, 16);
                doc.text("Ministerio del Poder Popular para la Educación", margin + 22, 21);
                doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", margin + 22, 26);
                doc.setTextColor(0, 102, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
                doc.text("COMPROBANTE DE SOLICITUD DE CUPO", pageWidth / 2, 40, { align: "center" });
                doc.setTextColor(100, 116, 139); doc.setFontSize(10); doc.setFont("helvetica", "normal");
                doc.text(`Período Escolar: ${anioEscolarProximo}`, pageWidth / 2, 46, { align: "center" });
                doc.setDrawColor(0, 102, 255); doc.setLineWidth(1.5); doc.line(margin, 52, pageWidth - margin, 52);
                doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.8); doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                if (base64CintilloMPPE) { doc.addImage(base64CintilloMPPE, 'PNG', margin, pageHeight - 18, 36, 10); }
                doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont("helvetica", "normal");
                doc.text(`Copia descargada: ${fechaHoyFormat}`, margin + 42, pageHeight - 12);
                doc.text(`Sistema SIGAE v1.0`, pageWidth / 2 + 25, pageHeight - 12, { align: "center" });
                doc.text(`Página ${i} de ${pgs}`, pageWidth - margin, pageHeight - 12, { align: "right" });
            }

            doc.save(`Recuperado_Solicitud_${datosPDF.codigo}.pdf`);
            Swal.close();
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Comprobante Descargado', showConfirmButton:false, timer:2500});
        }, 500); 
    }
};

window.init_Verificaciones = function() {
    window.ModVerificaciones.init();
};