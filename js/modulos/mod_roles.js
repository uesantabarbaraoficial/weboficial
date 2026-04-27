/**
 * MÓDULO: ROLES Y PRIVILEGIOS (SIGAE v1.0)
 * Matriz Simplificada (UX): Un solo interruptor de Acceso Total por Tarjeta.
 * ✨ INCLUYE AUDITORÍA ✨
 */

window.ModRoles = {
    roles: [],
    rolActual: null,

    init: function() {
        this.cargarDatos();
    },

    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('roles')
                .select('*')
                .order('nombre', { ascending: true });

            window.Aplicacion.ocultarCarga();
            if (error) throw error;

            this.roles = (data || []).map(r => ({
                idx: r.idx,
                nombre: r.nombre,
                privilegios: typeof r.permisos === 'string' ? JSON.parse(r.permisos || '{}') : (r.permisos || {})
            }));

            this.renderizarListaRoles();
            if(this.rolActual) {
                this.seleccionarRol(this.rolActual.nombre);
            }
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "Error al sincronizar con Supabase.", "error");
        }
    },

    renderizarListaRoles: function() {
        const lista = document.getElementById('lista-roles-ui');
        if(!lista) return;
        let html = '';
        this.roles.forEach(r => {
            let activo = (this.rolActual && this.rolActual.nombre === r.nombre) ? 'bg-light border-primary' : 'border-transparent';
            html += `
            <a href="javascript:void(0)" class="list-group-item list-group-item-action p-3 border ${activo} d-flex align-items-center mb-2 rounded-3 hover-efecto" onclick="window.ModRoles.seleccionarRol('${r.nombre}')">
                <div class="bg-white shadow-sm p-2 rounded-circle me-3 border"><i class="bi bi-person-badge text-primary fs-5"></i></div>
                <div class="fw-bold text-dark">${r.nombre}</div>
            </a>`;
        });
        lista.innerHTML = html;
    },

    seleccionarRol: function(nombre) {
        this.rolActual = this.roles.find(r => r.nombre === nombre);
        if (!this.rolActual) return;

        let pVacio = document.getElementById('panel-vacio-roles');
        let pPriv = document.getElementById('panel-privilegios');
        if (pVacio) pVacio.style.display = 'none';
        if (pPriv) pPriv.style.display = 'block';

        let lblTitulo = document.getElementById('lbl-rol-actual') || document.getElementById('titulo-rol-seleccionado');
        let lblDesc = document.getElementById('lbl-rol-desc');

        if (lblTitulo) lblTitulo.innerText = this.rolActual.nombre;
        if (lblDesc) lblDesc.innerText = "Active o desactive el acceso a los módulos y tarjetas.";

        this.dibujarMatrizSimplificada();
    },

    dibujarMatrizSimplificada: function() {
        const contenedor = document.getElementById('contenedor-permisos-dinamicos');
        if(!contenedor) return;

        // ✨ ESTRUCTURA ACTUALIZADA CON EXPEDIENTE DOCENTE ✨
        const estructura = {
            "Dirección y Sistema": {
                "Perfil de la Escuela": [],
                "Espacios Escolares": [],
                "Gestión de Registros": [],
                "Configuración del Sistema": [
                    "Tarjeta: Períodos Escolares",
                    "Tarjeta: Lapsos Académicos",
                    "Tarjeta: Niveles Educativos"
                ],
                "Calendario Escolar": [
                    "Tarjeta: Calendario Oficial MPPE",
                    "Tarjeta: Calendario Administrativo",
                    "Tarjeta: Calendario Pedagógico",
                    "Tarjeta: Planificador"
                ],
                "Panel de Control": [] 
            },
            "Organización Escolar": {
                "Cargos Institucionales": [
                    "Tarjeta: Definir Cargos",
                    "Tarjeta: Asignar Personal"
                ],
                "Cadena Supervisoria": [
                    "Función: Estructurar Cadena",
                    "Función: Imprimir Organigrama"
                ],
                "Gestión de Colectivos": [],
                "Estructura Empresa": [
                    "Diccionario: Nómina",
                    "Diccionario: Parentesco",
                    "Diccionario: Condición"
                ]
            },
            "Control de Estudios": {
                "Grados y Salones": [
                    "Tarjeta: Configurar Grados",
                    "Tarjeta: Configurar Secciones",
                    "Tarjeta: Apertura de Salones"
                ]
            },
            "Gestión Estudiantil": {
                "Gestión de Admisiones": [],
                "Gestión de Matrícula": [],
                "Vincular Estudiante": [],
                "Expediente Estudiantil": [],
                "Actualización de Datos": [],
                "Solicitud de Cupos": [],
                "Mis Solicitudes": [], 
                "Verificaciones": [
                    "Función: Escanear QR",
                    "Función: Re-imprimir Comprobante"
                ]
            },
            "Gestión Docente": {
                "Asignar Guiaturas": [],
                "Mi Expediente": [],
                "Gestor de Expedientes": []
            },
            "Formación y Capacitación": {
                "Gestor de Catálogo": [
                    "Función: Crear Cursos",
                    "Función: Editar Cursos",
                    "Función: Eliminar Cursos"
                ],
                "Oferta Académica": [],
                "Mis Certificados": []
            },
            "Servicios y Bienestar": {
                "Transporte Escolar": [
                    "Tarjeta: Gestión de Rutas",
                    "Tarjeta: Gestión de Paradas",
                    "Tarjeta: Operación (Tracking)",
                    "Tarjeta: Visor de Recorrido"
                ]
            },
            "Seguridad y Accesos": {
                "Mi Perfil": [],
                "Gestión de Usuarios": [],
                "Roles y Privilegios": [],
                "Preguntas de Seguridad": [],
                "Auditoría del Sistema": []
            }
        };

        let html = `
        <div class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border-start border-5" style="border-color: #F59E0B !important;">
            <h6 class="mb-0 fw-bold"><i class="bi bi-ui-checks-grid me-2" style="color: #F59E0B;"></i>Control de Accesos Simplificado</h6>
            <div class="form-check form-switch m-0">
                <input class="form-check-input" type="checkbox" id="chk-marcar-todos" onchange="window.ModRoles.toggleTodosPermisos(this.checked)" style="cursor: pointer; height: 22px; width: 44px;">
                <label class="form-check-label small fw-bold text-dark ms-1 mt-1" for="chk-marcar-todos" style="cursor: pointer;">Otorgar Todo</label>
            </div>
        </div>`;

        let privs = this.rolActual.privilegios || {};

        for (const [categoria, modulos] of Object.entries(estructura)) {
            html += `
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-header text-white py-3 rounded-top-4" style="background-color: #1e293b;">
                    <h6 class="mb-0 fw-bold text-uppercase" style="letter-spacing:1px; font-size:0.85rem;"><i class="bi bi-folder-fill text-warning me-2"></i>${categoria}</h6>
                </div>
                <div class="card-body p-3 p-md-4 bg-light bg-opacity-50">
                    <div class="row g-3">`;

            for (const [nombreModulo, tarjetasHijas] of Object.entries(modulos)) {
                let hasAccessMod = (privs[nombreModulo] && privs[nombreModulo]["ver"]) ? 'checked' : '';

                html += `
                <div class="col-12 mod-container">
                    <div class="p-3 bg-white border shadow-sm rounded-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="fw-bold text-dark fs-6"><i class="bi bi-box me-2 text-primary"></i>${nombreModulo}</div>
                            <div class="form-check form-switch m-0">
                                <input class="form-check-input chk-acceso chk-padre" type="checkbox" data-nombre="${nombreModulo}" ${hasAccessMod} onchange="window.ModRoles.evaluarCascada(this)" style="cursor: pointer; height: 22px; width: 44px;">
                                <label class="form-check-label small fw-bold text-primary ms-1 mt-1" style="cursor: pointer;">Acceso</label>
                            </div>
                        </div>`;

                if (tarjetasHijas.length > 0) {
                    html += `<div class="row g-2 mt-3 ps-4 border-start ms-2 border-primary border-opacity-25">`;
                    tarjetasHijas.forEach(tarjeta => {
                        let hasAccessTarj = (privs[tarjeta] && privs[tarjeta]["ver"]) ? 'checked' : '';
                        html += `
                        <div class="col-md-6 col-xl-4">
                            <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded border border-light">
                                <span class="small fw-bold text-muted text-truncate" title="${tarjeta}"><i class="bi bi-window-stack me-2 text-secondary"></i>${tarjeta.replace('Tarjeta: ', '').replace('Función: ', '').replace('Diccionario: ', '')}</span>
                                <div class="form-check form-switch m-0">
                                    <input class="form-check-input chk-acceso chk-hijo" type="checkbox" data-nombre="${tarjeta}" data-padre="${nombreModulo}" ${hasAccessTarj} onchange="window.ModRoles.evaluarHijo(this)" style="cursor: pointer;">
                                </div>
                            </div>
                        </div>`;
                    });
                    html += `</div>`;
                }
                html += `</div></div>`;
            }
            html += `</div></div></div>`;
        }
        contenedor.innerHTML = html;
        this.evaluarCheckTodos();
    },

    evaluarCascada: function(chkPadre) {
        let contenedor = chkPadre.closest('.mod-container');
        if (contenedor) {
            contenedor.querySelectorAll('.chk-hijo').forEach(chk => chk.checked = chkPadre.checked);
        }
        this.evaluarCheckTodos();
    },

    evaluarHijo: function(chkHijo) {
        if (chkHijo.checked) {
            let contenedor = chkHijo.closest('.mod-container');
            if (contenedor) {
                let chkPadre = contenedor.querySelector('.chk-padre');
                if (chkPadre) chkPadre.checked = true;
            }
        }
        this.evaluarCheckTodos();
    },

    toggleTodosPermisos: function(estado) {
        document.querySelectorAll('.chk-acceso').forEach(chk => chk.checked = estado);
    },

    evaluarCheckTodos: function() {
        const todos = document.querySelectorAll('.chk-acceso');
        const marcados = document.querySelectorAll('.chk-acceso:checked');
        const chkTodos = document.getElementById('chk-marcar-todos');
        if(chkTodos && todos.length > 0) chkTodos.checked = (todos.length === marcados.length);
    },

    guardarPrivilegios: async function() {
        if (!this.rolActual) return;
        
        let nuevosPriv = {};
        const superPoderes = { ver: true, crear: true, eliminar: true, modificar: true, masivo: true, escanear: true, imprimir: true, registrar: true, exportar: true, resetear: true };

        document.querySelectorAll('.chk-acceso:checked').forEach(chk => {
            let nombre = chk.getAttribute('data-nombre');
            nuevosPriv[nombre] = { ...superPoderes };
        });

        window.Aplicacion.mostrarCarga();
        try {
            const { error } = await window.supabaseDB
                .from('roles')
                .update({ permisos: nuevosPriv })
                .eq('nombre', this.rolActual.nombre);

            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Accesos guardados', showConfirmButton: false, timer: 1500 });
            window.Aplicacion.auditar('Roles y Privilegios', 'Actualizar Privilegios', `Accesos simplificados actualizados para: ${this.rolActual.nombre}`);
            
            // Recargamos el rol en sesión si es el mío para que se refresque el menú instantáneamente
            if (window.Aplicacion.usuario && window.Aplicacion.usuario.rol === this.rolActual.nombre) {
                window.Aplicacion.permisosActuales = nuevosPriv;
                window.Aplicacion.dibujarMenuPrincipal();
                window.Aplicacion.marcarMenuActivo(Enrutador.vistaActual);
            }

            this.cargarDatos();
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo guardar la matriz.', 'error');
        }
    },

    eliminarRolActual: function() {
        if (!this.rolActual) return;
        Swal.fire({
            title: '¿Eliminar Rol?', text: "Los usuarios con este rol perderán todos sus accesos.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(async (res) => {
            if(res.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('roles').delete().eq('nombre', this.rolActual.nombre);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;

                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Rol Eliminado', showConfirmButton: false, timer: 1500 });
                    window.Aplicacion.auditar('Roles y Privilegios', 'Eliminar Rol', `Se eliminó el rol: ${this.rolActual.nombre}`);
                    this.rolActual = null;
                    this.cargarDatos(); 
                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al eliminar el rol.', 'error');
                }
            }
        });
    },

    crearRol: function() {
        Swal.fire({
            title: 'Nuevo Rol de Acceso',
            html: `<input type="text" id="swal-rol-nombre" class="swal2-input input-moderno mb-0" placeholder="Nombre del Rol (Ej. Coordinador)"><small class="text-muted d-block mt-2">Los privilegios se asignarán después de crearlo.</small>`,
            showCancelButton: true, confirmButtonText: 'Crear Rol', cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const nombre = document.getElementById('swal-rol-nombre').value.trim();
                if (!nombre) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
                return { nombre };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('roles').insert([{ nombre: result.value.nombre, permisos: {} }]);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Rol Creado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Roles y Privilegios', 'Nuevo Rol', `Se creó el rol de acceso: ${result.value.nombre}`);
                    this.cargarDatos();
                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error de Base de Datos', 'No se pudo crear el rol.', 'error');
                }
            }
        });
    }
};

window.init_Roles_y_Privilegios = function() { window.ModRoles.init(); };