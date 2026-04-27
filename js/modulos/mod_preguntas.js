/**
 * MÓDULO: PREGUNTAS DE SEGURIDAD
 * Permite gestionar el banco de preguntas en Supabase.
 * ✨ INCLUYE AUDITORÍA, FILTRO Y PAGINACIÓN ✨
 */

window.ModPreguntas = {
    preguntas: [],
    preguntasFiltradas: [],
    
    // Variables de Paginación
    itemsPorPagina: 10,
    paginaActual: 1,

    init: function() {
        this.cargarPreguntas();
    },

    cargarPreguntas: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('conf_preguntas_seguridad')
                .select('*')
                .order('pregunta', { ascending: true });
                
            window.Aplicacion.ocultarCarga();
            if (error) throw error;
            
            this.preguntas = data || [];
            this.preguntasFiltradas = [...this.preguntas];
            this.paginaActual = 1;
            this.renderizarTabla();
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'No se pudo cargar el banco de preguntas.', 'error');
        }
    },

    filtrar: function() {
        let txt = document.getElementById('buscador-preguntas').value.toLowerCase();
        this.preguntasFiltradas = this.preguntas.filter(p => p.pregunta.toLowerCase().includes(txt));
        this.paginaActual = 1;
        this.renderizarTabla();
    },

    renderizarTabla: function() {
        const tbody = document.getElementById('tabla-preguntas');
        if(!tbody) return; 
        
        let totalPaginas = Math.ceil(this.preguntasFiltradas.length / this.itemsPorPagina) || 1;
        if(this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;
        let inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        let datosPagina = this.preguntasFiltradas.slice(inicio, inicio + this.itemsPorPagina);

        if(datosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-muted"><i class="bi bi-question-circle fs-2 d-block mb-2"></i>No se encontraron preguntas.</td></tr>`;
            document.getElementById('paginacion-preguntas').innerHTML = '';
            return;
        }

        let html = '';
        datosPagina.forEach(p => {
            html += `
            <tr class="align-middle hover-efecto">
                <td class="fw-bold text-dark ps-4">${p.pregunta}</td>
                <td class="text-end pe-4 text-nowrap">
                    <button class="btn btn-sm btn-light text-primary shadow-sm border me-1" onclick="window.ModPreguntas.editarPregunta('${p.id}', '${p.pregunta.replace(/'/g, "\\'")}')" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger shadow-sm border" onclick="window.ModPreguntas.eliminarPregunta('${p.id}')" title="Eliminar">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        this.generarPaginacion(totalPaginas);
    },

    generarPaginacion: function(totalPaginas) {
        const contenedor = document.getElementById('paginacion-preguntas');
        if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }
        
        let html = `<li class="page-item ${this.paginaActual === 1 ? 'disabled' : ''}"><button class="page-link" onclick="window.ModPreguntas.cambiarPagina(${this.paginaActual - 1})"><i class="bi bi-chevron-left"></i></button></li>`;
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= this.paginaActual - 2 && i <= this.paginaActual + 2)) {
                html += `<li class="page-item ${this.paginaActual === i ? 'active' : ''}"><button class="page-link" onclick="window.ModPreguntas.cambiarPagina(${i})">${i}</button></li>`;
            } else if (i === this.paginaActual - 3 || i === this.paginaActual + 3) {
                html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
            }
        }
        html += `<li class="page-item ${this.paginaActual === totalPaginas ? 'disabled' : ''}"><button class="page-link" onclick="window.ModPreguntas.cambiarPagina(${this.paginaActual + 1})"><i class="bi bi-chevron-right"></i></button></li>`;
        contenedor.innerHTML = html;
    },

    cambiarPagina: function(pag) {
        this.paginaActual = pag;
        this.renderizarTabla();
    },

    nuevaPregunta: function() {
        Swal.fire({
            title: 'Nueva Pregunta',
            input: 'text',
            inputPlaceholder: 'Ej: ¿Cuál es tu banda favorita?',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#0ea5e9',
            preConfirm: (valor) => {
                if (!valor) Swal.showValidationMessage('La pregunta no puede estar vacía');
                return valor;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('conf_preguntas_seguridad').insert([{ pregunta: result.value.trim() }]);
                    window.Aplicacion.ocultarCarga();
                    if (error) {
                        if(error.code === '23505') return Swal.fire('Error', 'Esta pregunta ya existe en el sistema.', 'error');
                        throw error;
                    }
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Pregunta guardada', showConfirmButton: false, timer: 1500});
                    
                    window.Aplicacion.auditar('Preguntas de Seguridad', 'Crear Pregunta', `Se añadió al banco: "${result.value.trim()}"`);
                    this.cargarPreguntas();
                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al guardar en el servidor.', 'error');
                }
            }
        });
    },

    editarPregunta: function(id, preguntaActual) {
        Swal.fire({
            title: 'Editar Pregunta',
            input: 'text',
            inputValue: preguntaActual,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            confirmButtonColor: '#0ea5e9',
            preConfirm: (valor) => {
                if (!valor) Swal.showValidationMessage('La pregunta no puede estar vacía');
                return valor;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('conf_preguntas_seguridad').update({ pregunta: result.value.trim() }).eq('id', id);
                    window.Aplicacion.ocultarCarga();
                    if (error) {
                        if(error.code === '23505') return Swal.fire('Error', 'Ya existe otra pregunta exactamente igual.', 'error');
                        throw error;
                    }
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Pregunta actualizada', showConfirmButton: false, timer: 1500});
                    
                    window.Aplicacion.auditar('Preguntas de Seguridad', 'Editar Pregunta', `Se modificó a: "${result.value.trim()}"`);
                    this.cargarPreguntas();
                } catch (e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'Falla al actualizar en el servidor.', 'error');
                }
            }
        });
    },

    eliminarPregunta: function(id) {
        Swal.fire({
            title: '¿Eliminar Pregunta?',
            text: "Esta acción no afectará a los usuarios que ya la hayan respondido.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('conf_preguntas_seguridad').delete().eq('id', id);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Eliminada', showConfirmButton: false, timer: 1500});
                    
                    window.Aplicacion.auditar('Preguntas de Seguridad', 'Eliminar Pregunta', `Se eliminó una pregunta del banco oficial.`);
                    this.cargarPreguntas();
                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    Swal.fire('Error', 'No se pudo eliminar.', 'error');
                }
            }
        });
    }
};

window.init_Preguntas_de_Seguridad = function() { window.ModPreguntas.init(); };