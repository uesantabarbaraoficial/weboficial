/**
 * MÓDULO: SOLICITUD DE CUPOS (NUEVO INGRESO - Supabase Edition)
 * Wizard avanzado, Lectura dinámica de DivPol, RUTAS DE TRANSPORTE, Buscador OpenStreetMap y PDF Institucional.
 * ✨ INCLUYE AUDITORÍA ✨
 */

window.ModSolicitud = {
    pasoActual: 1,
    totalPasos: 5,
    datosEmpresa: [],
    rutasTransporte: [], 
    paradasTransporte: [], 
    diccionarioVzla: {}, 
    
    // ✨ VARIABLES PARA EL BUSCADOR WEB ✨
    timeoutDireccion: null,

    init: function() {
        this.pasoActual = 1;
        this.generarCodigoUnico();
        this.actualizarUI();
        this.cargarDiccionariosYDivPol();
        this.mostrarProximoPeriodo();
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

    mostrarProximoPeriodo: function() {
        let actual = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
        let proximo = this.calcularProximoPeriodo(actual);
        let el = document.getElementById('sol-periodo-texto');
        if (el) el.innerText = `Proceso de admisión para el período ${proximo}`;
    },

    formatearTexto: function(inputElement) {
        if(!inputElement.value) return;
        
        let texto = inputElement.value.trim().replace(/\s+/g, ' ');
        const conectores = ['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'a', 'ante', 'con', 'en', 'para', 'por', 'sin', 'un', 'una', 'unos', 'unas'];
        const siglasEducativas = ['cei', 'c.e.i', 'ue', 'u.e', 'u.e.', 'uen', 'u.e.n', 'u.e.n.', 'pdvsa', 's.a', 's.a.', 'c.a', 'c.a.', 'mppe'];
        
        let palabras = texto.split(' ');
        
        for (let i = 0; i < palabras.length; i++) {
            let p = palabras[i];
            if(p.length === 0) continue;
            let pLower = p.toLowerCase();
            
            if (siglasEducativas.includes(pLower)) { 
                palabras[i] = pLower.toUpperCase(); 
            } else if (conectores.includes(pLower) && i > 0) { 
                palabras[i] = pLower; 
            } else { 
                palabras[i] = pLower.charAt(0).toUpperCase() + pLower.slice(1); 
            }
        }
        inputElement.value = palabras.join(' ');
    },

    formatearTelefono: function(inputElement) {
        let val = inputElement.value.replace(/[^\d+]/g, ''); 
        if (val.length > 0 && !val.startsWith('+58')) {
            if (val.startsWith('0')) val = '58' + val.substring(1); 
            else if (!val.startsWith('58') && !val.startsWith('+')) val = '58' + val; 
            if(!val.startsWith('+')) val = '+' + val;
        }
        let limpio = val.replace(/\D/g, ''); 
        if(limpio.startsWith('58')) {
            let num = limpio.substring(2);
            let final = '+58';
            if (num.length > 0) final += ' ' + num.substring(0, 3);
            if (num.length > 3) final += ' ' + num.substring(3, 10);
            inputElement.value = final;
        } else {
            inputElement.value = val;
        }
    },

    // ✨ BUSCADOR DE DIRECCIONES (OpenStreetMap / Photon API) ✨
    buscarDireccionWeb: function(query) {
        let lista = document.getElementById('lista-direcciones-web');
        
        if (!query || query.length < 4) {
            lista.classList.add('d-none');
            return;
        }

        lista.innerHTML = '<li class="list-group-item text-center text-muted small"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Buscando en el mapa...</li>';
        lista.classList.remove('d-none');

        clearTimeout(this.timeoutDireccion);
        
        this.timeoutDireccion = setTimeout(async () => {
            try {
                let estadoFijo = document.getElementById('sol-est-estado') ? document.getElementById('sol-est-estado').value : 'Monagas';
                let busquedaExacta = encodeURIComponent(`${query}, ${estadoFijo}, Venezuela`);
                
                let response = await fetch(`https://photon.komoot.io/api/?q=${busquedaExacta}&limit=5`);
                let data = await response.json();

                if (data.features && data.features.length > 0) {
                    let html = '';
                    data.features.forEach(f => {
                        let props = f.properties;
                        
                        let nombreLugar = props.name ? `<b>${props.name}</b>, ` : '';
                        let calle = props.street ? `${props.street}, ` : '';
                        let ciudad = props.city || props.town || props.village || props.county || '';
                        let direccionCompleta = `${nombreLugar}${calle}${ciudad}`.replace(/,\s*$/, ''); 

                        let textoPlano = `${props.name ? props.name+', ' : ''}${calle}${ciudad}`.replace(/,\s*$/, '');

                        html += `
                        <li class="list-group-item list-group-item-action hover-efecto" style="cursor:pointer; font-size: 0.9rem;" onclick="window.ModSolicitud.seleccionarDireccionWeb('${textoPlano}')">
                            <i class="bi bi-geo-alt-fill text-danger me-2"></i>${direccionCompleta}
                        </li>`;
                    });
                    lista.innerHTML = html;
                } else {
                    lista.innerHTML = '<li class="list-group-item text-center text-muted small"><i class="bi bi-emoji-frown fs-5 d-block mb-1"></i>No se encontraron coincidencias. Escriba manualmente.</li>';
                    setTimeout(() => lista.classList.add('d-none'), 3000);
                }
            } catch(e) {
                console.log("Error consultando OpenStreetMap: ", e);
                lista.classList.add('d-none');
            }
        }, 600); 
    },

    seleccionarDireccionWeb: function(direccion) {
        let inputDir = document.getElementById('sol-est-direccion');
        inputDir.value = direccion;
        this.formatearTexto(inputDir);
        document.getElementById('lista-direcciones-web').classList.add('d-none');
        inputDir.classList.replace('border-primary', 'border-success');
        setTimeout(() => inputDir.classList.replace('border-success', 'border-primary'), 1500);
    },

    verificarNomina: function() {
        const nomina = document.getElementById('sol-rep-nomina').value.toLowerCase();
        const filial = document.getElementById('sol-rep-filial');
        const gerencia = document.getElementById('sol-rep-gerencia');
        if (nomina.includes('comunidad')) {
            filial.value = ''; filial.disabled = true; filial.classList.add('bg-light');
            gerencia.value = ''; gerencia.disabled = true; gerencia.classList.add('bg-light');
            document.getElementById('lbl-rep-filial').innerHTML = 'Negocio / Filial <span class="text-muted">(Bloqueado)</span>';
            document.getElementById('lbl-rep-gerencia').innerHTML = 'Organización / Gerencia <span class="text-muted">(Bloqueado)</span>';
        } else {
            filial.disabled = false; filial.classList.remove('bg-light');
            gerencia.disabled = false; gerencia.classList.remove('bg-light');
            document.getElementById('lbl-rep-filial').innerHTML = 'Negocio / Filial<span class="req">*</span>';
            document.getElementById('lbl-rep-gerencia').innerHTML = 'Organización / Gerencia<span class="req">*</span>';
        }
    },

    cambiarReconocimiento: function() {
        const opcion = document.getElementById('sol-reconocido').value;
        const bMadre = document.getElementById('bloque-madre');
        const bPadre = document.getElementById('bloque-padre');
        bMadre.style.display = 'none'; bPadre.style.display = 'none';
        if (opcion === 'Ambos Padres') { bMadre.style.display = 'flex'; bPadre.style.display = 'flex'; } 
        else if (opcion === 'Solo la Madre') { bMadre.style.display = 'flex'; } 
        else if (opcion === 'Solo el Padre') { bPadre.style.display = 'flex'; }
    },

    irAPaso: function(pasoDestino) {
        if (pasoDestino === this.pasoActual) return;
        if (this.pasoActual === 1 && pasoDestino > 1) {
            if (!document.getElementById('sol-acepto').checked) {
                Swal.fire('Atención', 'Debe aceptar los términos y condiciones para continuar.', 'warning');
                return;
            }
        }
        document.getElementById(`paso-${this.pasoActual}`).style.display = 'none';
        for(let i=1; i<=this.totalPasos; i++) {
            let btnNum = document.getElementById(`step-indicator-${i}`);
            if(i < pasoDestino) { btnNum.classList.add('completado'); btnNum.classList.remove('activo'); } 
            else if (i === pasoDestino) { btnNum.classList.add('activo'); btnNum.classList.remove('completado'); } 
            else { btnNum.classList.remove('activo', 'completado'); }
        }
        this.pasoActual = pasoDestino;
        document.getElementById(`paso-${this.pasoActual}`).style.display = 'block';
        this.actualizarUI();
    },

    cambiarPaso: function(direccion) { this.irAPaso(this.pasoActual + direccion); },

    generarCodigoUnico: function() {
        const ahora = window.Aplicacion && window.Aplicacion.obtenerFechaReal ? window.Aplicacion.obtenerFechaReal().getTime() : new Date().getTime();
        const inputCodigo = document.getElementById('sol-codigo');
        if(inputCodigo) inputCodigo.value = "ADM-" + ahora.toString().substring(4);
    },

    cargarDiccionariosYDivPol: async function() {
        window.Aplicacion.mostrarCarga();
        
        try {
            const [empresaRes, gradosRes, divpolRes, rutasRes, paradasRes] = await Promise.all([
                window.supabaseDB.from('diccionarios_empresa').select('*'),
                window.supabaseDB.from('conf_grados').select('*').order('valor', { ascending: true }),
                window.supabaseDB.from('div_pol_vzla').select('*'),
                window.supabaseDB.from('rutas').select('*').order('nombre_ruta', { ascending: true }),
                window.supabaseDB.from('paradas').select('*')
            ]);
            
            window.Aplicacion.ocultarCarga();

            if (empresaRes.data) {
                this.datosEmpresa = empresaRes.data;
                this.llenarSelect('Nómina', 'sol-rep-nomina');
                this.llenarSelect('Negocio/Filial', 'sol-rep-filial');
                this.llenarSelect('Organización/Gerencia', 'sol-rep-gerencia');
                this.llenarSelect('Parentesco', 'sol-est-parentesco');
            }

            if (gradosRes.data) {
                let htmlGrado = '<option value="">Seleccione Grado/Año...</option>';
                gradosRes.data.forEach(g => { htmlGrado += `<option value="${g.valor}">${g.valor}</option>`; });
                let selGrado = document.getElementById('sol-est-grado');
                if(selGrado) selGrado.innerHTML = htmlGrado;
            }

            if (divpolRes.data && divpolRes.data.length > 0) {
                this.diccionarioVzla = {};
                divpolRes.data.forEach(fila => {
                    let est = fila.estado;
                    let mun = fila.municipio;
                    let par = fila.parroquia;
                    
                    if (!this.diccionarioVzla[est]) this.diccionarioVzla[est] = {};
                    if (!this.diccionarioVzla[est][mun]) this.diccionarioVzla[est][mun] = [];
                    this.diccionarioVzla[est][mun].push(par);
                });
                this.llenarEstados();
            }

            if (rutasRes.data) this.rutasTransporte = rutasRes.data;
            if (paradasRes.data) this.paradasTransporte = paradasRes.data;

            this.llenarSelectRutas();

        } catch (error) {
            window.Aplicacion.ocultarCarga();
            console.error(error);
            Swal.fire('Atención', 'Ocurrió un error al cargar las configuraciones de la base de datos.', 'warning');
        }
    },

    autoAsignarNivel: function() {
        const grado = document.getElementById('sol-est-grado').value.toLowerCase();
        const inputNivel = document.getElementById('sol-est-nivel');
        if (!grado) { inputNivel.value = ''; return; }
        if (grado.includes('año') || grado.includes('ano') || grado.includes('media')) { inputNivel.value = 'Educación Media General'; } 
        else if (grado.includes('grado') || grado.includes('primaria')) { inputNivel.value = 'Educación Primaria'; } 
        else if (grado.includes('grupo') || grado.includes('maternal') || grado.includes('preescolar')) { inputNivel.value = 'Educación Inicial'; } 
        else { inputNivel.value = 'Por definir'; }
    },

    llenarEstados: function() {
        const selEstado = document.getElementById('sol-est-estado');
        if (!selEstado) return;

        if (selEstado.tagName === 'SELECT') {
            let estados = Object.keys(this.diccionarioVzla).sort();
            let html = '<option value="">Seleccione Estado...</option>';
            estados.forEach(e => { html += `<option value="${e}">${e}</option>`; });
            selEstado.innerHTML = html;
        } else if (selEstado.tagName === 'INPUT' && selEstado.value) {
            this.llenarMunicipiosDivPol();
        }
    },

    llenarMunicipiosDivPol: function() {
        const estadoSel = document.getElementById('sol-est-estado').value;
        const selMuni = document.getElementById('sol-est-municipio');
        if (!selMuni) return;

        if (!estadoSel || !this.diccionarioVzla[estadoSel]) {
            selMuni.innerHTML = '<option value="">Seleccione Municipio...</option>';
            selMuni.disabled = true;
            return;
        }

        let municipios = Object.keys(this.diccionarioVzla[estadoSel]).sort();
        let html = '<option value="">Seleccione Municipio...</option>';
        municipios.forEach(m => { html += `<option value="${m}">${m}</option>`; });
        selMuni.innerHTML = html;
        selMuni.disabled = false;
        
        document.getElementById('sol-est-parroquia').innerHTML = '<option value="">Seleccione Parroquia...</option>';
        document.getElementById('sol-est-parroquia').disabled = true;
    },

    llenarMunicipiosMonagas: function() {
        this.llenarMunicipiosDivPol();
    },

    llenarParroquias: function() {
        const estadoSel = document.getElementById('sol-est-estado').value;
        const muni = document.getElementById('sol-est-municipio').value;
        const selParr = document.getElementById('sol-est-parroquia');
        
        if (!estadoSel || !muni || !this.diccionarioVzla[estadoSel][muni]) { 
            selParr.innerHTML = '<option value="">Seleccione Parroquia...</option>'; 
            selParr.disabled = true; 
            return; 
        }
        
        let parroquias = this.diccionarioVzla[estadoSel][muni].sort();
        let html = '<option value="">Seleccione Parroquia...</option>';
        parroquias.forEach(p => { html += `<option value="${p}">${p}</option>`; });
        selParr.innerHTML = html;
        selParr.disabled = false;
    },

    llenarSelect: function(categoria, idElemento) {
        const select = document.getElementById(idElemento);
        if(!select) return;
        const filtrados = this.datosEmpresa.filter(d => d.categoria === categoria);
        select.innerHTML = '<option value="">Seleccione...</option>' + filtrados.map(d => `<option value="${d.valor}">${d.valor}</option>`).join('');
    },

    llenarSelectRutas: function() {
        const sel = document.getElementById('sol-est-ruta');
        if(!sel) return;
        let html = '<option value="">Seleccione una opción...</option>';
        html += '<option value="No requiere">No requiere transporte (Medios propios)</option>';
        
        this.rutasTransporte.forEach(r => { 
            let idSeguro = r.id_ruta ? r.id_ruta : r.nombre_ruta; 
            html += `<option value="${idSeguro}">${r.nombre_ruta}</option>`; 
        });
        
        sel.innerHTML = html;
        this.filtrarParadas(); 
    },

    filtrarParadas: function() {
        const idRuta = document.getElementById('sol-est-ruta').value;
        const selParada = document.getElementById('sol-est-parada');
        
        if(!idRuta) { 
            selParada.innerHTML = '<option value="">Seleccione ruta primero...</option>'; 
            selParada.disabled = true; 
            return; 
        }
        
        if(idRuta === "No requiere") { 
            selParada.innerHTML = '<option value="No aplica">No aplica (Medios propios)</option>'; 
            selParada.disabled = true; 
            return; 
        }
        
        let ruta = this.rutasTransporte.find(r => String(r.id_ruta) === String(idRuta) || String(r.nombre_ruta) === String(idRuta));
        if(ruta) {
            if(ruta.paradas_json && ruta.paradas_json.trim() !== "") {
                try {
                    let arrayIds = typeof ruta.paradas_json === "string" ? JSON.parse(ruta.paradas_json) : ruta.paradas_json;
                    if (Array.isArray(arrayIds) && arrayIds.length > 0) {
                        let html = '<option value="">Seleccione una parada...</option>';
                        arrayIds.forEach(id => { 
                            let paradaObj = this.paradasTransporte.find(p => String(p.id_parada) === String(id));
                            if(paradaObj) html += `<option value="${paradaObj.id_parada}">${paradaObj.nombre_parada}</option>`; 
                        });
                        selParada.innerHTML = html === '<option value="">Seleccione una parada...</option>' ? '<option value="Sin paradas">Paradas no localizadas</option>' : html;
                        selParada.disabled = false;
                    } else { selParada.innerHTML = '<option value="Sin paradas">La ruta no tiene paradas registradas</option>'; selParada.disabled = false; }
                } catch(e) { selParada.innerHTML = '<option value="">Error de lectura</option>'; selParada.disabled = true; }
            } else { selParada.innerHTML = '<option value="Directa">Ruta Directa (Sin paradas)</option>'; selParada.disabled = false; }
        } else { selParada.innerHTML = '<option value="">Error: Ruta no encontrada</option>'; selParada.disabled = true; }
    },

    actualizarUI: function() {
        document.getElementById('btn-sol-prev').style.display = this.pasoActual === 1 ? 'none' : 'block';
        if (this.pasoActual === this.totalPasos) {
            document.getElementById('btn-sol-next').style.display = 'none';
            document.getElementById('btn-sol-save').style.display = 'block';
        } else {
            document.getElementById('btn-sol-next').style.display = 'block';
            document.getElementById('btn-sol-save').style.display = 'none';
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

    generarPDFResumen: async function(datosPDF) {
        Swal.fire({ title: 'Generando Documento...', text: 'Construyendo comprobante PDF. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        
        const qrContainer = document.getElementById('qr-temp');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: datosPDF.codigo, width: 120, height: 120, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
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
            let nombreRuta = datosPDF.est_ruta; let nombreParada = datosPDF.est_parada;
            if (datosPDF.est_ruta !== "No requiere") {
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
                y += 2; secTitle("VI. OBSERVACIONES ADICIONALES"); rowFull("Detalle", datosPDF.observaciones);
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
            let anioEscolarProximo = window.ModSolicitud.calcularProximoPeriodo(anioEscolarActual);

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
                doc.text(`Generado: ${fechaHoyFormat}`, margin + 42, pageHeight - 12);
                doc.text(`Sistema SIGAE v1.0`, pageWidth / 2 + 25, pageHeight - 12, { align: "center" });
                doc.text(`Página ${i} de ${pgs}`, pageWidth - margin, pageHeight - 12, { align: "right" });
            }

            doc.save(`Planilla_Solicitud_${datosPDF.codigo}.pdf`);
            Swal.close();
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Comprobante Descargado', showConfirmButton:false, timer:2500});
            setTimeout(() => window.location.reload(), 3000);
        }, 500); 
    },

    guardarSolicitud: async function() {
        let rep_tel_raw = document.getElementById('sol-rep-telefono').value.trim();
        let madre_tel_raw = document.getElementById('sol-madre-telefono').value.trim();
        let padre_tel_raw = document.getElementById('sol-padre-telefono').value.trim();
        
        let valRuta = document.getElementById('sol-est-ruta').value;
        let valParada = document.getElementById('sol-est-parada').value;

        let payloadBD = {
            codigo: document.getElementById('sol-codigo').value,
            rep_cedula: document.getElementById('sol-rep-cedula').value.trim(),
            rep_nombre: document.getElementById('sol-rep-nombre').value.trim(),
            rep_telefono: rep_tel_raw,
            rep_correo: document.getElementById('sol-rep-correo').value.trim(),
            rep_nomina: document.getElementById('sol-rep-nomina').value,
            rep_filial: document.getElementById('sol-rep-filial').value,
            rep_gerencia: document.getElementById('sol-rep-gerencia').value,
            est_cedula: document.getElementById('sol-est-cedula').value.trim(),
            est_nombre: document.getElementById('sol-est-nombre').value.trim(),
            est_fecha_nac: document.getElementById('sol-est-fecha-nac').value,
            est_genero: document.getElementById('sol-est-genero').value,
            est_num_hijo: document.getElementById('sol-est-num-hijo').value ? parseInt(document.getElementById('sol-est-num-hijo').value) : null,
            est_parentesco: document.getElementById('sol-est-parentesco').value,
            est_estado: document.getElementById('sol-est-estado').value,
            est_municipio: document.getElementById('sol-est-municipio').value,
            est_parroquia: document.getElementById('sol-est-parroquia').value,
            est_direccion: document.getElementById('sol-est-direccion').value.trim(),
            est_ruta: valRuta,
            est_parada: (valRuta === "No requiere") ? "N/A" : valParada,
            est_grado: document.getElementById('sol-est-grado').value,
            est_nivel: document.getElementById('sol-est-nivel').value,
            est_procedencia: document.getElementById('sol-est-procedencia').value.trim(),
            est_razon_cambio: document.getElementById('sol-est-razon-cambio').value.trim(),
            est_tecnica: document.getElementById('sol-est-tecnica').value,
            est_promedio: document.getElementById('sol-est-promedio').value.trim(),
            reconocido_por: document.getElementById('sol-reconocido').value,
            madre_estatus: document.getElementById('sol-madre-estatus').value,
            madre_cedula: document.getElementById('sol-madre-cedula').value.trim(),
            madre_nombre: document.getElementById('sol-madre-nombre').value.trim(),
            madre_telefono: madre_tel_raw,
            madre_correo: document.getElementById('sol-madre-correo').value.trim(),
            madre_pdvsa: document.getElementById('sol-madre-pdvsa').value,
            madre_direccion: document.getElementById('sol-madre-direccion').value.trim(), 
            padre_estatus: document.getElementById('sol-padre-estatus').value,
            padre_cedula: document.getElementById('sol-padre-cedula').value.trim(),
            padre_nombre: document.getElementById('sol-padre-nombre').value.trim(),
            padre_telefono: padre_tel_raw,
            padre_correo: document.getElementById('sol-padre-correo').value.trim(),
            padre_pdvsa: document.getElementById('sol-padre-pdvsa').value,
            padre_direccion: document.getElementById('sol-padre-direccion').value.trim(), 
            observaciones: document.getElementById('sol-observaciones').value.trim(),
            estatus: 'Pendiente'
        };

        let camposFaltantes = [];
        if(!payloadBD.rep_cedula) camposFaltantes.push("Paso 2: Cédula Representante");
        if(!payloadBD.rep_nombre || payloadBD.rep_nombre.split(' ').length < 2) camposFaltantes.push("Paso 2: Nombre Representante");
        if(!rep_tel_raw) camposFaltantes.push("Paso 2: Teléfono Principal");
        if(!payloadBD.rep_correo) camposFaltantes.push("Paso 2: Correo Electrónico");
        if(!payloadBD.rep_nomina) camposFaltantes.push("Paso 2: Tipo de Nómina");
        if(payloadBD.rep_nomina && !payloadBD.rep_nomina.toLowerCase().includes('comunidad')) {
            if(!payloadBD.rep_filial) camposFaltantes.push("Paso 2: Negocio / Filial");
            if(!payloadBD.rep_gerencia) camposFaltantes.push("Paso 2: Organización / Gerencia");
        }

        if(!payloadBD.est_cedula) camposFaltantes.push("Paso 3: Cédula Estudiante");
        if(!payloadBD.est_nombre || payloadBD.est_nombre.split(' ').length < 2) camposFaltantes.push("Paso 3: Nombre Estudiante");
        if(!payloadBD.est_fecha_nac) camposFaltantes.push("Paso 3: Fecha de Nacimiento");
        if(!payloadBD.est_genero) camposFaltantes.push("Paso 3: Género");
        if(!payloadBD.est_num_hijo) camposFaltantes.push("Paso 3: Número de Hijo");
        if(!payloadBD.est_parentesco) camposFaltantes.push("Paso 3: Parentesco con Representante");
        if(!payloadBD.est_municipio) camposFaltantes.push("Paso 3: Municipio de Residencia");
        if(!payloadBD.est_parroquia) camposFaltantes.push("Paso 3: Parroquia de Residencia");
        if(!payloadBD.est_direccion) camposFaltantes.push("Paso 3: Dirección de Residencia");

        if(!valRuta) camposFaltantes.push("Paso 3: Ruta Solicitada");
        if(valRuta && valRuta !== "No requiere" && (!valParada || valParada === "" || valParada.includes("Seleccione"))) {
            camposFaltantes.push("Paso 3: Parada Específica");
        }

        if(!payloadBD.est_grado) camposFaltantes.push("Paso 4: Grado a Cursar");
        if(!payloadBD.est_procedencia) camposFaltantes.push("Paso 4: Colegio de Procedencia");
        if(!payloadBD.est_tecnica) camposFaltantes.push("Paso 4: Proviene de Escuela Técnica");
        if(!payloadBD.reconocido_por) camposFaltantes.push("Paso 5: Reconocido legalmente por");
        
        let reqMadre = payloadBD.reconocido_por === 'Ambos Padres' || payloadBD.reconocido_por === 'Solo la Madre';
        let reqPadre = payloadBD.reconocido_por === 'Ambos Padres' || payloadBD.reconocido_por === 'Solo el Padre';

        if (reqMadre) {
            if(!payloadBD.madre_estatus) camposFaltantes.push("Paso 5 (Madre): Estatus Vital");
            if(!payloadBD.madre_cedula) camposFaltantes.push("Paso 5 (Madre): Cédula");
            if(!payloadBD.madre_nombre || payloadBD.madre_nombre.split(' ').length < 2) camposFaltantes.push("Paso 5 (Madre): Nombre");
            if(!madre_tel_raw) camposFaltantes.push("Paso 5 (Madre): Teléfono");
            if(!payloadBD.madre_correo) camposFaltantes.push("Paso 5 (Madre): Correo");
            if(!payloadBD.madre_pdvsa) camposFaltantes.push("Paso 5 (Madre): Trabaja en PDVSA");
            if(!payloadBD.madre_direccion) camposFaltantes.push("Paso 5 (Madre): Dirección de Habitación"); 
        }

        if (reqPadre) {
            if(!payloadBD.padre_estatus) camposFaltantes.push("Paso 5 (Padre): Estatus Vital");
            if(!payloadBD.padre_cedula) camposFaltantes.push("Paso 5 (Padre): Cédula");
            if(!payloadBD.padre_nombre || payloadBD.padre_nombre.split(' ').length < 2) camposFaltantes.push("Paso 5 (Padre): Nombre");
            if(!padre_tel_raw) camposFaltantes.push("Paso 5 (Padre): Teléfono");
            if(!payloadBD.padre_correo) camposFaltantes.push("Paso 5 (Padre): Correo");
            if(!payloadBD.padre_pdvsa) camposFaltantes.push("Paso 5 (Padre): Trabaja en PDVSA");
            if(!payloadBD.padre_direccion) camposFaltantes.push("Paso 5 (Padre): Dirección de Habitación"); 
        }

        if (camposFaltantes.length > 0) {
            let listaHtml = '<div class="text-start small mt-3 border bg-light p-3 rounded-3" style="max-height: 200px; overflow-y: auto;"><p class="fw-bold text-danger mb-2">Faltan los siguientes campos obligatorios:</p><ul class="text-dark fw-bold mb-0" style="padding-left: 15px;">';
            camposFaltantes.forEach(error => { listaHtml += `<li class="mb-1">${error}</li>`; });
            listaHtml += '</ul></div>';
            return Swal.fire({ title: 'Información Incompleta', html: listaHtml, icon: 'warning', confirmButtonColor: '#d33', confirmButtonText: 'Corregir campos' });
        }

        window.Aplicacion.mostrarCarga();
        
        try {
            const { error } = await window.supabaseDB.from('solicitudes').insert([payloadBD]);
            
            if (error) throw error;
            
            window.Aplicacion.ocultarCarga();
            
            if (window.Aplicacion && typeof window.Aplicacion.auditar === 'function') {
                window.Aplicacion.auditar('Admisión Escolar', 'Nueva Solicitud', `Se registró solicitud de cupo para la CI: ${payloadBD.est_cedula}`);
            }
            
            Swal.fire({
                title: '¡Solicitud Procesada!',
                text: `Su solicitud ha sido registrada bajo el código: ${payloadBD.codigo}`,
                icon: 'success', showCancelButton: true, confirmButtonText: '<i class="bi bi-file-earmark-pdf-fill"></i> Descargar', cancelButtonText: 'Finalizar', confirmButtonColor: '#198754', allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) { window.ModSolicitud.generarPDFResumen(payloadBD); } 
                else { window.location.reload(); }
            });

        } catch (error) {
            window.Aplicacion.ocultarCarga();
            console.error(error);
            Swal.fire('Error', 'Falla al procesar la solicitud en la base de datos.', 'error');
        }
    }
};

window.init_Solicitud_de_Cupos = function() { window.ModSolicitud.init(); };