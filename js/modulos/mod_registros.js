/**
 * MÓDULO: GESTIÓN DE REGISTROS (MANTENIMIENTO TOTAL)
 * Operaciones CRUD completas sobre Invitados y Solicitudes.
 * Permite edición de campos críticos y limpieza masiva.
 */

window.ModRegistros = {
    invitados: [],
    solicitudes: [],

    init: function() {
        if (!window.Aplicacion.usuario || !window.Aplicacion.usuario.rol.toLowerCase().includes('administrador')) {
            let col = document.querySelector('.col-xl-10');
            if(col) col.innerHTML = `<div class="alert alert-danger p-5 text-center mt-4 rounded-4 shadow-sm border-0"><i class="bi bi-shield-lock-fill fs-1 d-block mb-3 text-danger"></i><h4 class="fw-bold">Acceso Denegado</h4><p>Este módulo es de uso exclusivo para la Administración Global.</p></div>`;
            return;
        }

        this.cargarInvitados();
        this.cargarSolicitudes();
    },

    cargarInvitados: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB.from('invitados').select('*').order('ultimo_ingreso', { ascending: false });
            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            this.invitados = data || [];
            this.renderizarInvitados();
        } catch(e) { window.Aplicacion.ocultarCarga(); console.error(e); }
    },

    cargarSolicitudes: async function() {
        try {
            const { data, error } = await window.supabaseDB.from('solicitudes').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            this.solicitudes = data || [];
            this.renderizarSolicitudes();
        } catch(e) { console.error(e); }
    },

    renderizarInvitados: function() {
        const tb = document.getElementById('tb-invitados');
        if (!tb) return;
        if (this.invitados.length === 0) {
            tb.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted fw-bold">No hay invitados registrados.</td></tr>`;
            return;
        }
        let html = '';
        this.invitados.forEach(inv => {
            let fecha = inv.ultimo_ingreso ? new Date(inv.ultimo_ingreso).toLocaleDateString('es-VE') : 'N/A';
            html += `
            <tr>
                <td class="ps-4 fw-bold text-secondary">${inv.cedula}</td>
                <td class="fw-bold text-dark">${inv.nombre_completo}</td>
                <td>${inv.telefono || '---'}</td>
                <td><span class="badge bg-light text-dark border">${fecha}</span></td>
                <td class="text-end pe-4 text-nowrap">
                    <button class="btn btn-sm btn-light text-primary border shadow-sm me-1" onclick="window.ModRegistros.editarInvitado('${inv.cedula}')" title="Editar Registro Completo"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-light text-danger border shadow-sm" onclick="window.ModRegistros.eliminarFila('invitados', 'cedula', '${inv.cedula}', '${inv.nombre_completo}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
                </td>
            </tr>`;
        });
        tb.innerHTML = html;
    },

    renderizarSolicitudes: function() {
        const tb = document.getElementById('tb-solicitudes');
        if (!tb) return;
        if (this.solicitudes.length === 0) {
            tb.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted fw-bold">No hay solicitudes registradas.</td></tr>`;
            return;
        }
        let html = '';
        this.solicitudes.forEach(sol => {
            let colorEst = sol.estatus === 'Aprobado' ? 'success' : (sol.estatus === 'Rechazado' ? 'danger' : (sol.estatus === 'Inscrito' ? 'info' : 'secondary'));
            html += `
            <tr>
                <td class="ps-4 fw-bold text-primary">${sol.codigo}</td>
                <td class="fw-bold text-dark">${sol.est_nombre} <span class="small text-muted d-block">CI: ${sol.est_cedula}</span></td>
                <td>${sol.est_grado}</td>
                <td><span class="badge bg-${colorEst}">${sol.estatus}</span></td>
                <td class="text-end pe-4 text-nowrap">
                    <button class="btn btn-sm btn-light text-primary border shadow-sm me-1" onclick="window.ModRegistros.editarSolicitud('${sol.codigo}')" title="Editar Registro Completo"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-light text-danger border shadow-sm" onclick="window.ModRegistros.eliminarFila('solicitudes', 'codigo', '${sol.codigo}', '${sol.codigo}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
                </td>
            </tr>`;
        });
        tb.innerHTML = html;
    },

    // ✨ EDITOR COMPLETO DE INVITADOS ✨
    editarInvitado: async function(cedulaOriginal) {
        let inv = this.invitados.find(i => String(i.cedula) === String(cedulaOriginal));
        if(!inv) return;

        const { value: formValues } = await Swal.fire({
            title: 'Editar Invitado',
            html: `
                <div class="text-start mb-2"><label class="small fw-bold">Cédula:</label><input id="sw-ced" class="swal2-input m-0 w-100" value="${inv.cedula}"></div>
                <div class="text-start mb-2"><label class="small fw-bold">Nombre Completo:</label><input id="sw-nom" class="swal2-input m-0 w-100" value="${inv.nombre_completo}"></div>
                <div class="text-start mb-2"><label class="small fw-bold">Teléfono:</label><input id="sw-tel" class="swal2-input m-0 w-100" value="${inv.telefono || ''}"></div>
                <div class="text-start"><label class="small fw-bold">Correo:</label><input id="sw-mail" class="swal2-input m-0 w-100" value="${inv.email || ''}"></div>
            `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar Cambios',
            preConfirm: () => ({
                cedula: document.getElementById('sw-ced').value.trim(),
                nombre_completo: document.getElementById('sw-nom').value.trim(),
                telefono: document.getElementById('sw-tel').value.trim(),
                email: document.getElementById('sw-mail').value.trim()
            })
        });

        if (formValues) {
            window.Aplicacion.mostrarCarga();
            const { error } = await window.supabaseDB.from('invitados').update(formValues).eq('cedula', cedulaOriginal);
            window.Aplicacion.ocultarCarga();
            if(error) return Swal.fire('Error', 'Falla al actualizar: ' + error.message, 'error');
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Registro Actualizado', showConfirmButton:false, timer:1500});
            this.cargarInvitados();
        }
    },

    // ✨ EDITOR COMPLETO DE SOLICITUDES (CUPOS) ✨
    editarSolicitud: async function(codigoOriginal) {
        let sol = this.solicitudes.find(s => String(s.codigo) === String(codigoOriginal));
        if(!sol) return;

        const { value: fv } = await Swal.fire({
            title: 'Editar Solicitud',
            width: '600px',
            html: `
                <div class="row g-2 text-start">
                    <div class="col-6"><label class="small fw-bold">Código:</label><input id="sw-cod" class="swal2-input m-0 w-100" value="${sol.codigo}"></div>
                    <div class="col-6"><label class="small fw-bold">Estatus:</label>
                        <select id="sw-est" class="swal2-select m-0 w-100" style="height: 48px;">
                            <option value="Pendiente" ${sol.estatus==='Pendiente'?'selected':''}>Pendiente</option>
                            <option value="En Revisión" ${sol.estatus==='En Revisión'?'selected':''}>En Revisión</option>
                            <option value="Aprobado" ${sol.estatus==='Aprobado'?'selected':''}>Aprobado</option>
                            <option value="Rechazado" ${sol.estatus==='Rechazado'?'selected':''}>Rechazado</option>
                            <option value="Inscrito" ${sol.estatus==='Inscrito'?'selected':''}>Inscrito</option>
                        </select>
                    </div>
                    <div class="col-12 mt-3 fw-bold border-bottom pb-1 text-primary">DATOS DEL ESTUDIANTE</div>
                    <div class="col-8"><label class="small fw-bold">Nombre Estudiante:</label><input id="sw-est-nom" class="swal2-input m-0 w-100" value="${sol.est_nombre}"></div>
                    <div class="col-4"><label class="small fw-bold">Cédula:</label><input id="sw-est-ced" class="swal2-input m-0 w-100" value="${sol.est_cedula}"></div>
                    <div class="col-6"><label class="small fw-bold">Grado:</label><input id="sw-est-gra" class="swal2-input m-0 w-100" value="${sol.est_grado}"></div>
                    <div class="col-6"><label class="small fw-bold">Nivel:</label><input id="sw-est-niv" class="swal2-input m-0 w-100" value="${sol.est_nivel || ''}"></div>
                    <div class="col-12 mt-3 fw-bold border-bottom pb-1 text-primary">DATOS DEL REPRESENTANTE</div>
                    <div class="col-8"><label class="small fw-bold">Nombre Representante:</label><input id="sw-rep-nom" class="swal2-input m-0 w-100" value="${sol.rep_nombre}"></div>
                    <div class="col-4"><label class="small fw-bold">Cédula:</label><input id="sw-rep-ced" class="swal2-input m-0 w-100" value="${sol.rep_cedula}"></div>
                    <div class="col-6"><label class="small fw-bold">Teléfono:</label><input id="sw-rep-tel" class="swal2-input m-0 w-100" value="${sol.rep_telefono || ''}"></div>
                    <div class="col-6"><label class="small fw-bold">Correo:</label><input id="sw-rep-cor" class="swal2-input m-0 w-100" value="${sol.rep_correo || ''}"></div>
                </div>
            `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Actualizar Registro',
            preConfirm: () => ({
                codigo: document.getElementById('sw-cod').value.trim(),
                estatus: document.getElementById('sw-est').value,
                est_nombre: document.getElementById('sw-est-nom').value.trim(),
                est_cedula: document.getElementById('sw-est-ced').value.trim(),
                est_grado: document.getElementById('sw-est-gra').value.trim(),
                est_nivel: document.getElementById('sw-est-niv').value.trim(),
                rep_nombre: document.getElementById('sw-rep-nom').value.trim(),
                rep_cedula: document.getElementById('sw-rep-ced').value.trim(),
                rep_telefono: document.getElementById('sw-rep-tel').value.trim(),
                rep_correo: document.getElementById('sw-rep-cor').value.trim()
            })
        });

        if (fv) {
            window.Aplicacion.mostrarCarga();
            const { error } = await window.supabaseDB.from('solicitudes').update(fv).eq('codigo', codigoOriginal);
            window.Aplicacion.ocultarCarga();
            if(error) return Swal.fire('Error', 'Falla al actualizar: ' + error.message, 'error');
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Registro Actualizado', showConfirmButton:false, timer:1500});
            this.cargarSolicitudes();
        }
    },

    eliminarFila: function(tabla, columnaLlave, valorKey, identificador) {
        Swal.fire({
            title: '¿Eliminar Registro?', text: `Se borrará permanentemente: ${identificador}`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
        }).then(async (res) => {
            if(res.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                const { error } = await window.supabaseDB.from(tabla).delete().eq(columnaLlave, valorKey);
                window.Aplicacion.ocultarCarga();
                if(error) return Swal.fire('Error', 'No se pudo eliminar: ' + error.message, 'error');
                Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500});
                if(tabla === 'invitados') this.cargarInvitados(); else this.cargarSolicitudes();
            }
        });
    },

    limpiarTabla: async function(tabla) {
        let nombreLegible = tabla === 'invitados' ? 'TODOS LOS INVITADOS' : 'TODAS LAS SOLICITUDES DE CUPO';
        let advertencia = await Swal.fire({
            title: '¡ALERTA DE DESTRUCCIÓN!',
            html: `<div class="bg-danger bg-opacity-10 text-danger p-3 rounded text-start fw-bold small">Está a punto de vaciar <b>${nombreLegible}</b>.<br><br>Para confirmar, escriba <b>LIMPIAR</b>.</div>`,
            input: 'text', inputPlaceholder: 'Escriba LIMPIAR', icon: 'error',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ejecutar Limpieza'
        });

        if(!advertencia.isConfirmed || advertencia.value !== 'LIMPIAR') return;

        window.Aplicacion.mostrarCarga();
        try {
            let llave = tabla === 'invitados' ? 'cedula' : 'codigo';
            const { error } = await window.supabaseDB.from(tabla).delete().not(llave, 'is', null);
            window.Aplicacion.ocultarCarga();
            if(error) throw error;
            window.Aplicacion.auditar('Base de Datos', 'Limpieza', `Vació tabla: ${tabla}`);
            Swal.fire('¡Tabla Limpia!', `Vaciada correctamente.`, 'success');
            if(tabla === 'invitados') this.cargarInvitados(); else this.cargarSolicitudes();
        } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'Falla de seguridad o conexión.', 'error'); }
    }
};

window.init_Gestion_de_Registros = function() { window.ModRegistros.init(); };