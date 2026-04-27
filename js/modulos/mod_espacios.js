/**
 * MÓDULO: ESPACIOS Y AMBIENTES
 * ✨ INCLUYE PAGINACIÓN, FILTRO Y SEGURIDAD ✨
 */
window.ModEspacios = {
    espacios: [], 
    espaciosFiltrados: [],
    editandoId: null,

    // Variables de Paginación
    itemsPorPagina: 7,
    paginaActual: 1,

    init: function() { 
        // ✨ VALIDACIÓN DE SEGURIDAD MAESTRA ✨
        if (!window.Aplicacion.permiso('Espacios Escolares', 'ver')) {
            let contenedor = document.querySelector('.row.animate__animated.animate__fadeInUp');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para visualizar los espacios escolares.</p>
                </div>`;
            }
            return; 
        }

        // Ocultar el formulario de creación si no hay permiso
        if (!window.Aplicacion.permiso('Espacios Escolares', 'crear')) {
            let colForm = document.getElementById('columna-formulario-espacios');
            let colTabla = document.getElementById('columna-tabla-espacios');
            if(colForm) colForm.style.display = 'none';
            if(colTabla) colTabla.classList.replace('col-xl-8', 'col-xl-12'); // Expande la tabla para que ocupe todo el ancho
        }

        this.cargarEspacios(); 
    },

    cargarEspacios: async function() { 
        window.Aplicacion.mostrarCarga(); 
        try {
            const { data, error } = await window.supabaseDB
                .from('espacios')
                .select('*')
                .order('tipo', { ascending: true })
                .order('nombre', { ascending: true });
                
            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            this.espacios = data || []; 
            this.espaciosFiltrados = [...this.espacios];
            this.paginaActual = 1;
            this.dibujarTabla(); 
            
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudieron cargar los espacios desde Supabase.', 'error');
        }
    },

    filtrar: function() {
        let txt = document.getElementById('buscador-espacios').value.toLowerCase();
        this.espaciosFiltrados = this.espacios.filter(e => 
            e.nombre.toLowerCase().includes(txt) || 
            e.tipo.toLowerCase().includes(txt)
        );
        this.paginaActual = 1;
        this.dibujarTabla();
    },

    dibujarTabla: function() {
        const tbody = document.getElementById('tabla-espacios'); 
        if(!tbody) return;

        // Lógica de Paginación
        let totalPaginas = Math.ceil(this.espaciosFiltrados.length / this.itemsPorPagina) || 1;
        if(this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;
        let inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        let datosPagina = this.espaciosFiltrados.slice(inicio, inicio + this.itemsPorPagina);

        if (datosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="bi bi-building-slash fs-1 text-muted d-block mb-3"></i><span class="text-muted fw-bold">No se encontraron espacios.</span></td></tr>`;
            document.getElementById('paginacion-espacios').innerHTML = '';
            return;
        }

        let html = '';
        let pCrear = window.Aplicacion.permiso('Espacios Escolares', 'crear');
        let pElim = window.Aplicacion.permiso('Espacios Escolares', 'eliminar');

        datosPagina.forEach(e => {
            let colorBadge = e.tipo.includes('Aula') ? 'primary' : (e.tipo.includes('Laboratorio') ? 'success' : (e.tipo.includes('Cancha') ? 'danger' : 'secondary'));
            let capVisual = (e.capacidad) ? e.capacidad : 0;
            
            let btnEditar = pCrear ? `<button class="btn btn-sm btn-light border text-primary me-1 shadow-sm" onclick="window.ModEspacios.editarEspacio('${e.id}')" title="Editar"><i class="bi bi-pencil"></i></button>` : '';
            let btnEliminar = pElim ? `<button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="window.ModEspacios.eliminarEspacio('${e.id}')" title="Eliminar"><i class="bi bi-trash"></i></button>` : '';

            html += `
            <tr class="hover-efecto">
                <td class="ps-4 align-middle"><span class="badge bg-${colorBadge} bg-opacity-10 text-${colorBadge} border border-${colorBadge} px-2 py-1 shadow-sm">${e.tipo}</span></td>
                <td class="align-middle fw-bold text-dark fs-6">${e.nombre}</td>
                <td class="align-middle text-center"><span class="badge bg-light text-dark border"><i class="bi bi-people-fill me-1 text-info"></i> ${capVisual} pax</span></td>
                <td class="text-end pe-4 align-middle text-nowrap">
                    ${btnEditar}
                    ${btnEliminar}
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        this.generarPaginacion(totalPaginas);
    },

    generarPaginacion: function(totalPaginas) {
        const contenedor = document.getElementById('paginacion-espacios');
        if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }
        
        let html = `<li class="page-item ${this.paginaActual === 1 ? 'disabled' : ''}"><button class="page-link" onclick="window.ModEspacios.cambiarPagina(${this.paginaActual - 1})"><i class="bi bi-chevron-left"></i></button></li>`;
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= this.paginaActual - 2 && i <= this.paginaActual + 2)) {
                html += `<li class="page-item ${this.paginaActual === i ? 'active' : ''}"><button class="page-link" onclick="window.ModEspacios.cambiarPagina(${i})">${i}</button></li>`;
            } else if (i === this.paginaActual - 3 || i === this.paginaActual + 3) {
                html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
            }
        }
        html += `<li class="page-item ${this.paginaActual === totalPaginas ? 'disabled' : ''}"><button class="page-link" onclick="window.ModEspacios.cambiarPagina(${this.paginaActual + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
        contenedor.innerHTML = html;
    },

    cambiarPagina: function(pag) {
        this.paginaActual = pag;
        this.dibujarTabla();
    },

    // 🚀 INSERTAR / ACTUALIZAR EN SUPABASE
    guardarEspacio: async function() {
        if (!window.Aplicacion.permiso('Espacios Escolares', 'crear')) return Swal.fire('Error', 'No posee privilegios.', 'error');

        let n = document.getElementById('esp-nombre').value.trim(); 
        let t = document.getElementById('esp-tipo').value;
        let c = document.getElementById('esp-capacidad').value.trim(); 
        
        if(!n || !t) return Swal.fire('Aviso', 'Debe ingresar el nombre y seleccionar el tipo.', 'warning');
        
        window.Aplicacion.mostrarCarga(); 
        
        try {
            const payload = {
                nombre: n,
                tipo: t,
                capacidad: parseInt(c) || 0
            };

            let errorGuardado;
            let accionRegistro = 'Añadir Espacio';

            if (this.editandoId) {
                const { error } = await window.supabaseDB.from('espacios').update(payload).eq('id', this.editandoId);
                errorGuardado = error;
                accionRegistro = 'Editar Espacio';
            } else {
                payload.id = 'ESP-' + new Date().getTime();
                const { error } = await window.supabaseDB.from('espacios').insert([payload]);
                errorGuardado = error;
            }

            window.Aplicacion.ocultarCarga(); 
            if (errorGuardado) throw errorGuardado;
            
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Guardado exitosamente', timer:2000, showConfirmButton:false}); 
            
            // ✨ REGISTRO EN AUDITORÍA ✨
            window.Aplicacion.auditar('Espacios Escolares', accionRegistro, `Se guardó el espacio: ${n} (${t}) con capacidad para ${c} pax.`);
            
            this.cancelarEdicion();
            this.cargarEspacios();  
            
        } catch (e) {
            window.Aplicacion.ocultarCarga(); 
            Swal.fire('Error', 'Falla al guardar en la base de datos.', 'error'); 
        }
    },

    // 🚀 ELIMINAR EN SUPABASE
    eliminarEspacio: function(id) { 
        if (!window.Aplicacion.permiso('Espacios Escolares', 'eliminar')) return Swal.fire('Error', 'No posee privilegios de eliminación.', 'error');

        let e = this.espacios.find(x => x.id === id); 
        let nombreEspacio = e ? e.nombre : 'Desconocido';

        Swal.fire({
            title:'¿Eliminar este ambiente?', 
            icon:'warning', 
            showCancelButton:true,
            confirmButtonColor: '#d33'
        }).then(async r => { 
            if(r.isConfirmed) { 
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('espacios').delete().eq('id', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;
                    
                    Swal.fire({toast:true, position:'top-end', icon:'success', title:'Eliminado', timer:2000, showConfirmButton:false});
                    
                    // ✨ REGISTRO EN AUDITORÍA ✨
                    window.Aplicacion.auditar('Espacios Escolares', 'Eliminar Espacio', `Se eliminó el espacio: ${nombreEspacio}`);

                    this.cargarEspacios();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
                }
            } 
        }); 
    },
    
    // ⚙️ PREPARAR FORMULARIO PARA EDICIÓN
    editarEspacio: function(id) { 
        let e = this.espacios.find(x => x.id === id); 
        if(e) { 
            this.editandoId = id; 
            document.getElementById('esp-nombre').value = e.nombre; 
            document.getElementById('esp-tipo').value = e.tipo; 
            document.getElementById('esp-capacidad').value = e.capacidad || ''; 
            
            document.getElementById('titulo-form').innerText = 'Editar Espacio';
            document.getElementById('btn-guardar-espacio').innerHTML = '<i class="bi bi-save-fill me-2"></i>Actualizar Espacio'; 
            document.getElementById('btn-cancelar-edicion').classList.remove('d-none');
        } 
    },
    
    // ⚙️ LIMPIAR FORMULARIO
    cancelarEdicion: function() { 
        this.editandoId = null; 
        document.getElementById('esp-nombre').value = ''; 
        document.getElementById('esp-tipo').value = ''; 
        document.getElementById('esp-capacidad').value = ''; 
        
        document.getElementById('titulo-form').innerText = 'Registrar Espacio';
        document.getElementById('btn-guardar-espacio').innerHTML = '<i class="bi bi-save-fill me-2"></i>Guardar Espacio'; 
        document.getElementById('btn-cancelar-edicion').classList.add('d-none');
    }
};

window.init_Espacios_Escolares = function() { window.ModEspacios.init(); };