/**
 * MÓDULO: CONFIGURACIÓN GLOBAL (Edición Tablas Independientes + Edición)
 * ✨ CONEXIÓN TOTAL CON MATRIZ DE ROLES Y SEGURIDAD ✨
 */
window.ModConfiguracion = {
    init: function() { 
        // ✨ 1. VALIDACIÓN MAESTRA DEL MÓDULO ✨
        if (!window.Aplicacion.permiso('Configuración del Sistema', 'ver')) {
            let contenedor = document.querySelector('.row.g-4.animate__animated.animate__fadeIn');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para acceder a la configuración del sistema.</p>
                </div>`;
            }
            return; // Bloqueamos ejecución
        }

        this.aplicarSeguridadVisual();
        this.cargarConfiguraciones(); 
    },

    // ✨ 2. OCULTAMIENTO DE TARJETAS Y BOTONES (VER Y CREAR) ✨
    aplicarSeguridadVisual: function() {
        let colPeriodos = document.getElementById('lista-periodos')?.closest('.col-md-4');
        let colLapsos = document.getElementById('lista-lapsos')?.closest('.col-md-4');
        let colNiveles = document.getElementById('lista-niveles')?.closest('.col-md-4');

        // Visibilidad de las columnas
        if (!window.Aplicacion.permiso('Tarjeta: Períodos Escolares', 'ver') && colPeriodos) colPeriodos.style.display = 'none';
        if (!window.Aplicacion.permiso('Tarjeta: Lapsos Académicos', 'ver') && colLapsos) colLapsos.style.display = 'none';
        if (!window.Aplicacion.permiso('Tarjeta: Niveles Educativos', 'ver') && colNiveles) colNiveles.style.display = 'none';

        // Ocultar botones superiores de Crear (+)
        if (!window.Aplicacion.permiso('Tarjeta: Períodos Escolares', 'crear')) {
            let btn = document.querySelector(`button[onclick="window.ModConfiguracion.nuevoParametro('Periodo_Escolar')"]`);
            if (btn) btn.style.display = 'none';
        }
        if (!window.Aplicacion.permiso('Tarjeta: Lapsos Académicos', 'crear')) {
            let btn = document.querySelector(`button[onclick="window.ModConfiguracion.nuevoParametro('Fase_Escolar')"]`);
            if (btn) btn.style.display = 'none';
        }
        if (!window.Aplicacion.permiso('Tarjeta: Niveles Educativos', 'crear')) {
            let btn = document.querySelector(`button[onclick="window.ModConfiguracion.nuevoParametro('Nivel_Educativo', false)"]`);
            if (btn) btn.style.display = 'none';
        }
    },

    cargarConfiguraciones: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [perRes, lapRes, nivRes] = await Promise.all([
                window.supabaseDB.from('conf_periodos').select('*').order('valor', { ascending: false }),
                window.supabaseDB.from('conf_lapsos').select('*').order('valor', { ascending: true }),
                window.supabaseDB.from('conf_niveles').select('*').order('valor', { ascending: true })
            ]);
            
            window.Aplicacion.ocultarCarga();
            if (perRes.error) throw perRes.error;

            let periodos = this.procesarConFechas(perRes.data || [], 'conf_periodos');
            let lapsos = this.procesarConFechas(lapRes.data || [], 'conf_lapsos');
            let niveles = (nivRes.data || []).map(n => ({ id: n.id_parametro, valor: n.valor, tabla: 'conf_niveles' }));

            // Solo renderizamos si el usuario tiene permiso de ver esa tarjeta
            if (window.Aplicacion.permiso('Tarjeta: Períodos Escolares', 'ver')) this.renderizarLista('lista-periodos', periodos, true);
            if (window.Aplicacion.permiso('Tarjeta: Lapsos Académicos', 'ver')) this.renderizarLista('lista-lapsos', lapsos, true);
            if (window.Aplicacion.permiso('Tarjeta: Niveles Educativos', 'ver')) this.renderizarLista('lista-niveles', niveles, false);
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire("Error", "No se pudieron cargar las configuraciones.", "error");
        }
    },

    procesarConFechas: function(data, nombreTabla) {
        let hoy = new Date().getTime(); 
        return data.map(item => {
            let estadoDinamico = "Sin Fechas";
            if (item.fecha_inicio && item.fecha_fin) {
                let pIn = new Date(item.fecha_inicio + "T00:00:00").getTime();
                let pOut = new Date(item.fecha_fin + "T23:59:59").getTime();
                if (hoy < pIn) estadoDinamico = "Próximo";
                else if (hoy > pOut) estadoDinamico = "Finalizado";
                else estadoDinamico = "Activo";
            }
            return { id: item.id_parametro, valor: item.valor, estado: estadoDinamico, inicio: item.fecha_inicio, fin: item.fecha_fin, tabla: nombreTabla };
        });
    },

    renderizarLista: function(idContenedor, listaDatos, requiereFechas) {
        const contenedor = document.getElementById(idContenedor);
        if(!contenedor) return;

        if(!listaDatos || listaDatos.length === 0) {
            contenedor.innerHTML = `<div class="p-4 text-center text-muted"><i class="bi bi-inbox fs-2"></i><p class="mb-0 small fw-bold mt-2">No hay registros</p></div>`;
            return;
        }

        // Determinar qué permisos aplicar según la tarjeta
        let cardName = "";
        if (idContenedor === 'lista-periodos') cardName = 'Tarjeta: Períodos Escolares';
        if (idContenedor === 'lista-lapsos') cardName = 'Tarjeta: Lapsos Académicos';
        if (idContenedor === 'lista-niveles') cardName = 'Tarjeta: Niveles Educativos';

        let pCrear = window.Aplicacion.permiso(cardName, 'crear'); 
        let pElim = window.Aplicacion.permiso(cardName, 'eliminar');

        let html = '';
        listaDatos.forEach(item => {
            let badgeHTML = '';
            if (requiereFechas) {
                if(item.estado === 'Activo') badgeHTML = `<span class="badge bg-success rounded-pill px-2 shadow-sm" style="font-size: 0.7rem;">Activo</span>`;
                else if(item.estado === 'Próximo') badgeHTML = `<span class="badge bg-warning text-dark rounded-pill px-2 shadow-sm" style="font-size: 0.7rem;">Próximo</span>`;
                else badgeHTML = `<span class="badge bg-secondary rounded-pill px-2 shadow-sm" style="font-size: 0.7rem;">Finalizado</span>`;
            }

            let infoFechas = requiereFechas ? `<div class="small text-muted mt-1" style="font-size: 0.75rem;"><i class="bi bi-calendar2-range me-1"></i>${item.inicio || '?'} al ${item.fin || '?'}</div>` : '';

            let valInicio = item.inicio ? `'${item.inicio}'` : `null`;
            let valFin = item.fin ? `'${item.fin}'` : `null`;
            
            // ✨ 3. BLOQUEO DE BOTONES DE EDICIÓN Y ELIMINACIÓN ✨
            let btnEditar = pCrear ? `<button class="btn btn-sm btn-light text-primary rounded-circle shadow-sm me-1" onclick="window.ModConfiguracion.editar('${item.id}', '${item.tabla}', '${item.valor}', ${valInicio}, ${valFin}, ${requiereFechas})" title="Editar"><i class="bi bi-pencil-square"></i></button>` : '';
            let btnEliminar = pElim ? `<button class="btn btn-sm btn-light text-danger rounded-circle shadow-sm" onclick="window.ModConfiguracion.eliminar('${item.id}', '${item.tabla}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>` : '';

            html += `
            <div class="list-group-item p-3 border-0 border-bottom d-flex justify-content-between align-items-center hover-efecto" style="transition: background 0.2s;">
                <div>
                    <div class="fw-bold text-dark d-flex align-items-center gap-2">${item.valor} ${badgeHTML}</div>
                    ${infoFechas}
                </div>
                <div class="d-flex">
                    ${btnEditar}
                    ${btnEliminar}
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    nuevoParametro: function(categoria, requiereFechas = true) {
        let cardName = categoria === 'Periodo_Escolar' ? 'Tarjeta: Períodos Escolares' : (categoria === 'Fase_Escolar' ? 'Tarjeta: Lapsos Académicos' : 'Tarjeta: Niveles Educativos');
        if (!window.Aplicacion.permiso(cardName, 'crear')) return Swal.fire('Acceso Denegado', 'No tienes permiso para crear registros en esta categoría.', 'error');

        let htmlForm = `<input type="text" id="swal-valor" class="swal2-input input-moderno mb-3" placeholder="Ej: ${categoria === 'Periodo_Escolar' ? '2025 - 2026' : (categoria === 'Fase_Escolar' ? '1er Momento' : 'Educación Media')}">`;
        if (requiereFechas) {
            htmlForm += `<div class="row text-start mt-3"><div class="col-6"><label class="small fw-bold text-muted mb-1">Inicio</label><input type="date" id="swal-inicio" class="swal2-input m-0 w-100 input-moderno text-muted"></div><div class="col-6"><label class="small fw-bold text-muted mb-1">Fin</label><input type="date" id="swal-fin" class="swal2-input m-0 w-100 input-moderno text-muted"></div></div>`;
        }
        Swal.fire({ title: 'Nuevo Registro', html: htmlForm, showCancelButton: true, confirmButtonText: 'Guardar', preConfirm: () => {
            const valor = document.getElementById('swal-valor').value;
            if (!valor) { Swal.showValidationMessage('Obligatorio'); return false; }
            let inicio = null, fin = null;
            if (requiereFechas) {
                inicio = document.getElementById('swal-inicio').value; fin = document.getElementById('swal-fin').value;
                if (!inicio || !fin) { Swal.showValidationMessage('Fechas obligatorias'); return false; }
            }
            return { valor: valor, inicio: inicio, fin: fin };
        }}).then((result) => { if (result.isConfirmed) this.guardar(categoria, result.value); });
    },

    editar: function(id, tabla, valorActual, inicioActual, finActual, requiereFechas) {
        let cardName = tabla === 'conf_periodos' ? 'Tarjeta: Períodos Escolares' : (tabla === 'conf_lapsos' ? 'Tarjeta: Lapsos Académicos' : 'Tarjeta: Niveles Educativos');
        if (!window.Aplicacion.permiso(cardName, 'crear')) return Swal.fire('Acceso Denegado', 'No tienes permiso para editar registros en esta categoría.', 'error');

        let valIn = inicioActual && inicioActual !== 'null' ? inicioActual : '';
        let valOut = finActual && finActual !== 'null' ? finActual : '';

        let htmlForm = `<input type="text" id="swal-valor-ed" class="swal2-input input-moderno mb-3" value="${valorActual}">`;
        if (requiereFechas) {
            htmlForm += `<div class="row text-start mt-3"><div class="col-6"><label class="small fw-bold text-muted mb-1">Inicio</label><input type="date" id="swal-inicio-ed" class="swal2-input m-0 w-100 input-moderno text-muted" value="${valIn}"></div><div class="col-6"><label class="small fw-bold text-muted mb-1">Fin</label><input type="date" id="swal-fin-ed" class="swal2-input m-0 w-100 input-moderno text-muted" value="${valOut}"></div></div>`;
        }

        Swal.fire({
            title: 'Editar Registro',
            html: htmlForm,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            confirmButtonColor: '#0066FF',
            preConfirm: () => {
                const valor = document.getElementById('swal-valor-ed').value;
                if (!valor) { Swal.showValidationMessage('Obligatorio'); return false; }
                let inicio = null, fin = null;
                if (requiereFechas) {
                    inicio = document.getElementById('swal-inicio-ed').value;
                    fin = document.getElementById('swal-fin-ed').value;
                    if (!inicio || !fin) { Swal.showValidationMessage('Fechas obligatorias'); return false; }
                }
                return { valor: valor, inicio: inicio, fin: fin };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const payload = { valor: result.value.valor };
                    if (requiereFechas) {
                        payload.fecha_inicio = result.value.inicio;
                        payload.fecha_fin = result.value.fin;
                    }

                    const { error } = await window.supabaseDB.from(tabla).update(payload).eq('id_parametro', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Registro actualizado', showConfirmButton: false, timer: 1500});
                    
                    // ✨ AUDITORÍA ✨
                    window.Aplicacion.auditar('Configuración del Sistema', 'Editar Parámetro', `Se actualizó un registro en la tabla ${tabla} al valor: ${result.value.valor}`);
                    
                    this.cargarConfiguraciones();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'No se pudo actualizar en la base de datos.', 'error');
                }
            }
        });
    },

    guardar: async function(categoria, datos) {
        window.Aplicacion.mostrarCarga();
        let tabla = categoria === 'Periodo_Escolar' ? 'conf_periodos' : (categoria === 'Fase_Escolar' ? 'conf_lapsos' : 'conf_niveles');
        try {
            const payload = { id_parametro: "CONF-" + new Date().getTime(), valor: datos.valor };
            if (datos.inicio) { payload.fecha_inicio = datos.inicio; payload.fecha_fin = datos.fin; }
            const { error } = await window.supabaseDB.from(tabla).insert([payload]);
            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500});
            
            // ✨ AUDITORÍA ✨
            window.Aplicacion.auditar('Configuración del Sistema', 'Nuevo Parámetro', `Se agregó "${datos.valor}" a la configuración de ${categoria.replace('_', ' ')}`);
            
            this.cargarConfiguraciones();
        } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo guardar.', 'error'); }
    },

    eliminar: function(id, tabla) {
        let cardName = tabla === 'conf_periodos' ? 'Tarjeta: Períodos Escolares' : (tabla === 'conf_lapsos' ? 'Tarjeta: Lapsos Académicos' : 'Tarjeta: Niveles Educativos');
        if (!window.Aplicacion.permiso(cardName, 'eliminar')) return Swal.fire('Acceso Denegado', 'No tienes permiso para eliminar registros.', 'error');

        Swal.fire({ title: '¿Eliminar?', text: "Se borrará del sistema.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from(tabla).delete().eq('id_parametro', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;
                    
                    // ✨ AUDITORÍA ✨
                    window.Aplicacion.auditar('Configuración del Sistema', 'Eliminar Parámetro', `Se eliminó un parámetro de configuración interno.`);
                    
                    this.cargarConfiguraciones();
                } catch(e) { window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
            }
        });
    }
};

window.init_Configuracion_del_Sistema = function() { window.ModConfiguracion.init(); };
window.init_Configuración_del_Sistema = function() { window.ModConfiguracion.init(); };