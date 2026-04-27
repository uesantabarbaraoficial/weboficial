/**
 * MÓDULO: ASIGNAR GUIATURAS (Supabase Edition)
 * ✨ Filtros Dinámicos, Exclusión de Docentes Ocupados, Regla de Inicial y Auditoría ✨
 */

window.ModGuiaturas = {
    salonesTodos: [],
    salonesFiltrados: [],
    docentes: [],

    init: function() {
        if (!window.Aplicacion.permiso('Asignar Guiaturas', 'ver')) {
            let contenedor = document.querySelector('.row.animate__animated.animate__fadeInUp');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar o asignar docentes guías.</p>
                </div>`;
            }
            return;
        }

        this.cargarDatos();
    },

    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        
        try {
            const [salonesRes, usuariosRes] = await Promise.all([
                window.supabaseDB.from('salones').select('*').order('nivel_educativo', { ascending: true }).order('nombre_salon', { ascending: true }),
                window.supabaseDB.from('usuarios').select('cedula, nombre_completo, rol, cargo').order('nombre_completo', { ascending: true })
            ]);

            window.Aplicacion.ocultarCarga();

            if (salonesRes.error) throw salonesRes.error;
            if (usuariosRes.error) throw usuariosRes.error;

            this.salonesTodos = salonesRes.data || [];
            
            // Filtramos a los que NO son estudiantes ni representantes
            const rolesExcluidos = ["Estudiante", "Representante", "Invitado"];
            this.docentes = (usuariosRes.data || []).filter(u => !rolesExcluidos.includes(u.rol));

            this.poblarFiltroNiveles();
            this.aplicarFiltros();

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire("Error", "No se pudieron cargar los datos de la base de datos.", "error");
        }
    },

    poblarFiltroNiveles: function() {
        const select = document.getElementById('filtro-nivel-guiatura');
        if (!select) return;

        let nivelesUnicos = [...new Set(this.salonesTodos.map(s => s.nivel_educativo))].sort();
        let html = '<option value="TODOS">Todos los Niveles</option>';
        
        nivelesUnicos.forEach(n => {
            html += `<option value="${n}">${n}</option>`;
        });
        
        select.innerHTML = html;
    },

    aplicarFiltros: function() {
        const nivelSeleccionado = document.getElementById('filtro-nivel-guiatura').value;

        if (nivelSeleccionado === "TODOS") {
            this.salonesFiltrados = this.salonesTodos;
        } else {
            this.salonesFiltrados = this.salonesTodos.filter(s => s.nivel_educativo === nivelSeleccionado);
        }

        this.renderizarTabla();
    },

    renderizarTabla: function() {
        const tbody = document.getElementById('tabla-guiaturas');
        document.getElementById('contador-salones').innerText = `${this.salonesFiltrados.length} Salones`;

        if (this.salonesFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center p-5 text-muted"><i class="bi bi-door-closed fs-1 d-block mb-3"></i>No hay salones aperturados para este nivel.<br>Vaya al módulo de "Grados y Salones" para crearlos.</td></tr>`;
            return;
        }

        // ✨ 1. RECOLECTAR DOCENTES OCUPADOS ✨
        // Buscamos todas las cédulas que ya están asignadas a cualquier salón
        let cedulasOcupadas = [];
        this.salonesTodos.forEach(sal => {
            if (sal.docente_guia_1) cedulasOcupadas.push(sal.docente_guia_1);
            if (sal.docente_guia_2) cedulasOcupadas.push(sal.docente_guia_2);
        });

        let pCrear = window.Aplicacion.permiso('Asignar Guiaturas', 'crear');
        let disabledAttr = pCrear ? '' : 'disabled';

        let html = '';
        this.salonesFiltrados.forEach(s => {
            
            // Evaluamos si el nivel corresponde a Inicial
            let esInicial = (s.nivel_educativo || '').toLowerCase().includes('inicial');

            // ✨ 2. GENERADOR DINÁMICO DE OPCIONES ✨
            // Esta función construye la lista de docentes, ocultando a los ocupados (a menos que sean los dueños actuales del select)
            const construirOpciones = (cedulaActual) => {
                let opciones = '<option value="">Sin asignar...</option>';
                this.docentes.forEach(d => {
                    // Solo mostramos al docente si NO está ocupado, o si es el dueño actual de esta casilla
                    if (!cedulasOcupadas.includes(d.cedula) || d.cedula === cedulaActual) {
                        let sel = (d.cedula === cedulaActual) ? 'selected' : '';
                        opciones += `<option value="${d.cedula}" ${sel}>${d.nombre_completo} (${d.cargo || 'Docente'})</option>`;
                    }
                });
                return opciones;
            };

            // Construir Select Principal (Aplica para todos)
            let selectGuia1 = `<select class="form-select border-success text-dark shadow-sm select-guia-1" id="g1-${s.id_salon}" ${disabledAttr}>${construirOpciones(s.docente_guia_1)}</select>`;

            // Construir Select Auxiliar (Solo aplica para Inicial)
            let selectGuia2 = '';
            if (esInicial) {
                selectGuia2 = `<select class="form-select border-secondary text-dark shadow-sm select-guia-2" id="g2-${s.id_salon}" ${disabledAttr}>${construirOpciones(s.docente_guia_2)}</select>`;
            } else {
                selectGuia2 = `<div class="text-center text-muted small py-2 bg-light rounded border"><i class="bi bi-dash-circle me-1"></i>No Aplica para este nivel</div>`;
            }

            // ✨ 3. INDICADOR VISUAL (SEMÁFORO ADAPTADO) ✨
            let badgeEstatus = `<span class="badge bg-danger rounded-pill shadow-sm mt-1" style="font-size: 0.7rem;"><i class="bi bi-x-circle me-1"></i>Sin Asignar</span>`;
            
            if (esInicial) {
                if (s.docente_guia_1 && s.docente_guia_2) badgeEstatus = `<span class="badge bg-success rounded-pill shadow-sm mt-1" style="font-size: 0.7rem;"><i class="bi bi-check-circle-fill me-1"></i>Asignado Completo</span>`;
                else if (s.docente_guia_1 || s.docente_guia_2) badgeEstatus = `<span class="badge bg-warning text-dark rounded-pill shadow-sm mt-1" style="font-size: 0.7rem;"><i class="bi bi-exclamation-circle-fill me-1"></i>Incompleto</span>`;
            } else {
                if (s.docente_guia_1) badgeEstatus = `<span class="badge bg-success rounded-pill shadow-sm mt-1" style="font-size: 0.7rem;"><i class="bi bi-check-circle-fill me-1"></i>Asignado</span>`;
            }

            let btnGuardar = pCrear ? `
                <button class="btn btn-success fw-bold shadow-sm hover-efecto" onclick="window.ModGuiaturas.guardar('${s.id_salon}', '${s.nombre_salon}', ${esInicial})" title="Guardar Asignación">
                    <i class="bi bi-floppy-fill"></i>
                </button>` : '';

            html += `
            <tr class="align-middle hover-efecto">
                <td class="ps-4 py-3">
                    <div class="fw-bolder text-dark text-uppercase fs-6">${s.nombre_salon}</div>
                    <div class="small text-muted mb-1">${s.nivel_educativo}</div>
                    ${badgeEstatus}
                </td>
                <td>${selectGuia1}</td>
                <td>${selectGuia2}</td>
                <td class="text-end pe-4">${btnGuardar}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
    },

    guardar: async function(id_salon, nombre_salon, esInicial) {
        if (!window.Aplicacion.permiso('Asignar Guiaturas', 'crear')) return Swal.fire('Error', 'Privilegios insuficientes.', 'error');

        const cedula1 = document.getElementById(`g1-${id_salon}`).value;
        let cedula2 = null;

        if (esInicial) {
            cedula2 = document.getElementById(`g2-${id_salon}`).value;
            if (cedula1 && cedula1 === cedula2) {
                return Swal.fire("Atención", "No puede asignar a la misma persona como Guía Principal y Auxiliar en el mismo salón.", "warning");
            }
        }

        window.Aplicacion.mostrarCarga();
        
        try {
            const payload = {
                docente_guia_1: cedula1 || null,
                docente_guia_2: cedula2 || null
            };

            const { error } = await window.supabaseDB.from('salones').update(payload).eq('id_salon', id_salon);

            if (error) throw error;

            window.Aplicacion.ocultarCarga();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guiatura Guardada', showConfirmButton: false, timer: 2000 });
            
            // ✨ AUDITORÍA ✨
            window.Aplicacion.auditar('Asignar Guiaturas', 'Actualizar Docentes', `Se asignaron/modificaron los docentes guías del salón: ${nombre_salon}`);
            
            // Recargamos para que las cédulas se oculten/muestren en los otros selectores
            this.cargarDatos(); 

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire("Error", "Falla al guardar la asignación en la base de datos.", "error");
        }
    }
};

window.init_Asignar_Guiaturas = function() { window.ModGuiaturas.init(); };