/**
 * MÓDULO: ESTRUCTURA CORPORATIVA DE LA EMPRESA (Supabase Edition)
 * Gestión de diccionarios dinámicos mediante diseño de grilla UI.
 * ✨ INCLUYE AUDITORÍA TOTAL Y SEGURIDAD ✨
 */

window.ModEmpresa = {
    datos: [],
    
    init: function() {
        // ✨ VALIDACIÓN MAESTRA DEL MÓDULO ✨
        if (!window.Aplicacion.permiso('Estructura Empresa', 'ver')) {
            let contenedor = document.getElementById('contenedor-diccionarios');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5 mt-4">
                    <div class="bg-light d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow-sm border" style="width: 100px; height: 100px;">
                        <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="text-dark fw-bold mb-2">Área Restringida</h4>
                    <p class="text-muted mb-0">No tienes permisos asignados para acceder a la estructura de la empresa.</p>
                </div>`;
            }
            return;
        }

        this.cargarDatos();
    },

    cargarDatos: async function(silencioso = false) {
        if(!silencioso) window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('diccionarios_empresa')
                .select('*')
                .order('valor', { ascending: true });
                
            if(!silencioso) window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            this.datos = data || [];
            this.distribuirListas();
            
        } catch (e) {
            if(!silencioso) window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire('Error', 'No se pudo conectar con la base de datos Supabase.', 'error');
        }
    },

    distribuirListas: function() {
        this.renderizarTarjeta('Nómina', 'lista-nomina');
        this.renderizarTarjeta('Parentesco', 'lista-parentesco');
        this.renderizarTarjeta('Condición', 'lista-condicion');
        this.renderizarTarjeta('Negocio/Filial', 'lista-filial');
        this.renderizarTarjeta('Organización/Gerencia', 'lista-gerencia');
    },

    renderizarTarjeta: function(categoria, idContenedor) {
        const contenedor = document.getElementById(idContenedor);
        if(!contenedor) return;

        let filtrados = this.datos.filter(d => d.categoria === categoria);
        
        if(filtrados.length === 0) {
            contenedor.innerHTML = `<div class="p-4 text-center text-muted"><i class="bi bi-inbox fs-2"></i><p class="mb-0 small fw-bold mt-2">No hay registros</p></div>`;
            return;
        }

        // Determinar permisos para esta tarjeta específica o genéricos
        let pEliminar = window.Aplicacion.permiso('Estructura Empresa', 'eliminar');

        let html = '';
        filtrados.forEach(item => {
            let btnEliminar = pEliminar ? `<button class="btn btn-sm btn-light text-danger rounded-circle shadow-sm hover-efecto" onclick="window.ModEmpresa.eliminarItem('${item.id_parametro}', '${item.valor}', '${categoria}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>` : '';

            html += `
            <div class="list-group-item p-3 border-0 border-bottom d-flex justify-content-between align-items-center hover-efecto">
                <div class="fw-bold text-dark d-flex align-items-center gap-2">
                    <i class="bi bi-record-circle-fill text-secondary small" style="font-size: 0.6rem;"></i> ${item.valor}
                </div>
                <div>${btnEliminar}</div>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    nuevoItem: function(categoria) {
        if (!window.Aplicacion.permiso('Estructura Empresa', 'crear')) return Swal.fire('Acceso Denegado', 'No tienes permiso para añadir registros.', 'error');

        Swal.fire({ 
            title: `Añadir a ${categoria}`, 
            html: `<input type="text" id="swal-valor-dic" class="swal2-input input-moderno m-0 w-100" placeholder="Escriba el nombre...">`, 
            showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#0f172a',
            preConfirm: () => {
                const valor = document.getElementById('swal-valor-dic').value.trim();
                if (!valor) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
                return valor;
            }
        }).then(async (result) => { 
            if (result.isConfirmed) {
                // Prevenir duplicados en la misma categoría
                let existe = this.datos.find(d => d.categoria === categoria && d.valor.toLowerCase() === result.value.toLowerCase());
                if(existe) return Swal.fire('Atención', 'Este registro ya existe en la lista.', 'warning');

                window.Aplicacion.mostrarCarga();
                try {
                    const payload = { 
                        id_parametro: "EMP-" + new Date().getTime(), 
                        categoria: categoria,
                        valor: result.value 
                    };
                    
                    const { error } = await window.supabaseDB.from('diccionarios_empresa').insert([payload]);
                    window.Aplicacion.ocultarCarga();
                    
                    if (error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Añadido exitosamente', showConfirmButton: false, timer: 1500});
                    
                    // ✨ AUDITORÍA ✨
                    window.Aplicacion.auditar('Estructura Empresa', 'Nuevo Registro', `Se añadió "${result.value}" a la lista de ${categoria}.`);
                    
                    this.cargarDatos(true);
                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    console.error(e);
                    Swal.fire('Error', 'Falla en base de datos al guardar.', 'error'); 
                }
            } 
        });
    },

    eliminarItem: function(id, valor, categoria) {
        if (!window.Aplicacion.permiso('Estructura Empresa', 'eliminar')) return Swal.fire('Acceso Denegado', 'No tienes permiso para eliminar registros.', 'error');

        Swal.fire({ 
            title: '¿Eliminar Registro?', text: `Se borrará "${valor}" de las opciones disponibles.`, icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('diccionarios_empresa').delete().eq('id_parametro', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) throw error;
                    
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500});
                    
                    // ✨ AUDITORÍA ✨
                    window.Aplicacion.auditar('Estructura Empresa', 'Eliminar Registro', `Se eliminó "${valor}" de la lista de ${categoria}.`);
                    
                    this.cargarDatos(true);
                } catch(e) { 
                    window.Aplicacion.ocultarCarga(); 
                    Swal.fire('Error', 'Falla de conexión al eliminar.', 'error'); 
                }
            }
        });
    }
};

window.init_Estructura_Empresa = function() { window.ModEmpresa.init(); };