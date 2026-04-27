/**
 * MÓDULO: GESTIÓN DE ADMISIONES (Supabase Edition)
 * Embudo de Prioridades, Radar de Hermanos, Notificación Multicanal y Carta PDF.
 * ✨ INCLUYE AUDITORÍA, FORMALIZACIÓN Y PESTAÑA DE INSCRITOS ✨
 */

window.ModAdmisiones = {
    solicitudes: [],
    solicitudActiva: null,
    filtroActual: 'Pendiente',

    init: function() {
        if (!window.Aplicacion.permiso('Gestión de Admisiones', 'ver')) {
            let colIzq = document.querySelector('.col-lg-5');
            let colDer = document.querySelector('.col-lg-7');
            if(colIzq) colIzq.innerHTML = '';
            if(colDer) colDer.innerHTML = `<div class="bg-white rounded-4 shadow-sm p-5 text-center border"><div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;"><i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i></div><h4 class="text-dark fw-bold mb-2">Área Restringida</h4><p class="text-muted mb-0">No tienes permisos para gestionar admisiones.</p></div>`;
            return;
        }

        this.cargarSolicitudes();
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

    cargarSolicitudes: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB.from('solicitudes').select('*').order('created_at', { ascending: true });
            window.Aplicacion.ocultarCarga();

            if (error) throw error;
            
            this.solicitudes = (data || []).map(sol => {
                sol.prioridad_calculada = this.calcularPrioridad(sol);
                return sol;
            });

            this.filtrarLista(this.filtroActual);
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire('Error', 'No se pudieron cargar las solicitudes desde la base de datos.', 'error');
        }
    },

    calcularPrioridad: function(sol) {
        if (sol.instruccion_superior === true) return 0;
        if (sol.prioridad_manual !== null && sol.prioridad_manual !== undefined) return parseInt(sol.prioridad_manual);

        let nomina = (sol.rep_nomina || "").toLowerCase();
        let parentesco = (sol.est_parentesco || "").toLowerCase();
        let municipio = (sol.est_municipio || "").toLowerCase();
        
        let esLocal = municipio.includes("maturín") || municipio.includes("maturin");
        let esHijo = parentesco.includes("hijo") || parentesco.includes("hija");
        let esContractual = nomina.includes("contractual") && !nomina.includes("no contractual");
        let esNoContractual = nomina.includes("no contractual");
        let esJubilado = nomina.includes("jubilado");
        let esComunidad = nomina.includes("comunidad");
        let esTrabajadorActivo = esContractual || esNoContractual;

        if (esComunidad) return 9;

        if (esHijo) {
            if (esContractual) return esLocal ? 1 : 2;
            if (esNoContractual || esJubilado) return esLocal ? 3 : 4;
        } else {
            if (esTrabajadorActivo) return esLocal ? 5 : 6;
            if (esJubilado) return esLocal ? 7 : 8;
        }
        
        return 9; 
    },

    filtrarLista: function(estatusFiltro) {
        this.filtroActual = estatusFiltro;
        
        document.querySelectorAll('#adm-buscador ~ div button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.id === `btn-filtro-${estatusFiltro}`) btn.classList.add('active');
        });

        this.ejecutarBusquedaLocal();
    },

    ejecutarBusquedaLocal: function() {
        let busqueda = document.getElementById('adm-buscador').value.toLowerCase().trim();
        
        let listaFiltrada = this.solicitudes.filter(s => {
            let coincideEstatus = (s.estatus || 'Pendiente') === this.filtroActual;
            let coincideTexto = true;
            if (busqueda !== "") {
                coincideTexto = (s.est_nombre.toLowerCase().includes(busqueda) || String(s.est_cedula).includes(busqueda));
            }
            return coincideEstatus && coincideTexto;
        });

        listaFiltrada.sort((a, b) => {
            if (a.prioridad_calculada !== b.prioridad_calculada) {
                return a.prioridad_calculada - b.prioridad_calculada;
            }
            return new Date(a.created_at) - new Date(b.created_at);
        });

        this.renderizarLista(listaFiltrada);
    },

    renderizarLista: function(lista) {
        let contenedor = document.getElementById('lista-admisiones');
        document.getElementById('adm-total-lista').innerText = lista.length;

        if (lista.length === 0) {
            contenedor.innerHTML = `<div class="text-center py-5 text-muted opacity-50"><i class="bi bi-inbox fs-1 d-block mb-3"></i><p class="small fw-bold">No hay solicitudes en esta bandeja.</p></div>`;
            return;
        }

        let html = '';
        lista.forEach(sol => {
            let clasePrioridad = `prioridad-${sol.prioridad_calculada}`;
            let colorTexto = sol.prioridad_calculada === 0 ? 'text-purple' : 'text-primary';
            let iconoLvl = sol.prioridad_calculada === 0 ? '<i class="bi bi-star-fill text-warning"></i> VIP' : `Nivel ${sol.prioridad_calculada}`;
            
            let activaClase = (this.solicitudActiva && this.solicitudActiva.codigo === sol.codigo) ? 'activa' : '';
            let tiempo = this.calcularTiempoTranscurrido(sol.created_at);

            html += `
            <div class="tarjeta-aspirante ${clasePrioridad} ${activaClase} p-3 mb-2 shadow-sm border" onclick="window.ModAdmisiones.verDetalle('${sol.codigo}')" id="tarjeta-sol-${sol.codigo}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="text-truncate pe-2">
                        <h6 class="fw-bold text-dark mb-0 text-truncate" style="font-size: 0.95rem;">${sol.est_nombre}</h6>
                        <small class="text-muted" style="font-size: 0.75rem;">${sol.est_grado}</small>
                    </div>
                    <div class="text-end" style="min-width: 60px;">
                        <span class="badge bg-light text-dark border shadow-sm w-100">${iconoLvl}</span>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-end mt-2">
                    <small class="text-muted fw-bold" style="font-size: 0.7rem;"><i class="bi bi-clock me-1"></i> ${tiempo}</small>
                    <small class="fw-bold ${colorTexto}" style="font-size: 0.7rem;">${sol.codigo}</small>
                </div>
            </div>`;
        });

        contenedor.innerHTML = html;
    },

    calcularTiempoTranscurrido: function(fechaStr) {
        if (!fechaStr) return "Desconocido";
        let f = new Date(fechaStr).getTime();
        let hoy = window.Aplicacion.obtenerFechaReal().getTime();
        let diffDias = Math.floor((hoy - f) / (1000 * 60 * 60 * 24));
        if (diffDias <= 0) return "Hoy";
        if (diffDias === 1) return "Ayer";
        return `Hace ${diffDias} días`;
    },

    verDetalle: function(codigo) {
        let sol = this.solicitudes.find(s => s.codigo === codigo);
        if (!sol) return;

        this.solicitudActiva = sol;
        this.ejecutarBusquedaLocal(); 

        document.getElementById('panel-expediente-vacio').classList.add('d-none');
        document.getElementById('panel-expediente-lleno').classList.remove('d-none');

        document.getElementById('exp-codigo').innerHTML = `<i class="bi bi-hash"></i> ${sol.codigo}`;
        document.getElementById('exp-nombre-est').innerText = sol.est_nombre;
        document.getElementById('exp-grado').innerText = sol.est_grado;
        document.getElementById('exp-fecha-sol').innerText = "Recibida: " + new Date(sol.created_at).toLocaleDateString('es-VE');
        
        // ✨ LÓGICA DE COLORES DE ESTATUS MEJORADA ✨
        let estatusBadge = document.getElementById('exp-estatus-badge');
        let est = sol.estatus || 'Pendiente';
        estatusBadge.innerText = est;
        
        let colorClase = 'bg-primary';
        if (est === 'Aprobado') colorClase = 'bg-success';
        else if (est === 'Rechazado') colorClase = 'bg-danger';
        else if (est === 'En Revisión') colorClase = 'bg-warning text-dark';
        else if (est === 'Inscrito') colorClase = 'bg-info text-dark border';

        estatusBadge.className = `badge px-3 py-2 fs-6 shadow-sm ${colorClase}`;

        let explicacionNivel = this.obtenerExplicacionNivel(sol.prioridad_calculada);
        document.getElementById('exp-motor-calculo').innerHTML = `<span class="badge ${sol.prioridad_calculada===0?'bg-purple':'bg-success'} me-2 fs-6 shadow-sm">Nivel ${sol.prioridad_calculada}</span> ${explicacionNivel}`;
        
        let selOverride = document.getElementById('exp-override-nivel');
        let switchVip = document.getElementById('exp-switch-vip');
        
        switchVip.checked = (sol.instruccion_superior === true);
        selOverride.value = (sol.prioridad_manual !== null && sol.prioridad_manual !== undefined) ? sol.prioridad_manual : (sol.instruccion_superior ? 0 : sol.prioridad_calculada);
        selOverride.disabled = switchVip.checked || (est === 'Inscrito');
        switchVip.disabled = (est === 'Inscrito');

        document.getElementById('dt-rep-nombre').innerText = sol.rep_nombre;
        document.getElementById('dt-rep-cedula').innerText = `(${sol.rep_cedula})`;
        document.getElementById('dt-rep-contacto').innerText = `${sol.rep_telefono} | ${sol.rep_correo}`;
        document.getElementById('dt-rep-laboral').innerText = `${sol.rep_nomina} | ${sol.rep_filial || 'N/A'} | ${sol.rep_gerencia || 'N/A'}`;
        document.getElementById('dt-reconocimiento').innerText = sol.reconocido_por;
        
        let txtPadres = "";
        if (sol.madre_nombre) txtPadres += `Madre: ${sol.madre_pdvsa} `;
        if (sol.padre_nombre) txtPadres += `| Padre: ${sol.padre_pdvsa}`;
        document.getElementById('dt-padres-pdvsa').innerText = txtPadres;

        document.getElementById('dt-est-direccion').innerText = sol.est_direccion;
        document.getElementById('dt-est-sector').innerText = `${sol.est_municipio}, ${sol.est_parroquia}, ${sol.est_estado}`;
        document.getElementById('dt-est-ruta').innerText = sol.est_ruta === 'No requiere' ? 'Transporte Propio' : `Ruta: ${sol.est_ruta} (Parada: ${sol.est_parada})`;
        
        document.getElementById('dt-est-colegio').innerText = sol.est_procedencia;
        document.getElementById('dt-est-motivo').innerText = sol.est_razon_cambio;
        
        if (sol.observaciones) {
            document.getElementById('dt-est-obs-box').style.display = 'block';
            document.getElementById('dt-est-obs').innerText = sol.observaciones;
        } else {
            document.getElementById('dt-est-obs-box').style.display = 'none';
        }

        // ✨ ÁREA DE BOTONES ACTUALIZADA ✨
        let areaAccionesNuevas = document.getElementById('area-acciones-aprobado');
        if (areaAccionesNuevas) {
            if (est === 'Aprobado' || est === 'Inscrito') { 
                areaAccionesNuevas.classList.remove('d-none'); 
                let btnInscribir = areaAccionesNuevas.querySelector('button.btn-primary');
                if(btnInscribir) {
                    if(est === 'Inscrito') btnInscribir.style.display = 'none'; // Ya está inscrito, ocultamos el botón
                    else btnInscribir.style.display = 'inline-block';
                }
            } else { 
                areaAccionesNuevas.classList.add('d-none'); 
            }
        }

        let areaBotones = document.getElementById('area-botones-decision');
        if (est === 'Inscrito') {
            areaBotones.innerHTML = `<div class="alert alert-info w-100 text-center fw-bold m-0"><i class="bi bi-person-check-fill fs-5 d-block mb-1"></i> Este estudiante ya se encuentra oficialmente inscrito en la matrícula.</div>`;
        } else if (est === 'Aprobado' || est === 'Rechazado') {
            areaBotones.innerHTML = `<button class="btn btn-outline-secondary btn-decision px-4 rounded-pill" onclick="window.ModAdmisiones.cambiarEstatus('En Revisión')"><i class="bi bi-arrow-counterclockwise me-1"></i> Revertir Decisión y Dejar en Revisión</button>`;
        } else {
            areaBotones.innerHTML = `
                <button class="btn btn-danger btn-decision px-4 shadow-sm" onclick="window.ModAdmisiones.cambiarEstatus('Rechazado')"><i class="bi bi-x-circle-fill me-1"></i> Rechazar</button>
                <button class="btn btn-warning text-dark btn-decision px-4 shadow-sm" onclick="window.ModAdmisiones.cambiarEstatus('En Revisión')"><i class="bi bi-hourglass-split me-1"></i> Dejar en Revisión</button>
                <button class="btn btn-success btn-decision px-5 flex-grow-1 flex-md-grow-0 shadow" onclick="window.ModAdmisiones.cambiarEstatus('Aprobado')"><i class="bi bi-check-circle-fill me-1"></i> APROBAR CUPO</button>
            `;
        }

        this.buscarHermanos(sol.rep_cedula, sol.est_cedula);
    },

    obtenerExplicacionNivel: function(nivel) {
        const reglas = {
            0: "👑 Instrucción Directa Superior (VIP).",
            1: "Hijo de Contractual + Residencia Local.",
            2: "Hijo de Contractual + Residencia Foránea.",
            3: "Hijo de No Contractual/Jubilado + Local.",
            4: "Hijo de No Contractual/Jubilado + Foránea.",
            5: "Otro Parentesco + Trabajador Activo + Local.",
            6: "Otro Parentesco + Trabajador Activo + Foráneo.",
            7: "Otro Parentesco + Jubilado + Local.",
            8: "Otro Parentesco + Jubilado + Foráneo.",
            9: "Nómina Comunidad (Sin relación directa)."
        };
        return reglas[nivel] || "Nivel desconocido.";
    },

    buscarHermanos: async function(repCedula, estCedulaActual) {
        let areaRadar = document.getElementById('area-radar-hermanos');
        let listaCoincidencias = document.getElementById('lista-coincidencias');
        areaRadar.classList.add('d-none');
        listaCoincidencias.innerHTML = '';

        try {
            const { data, error } = await window.supabaseDB.from('solicitudes')
                .select('est_nombre, est_grado, est_parentesco, est_cedula, estatus')
                .eq('rep_cedula', repCedula)
                .neq('est_cedula', estCedulaActual);
            
            if (data && data.length > 0) {
                areaRadar.classList.remove('d-none');
                let html = '';
                data.forEach(h => {
                    let cBadge = h.estatus === 'Aprobado' ? 'bg-success' : 'bg-secondary';
                    html += `
                    <div class="bg-white border rounded-3 p-2 d-flex align-items-center shadow-sm">
                        <i class="bi bi-person-check-fill text-primary fs-3 me-2"></i>
                        <div class="lh-sm">
                            <span class="fw-bold text-dark d-block" style="font-size: 0.85rem;">${h.est_nombre}</span>
                            <span class="text-muted d-block" style="font-size: 0.75rem;">${h.est_parentesco} | ${h.est_grado}</span>
                            <span class="badge ${cBadge} mt-1" style="font-size: 0.6rem;">${h.estatus}</span>
                        </div>
                    </div>`;
                });
                listaCoincidencias.innerHTML = html;
            }
        } catch(e) { console.error("Error en radar:", e); }
    },

    guardarSobrescritura: async function() {
        if (!this.solicitudActiva) return;
        let nuevoNivel = parseInt(document.getElementById('exp-override-nivel').value);
        let solCodigo = this.solicitudActiva.codigo;
        let nivelAnterior = this.solicitudActiva.prioridad_calculada;

        window.Aplicacion.mostrarCarga();
        const { error } = await window.supabaseDB.from('solicitudes')
            .update({ prioridad_manual: nuevoNivel })
            .eq('codigo', solCodigo);
        window.Aplicacion.ocultarCarga();

        if (!error) {
            window.Aplicacion.auditar('Admisiones', 'Sobrescritura de Prioridad', `Modificó prioridad a CI: ${this.solicitudActiva.est_cedula} del Nivel ${nivelAnterior} al Nivel ${nuevoNivel}`);
            Swal.fire({toast: true, position:'top-end', icon:'success', title:'Prioridad Modificada', showConfirmButton:false, timer:2000});
            this.solicitudActiva.prioridad_manual = nuevoNivel;
            this.solicitudActiva.prioridad_calculada = nuevoNivel;
            this.ejecutarBusquedaLocal();
            this.verDetalle(solCodigo);
        }
    },

    cambiarVip: async function(esVip) {
        if (!this.solicitudActiva) return;
        let solCodigo = this.solicitudActiva.codigo;

        window.Aplicacion.mostrarCarga();
        const { error } = await window.supabaseDB.from('solicitudes')
            .update({ instruccion_superior: esVip })
            .eq('codigo', solCodigo);
        window.Aplicacion.ocultarCarga();

        if (!error) {
            window.Aplicacion.auditar('Admisiones', 'Instrucción VIP', `${esVip ? 'Activó' : 'Desactivó'} prioridad Suprema a CI: ${this.solicitudActiva.est_cedula}`);
            Swal.fire({toast: true, position:'top-end', icon:'warning', title: esVip ? 'Marcado como VIP' : 'VIP Removido', showConfirmButton:false, timer:2000});
            
            this.solicitudActiva.instruccion_superior = esVip;
            this.solicitudActiva.prioridad_calculada = this.calcularPrioridad(this.solicitudActiva);
            this.ejecutarBusquedaLocal();
            this.verDetalle(solCodigo);
        }
    },

    cambiarEstatus: async function(nuevoEstatus) {
        if (!this.solicitudActiva) return;
        let sol = this.solicitudActiva;
        
        let motivo = '';
        let cita_lugar = null;
        let cita_fecha = null;

        if (nuevoEstatus === 'Rechazado') {
            const res = await Swal.fire({
                title: 'Confirmar Rechazo',
                input: 'text',
                inputLabel: 'Motivo de Rechazo (Se enviará al representante)',
                inputPlaceholder: 'Ej: Falta de cupo en el grado...',
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, rechazar',
                cancelButtonText: 'Cancelar'
            });
            if (!res.isConfirmed) return;
            motivo = res.value || '';
        } else if (nuevoEstatus === 'Aprobado') {
            const res = await Swal.fire({
                title: 'Aprobar y Agendar Cita',
                html: `
                    <div class="text-start mb-3 mt-3">
                        <label class="small fw-bold text-primary mb-1"><i class="bi bi-geo-alt-fill me-1"></i> Lugar de la Cita Presencial (Fase 3)</label>
                        <input id="swal-lugar" class="swal2-input border-primary mt-0 w-100" style="font-size: 0.95rem; height: 40px;" value="ESEM - Frente al Salón Temblador">
                    </div>
                    <div class="text-start">
                        <label class="small fw-bold text-primary mb-1"><i class="bi bi-calendar-check-fill me-1"></i> Fecha y Hora de la Cita</label>
                        <input id="swal-fecha" type="text" class="swal2-input border-primary mt-0 w-100" style="font-size: 0.95rem; height: 40px;" placeholder="Ej: 26/9/2026 de 8:00 a.m. a 4:00 p.m.">
                    </div>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                confirmButtonText: '<i class="bi bi-check-circle-fill me-1"></i> Aprobar y Guardar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const l = document.getElementById('swal-lugar').value.trim();
                    const f = document.getElementById('swal-fecha').value.trim();
                    if (!l || !f) { Swal.showValidationMessage('Debe indicar el lugar y la fecha de la cita.'); return false; }
                    return { lugar: l, fecha: f };
                }
            });
            if (!res.isConfirmed) return;
            cita_lugar = res.value.lugar;
            cita_fecha = res.value.fecha;
        } else {
            const res = await Swal.fire({
                title: 'Confirmar Decisión',
                text: `¿Desea cambiar el estatus a "En Revisión"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#F59E0B',
                confirmButtonText: 'Sí, aplicar cambios',
                cancelButtonText: 'Cancelar'
            });
            if (!res.isConfirmed) return;
        }

        let solCodigo = sol.codigo;

        window.Aplicacion.mostrarCarga();
        let payload = { estatus: nuevoEstatus, motivo_respuesta: motivo };
        if (nuevoEstatus === 'Aprobado') {
            payload.cita_lugar = cita_lugar;
            payload.cita_fecha = cita_fecha;
        }

        const { error } = await window.supabaseDB.from('solicitudes').update(payload).eq('codigo', solCodigo);
        window.Aplicacion.ocultarCarga();

        if (error) { return Swal.fire('Error', 'No se pudo actualizar el estatus en la base de datos.', 'error'); }

        window.Aplicacion.auditar('Admisiones', 'Decisión de Cupo', `Estatus de ${sol.est_cedula} cambiado a: ${nuevoEstatus}`);
        
        sol.estatus = nuevoEstatus;
        sol.motivo_respuesta = motivo;
        if(cita_lugar) sol.cita_lugar = cita_lugar;
        if(cita_fecha) sol.cita_fecha = cita_fecha;
        
        this.verDetalle(solCodigo);
        this.ejecutarBusquedaLocal();

        if (nuevoEstatus === 'Aprobado') {
            await this.generarCartaAceptacion(sol, true); 
            this.mostrarPanelNotificacion(sol, nuevoEstatus, motivo);
        } else if (nuevoEstatus === 'Rechazado') {
            this.mostrarPanelNotificacion(sol, nuevoEstatus, motivo);
        } else {
            Swal.fire({toast: true, position:'top-end', icon:'success', title:'Guardado.', showConfirmButton:false, timer:1500});
        }
    },

    mostrarPanelNotificacion: function(sol, estatus, motivo) {
        let phone = (sol.rep_telefono || "").replace(/[\s+]/g, '');
        if(phone && !phone.startsWith('+')) phone = '+' + phone;

        let saludo = `👋 Hola, *${sol.rep_nombre || 'Representante'}*.\n\nLe escribimos desde la Dirección de la *U.E. Libertador Bolívar*.\n\n`;
        let cuerpo = "";

        if (estatus === 'Aprobado') {
            cuerpo = `✅ Nos complace informarle que la solicitud de cupo de *${sol.est_nombre}* para *${sol.est_grado}* ha sido *APROBADA*.\n\nSu Código de Control es: *${sol.codigo}*\n\n📅 *Cita Presencial para Matrícula:*\nDeberá presentarse el día *${sol.cita_fecha}* en *${sol.cita_lugar}* para formalizar el proceso.\n\n📄 *IMPORTANTE:* Adjunto a este mensaje encontrará su Carta de Aceptación Oficial. Por favor, imprímala y llévela consigo el día de la cita junto a los demás recaudos.`;
        } else {
            cuerpo = `❌ Lamentamos informarle que en esta oportunidad la solicitud de cupo para *${sol.est_nombre}* ha sido *RECHAZADA*.\n\n`;
            if (motivo) cuerpo += `*Motivo:* ${motivo}\n\n`;
            cuerpo += `Agradecemos su interés en nuestra institución.`;
        }

        let txtMensaje = encodeURIComponent(saludo + cuerpo);

        let saludoEmail = `Hola, ${sol.rep_nombre || 'Representante'}.\n\nLe escribimos desde la Dirección de la U.E. Libertador Bolívar.\n\n`;
        let cuerpoEmail = "";
        
        if (estatus === 'Aprobado') {
            cuerpoEmail = `Nos complace informarle que la solicitud de cupo de ${sol.est_nombre} para ${sol.est_grado} ha sido APROBADA.\n\nSu Código de Control es: ${sol.codigo}\n\nCita Presencial para Matrícula:\nDeberá presentarse el día ${sol.cita_fecha} en ${sol.cita_lugar} para formalizar el proceso.\n\nIMPORTANTE: Hemos adjuntado a este correo su Carta de Aceptación Oficial. Por favor, imprímala y llévela consigo el día de la cita junto a los demás recaudos solicitados.`;
        } else {
            cuerpoEmail = `Lamentamos informarle que en esta oportunidad la solicitud de cupo para ${sol.est_nombre} ha sido RECHAZADA.\n\n`;
            if (motivo) cuerpoEmail += `Motivo: ${motivo}\n\n`;
            cuerpoEmail += `Agradecemos su interés en nuestra institución.`;
        }
        
        let txtEmail = encodeURIComponent(saludoEmail + cuerpoEmail);
        let subjectEmail = encodeURIComponent(`Notificación de Solicitud de Cupo - ${sol.codigo}`);

        Swal.fire({
            title: 'Notificar al Representante',
            html: `
                <p class="small text-muted mb-4 text-start">
                    <i class="bi bi-info-circle-fill text-primary"></i> 
                    ${estatus === 'Aprobado' ? 'El documento PDF se ha descargado en su computadora. <b>Recuerde adjuntarlo manualmente</b> en la aplicación que elija para enviar el mensaje.' : 'Seleccione el medio para enviar la notificación de rechazo:'}
                </p>
                <div class="d-flex flex-column gap-2">
                    <a href="https://api.whatsapp.com/send?phone=${phone}&text=${txtMensaje}" target="_blank" class="btn text-white w-100 shadow-sm text-start ps-4 fw-bold" style="background-color: #25D366; border-radius: 12px;"><i class="bi bi-whatsapp me-2 fs-5"></i> Enviar por WhatsApp</a>
                    <a href="https://t.me/+${phone.replace('+','')}" target="_blank" class="btn text-white w-100 shadow-sm text-start ps-4 fw-bold" style="background-color: #0088cc; border-radius: 12px;"><i class="bi bi-telegram me-2 fs-5"></i> Abrir Chat en Telegram</a>
                    <a href="mailto:${sol.rep_correo}?subject=${subjectEmail}&body=${txtEmail}" class="btn text-white w-100 shadow-sm text-start ps-4 fw-bold" style="background-color: #ea4335; border-radius: 12px;"><i class="bi bi-envelope-fill me-2 fs-5"></i> Redactar Correo Electrónico</a>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            cancelButtonColor: '#64748b'
        });
    },

    // ✨ FUNCIÓN MAESTRA BLINDADA CONTRA ERRORES SILENCIOSOS ✨
    formalizarInscripcion: async function() {
        if(!this.solicitudActiva) return;

        let confirmacion = await Swal.fire({
            title: '¿Formalizar Inscripción?',
            html: `<div class="text-start small">El sistema ejecutará los siguientes pasos de forma inteligente:<br><br>
            <b>1.</b> Verificará si el representante ya existe.<br>
            <b>2.</b> Lo creará o actualizará sus permisos automáticamente.<br>
            <b>3.</b> Creará el expediente permanente del estudiante asignado a ese padre.</div>`,
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, Formalizar Inscrito'
        });

        if(!confirmacion.isConfirmed) return;

        window.Aplicacion.mostrarCarga();
        
        try {
            const sol = this.solicitudActiva;
            let cedRep = String(sol.rep_cedula || '').trim();
            let cedEst = String(sol.est_cedula || '').trim();

            if (!cedRep || !cedEst) {
                throw new Error("No se detectó la cédula del representante o del estudiante en la solicitud original.");
            }

            // 1. GESTIONAR USUARIO REPRESENTANTE (LÓGICA INTELIGENTE)
            const { data: userExist, error: errCheckUser } = await window.supabaseDB.from('usuarios')
                .select('cedula, rol')
                .eq('cedula', cedRep)
                .maybeSingle();
            
            if (errCheckUser) throw new Error("Error DB Usuario: " + errCheckUser.message);

            if (userExist) {
                if (userExist.rol === 'Invitado' || userExist.rol === 'Visitante') {
                    const { error: errUpd } = await window.supabaseDB.from('usuarios')
                        .update({ rol: 'Representante', cargo: 'Representante Legal' })
                        .eq('cedula', cedRep);
                    
                    if(errUpd) throw new Error("Error Ascenso Usuario: " + errUpd.message);
                }
            } else {
                const { error: errUser } = await window.supabaseDB.from('usuarios').insert([{
                    cedula: cedRep,
                    nombre_completo: sol.rep_nombre || 'Sin Nombre',
                    email: sol.rep_correo || `${cedRep}@correo.com`, 
                    telefono: sol.rep_telefono || '00000000000',
                    rol: 'Representante',
                    cargo: 'Representante Legal',
                    estado: 'Activo',
                    primer_ingreso: true
                }]);
                if(errUser) throw new Error("Error Creación Usuario: " + errUser.message);
            }

            // 2. CREAR EXPEDIENTE DEL ESTUDIANTE
            const { data: estExist, error: errCheckEst } = await window.supabaseDB.from('expedientes')
                .select('cedula_escolar')
                .eq('cedula_escolar', cedEst)
                .maybeSingle();
            
            if (errCheckEst) throw new Error("Error DB Expediente: " + errCheckEst.message);

            if(!estExist) {
                let nomSeparado = (sol.est_nombre || 'Estudiante SinNombre').trim().split(' ');
                
                const payloadExpediente = {
                    cedula_escolar: cedEst,
                    nombres: nomSeparado[0], 
                    apellidos: nomSeparado.slice(1).join(' ') || 'Pendiente',
                    rep_cedula: cedRep,
                    nivel_educativo: sol.est_nivel || 'Por Asignar',
                    grado_actual: sol.est_grado || 'Por Asignar',
                    seccion_actual: 'Por Asignar',
                    estatus: 'Activo'
                };

                const { error: errExp } = await window.supabaseDB.from('expedientes').insert([payloadExpediente]);
                if(errExp) throw new Error("Error Creación Expediente: " + errExp.message);
            }

            // 3. ACTUALIZAR SOLICITUD A 'INSCRITO'
            const { error: errSol } = await window.supabaseDB.from('solicitudes').update({ estatus: 'Inscrito' }).eq('codigo', sol.codigo);
            if (errSol) throw new Error("Error Act. Solicitud: " + errSol.message);

            // 4. AUDITORÍA
            window.Aplicacion.auditar('Admisiones', 'Formalización Exitosa', `Estudiante ${sol.est_nombre} inscrito y asignado a C.I: ${cedRep}`);

            window.Aplicacion.ocultarCarga();
            
            Swal.fire({
                title: '¡Proceso Exitoso!',
                text: 'El estudiante ahora forma parte de la matrícula oficial y el expediente ha sido vinculado correctamente al representante.',
                icon: 'success', confirmButtonColor: '#10B981'
            });

            this.solicitudActiva = null;
            await this.cargarSolicitudes();
            document.getElementById('panel-expediente-lleno').classList.add('d-none');
            document.getElementById('panel-expediente-vacio').classList.remove('d-none');

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire("Error Crítico", e.message || "Falla al formalizar la inscripción.", "error");
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

    generarCartaAceptacion: function(solicitudEspecifica = null, esAutomatico = false) {
        return new Promise(async (resolve) => {
            let sol = solicitudEspecifica || this.solicitudActiva;
            if (!sol) return resolve(false);

            let nombreFirmante = document.getElementById('adm-firmante-nombre').value.trim() || 'Autoridad Escolar';
            let cargoFirmante = document.getElementById('adm-firmante-cargo').value;

            if(!esAutomatico) Swal.fire({ title: 'Firmando Documento...', text: 'Generando Carta de Aceptación Dinámica. Por favor espere.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
            
            const qrContainer = document.getElementById('qr-temp-aceptacion');
            if(!qrContainer) return resolve(false);
            
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: sol.codigo, width: 120, height: 120, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
            });

            let base64LogoEscuela = await this.obtenerImagenBase64('assets/img/logo.png');
            let base64CintilloMPPE = await this.obtenerImagenBase64('assets/img/logoMPPE.png');

            let recaudosDin = [];
            let nivel = (sol.est_nivel || "").toLowerCase();
            let grado = (sol.est_grado || "").toLowerCase();
            let parentesco = (sol.est_parentesco || "").toLowerCase();
            let esHijo = parentesco.includes("hijo") || parentesco.includes("hija");

            recaudosDin.push("- Carpeta marrón brillante tamaño oficio (nueva y con gancho).");
            if(sol.rep_nomina && !sol.rep_nomina.toLowerCase().includes("comunidad")) {
                recaudosDin.push("- Copia del carnet del trabajador(a) responsable.");
            }
            recaudosDin.push("- Copia de la Cédula de Identidad de la madre y del padre.");
            recaudosDin.push("- Copia legible de la Partida de Nacimiento del estudiante (vista al original).");
            recaudosDin.push("- Dos (2) fotos tipo carnet del estudiante.");
            recaudosDin.push("- Informe médico de especialista (Solo en caso de tener alguna condición de salud).");

            if (!esHijo && sol.rep_nomina && !sol.rep_nomina.toLowerCase().includes("comunidad")) {
                recaudosDin.push("- Copia legible de la Partida de Nacimiento del trabajador(a).");
                recaudosDin.push("- Documento probatorio de filiación (ej. Partida de Nacimiento del padre/madre).");
            }

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
                const qrDataUrl = canvas ? canvas.toDataURL('image/png') : null;
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
                
                const margin = 20;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const centro = pageWidth / 2;
                let y = 15;
                
                const checkOverflow = (espacio) => { 
                    if (y + espacio > pageHeight - 25) { 
                        doc.addPage(); y = 20; 
                    } 
                };

                if (base64LogoEscuela) doc.addImage(base64LogoEscuela, 'PNG', margin, y, 20, 20);
                doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont("helvetica", "normal");
                doc.text("República Bolivariana de Venezuela", margin + 25, y+5);
                doc.text("Ministerio del Poder Popular para la Educación", margin + 25, y+10);
                doc.setFont("helvetica", "bold"); doc.text("Unidad Educativa Libertador Bolívar", margin + 25, y+15);
                y += 25;
                
                doc.setDrawColor(0, 102, 255); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y);
                y += 15;

                doc.setFontSize(14); doc.setTextColor(0, 102, 255);
                doc.text("CARTA DE ACEPTACIÓN", centro, y, { align: "center" });
                y += 12;

                doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
                
                let anioEscolarActual = (window.Aplicacion && window.Aplicacion.momentoActual) ? window.Aplicacion.momentoActual.anioEscolar : "2025 - 2026";
                let anioEscolarProximo = window.ModAdmisiones.calcularProximoPeriodo(anioEscolarActual);
                
                let p1 = `Quien suscribe, ${cargoFirmante}, hace constar por medio de la presente que, tras haber evaluado la solicitud de inscripción bajo el código único ${sol.codigo} para el año escolar ${anioEscolarProximo}, se declara PROCEDENTE y se aprueba la asignación de cupo.`;
                let splitP1 = doc.splitTextToSize(p1, pageWidth - (margin*2));
                doc.text(splitP1, margin, y);
                y += (splitP1.length * 5) + 5;

                doc.setFillColor(248, 250, 252); doc.setDrawColor(200, 200, 200);
                doc.roundedRect(margin, y, pageWidth - (margin*2), 35, 3, 3, 'FD');
                y += 8;
                doc.setFont("helvetica", "bold");
                doc.text(`Aspirante Aprobado:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(sol.est_nombre, margin + 45, y); y+=7;
                doc.setFont("helvetica", "bold");
                doc.text(`Cédula / Escolar:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(sol.est_cedula, margin + 45, y); y+=7;
                doc.setFont("helvetica", "bold");
                doc.text(`Nivel Asignado:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(`${sol.est_grado} (${sol.est_nivel || ''})`, margin + 45, y); y+=7;
                doc.setFont("helvetica", "bold");
                doc.text(`Representante Legal:`, margin + 5, y); doc.setFont("helvetica", "normal"); doc.text(`${sol.rep_nombre} (C.I: ${sol.rep_cedula})`, margin + 45, y);
                y += 15;

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

                doc.setFontSize(9);
                recaudosDin.forEach(req => {
                    checkOverflow(10);
                    let splitReq = doc.splitTextToSize(req, pageWidth - (margin*2) - 10);
                    doc.text(splitReq, margin + 10, y);
                    y += (splitReq.length * 4) + 2;
                });
                y+=5;
                
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

                checkOverflow(60);
                y += 15;
                doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.line(centro - 35, y, centro + 35, y); y+=5;
                
                doc.setFont("helvetica", "bold"); doc.setFontSize(10);
                doc.text(nombreFirmante, centro, y, { align: "center" }); y+=5;
                doc.setFont("helvetica", "normal"); doc.setFontSize(9);
                doc.text(cargoFirmante, centro, y, { align: "center" }); y+=10;

                if (qrDataUrl) {
                    doc.addImage(qrDataUrl, 'PNG', centro - 12.5, y, 25, 25); y+=28;
                } else { y += 28; }
                
                doc.setFontSize(8); doc.setTextColor(100, 116, 139);
                doc.text("Documento avalado mediante Firma Electrónica.", centro, y, { align: "center" }); y+=4;
                doc.text(`Código de Verificación SIGAE: ${sol.codigo}`, centro, y, { align: "center" });

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
                
                if(!esAutomatico) {
                    Swal.close();
                    window.Aplicacion.auditar('Admisiones', 'PDF Carta de Aceptación', `Generado y descargado para CI: ${sol.est_cedula}`);
                    Swal.fire({toast:true, position:'top-end', icon:'success', title:'Carta Descargada', showConfirmButton:false, timer:2500});
                }
                resolve(true);
            }, 500); 
        });
    }
};

window.init_Gestion_de_Admisiones = function() { window.ModAdmisiones.init(); };