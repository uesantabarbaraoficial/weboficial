/**
 * MÓDULO: GESTIÓN DE CARGOS INSTITUCIONALES (Supabase Edition)
 * Conexión Directa con BD, UI Mejorada, Pestañas, Paginación y Asignación.
 * ✨ INCLUYE AUDITORÍA ESTRICTA, SEGURIDAD Y MANEJO AVANZADO DE ERRORES ✨
 */

window.ModCargos = {
    cargos: [],
    usuariosValidos: [],
    usuariosFiltrados: [], 
    
    // Configuración de Paginación
    itemsPorPaginaCargos: 6,
    paginaActualCargos: 1,
    itemsPorPaginaUsuarios: 10,
    paginaActualUsuarios: 1,

    init: function() {
        // ✨ VALIDACIÓN DE SEGURIDAD MAESTRA (VER) ✨
        let pDefinir = window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'ver');
        let pAsignar = window.Aplicacion.permiso('Tarjeta: Asignar Personal', 'ver');

        if (!pDefinir && !pAsignar) {
            let contenedor = document.querySelector('.row.mb-4.animate__animated.animate__fadeIn');
            if (contenedor && contenedor.parentNode) {
                contenedor.parentNode.innerHTML = `
                <div class="row mb-4 animate__animated animate__fadeInDown"><div class="col-12"><div class="banner-modulo p-4 p-md-5 text-white shadow-sm" style="background: linear-gradient(135deg, #0066FF 0%, #003399 100%); border-radius: 24px;"><h1 class="fw-bolder mb-2 text-white">Gestión de Cargos Institucionales</h1></div></div></div>
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar ni asignar cargos.</p>
                </div>`;
            }
            return; // Bloquea todo
        }

        // Ocultar pestañas si no hay permiso
        let tabDefinir = document.getElementById('tab-definir');
        let tabAsignar = document.getElementById('tab-asignar');
        if (!pDefinir && tabDefinir) tabDefinir.style.display = 'none';
        if (!pAsignar && tabAsignar) tabAsignar.style.display = 'none';

        // Bloqueo visual del formulario de creación
        if (!window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'crear')) {
            let formCargo = document.getElementById('form-cargo');
            if(formCargo) formCargo.innerHTML = `<div class="alert alert-warning text-center mt-4"><i class="bi bi-lock-fill fs-3 d-block mb-2"></i>No posees permisos para crear o editar cargos institucionales.</div>`;
        }

        // Bloqueo visual del botón de guardado masivo
        if (!window.Aplicacion.permiso('Tarjeta: Asignar Personal', 'masivo')) {
            let btnBulk = document.querySelector('button[onclick="window.ModCargos.guardarAsignacionesBulk()"]');
            if(btnBulk) btnBulk.style.display = 'none';
        }

        this.cargarDatos();

        // Cargar pestaña por defecto según permisos
        setTimeout(() => {
            if (pDefinir) this.cambiarPestana('definir');
            else if (pAsignar) this.cambiarPestana('asignar');
        }, 100);
    },

    cambiarPestana: function(pestana) {
        let tabDefinir = document.getElementById('tab-definir');
        let tabAsignar = document.getElementById('tab-asignar');
        let secDefinir = document.getElementById('seccion-definir');
        let secAsignar = document.getElementById('seccion-asignar');

        if(tabDefinir) tabDefinir.classList.remove('activo');
        if(tabAsignar) tabAsignar.classList.remove('activo');
        if(secDefinir) secDefinir.style.display = 'none';
        if(secAsignar) secAsignar.style.display = 'none';

        if(pestana === 'definir' && window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'ver')) {
            if(tabDefinir) tabDefinir.classList.add('activo');
            if(secDefinir) secDefinir.style.display = 'flex';
        } else if (pestana === 'asignar' && window.Aplicacion.permiso('Tarjeta: Asignar Personal', 'ver')) {
            if(tabAsignar) tabAsignar.classList.add('activo');
            if(secAsignar) secAsignar.style.display = 'flex';
        }
    },

    // 🚀 LECTURA MÚLTIPLE EN SUPABASE
    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            // Ejecutar ambas consultas en paralelo en Supabase
            const [resCargos, resUsers] = await Promise.all([
                window.supabaseDB.from('cargos').select('*').order('nombre_cargo', { ascending: true }),
                window.supabaseDB.from('usuarios').select('*').order('nombre_completo', { ascending: true })
            ]);

            if (resCargos.error) throw resCargos.error;
            if (resUsers.error) throw resUsers.error;

            this.cargos = resCargos.data || [];
            
            // Filtramos a los que NO son estudiantes ni representantes (solo personal apto para cargos)
            const rolesExcluidos = ["Estudiante", "Representante", "Invitado"];
            this.usuariosValidos = (resUsers.data || []).filter(u => !rolesExcluidos.includes(u.rol));
            this.usuariosFiltrados = [...this.usuariosValidos]; 
            
            this.actualizarUI();
            window.Aplicacion.ocultarCarga();

        } catch (e) {
            console.error("Error de conexión:", e);
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "No se pudo conectar con la base de datos Supabase.", "error");
        }
    },

    actualizarUI: function() {
        document.getElementById('total-cargos').innerText = `${this.cargos.length} Cargos`;
        this.renderizarTablaCargos();
        this.renderizarTablaAsignacion();
    },

    // ----------------------------------------------------
    // LÓGICA DE TABLA 1: DEFINIR CARGOS
    // ----------------------------------------------------
    renderizarTablaCargos: function() {
        const tbody = document.getElementById('tabla-cargos-body');
        const totalPaginas = Math.ceil(this.cargos.length / this.itemsPorPaginaCargos) || 1;
        if (this.paginaActualCargos > totalPaginas) this.paginaActualCargos = totalPaginas;

        const inicio = (this.paginaActualCargos - 1) * this.itemsPorPaginaCargos;
        const cargosPagina = this.cargos.slice(inicio, inicio + this.itemsPorPaginaCargos);

        if (cargosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No hay cargos registrados aún.</td></tr>`;
            document.getElementById('paginacion-cargos').innerHTML = '';
            return;
        }

        let html = '';
        let pCrear = window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'crear');
        let pElim = window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'eliminar');

        cargosPagina.forEach(c => {
            let colorClasif = c.tipo_cargo === 'Directivo' ? 'danger' : (c.tipo_cargo === 'Supervisorio' ? 'warning text-dark' : 'primary');
            
            let btnEditar = pCrear ? `<button class="btn btn-sm btn-light text-primary border shadow-sm me-1 hover-efecto" onclick="window.ModCargos.editarCargo('${c.id_cargo}')"><i class="bi bi-pencil-fill"></i></button>` : '';
            let btnEliminar = pElim ? `<button class="btn btn-sm btn-light text-danger border shadow-sm hover-efecto" onclick="window.ModCargos.eliminarCargo('${c.id_cargo}')"><i class="bi bi-trash3-fill"></i></button>` : '';

            html += `
            <tr class="hover-efecto">
                <td class="ps-4 fw-bold text-dark align-middle">${c.nombre_cargo}</td>
                <td class="align-middle"><span class="badge bg-${colorClasif} bg-opacity-10 text-${colorClasif.replace(' text-dark','')} border border-${colorClasif.replace(' text-dark','')} px-2 py-1 shadow-sm">${c.tipo_cargo}</span></td>
                <td class="text-muted small align-middle" style="max-width: 250px;">${c.descripcion || 'Sin descripción'}</td>
                <td class="text-end pe-4 align-middle text-nowrap">${btnEditar}${btnEliminar}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        this.generarControlesPaginacion(totalPaginas, this.paginaActualCargos, 'paginacion-cargos', 'window.ModCargos.cambiarPaginaCargos');
    },

    cambiarPaginaCargos: function(pag) { this.paginaActualCargos = pag; this.renderizarTablaCargos(); },

    // ----------------------------------------------------
    // LÓGICA DE TABLA 2: ASIGNACIÓN DE PERSONAL (UI MEJORADA)
    // ----------------------------------------------------
    filtrarUsuarios: function() {
        const texto = document.getElementById('buscador-personal').value.toLowerCase();
        this.usuariosFiltrados = this.usuariosValidos.filter(u => 
            String(u.nombre_completo).toLowerCase().includes(texto) || 
            String(u.cedula).toLowerCase().includes(texto)
        );
        this.paginaActualUsuarios = 1;
        this.renderizarTablaAsignacion();
    },

    renderizarTablaAsignacion: function() {
        const tbody = document.getElementById('tabla-asignacion-body');
        const totalPaginas = Math.ceil(this.usuariosFiltrados.length / this.itemsPorPaginaUsuarios) || 1;
        if (this.paginaActualUsuarios > totalPaginas) this.paginaActualUsuarios = totalPaginas;

        const inicio = (this.paginaActualUsuarios - 1) * this.itemsPorPaginaUsuarios;
        const usuariosPagina = this.usuariosFiltrados.slice(inicio, inicio + this.itemsPorPaginaUsuarios);

        if (usuariosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-5 text-muted"><i class="bi bi-search fs-2 d-block mb-2"></i>No se encontró personal.</td></tr>`;
            document.getElementById('paginacion-usuarios').innerHTML = '';
            return;
        }

        let pMasivo = window.Aplicacion.permiso('Tarjeta: Asignar Personal', 'masivo');
        let propDisabled = pMasivo ? '' : 'disabled';

        let html = '';
        usuariosPagina.forEach(u => {
            // UI Mejorada: Si tiene cargo se pinta azul, si no, gris.
            let colorUI = u.cargo ? 'primary' : 'secondary';
            let selectHTML = `
                <div class="input-group input-group-sm shadow-sm hover-efecto" style="border-radius: 10px; overflow: hidden; border: 1px solid #ced4da;">
                    <span class="input-group-text bg-${colorUI} bg-opacity-10 text-${colorUI} border-0"><i class="bi bi-briefcase-fill"></i></span>
                    <select class="form-select border-0 fw-bold text-dark selector-cargo-bulk" data-id="${u.id_usuario}" ${propDisabled} style="background-color: #f8fafc; cursor: pointer;">
                        <option value="">-- Sin cargo asignado --</option>`;
            
            this.cargos.forEach(c => {
                let sel = (u.cargo === c.nombre_cargo) ? 'selected' : '';
                selectHTML += `<option value="${c.nombre_cargo}" ${sel}>${c.nombre_cargo}</option>`;
            });
            
            selectHTML += `</select></div>`;

            html += `
            <tr class="align-middle hover-efecto">
                <td class="ps-4">
                    <div class="fw-bold text-dark fs-6">${u.nombre_completo}</div>
                    <div class="small text-muted"><i class="bi bi-person-vcard me-1"></i>${u.cedula}</div>
                </td>
                <td><span class="badge bg-dark bg-opacity-10 text-dark border px-2 py-1 shadow-sm">${u.rol}</span></td>
                <td class="pe-4">${selectHTML}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        this.generarControlesPaginacion(totalPaginas, this.paginaActualUsuarios, 'paginacion-usuarios', 'window.ModCargos.cambiarPaginaUsuarios');
    },

    cambiarPaginaUsuarios: function(pag) { this.paginaActualUsuarios = pag; this.renderizarTablaAsignacion(); },

    // Función global para paginaciones
    generarControlesPaginacion: function(totalPaginas, paginaActual, idContenedor, funcionClick) {
        const contenedor = document.getElementById(idContenedor);
        if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }
        
        let html = `<li class="page-item ${paginaActual === 1 ? 'disabled' : ''}"><button class="page-link" onclick="${funcionClick}(${paginaActual - 1})"><i class="bi bi-chevron-left"></i></button></li>`;
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
                html += `<li class="page-item ${paginaActual === i ? 'active' : ''}"><button class="page-link" onclick="${funcionClick}(${i})">${i}</button></li>`;
            } else if (i === paginaActual - 3 || i === paginaActual + 3) {
                html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
            }
        }
        html += `<li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}"><button class="page-link" onclick="${funcionClick}(${paginaActual + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
        contenedor.innerHTML = html;
    },

    // 🚀 INTERACCIONES CON SUPABASE (CRUD Y AUDITORÍA)
    guardarCargo: async function() {
        if (!window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'crear')) return Swal.fire('Acceso Denegado', 'No posees privilegios de creación.', 'error');

        const id = document.getElementById('c-id').value;
        const nombre = document.getElementById('c-nombre').value.trim();
        const tipo = document.getElementById('c-tipo').value;
        const desc = document.getElementById('c-desc').value.trim();

        if (!nombre || !tipo) return Swal.fire('Atención', 'El nombre y el tipo de cargo son obligatorios', 'warning');

        window.Aplicacion.mostrarCarga();
        try {
            const payload = { nombre_cargo: nombre, tipo_cargo: tipo, descripcion: desc };
            let errorGuardado;
            let accionRegistro = id ? 'Editar Cargo' : 'Nuevo Cargo';

            if (id) {
                const { error } = await window.supabaseDB.from('cargos').update(payload).eq('id_cargo', id);
                errorGuardado = error;
            } else {
                payload.id_cargo = 'CAR-' + new Date().getTime();
                const { error } = await window.supabaseDB.from('cargos').insert([payload]);
                errorGuardado = error;
            }

            window.Aplicacion.ocultarCarga();
            
            // ✨ DETECTOR DE ERRORES EXACTOS ✨
            if (errorGuardado) {
                console.error("Error devuelto por Supabase:", errorGuardado);
                return Swal.fire("Error de Base de Datos", `Supabase dice: ${errorGuardado.message || errorGuardado.details}`, "error");
            }

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cargo guardado', showConfirmButton: false, timer: 1500 });
            
            // Registro en Auditoría
            window.Aplicacion.auditar('Cargos Institucionales', accionRegistro, `Se guardó el cargo: ${nombre} (${tipo})`);
            
            this.cancelarEdicion();
            this.cargarDatos();

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error("Error de código JS:", e);
            Swal.fire("Error Crítico", `Falla interna: ${e.message}`, "error");
        }
    },

    editarCargo: function(id) {
        if (!window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'crear')) return Swal.fire('Acceso Denegado', 'No posees privilegios para editar.', 'error');
        
        const cargo = this.cargos.find(c => String(c.id_cargo) === String(id));
        if (!cargo) return;
        
        document.getElementById('c-id').value = cargo.id_cargo;
        document.getElementById('c-nombre').value = cargo.nombre_cargo;
        document.getElementById('c-tipo').value = cargo.tipo_cargo;
        document.getElementById('c-desc').value = cargo.descripcion || '';
        
        document.getElementById('btn-submit-cargo').innerHTML = '<i class="bi bi-save-fill me-2"></i>Actualizar Cargo';
        document.getElementById('btn-submit-cargo').classList.replace('btn-primary', 'btn-success');
        document.getElementById('btn-cancelar-cargo').classList.remove('d-none');
    },

    cancelarEdicion: function() {
        document.getElementById('form-cargo').reset();
        document.getElementById('c-id').value = '';
        document.getElementById('btn-submit-cargo').innerHTML = '<i class="bi bi-floppy-fill me-2"></i>Registrar Cargo';
        document.getElementById('btn-submit-cargo').classList.replace('btn-success', 'btn-primary');
        document.getElementById('btn-cancelar-cargo').classList.add('d-none');
    },

    eliminarCargo: function(id) {
        if (!window.Aplicacion.permiso('Tarjeta: Definir Cargos', 'eliminar')) return Swal.fire('Acceso Denegado', 'No posees privilegios de eliminación.', 'error');

        let cargoRef = this.cargos.find(c => c.id_cargo === id);
        let nombreC = cargoRef ? cargoRef.nombre_cargo : 'Desconocido';

        Swal.fire({
            title: '¿Eliminar cargo?', text: `Se borrará "${nombreC}". Esto no afectará a los usuarios, solo lo dejará en blanco.`, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('cargos').delete().eq('id_cargo', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;
                    
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500 });
                    
                    // ✨ REGISTRO EN AUDITORÍA ✨
                    window.Aplicacion.auditar('Cargos Institucionales', 'Eliminar Cargo', `Se eliminó el cargo: ${nombreC}`);
                    
                    this.cargarDatos();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire("Error", "Error al eliminar en Supabase.", "error");
                }
            }
        });
    },

    guardarAsignacionesBulk: async function() {
        if (!window.Aplicacion.permiso('Tarjeta: Asignar Personal', 'masivo')) return Swal.fire('Acceso Denegado', 'No posees privilegios de asignación masiva.', 'error');

        const selects = document.querySelectorAll('.selector-cargo-bulk');
        let promesas = [];
        let contador = 0;

        window.Aplicacion.mostrarCarga();
        
        selects.forEach(sel => {
            let idUsr = sel.getAttribute('data-id');
            let cargoNuevo = sel.value || null; 
            
            promesas.push(
                window.supabaseDB.from('usuarios').update({ cargo: cargoNuevo }).eq('id_usuario', idUsr)
            );
            contador++;
        });

        if (contador === 0) {
            window.Aplicacion.ocultarCarga();
            return Swal.fire('Atención', 'No hay personal en esta página para guardar.', 'warning');
        }

        try {
            await Promise.all(promesas);
            window.Aplicacion.ocultarCarga();
            
            Swal.fire('¡Éxito!', 'Los cargos de esta página han sido asignados correctamente.', 'success');
            
            // ✨ REGISTRO EN AUDITORÍA ✨
            window.Aplicacion.auditar('Cargos Institucionales', 'Asignación Masiva', `Se actualizaron los cargos de ${contador} usuarios.`);
            
            this.cargarDatos(); 
        } catch(e) {
            console.error(e);
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "Ocurrió un error al sincronizar con Supabase.", "error");
        }
    }
};

window.init_Cargos_Institucionales = function() { window.ModCargos.init(); };