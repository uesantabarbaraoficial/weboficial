/**
 * MÓDULO: GRADOS Y SALONES (Supabase Edition)
 * ✨ INCLUYE ORDENAMIENTO DE GRADOS PARA PROMOCIÓN AUTOMÁTICA ✨
 */
window.ModSalones = {
    niveles: [], grados: [], secciones: [], salones: [],

    init: function() { 
        let pGrupos = window.Aplicacion.permiso('Tarjeta: Configurar Grados', 'ver');
        let pSecc = window.Aplicacion.permiso('Tarjeta: Configurar Secciones', 'ver');
        let pSalones = window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'ver');

        if (!pGrupos && !pSecc && !pSalones) {
            let contenedor = document.getElementById('contenedor-vistas');
            if (contenedor) {
                document.getElementById('nav-salones').style.display = 'none';
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para configurar grados o salones.</p>
                </div>`;
            }
            return;
        }

        if (!pGrupos) document.getElementById('col-nav-grados').style.display = 'none';
        if (!pSecc) document.getElementById('col-nav-secciones').style.display = 'none';
        if (!pSalones) document.getElementById('col-nav-apertura').style.display = 'none';

        if (!window.Aplicacion.permiso('Tarjeta: Configurar Grados', 'crear')) document.querySelector('.btn-crear-grado').style.display = 'none';
        if (!window.Aplicacion.permiso('Tarjeta: Configurar Secciones', 'crear')) document.querySelector('.btn-crear-seccion').style.display = 'none';
        if (!window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'crear')) document.querySelector('.btn-crear-salon').style.display = 'none';

        this.cargarDatos(); 
        
        setTimeout(() => {
            if (pGrupos) this.cambiarVista('grados');
            else if (pSecc) this.cambiarVista('secciones');
            else if (pSalones) this.cambiarVista('salones');
        }, 100);
    },

    cambiarVista: function(vista) {
        ['grados', 'secciones', 'salones'].forEach(v => {
            let tab = document.getElementById('tab-' + v);
            let pnl = document.getElementById('vista-' + v);
            if(tab) tab.classList.remove('activo');
            if(pnl) pnl.style.display = 'none';
        });
        
        let tabSel = document.getElementById('tab-' + vista);
        let pnlSel = document.getElementById('vista-' + vista);
        if(tabSel) tabSel.classList.add('activo');
        if(pnlSel) pnlSel.style.display = 'block';
    },

    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const [nivRes, graRes, secRes, salonesRes] = await Promise.all([
                window.supabaseDB.from('conf_niveles').select('*').order('valor', { ascending: true }),
                // ✨ LOS GRADOS AHORA SE ORDENAN POR SU COLUMNA 'ORDEN' ✨
                window.supabaseDB.from('conf_grados').select('*').order('orden', { ascending: true }),
                window.supabaseDB.from('conf_secciones').select('*').order('valor', { ascending: true }),
                window.supabaseDB.from('salones').select('*') 
            ]);

            window.Aplicacion.ocultarCarga();

            if (nivRes.error) throw nivRes.error;
            if (graRes.error) throw graRes.error;
            if (secRes.error) throw secRes.error;
            if (salonesRes.error) throw salonesRes.error;

            this.niveles = (nivRes.data || []).map(n => ({ id: n.id_parametro, valor: n.valor, tabla: 'conf_niveles' }));
            // Incluimos el parámetro orden
            this.grados = (graRes.data || []).map(g => ({ id: g.id_parametro, valor: g.valor, orden: g.orden || 0, tabla: 'conf_grados' }));
            this.secciones = (secRes.data || []).map(s => ({ id: s.id_parametro, valor: s.valor, tabla: 'conf_secciones' }));
            this.salones = salonesRes.data || [];

            this.renderizarListasSimples('lista-grados', this.grados, 'Tarjeta: Configurar Grados');
            this.renderizarListasSimples('lista-secciones', this.secciones, 'Tarjeta: Configurar Secciones');
            
            this.aplicarFiltroSalones();

        } catch(e) { 
            window.Aplicacion.ocultarCarga(); 
            console.error(e);
            Swal.fire("Error", "Falla de conexión con Supabase.", "error"); 
        }
    },

    renderizarListasSimples: function(idContenedor, listaDatos, permisoAsociado) {
        const contenedor = document.getElementById(idContenedor);
        if(!contenedor) return;
        
        if(!listaDatos || listaDatos.length === 0) {
            contenedor.innerHTML = `<div class="p-4 text-center text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i><span class="small fw-bold">Lista vacía</span></div>`; 
            return;
        }

        let pCrear = window.Aplicacion.permiso(permisoAsociado, 'crear');
        let pElim = window.Aplicacion.permiso(permisoAsociado, 'eliminar');
        let html = '';

        listaDatos.forEach((item, index) => {
            let btnEditar = pCrear ? `<button class="btn btn-sm btn-light text-primary rounded-circle shadow-sm hover-efecto me-1" onclick="window.ModSalones.editarParametro('${item.id}', '${item.tabla}', '${item.valor}', '${permisoAsociado}')" title="Editar"><i class="bi bi-pencil-fill"></i></button>` : '';
            let btnEliminar = pElim ? `<button class="btn btn-sm btn-light text-danger rounded-circle shadow-sm hover-efecto" onclick="window.ModSalones.eliminarParametro('${item.id}', '${item.tabla}', '${item.valor}', '${permisoAsociado}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>` : '';
            
            // ✨ SI ES UN GRADO, INYECTAMOS LOS BOTONES DE SUBIR/BAJAR ✨
            let controlesOrden = '';
            if (item.tabla === 'conf_grados' && pCrear) {
                let btnSubir = index > 0 ? `<button class="btn btn-sm btn-secondary text-white rounded-circle shadow-sm hover-efecto me-1" onclick="window.ModSalones.moverGrado('${item.id}', -1)" title="Subir Nivel"><i class="bi bi-arrow-up-short"></i></button>` : `<div style="width: 28px; display:inline-block;" class="me-1"></div>`;
                let btnBajar = index < listaDatos.length - 1 ? `<button class="btn btn-sm btn-secondary text-white rounded-circle shadow-sm hover-efecto me-2" onclick="window.ModSalones.moverGrado('${item.id}', 1)" title="Bajar Nivel"><i class="bi bi-arrow-down-short"></i></button>` : `<div style="width: 28px; display:inline-block;" class="me-2"></div>`;
                
                controlesOrden = `<span class="badge bg-light text-dark border me-3"><i class="bi bi-list-ol text-info me-1"></i> Orden: ${index + 1}</span>` + btnSubir + btnBajar;
            }

            html += `
            <div class="list-group-item p-3 border-0 border-bottom d-flex justify-content-between align-items-center hover-efecto">
                <div class="fw-bold text-dark d-flex align-items-center"><i class="bi bi-check2-circle text-info me-2"></i>${item.valor}</div>
                <div class="text-end d-flex align-items-center text-nowrap">${controlesOrden}${btnEditar}${btnEliminar}</div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    // ✨ MOTOR DE REORDENAMIENTO DE GRADOS ✨
    moverGrado: async function(id, direccion) {
        let index = this.grados.findIndex(g => g.id === id);
        if (index < 0) return;
        let nuevoIndex = index + direccion;
        if (nuevoIndex < 0 || nuevoIndex >= this.grados.length) return;

        // Intercambiamos posiciones en la matriz
        let temp = this.grados[index];
        this.grados[index] = this.grados[nuevoIndex];
        this.grados[nuevoIndex] = temp;

        // Actualizamos los números de 'orden' (1, 2, 3...)
        this.grados.forEach((g, idx) => g.orden = idx + 1);

        window.Aplicacion.mostrarCarga();
        try {
            // Guardamos en la base de datos de Supabase masivamente
            const promesas = this.grados.map(g => 
                window.supabaseDB.from('conf_grados').update({ orden: g.orden }).eq('id_parametro', g.id)
            );
            await Promise.all(promesas);

            window.Aplicacion.ocultarCarga();
            this.cargarDatos(); // Recargar la tabla visualmente
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo guardar el nuevo orden.', 'error');
        }
    },

    nuevoParametro: function(categoria, placeholderText) {
        let tabla = categoria === 'Grado_Anio' ? 'conf_grados' : 'conf_secciones';
        let permiso = categoria === 'Grado_Anio' ? 'Tarjeta: Configurar Grados' : 'Tarjeta: Configurar Secciones';
        
        if (!window.Aplicacion.permiso(permiso, 'crear')) return Swal.fire('Denegado', 'No posees privilegios de creación.', 'error');

        Swal.fire({ 
            title: 'Nuevo Registro', input: 'text', inputPlaceholder: placeholderText, 
            showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#00BCD4'
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                
                let valorLimpio = result.value.trim();
                let lista = categoria === 'Grado_Anio' ? this.grados : this.secciones;
                if (lista.find(x => x.valor.toLowerCase() === valorLimpio.toLowerCase())) {
                    return Swal.fire('Aviso', 'Este registro ya existe.', 'warning');
                }

                let payload = { id_parametro: "CONF-" + new Date().getTime(), valor: valorLimpio };
                
                // Si es un Grado nuevo, le asignamos el orden más alto automáticamente
                if (tabla === 'conf_grados') {
                    let maxOrden = this.grados.reduce((max, g) => Math.max(max, g.orden || 0), 0);
                    payload.orden = maxOrden + 1;
                }

                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from(tabla).insert([payload]);
                    if (error) throw error;
                    
                    window.Aplicacion.ocultarCarga();
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Control de Estudios', 'Nuevo Parámetro', `Se agregó "${valorLimpio}" a la configuración de Salones.`);
                    this.cargarDatos();

                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    console.error(e);
                    Swal.fire('Error', 'Falla al guardar en base de datos.', 'error'); 
                }
            }
        });
    },

    editarParametro: function(id, tabla, valorActual, permisoAsociado) {
        if (!window.Aplicacion.permiso(permisoAsociado, 'crear')) return Swal.fire('Denegado', 'No posees privilegios para editar.', 'error');

        Swal.fire({
            title: 'Editar Registro',
            input: 'text',
            inputValue: valorActual,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            confirmButtonColor: '#00BCD4',
            preConfirm: (nuevoValor) => {
                if (!nuevoValor || nuevoValor.trim() === '') {
                    Swal.showValidationMessage('El valor no puede estar vacío');
                    return false;
                }
                return nuevoValor.trim();
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                let valorLimpio = result.value;
                if (valorLimpio.toLowerCase() === valorActual.toLowerCase()) return;

                let lista = tabla === 'conf_grados' ? this.grados : this.secciones;
                if (lista.find(x => x.valor.toLowerCase() === valorLimpio.toLowerCase() && x.id !== id)) {
                    return Swal.fire('Aviso', 'Este registro ya existe.', 'warning');
                }

                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from(tabla).update({ valor: valorLimpio }).eq('id_parametro', id);
                    if (error) throw error;

                    window.Aplicacion.ocultarCarga();
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Actualizado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Control de Estudios', 'Editar Parámetro', `Se actualizó "${valorActual}" a "${valorLimpio}".`);
                    this.cargarDatos();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    console.error(e);
                    Swal.fire('Error', 'Falla al actualizar en base de datos.', 'error');
                }
            }
        });
    },

    eliminarParametro: function(id, tabla, valor, permisoAsociado) {
        if (!window.Aplicacion.permiso(permisoAsociado, 'eliminar')) return Swal.fire('Denegado', 'No posees privilegios para eliminar.', 'error');

        Swal.fire({ 
            title: '¿Eliminar Registro?', text: `Se borrará "${valor}".`, icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from(tabla).delete().eq('id_parametro', id);
                    window.Aplicacion.ocultarCarga();
                    
                    if (error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Control de Estudios', 'Eliminar Parámetro', `Se eliminó "${valor}".`);
                    
                    // Si se elimina un grado, forzamos reordenar los que quedaron
                    if(tabla === 'conf_grados') {
                        this.grados = this.grados.filter(g => g.id !== id);
                        this.grados.forEach((g, idx) => g.orden = idx + 1);
                        const promesas = this.grados.map(g => window.supabaseDB.from('conf_grados').update({ orden: g.orden }).eq('id_parametro', g.id));
                        await Promise.all(promesas);
                    }
                    
                    this.cargarDatos();

                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    Swal.fire('Error', 'Falla al eliminar en servidor.', 'error'); 
                }
            }
        });
    },

    aplicarFiltroSalones: function() {
        const selectFiltro = document.getElementById('filtro-salones');
        let criterio = selectFiltro ? selectFiltro.value : 'nombre_salon';

        this.salones.sort((a, b) => {
            let valA = (a[criterio] || '').toLowerCase();
            let valB = (b[criterio] || '').toLowerCase();
            if (valA < valB) return -1;
            if (valA > valB) return 1;
            return 0;
        });

        this.renderizarSalones();
    },

    renderizarSalones: function() {
        const tbody = document.getElementById('tabla-salones');
        if(!tbody) return;

        if (this.salones.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-5 text-muted"><i class="bi bi-door-closed fs-1 d-block mb-3"></i>No hay salones aperturados.</td></tr>`; 
            return; 
        }

        let pCrear = window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'crear');
        let pElim = window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'eliminar');
        let html = '';

        this.salones.forEach(s => {
            let btnEditar = pCrear ? `<button class="btn btn-sm btn-light text-primary border shadow-sm hover-efecto me-1" onclick="window.ModSalones.editarSalon('${s.id_salon}')" title="Editar Salón"><i class="bi bi-pencil-fill"></i></button>` : '';
            let btnEliminar = pElim ? `<button class="btn btn-sm btn-light text-danger border shadow-sm hover-efecto" onclick="window.ModSalones.eliminarSalon('${s.id_salon}', '${s.nombre_salon}')" title="Clausurar Salón"><i class="bi bi-trash3-fill"></i></button>` : '';

            html += `
            <tr class="align-middle hover-efecto">
                <td class="ps-4 fw-bold text-dark text-uppercase"><i class="bi bi-geo-alt-fill text-secondary me-2"></i>${s.nombre_salon}</td>
                <td><span class="badge bg-light text-dark border shadow-sm">${s.nivel_educativo}</span></td>
                <td class="fw-bold text-secondary">${s.grado_anio}</td>
                <td><span class="badge bg-info rounded-circle shadow-sm" style="width: 30px; height: 30px; line-height: 20px; font-size: 14px;">${s.seccion}</span></td>
                <td class="text-end pe-4 text-nowrap">${btnEditar}${btnEliminar}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    },

    abrirModalSalon: function() {
        if (!window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'crear')) return Swal.fire('Denegado', 'No posees privilegios.', 'error');

        if(this.niveles.length === 0 || this.grados.length === 0 || this.secciones.length === 0) {
            return Swal.fire("Faltan Datos", "Debe configurar los Niveles Educativos (Configuración Global), Grados y Secciones antes de aperturar un salón.", "warning");
        }

        let optNiveles = '<option value="">Seleccione Nivel...</option>'; this.niveles.forEach(n => optNiveles += `<option value="${n.valor}">${n.valor}</option>`);
        let optGrados = '<option value="">Seleccione Grado...</option>'; this.grados.forEach(g => optGrados += `<option value="${g.valor}">${g.valor}</option>`);
        let optSecc = '<option value="">Seleccione Sección...</option>'; this.secciones.forEach(s => optSecc += `<option value="${s.valor}">${s.valor}</option>`);
        
        let htmlForm = `
        <div class="text-start">
            <label class="small fw-bold mb-1 text-muted">Nivel Educativo</label>
            <select id="swal-nivel" class="swal2-input input-moderno m-0 mb-3 w-100">${optNiveles}</select>
            
            <div class="row g-3">
                <div class="col-8">
                    <label class="small fw-bold mb-1 text-muted">Grado / Año</label>
                    <select id="swal-grado" class="swal2-input input-moderno m-0 w-100">${optGrados}</select>
                </div>
                <div class="col-4">
                    <label class="small fw-bold mb-1 text-muted">Sección</label>
                    <select id="swal-secc" class="swal2-input input-moderno m-0 w-100">${optSecc}</select>
                </div>
            </div>
            <div class="alert alert-info mt-3 small"><i class="bi bi-info-circle me-1"></i>El sistema unirá el Grado y la Sección para crear el Nombre Oficial del Salón automáticamente.</div>
        </div>`;

        Swal.fire({ 
            title: 'Aperturar Salón', html: htmlForm, showCancelButton: true, confirmButtonText: 'Aperturar', confirmButtonColor: '#00BCD4',
            preConfirm: () => {
                const niv = document.getElementById('swal-nivel').value;
                const gra = document.getElementById('swal-grado').value;
                const sec = document.getElementById('swal-secc').value;
                if (!niv || !gra || !sec) { Swal.showValidationMessage('Todos los campos son obligatorios'); return false; }
                return { nivel: niv, grado: gra, seccion: sec };
            }
        }).then((result) => { if (result.isConfirmed) this.guardarSalon(result.value); });
    },

    editarSalon: function(id_salon) {
        if (!window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'crear')) return Swal.fire('Denegado', 'No posees privilegios para editar.', 'error');

        let salon = this.salones.find(s => s.id_salon === id_salon);
        if (!salon) return;

        let optNiveles = '<option value="">Seleccione Nivel...</option>';
        this.niveles.forEach(n => {
            let sel = (n.valor === salon.nivel_educativo) ? 'selected' : '';
            optNiveles += `<option value="${n.valor}" ${sel}>${n.valor}</option>`;
        });

        let optGrados = '<option value="">Seleccione Grado...</option>';
        this.grados.forEach(g => {
            let sel = (g.valor === salon.grado_anio) ? 'selected' : '';
            optGrados += `<option value="${g.valor}" ${sel}>${g.valor}</option>`;
        });

        let optSecc = '<option value="">Seleccione Sección...</option>';
        this.secciones.forEach(s => {
            let sel = (s.valor === salon.seccion) ? 'selected' : '';
            optSecc += `<option value="${s.valor}" ${sel}>${s.valor}</option>`;
        });

        let htmlForm = `
        <div class="text-start">
            <label class="small fw-bold mb-1 text-muted">Nivel Educativo</label>
            <select id="swal-nivel-ed" class="swal2-input input-moderno m-0 mb-3 w-100">${optNiveles}</select>

            <div class="row g-3">
                <div class="col-8">
                    <label class="small fw-bold mb-1 text-muted">Grado / Año</label>
                    <select id="swal-grado-ed" class="swal2-input input-moderno m-0 w-100">${optGrados}</select>
                </div>
                <div class="col-4">
                    <label class="small fw-bold mb-1 text-muted">Sección</label>
                    <select id="swal-secc-ed" class="swal2-input input-moderno m-0 w-100">${optSecc}</select>
                </div>
            </div>
            <div class="alert alert-warning mt-3 small"><i class="bi bi-exclamation-triangle me-1"></i>Modificar el grado o sección alterará el nombre oficial de este salón en todo el sistema.</div>
        </div>`;

        Swal.fire({
            title: 'Editar Salón', html: htmlForm, showCancelButton: true, confirmButtonText: 'Actualizar', confirmButtonColor: '#00BCD4',
            preConfirm: () => {
                const niv = document.getElementById('swal-nivel-ed').value;
                const gra = document.getElementById('swal-grado-ed').value;
                const sec = document.getElementById('swal-secc-ed').value;
                if (!niv || !gra || !sec) { Swal.showValidationMessage('Todos los campos son obligatorios'); return false; }
                return { nivel: niv, grado: gra, seccion: sec };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                let datos = result.value;
                window.Aplicacion.mostrarCarga();
                try {
                    const { data: existen } = await window.supabaseDB.from('salones')
                        .select('id_salon')
                        .eq('nivel_educativo', datos.nivel)
                        .eq('grado_anio', datos.grado)
                        .eq('seccion', datos.seccion)
                        .neq('id_salon', id_salon);

                    if (existen && existen.length > 0) {
                        window.Aplicacion.ocultarCarga();
                        return Swal.fire('Atención', 'Ya existe otro salón aperturado con esa misma estructura.', 'warning');
                    }

                    let nombreSal = `${datos.grado} ${datos.seccion}`;
                    const payload = {
                        nivel_educativo: datos.nivel,
                        grado_anio: datos.grado,
                        seccion: datos.seccion,
                        nombre_salon: nombreSal
                    };

                    const { error } = await window.supabaseDB.from('salones').update(payload).eq('id_salon', id_salon);

                    if (error) throw error;

                    window.Aplicacion.ocultarCarga();
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Salón Actualizado', showConfirmButton: false, timer: 2000});
                    window.Aplicacion.auditar('Control de Estudios', 'Editar Salón', `Se actualizó el salón académico a: ${nombreSal}`);
                    this.cargarDatos();

                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    console.error(e);
                    Swal.fire('Error', 'Falla al actualizar en base de datos.', 'error');
                }
            }
        });
    },

    guardarSalon: async function(datos) {
        window.Aplicacion.mostrarCarga();
        try {
            const { data: existen } = await window.supabaseDB.from('salones')
                .select('id_salon')
                .eq('nivel_educativo', datos.nivel)
                .eq('grado_anio', datos.grado)
                .eq('seccion', datos.seccion);

            if (existen && existen.length > 0) { 
                window.Aplicacion.ocultarCarga(); 
                return Swal.fire('Atención', 'Ese salón ya se encuentra aperturado.', 'warning'); 
            }

            let nombreSal = `${datos.grado} ${datos.seccion}`;
            const payload = { 
                id_salon: "SAL-" + new Date().getTime(), 
                nivel_educativo: datos.nivel, 
                grado_anio: datos.grado, 
                seccion: datos.seccion, 
                nombre_salon: nombreSal, 
                estatus: 'Activo' 
            };

            const { error } = await window.supabaseDB.from('salones').insert([payload]);
            
            if (error) throw error;
            
            window.Aplicacion.ocultarCarga();
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Salón Aperturado', showConfirmButton: false, timer: 2000});
            window.Aplicacion.auditar('Control de Estudios', 'Aperturar Salón', `Se aperturó el salón académico: ${nombreSal}`);
            this.cargarDatos();

        } catch (e) { 
            window.Aplicacion.ocultarCarga(); 
            console.error(e);
            Swal.fire('Error', 'Falla al guardar en base de datos.', 'error'); 
        }
    },

    eliminarSalon: function(id_salon, nombre_salon) {
        if (!window.Aplicacion.permiso('Tarjeta: Apertura de Salones', 'eliminar')) return Swal.fire('Denegado', 'No posees privilegios.', 'error');

        Swal.fire({ 
            title: '¿Clausurar Salón?', 
            text: `Estás a punto de cerrar el salón: ${nombre_salon}`, 
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, clausurar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('salones').delete().eq('id_salon', id_salon);
                    window.Aplicacion.ocultarCarga();
                    
                    if (error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Clausurado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Control de Estudios', 'Clausurar Salón', `Se clausuró el salón: ${nombre_salon}`);
                    this.cargarDatos();
                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    Swal.fire('Error', 'Falla al eliminar en Supabase.', 'error'); 
                }
            }
        });
    }
};

window.init_Grados_y_Salones = function() { window.ModSalones.init(); };