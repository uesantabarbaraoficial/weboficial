/**
 * MÓDULO: GESTIÓN DE USUARIOS
 * Permite crear, editar, eliminar, carga masiva inteligente y resetear claves.
 * ✨ INCLUYE PAGINACIÓN Y SEGURIDAD ✨
 */

window.ModUsuarios = {
    usuarios: [],
    usuariosFiltrados: [],
    rolesDisponibles: [], 
    _rechazadosTemporales: [], 
    
    // Variables de Paginación
    itemsPorPagina: 10,
    paginaActual: 1,
    
    init: async function() {
        if (!window.Aplicacion.permiso('Gestión de Usuarios', 'ver')) {
            let contenedor = document.querySelector('.row.animate__animated.animate__fadeInUp');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar el directorio de usuarios.</p>
                </div>`;
            }
            return; 
        }

        await this.cargarRoles();
        this.cargarUsuarios();
    },

    cargarRoles: async function() {
        try {
            const { data } = await window.supabaseDB.from('roles').select('nombre');
            if (data) this.rolesDisponibles = data.map(r => r.nombre);
        } catch (e) {
            console.error("Error cargando roles", e);
        }
    },

    cargarUsuarios: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('usuarios')
                .select('*')
                .order('nombre_completo', { ascending: true });
                
            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            this.usuarios = data || [];
            this.usuariosFiltrados = [...this.usuarios];
            this.paginaActual = 1;
            this.renderizarTabla();
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudieron cargar los usuarios desde Supabase.', 'error');
        }
    },

    filtrar: function() {
        let txt = document.getElementById('buscador-usuarios').value.toLowerCase();
        this.usuariosFiltrados = this.usuarios.filter(u => 
            u.cedula.toLowerCase().includes(txt) || 
            u.nombre_completo.toLowerCase().includes(txt) ||
            u.rol.toLowerCase().includes(txt)
        );
        this.paginaActual = 1;
        this.renderizarTabla();
    },

    renderizarTabla: function() {
        const tbody = document.getElementById('tabla-usuarios');
        if(!tbody) return; 

        // Lógica de Paginación
        let totalPaginas = Math.ceil(this.usuariosFiltrados.length / this.itemsPorPagina) || 1;
        if(this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;
        let inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        let datosPagina = this.usuariosFiltrados.slice(inicio, inicio + this.itemsPorPagina);

        if(datosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted"><i class="bi bi-people fs-2 d-block mb-2"></i>No hay usuarios que coincidan con la búsqueda.</td></tr>`;
            document.getElementById('paginacion-usuarios').innerHTML = '';
            return;
        }

        let html = '';
        datosPagina.forEach(u => {
            let badgeEstado = u.estado === 'Activo' 
                ? '<span class="badge bg-success bg-opacity-10 text-success border border-success">Activo</span>' 
                : '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">Bloqueado</span>';
            
            html += `
            <tr class="align-middle hover-efecto">
                <td class="fw-bold ps-3">${u.cedula}</td>
                <td>
                    <div class="fw-bold text-dark">${u.nombre_completo}</div>
                    <div class="small text-muted">${u.email || 'Sin correo'}</div>
                </td>
                <td><span class="badge bg-primary bg-opacity-10 text-primary border">${u.rol}</span></td>
                <td><span class="text-muted small"><i class="bi bi-briefcase me-1"></i>${u.cargo || 'Sin asignar'}</span></td>
                <td>${badgeEstado}</td>
                <td class="text-end pe-3 text-nowrap">
                    <button class="btn btn-sm btn-light text-primary shadow-sm border me-1" onclick="window.ModUsuarios.editarUsuario('${u.id_usuario}')" title="Editar Usuario">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-warning shadow-sm border me-1" onclick="window.ModUsuarios.resetearClave('${u.id_usuario}')" title="Resetear Clave a Cédula">
                        <i class="bi bi-key-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger shadow-sm border" onclick="window.ModUsuarios.eliminarUsuario('${u.id_usuario}', '${u.nombre_completo}')" title="Eliminar Usuario">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        this.generarPaginacion(totalPaginas);
    },

    generarPaginacion: function(totalPaginas) {
        const contenedor = document.getElementById('paginacion-usuarios');
        if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }
        
        let html = `<li class="page-item ${this.paginaActual === 1 ? 'disabled' : ''}"><button class="page-link" onclick="window.ModUsuarios.cambiarPagina(${this.paginaActual - 1})"><i class="bi bi-chevron-left"></i></button></li>`;
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= this.paginaActual - 2 && i <= this.paginaActual + 2)) {
                html += `<li class="page-item ${this.paginaActual === i ? 'active' : ''}"><button class="page-link" onclick="window.ModUsuarios.cambiarPagina(${i})">${i}</button></li>`;
            } else if (i === this.paginaActual - 3 || i === this.paginaActual + 3) {
                html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
            }
        }
        html += `<li class="page-item ${this.paginaActual === totalPaginas ? 'disabled' : ''}"><button class="page-link" onclick="window.ModUsuarios.cambiarPagina(${this.paginaActual + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
        contenedor.innerHTML = html;
    },

    cambiarPagina: function(pag) {
        this.paginaActual = pag;
        this.renderizarTabla();
    },

    // (El resto de las funciones de carga masiva, edición y eliminación se mantienen idénticas, ahorrando espacio aquí pero asumo las dejarás tal como te las di en el paso anterior).
    mostrarFormulario: function(idEditar = null) {
        let u = null; let titulo = 'Registrar Nuevo Usuario'; let txtBoton = 'Crear Usuario';
        if (idEditar) { u = this.usuarios.find(x => x.id_usuario === idEditar); titulo = 'Editar Usuario'; txtBoton = 'Actualizar Datos'; }
        let opcionesRoles = '<option value="">Seleccione un rol de acceso...</option>';
        this.rolesDisponibles.forEach(r => { let sel = (u && u.rol === r) ? 'selected' : ''; opcionesRoles += `<option value="${r}" ${sel}>${r}</option>`; });

        let htmlForm = `
            <div class="text-start">
                <label class="small fw-bold mb-1 text-muted">Cédula de Identidad <span class="text-danger">*</span></label>
                <input type="text" id="swal-cedula" class="swal2-input input-moderno m-0 mb-3 w-100" placeholder="Ej: 12345678" value="${u ? u.cedula : ''}" ${u ? 'readonly title="La cédula no se puede cambiar"' : ''}>
                <label class="small fw-bold mb-1 text-muted">Nombre Completo <span class="text-danger">*</span></label>
                <input type="text" id="swal-nombre" class="swal2-input input-moderno m-0 mb-3 w-100" placeholder="Ej: Juan Pérez" value="${u ? u.nombre_completo : ''}">
                <label class="small fw-bold mb-1 text-muted">Rol en el Sistema <span class="text-danger">*</span></label>
                <select id="swal-rol" class="swal2-input input-moderno m-0 w-100">${opcionesRoles}</select>
                <small class="text-muted d-block mt-2"><i class="bi bi-info-circle text-primary me-1"></i>Nota: El Cargo institucional se asigna desde el módulo de Organización Escolar.</small>
            </div>`;
        Swal.fire({ title: titulo, html: htmlForm, showCancelButton: true, confirmButtonText: txtBoton, cancelButtonText: 'Cancelar', confirmButtonColor: '#10B981', width: '500px', preConfirm: () => {
            let cedula = document.getElementById('swal-cedula').value.trim(); let nombre = document.getElementById('swal-nombre').value.trim(); let rol = document.getElementById('swal-rol').value;
            if (!cedula || !nombre || !rol) { Swal.showValidationMessage('Todos los campos son obligatorios'); return false; }
            return { id_usuario: idEditar, cedula, nombre, rol };
        }}).then((result) => { if(result.isConfirmed) this.guardarUsuario(result.value); });
    },
    nuevoUsuario: function() { this.mostrarFormulario(); },
    editarUsuario: function(id) { this.mostrarFormulario(id); },
    guardarUsuario: async function(datos) {
        window.Aplicacion.mostrarCarga();
        try {
            const payload = { cedula: datos.cedula, nombre_completo: datos.nombre, rol: datos.rol }; let errorProceso;
            if (datos.id_usuario) { const { error } = await window.supabaseDB.from('usuarios').update(payload).eq('id_usuario', datos.id_usuario); errorProceso = error; } 
            else { payload.password = datos.cedula; payload.primer_ingreso = true; payload.estado = 'Activo'; const { error } = await window.supabaseDB.from('usuarios').insert([payload]); errorProceso = error; }
            window.Aplicacion.ocultarCarga();
            if (errorProceso) { if(errorProceso.code === '23505') return Swal.fire('Error', 'Esa cédula ya se encuentra registrada en el sistema.', 'error'); throw errorProceso; }
            if (datos.id_usuario) { Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Usuario actualizado', showConfirmButton: false, timer: 1500}); window.Aplicacion.auditar('Gestión de Usuarios', 'Editar Usuario', `Actualizó datos de: ${datos.cedula}`); } 
            else { Swal.fire('¡Usuario Creado!', `Se ha registrado a ${datos.nombre}.<br><br>Su clave temporal de acceso es: <b>${datos.cedula}</b>`, 'success'); window.Aplicacion.auditar('Gestión de Usuarios', 'Nuevo Usuario', `Creó usuario: ${datos.cedula}`); }
            this.cargarUsuarios();
        } catch (e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'Falla al guardar los datos en el servidor.', 'error'); }
    },
    descargarPlantilla: function() {
        let csvContent = "Cedula;Nombre_Completo;Rol\n"; csvContent += "V12345678;Perez Juan;Docente\n"; csvContent += "V98765432;Gomez Maria;Coordinador\n";
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Plantilla_Usuarios_SIGAE.csv"; link.click();
    },
    cargaMasiva: function() {
        Swal.fire({ title: 'Carga Masiva CSV', html: `<div class="text-start"><p class="small text-muted mb-2">1. Sube un archivo <b>CSV (separado por punto y coma o comas)</b> sin encabezado, o usa nuestra plantilla.</p><button class="btn btn-sm btn-outline-success fw-bold mb-3 w-100" onclick="window.ModUsuarios.descargarPlantilla()"><i class="bi bi-download me-1"></i> Descargar Plantilla Modelo (3 Columnas)</button><p class="small text-muted mb-2">2. Selecciona tu archivo completo:</p><input type="file" id="file-csv-usuarios" class="form-control border-success" accept=".csv"></div>`, showCancelButton: true, confirmButtonText: '<i class="bi bi-cloud-upload-fill me-1"></i> Procesar', confirmButtonColor: '#10B981', preConfirm: () => { const file = document.getElementById('file-csv-usuarios').files[0]; if(!file) { Swal.showValidationMessage('Debes seleccionar un archivo CSV'); return false; } return file; } }).then(res => { if(res.isConfirmed) this.procesarCSV(res.value); });
    },
    procesarCSV: function(file) {
        let reader = new FileReader();
        reader.onload = async (e) => {
            let text = e.target.result; let lines = text.split(/\r?\n/); let validos = []; let rechazados = []; let startIndex = 0;
            if(lines.length > 0 && (lines[0].toLowerCase().includes('cedula') || lines[0].toLowerCase().includes('nombre'))) startIndex = 1;
            for(let i = startIndex; i < lines.length; i++) {
                let line = lines[i].trim(); if(!line) continue;
                let row = line.split(/[;,]/); 
                if(row.length < 3) { rechazados.push({ linea: i+1, datos: line, motivo: "Faltan columnas obligatorias (Deben ser 3: Cédula, Nombre, Rol)." }); continue; }
                let cedula = row[0].trim(); let nombre = row[1].trim(); let rol = row[2].trim();
                if(!cedula || !nombre || !rol) { rechazados.push({ linea: i+1, datos: line, motivo: "Cédula, Nombre o Rol están en blanco." }); continue; }
                let rolExiste = this.rolesDisponibles.find(r => r.toLowerCase() === rol.toLowerCase());
                if(!rolExiste) { rechazados.push({ linea: i+1, datos: line, motivo: `El rol '${rol}' no está creado en el panel de Privilegios.` }); continue; }
                validos.push({ cedula: cedula, nombre_completo: nombre, rol: rolExiste, password: cedula, primer_ingreso: true, estado: 'Activo' });
            }
            if(validos.length === 0 && rechazados.length === 0) return Swal.fire('Error', 'El archivo está vacío o el formato es incorrecto.', 'error');
            window.Aplicacion.mostrarCarga(); let insertados = 0; let actualizados = 0;
            try {
                if (validos.length > 0) {
                    let cedulasNuevas = validos.map(v => String(v.cedula));
                    const { data: existentes } = await window.supabaseDB.from('usuarios').select('cedula').in('cedula', cedulasNuevas);
                    let cedulasBD = (existentes || []).map(e => String(e.cedula));
                    let registrosIns = []; let registrosUpd = [];
                    validos.forEach(v => { if(cedulasBD.includes(String(v.cedula))) registrosUpd.push(v); else registrosIns.push(v); });
                    if(registrosIns.length > 0) { const { error } = await window.supabaseDB.from('usuarios').insert(registrosIns); if(error) throw error; insertados = registrosIns.length; }
                    if(registrosUpd.length > 0) { const { error } = await window.supabaseDB.from('usuarios').upsert(registrosUpd, { onConflict: 'cedula' }); if(error) throw error; actualizados = registrosUpd.length; }
                }
                window.Aplicacion.ocultarCarga(); this._rechazadosTemporales = rechazados;
                let htmlResumen = `<div class="text-start"><p class="mb-3 text-muted">Se leyeron <b>${validos.length + rechazados.length}</b> filas del archivo.</p><div class="bg-light p-3 border rounded-3 mb-2"><p class="text-success m-0 fw-bold"><i class="bi bi-check-circle-fill me-2"></i>Nuevos agregados: ${insertados}</p><p class="text-info m-0 mt-2 fw-bold"><i class="bi bi-arrow-repeat me-2"></i>Actualizados (Ya existían): ${actualizados}</p><p class="text-danger m-0 mt-2 fw-bold"><i class="bi bi-x-circle-fill me-2"></i>Rechazados por errores: ${rechazados.length}</p></div></div>`;
                let confText = '<i class="bi bi-check-lg"></i> Entendido'; let cancelText = ''; let showCancel = false;
                if (rechazados.length > 0) { showCancel = true; cancelText = '<i class="bi bi-download me-1"></i> Bajar Errores'; }
                Swal.fire({ title: 'Resumen de Carga', html: htmlResumen, icon: rechazados.length > 0 ? 'warning' : 'success', showCancelButton: showCancel, confirmButtonText: confText, cancelButtonText: cancelText, cancelButtonColor: '#dc3545', confirmButtonColor: '#10B981', reverseButtons: true }).then((result) => { if (result.dismiss === Swal.DismissReason.cancel && rechazados.length > 0) this.descargarRechazados(); });
                this.cargarUsuarios(); window.Aplicacion.auditar('Gestión de Usuarios', 'Carga Masiva', `Insertados: ${insertados}, Actualizados: ${actualizados}, Rechazados: ${rechazados.length}`);
            } catch(errorDb) { window.Aplicacion.ocultarCarga(); Swal.fire('Error en Base de Datos', 'No se pudo procesar la carga masiva. ' + errorDb.message, 'error'); }
        };
        reader.readAsText(file);
    },
    descargarRechazados: function() {
        if(!this._rechazadosTemporales || this._rechazadosTemporales.length === 0) return;
        let csv = "Linea_Excel;Datos_Originales;Motivo_del_Rechazo\n";
        this._rechazadosTemporales.forEach(r => { let datosSafe = r.datos.replace(/"/g, '""'); let motivoSafe = r.motivo.replace(/"/g, '""'); csv += `${r.linea};"${datosSafe}";"${motivoSafe}"\n`; });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Usuarios_Rechazados_SIGAE_${new Date().getTime()}.csv`; link.click();
    },
    eliminarUsuario: function(id, nombre) {
        if(window.Aplicacion.usuario && window.Aplicacion.usuario.id === id) return Swal.fire('Acción denegada', 'No puedes eliminar tu propio usuario mientras estás conectado.', 'warning');
        Swal.fire({ title: '¿Eliminar Usuario?', html: `Se revocará permanentemente el acceso a:<br><b>${nombre}</b>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar' }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try { const { error } = await window.supabaseDB.from('usuarios').delete().eq('id_usuario', id); window.Aplicacion.ocultarCarga(); if(error) throw error; Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500}); window.Aplicacion.auditar('Gestión de Usuarios', 'Eliminar Usuario', `Eliminó usuario: ${nombre}`); this.cargarUsuarios(); } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
            }
        });
    },
    resetearClave: function(id) {
        Swal.fire({ title: '¿Resetear Contraseña?', text: "La contraseña volverá a ser el número de cédula del usuario y se desbloqueará su cuenta.", icon: 'question', showCancelButton: true, confirmButtonColor: '#f59e0b', confirmButtonText: 'Sí, resetear' }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga(); let user = this.usuarios.find(u => u.id_usuario === id); if(!user) { window.Aplicacion.ocultarCarga(); return; }
                try { const { error } = await window.supabaseDB.from('usuarios').update({ password: user.cedula, primer_ingreso: true, intentos_fallidos: 0, bloqueo_hasta: null, estado: 'Activo' }).eq('id_usuario', id); window.Aplicacion.ocultarCarga(); if(error) throw error; Swal.fire('¡Contraseña Reseteada!', 'La contraseña ha vuelto a ser la cédula.', 'success'); window.Aplicacion.auditar('Gestión de Usuarios', 'Resetear Clave', `Reinició contraseña de: ${user.cedula}`); this.cargarUsuarios(); } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo resetear la cuenta.', 'error'); }
            }
        });
    }
};

window.init_Gestión_de_Usuarios = function() { window.ModUsuarios.init(); };
window.init_Gestion_de_Usuarios = function() { window.ModUsuarios.init(); };