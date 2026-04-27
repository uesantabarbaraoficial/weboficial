/**
 * MÓDULO: AUDITORÍA DEL SISTEMA
 * Seguridad Inyectada: Bloqueo de Vista, Exportación, Eliminación y MANTENIMIENTO
 */

window.ModAuditoria = {
    registrosTodos: [],
    registrosFiltrados: [],

    // Variables de Paginación
    itemsPorPagina: 15,
    paginaActual: 1,

    init: function() {
        if (!window.Aplicacion.permiso('Auditoría del Sistema', 'ver')) {
            let contenedor = document.querySelector('.row.animate__animated.animate__fadeInUp');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar el historial del sistema.</p>
                </div>`;
            }
            return;
        }

        let pExportar = window.Aplicacion.permiso('Auditoría del Sistema', 'exportar');
        let pEliminar = window.Aplicacion.permiso('Auditoría del Sistema', 'eliminar');

        let btnExcel = document.querySelector('button[onclick="window.ModAuditoria.exportarExcel()"]');
        let btnCSV = document.querySelector('button[onclick="window.ModAuditoria.exportarCSV()"]');
        let btnEliminar = document.querySelector('button[onclick="window.ModAuditoria.eliminarSeleccionados()"]');
        let btnServicio = document.querySelector('button[onclick="window.ModAuditoria.mantenimientoTotal()"]');

        if (btnExcel && !pExportar) btnExcel.style.display = 'none';
        if (btnCSV && !pExportar) btnCSV.style.display = 'none';
        if (btnEliminar && !pEliminar) btnEliminar.style.display = 'none';
        // El botón de servicio requiere ambos permisos para funcionar
        if (btnServicio && (!pExportar || !pEliminar)) btnServicio.style.display = 'none';

        this.cargarHistorial();
    },

    cargarHistorial: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('historial_auditoria')
                .select('*')
                .order('fecha', { ascending: false });

            window.Aplicacion.ocultarCarga();
            if (error) throw error;

            this.registrosTodos = data || [];
            this.llenarFiltroUsuarios();
            this.aplicarFiltros();
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo cargar el historial de auditoría.', 'error');
        }
    },

    llenarFiltroUsuarios: function() {
        const select = document.getElementById('filtro-usuario');
        if(!select) return;
        let usuariosUnicos = [...new Set(this.registrosTodos.map(r => r.usuario_nombre))].sort();
        let html = '<option value="TODOS">Todos los usuarios</option>';
        usuariosUnicos.forEach(u => { html += `<option value="${u}">${u}</option>`; });
        select.innerHTML = html;
    },

    aplicarFiltros: function() {
        let filtroUser = document.getElementById('filtro-usuario').value;
        let orden = document.getElementById('orden-auditoria').value;

        this.registrosFiltrados = this.registrosTodos.filter(r => {
            if (filtroUser !== "TODOS" && r.usuario_nombre !== filtroUser) return false;
            return true;
        });

        this.registrosFiltrados.sort((a, b) => {
            if (orden === "FECHA_DESC") return new Date(b.fecha) - new Date(a.fecha);
            if (orden === "FECHA_ASC") return new Date(a.fecha) - new Date(b.fecha);
            if (orden === "ACCION_AZ") return a.accion.localeCompare(b.accion);
        });

        let chkTodos = document.getElementById('chk-todos-auditoria');
        if(chkTodos) chkTodos.checked = false;
        
        this.paginaActual = 1;
        this.renderizarTabla();
    },

    renderizarTabla: function() {
        const tbody = document.getElementById('tabla-auditoria');
        if(!tbody) return;

        // Lógica de Paginación
        let totalPaginas = Math.ceil(this.registrosFiltrados.length / this.itemsPorPagina) || 1;
        if(this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;
        let inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        let datosPagina = this.registrosFiltrados.slice(inicio, inicio + this.itemsPorPagina);

        if (datosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted"><i class="bi bi-clipboard-x fs-1 d-block mb-3"></i>No hay registros para este filtro.</td></tr>`;
            document.getElementById('paginacion-auditoria').innerHTML = '';
            return;
        }

        let html = '';
        let pEliminar = window.Aplicacion.permiso('Auditoría del Sistema', 'eliminar');
        let pExportar = window.Aplicacion.permiso('Auditoría del Sistema', 'exportar');

        datosPagina.forEach(r => {
            let fechaBonita = new Date(r.fecha).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'medium' });
            let badgeModulo = `<span class="badge bg-secondary bg-opacity-10 text-secondary border">${r.modulo}</span>`;
            let disabledCheck = (!pEliminar && !pExportar) ? 'disabled style="opacity:0.5;"' : 'style="cursor:pointer;"';

            html += `
            <tr class="align-middle hover-efecto">
                <td class="text-center ps-4">
                    <input class="form-check-input chk-item-auditoria" type="checkbox" value="${r.id}" ${disabledCheck}>
                </td>
                <td class="fw-bold text-dark small"><i class="bi bi-clock me-1 text-muted"></i>${fechaBonita}</td>
                <td>
                    <div class="fw-bold text-primary">${r.usuario_nombre}</div>
                    <div class="small text-muted">C.I: ${r.usuario_cedula}</div>
                </td>
                <td>${badgeModulo}</td>
                <td>
                    <div class="fw-bold text-dark small">${r.accion}</div>
                    <div class="small text-muted text-truncate" style="max-width: 250px;" title="${r.detalles || ''}">${r.detalles || '-'}</div>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;

        let chkTodos = document.getElementById('chk-todos-auditoria');
        if(chkTodos) {
            chkTodos.disabled = (!pEliminar && !pExportar);
            chkTodos.checked = false; 
        }
        
        this.generarPaginacion(totalPaginas);
    },

    generarPaginacion: function(totalPaginas) {
        const contenedor = document.getElementById('paginacion-auditoria');
        if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }
        
        let html = `<li class="page-item ${this.paginaActual === 1 ? 'disabled' : ''}"><button class="page-link" onclick="window.ModAuditoria.cambiarPagina(${this.paginaActual - 1})"><i class="bi bi-chevron-left"></i></button></li>`;
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= this.paginaActual - 2 && i <= this.paginaActual + 2)) {
                html += `<li class="page-item ${this.paginaActual === i ? 'active' : ''}"><button class="page-link" onclick="window.ModAuditoria.cambiarPagina(${i})">${i}</button></li>`;
            } else if (i === this.paginaActual - 3 || i === this.paginaActual + 3) {
                html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
            }
        }
        html += `<li class="page-item ${this.paginaActual === totalPaginas ? 'disabled' : ''}"><button class="page-link" onclick="window.ModAuditoria.cambiarPagina(${this.paginaActual + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
        contenedor.innerHTML = html;
    },

    cambiarPagina: function(pag) {
        this.paginaActual = pag;
        this.renderizarTabla();
    },

    toggleSeleccionarTodo: function(estado) {
        const checkboxes = document.querySelectorAll('.chk-item-auditoria:not(:disabled)');
        checkboxes.forEach(chk => chk.checked = estado);
    },

    obtenerSeleccionados: function() {
        let seleccionados = [];
        document.querySelectorAll('.chk-item-auditoria:checked').forEach(chk => {
            let reg = this.registrosFiltrados.find(r => r.id === chk.value);
            if(reg) seleccionados.push(reg);
        });
        return seleccionados;
    },

    exportarCSV: function() {
        if (!window.Aplicacion.permiso('Auditoría del Sistema', 'exportar')) return Swal.fire('Denegado', 'No posees privilegios de exportación.', 'error');

        let datos = this.obtenerSeleccionados();
        if (datos.length === 0) datos = this.registrosFiltrados; 
        if (datos.length === 0) return Swal.fire('Aviso', 'No hay datos para exportar', 'warning');

        let csvContent = "FECHA,USUARIO,CEDULA,MODULO,ACCION,DETALLES\n";
        
        datos.forEach(r => {
            let f = new Date(r.fecha).toLocaleString('es-VE');
            let det = (r.detalles || "").replace(/"/g, '""').replace(/\n/g, " ");
            csvContent += `"${f}","${r.usuario_nombre}","${r.usuario_cedula}","${r.modulo}","${r.accion}","${det}"\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Auditoria_SIGAE_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportarExcel: function() {
        if (!window.Aplicacion.permiso('Auditoría del Sistema', 'exportar')) return Swal.fire('Denegado', 'No posees privilegios de exportación.', 'error');
        if(typeof XLSX === 'undefined') return Swal.fire('Error', 'La librería Excel no está cargada.', 'error');
        
        let datos = this.obtenerSeleccionados();
        if (datos.length === 0) datos = this.registrosFiltrados;
        if (datos.length === 0) return Swal.fire('Aviso', 'No hay datos para exportar', 'warning');

        let dataLimpia = datos.map(r => ({
            "Fecha y Hora": new Date(r.fecha).toLocaleString('es-VE'),
            "Usuario": r.usuario_nombre,
            "Cédula": r.usuario_cedula,
            "Módulo": r.modulo,
            "Acción": r.accion,
            "Detalles Adicionales": r.detalles || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataLimpia);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoría");
        XLSX.writeFile(workbook, `Auditoria_SIGAE_${new Date().getTime()}.xlsx`);
    },

    eliminarSeleccionados: function() {
        if (!window.Aplicacion.permiso('Auditoría del Sistema', 'eliminar')) return Swal.fire('Denegado', 'No posees privilegios para alterar el historial.', 'error');

        let seleccionados = Array.from(document.querySelectorAll('.chk-item-auditoria:checked')).map(c => c.value);
        if(seleccionados.length === 0) return Swal.fire('Aviso', 'Selecciona al menos un registro en esta página para eliminar.', 'warning');

        Swal.fire({
            title: '¿Eliminar registros?',
            text: `Vas a borrar ${seleccionados.length} evento(s) del historial. ¡Esto no se puede deshacer!`,
            icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, borrar definitivamente'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('historial_auditoria').delete().in('id', seleccionados);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Registros eliminados', showConfirmButton: false, timer: 1500});
                    this.cargarHistorial();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al eliminar en el servidor.', 'error');
                }
            }
        });
    },

    // ✨ NUEVA FUNCIÓN: MANTENIMIENTO Y SERVICIO TOTAL ✨
    mantenimientoTotal: function() {
        let pExportar = window.Aplicacion.permiso('Auditoría del Sistema', 'exportar');
        let pEliminar = window.Aplicacion.permiso('Auditoría del Sistema', 'eliminar');

        if (!pExportar || !pEliminar) {
            return Swal.fire('Acceso Denegado', 'Se requieren privilegios máximos (Exportar y Eliminar) para el servicio del sistema.', 'error');
        }

        if (this.registrosTodos.length === 0) {
            return Swal.fire('Aviso', 'La base de datos ya se encuentra vacía.', 'warning');
        }

        Swal.fire({
            title: 'Mantenimiento del Sistema',
            html: `Esta acción generará un <b>Respaldo Excel Completo</b> (${this.registrosTodos.length} registros) y luego <b>VACIARÁ</b> toda la tabla de auditoría para liberar espacio.<br><br>¿Deseas continuar?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-database-down me-1"></i> Sí, Ejecutar Servicio',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                
                // 1. Exportamos absolutamente todos los registros a Excel
                if(typeof XLSX === 'undefined') return Swal.fire('Error', 'La librería Excel no está cargada.', 'error');
                
                let dataLimpia = this.registrosTodos.map(r => ({
                    "Fecha y Hora": new Date(r.fecha).toLocaleString('es-VE'),
                    "Usuario": r.usuario_nombre,
                    "Cédula": r.usuario_cedula,
                    "Módulo": r.modulo,
                    "Acción": r.accion,
                    "Detalles Adicionales": r.detalles || ""
                }));

                const worksheet = XLSX.utils.json_to_sheet(dataLimpia);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Respaldo Auditoria");
                XLSX.writeFile(workbook, `Respaldo_Maestro_Auditoria_${new Date().getTime()}.xlsx`);

                // 2. Vaciamos la base de datos completa en Supabase
                window.Aplicacion.mostrarCarga();
                try {
                    // Truco Supabase JS: not('id', 'is', null) borra todas las filas existentes
                    const { error } = await window.supabaseDB.from('historial_auditoria').delete().not('id', 'is', null);
                    window.Aplicacion.ocultarCarga();
                    
                    if (error) throw error;

                    Swal.fire('Servicio Completado', 'El respaldo se descargó y el historial fue vaciado exitosamente para liberar espacio.', 'success');
                    
                    // 3. Auditoría de la propia limpieza (Queda como el nuevo primer evento en la tabla limpia)
                    window.Aplicacion.auditar('Auditoría del Sistema', 'Mantenimiento', `Se descargó un respaldo maestro y se vació el historial completo (${this.registrosTodos.length} eventos).`);

                    this.cargarHistorial();

                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Se descargó el respaldo pero falló el vaciado en el servidor de Supabase.', 'error');
                }
            }
        });
    }
};

window.init_Auditoría_del_Sistema = function() { window.ModAuditoria.init(); };
window.init_Auditoria_del_Sistema = function() { window.ModAuditoria.init(); };