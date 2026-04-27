/**
 * MÓDULO: FORMACIÓN Y CAPACITACIÓN (Gestor de Catálogo y Demanda)
 * CRUD del catálogo con Imágenes, Paginación Inteligente, Filtros y Análisis Estadístico.
 */

window.ModFormacion = {
    catalogo: [],
    paginaActual: 1,
    itemsPorPagina: 12,

    init: function() {
        if (!window.Aplicacion.permiso('Gestor de Catálogo', 'ver')) {
            Swal.fire('Denegado', 'No posees privilegios para administrar el catálogo.', 'error');
            return;
        }
        this.cargarDatos();
    },

    cargarDatos: async function() {
        window.Aplicacion.mostrarCarga();
        try {
            const { data, error } = await window.supabaseDB
                .from('catalogo_formaciones')
                .select('*')
                .order('categoria', { ascending: true })
                .order('titulo', { ascending: true });

            window.Aplicacion.ocultarCarga();
            if (error) throw error;

            this.catalogo = data || [];
            this.llenarSelectorCategorias();
            this.renderizarCatalogo();

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'Falla al cargar el catálogo de formaciones.', 'error');
        }
    },

    // ✨ EXTRAE CATEGORÍAS ÚNICAS DE LA BD PARA EL FILTRO ✨
    llenarSelectorCategorias: function() {
        let select = document.getElementById('filtro-categoria');
        if(!select) return;
        
        let categoriasUnicas = [...new Set(this.catalogo.map(c => c.categoria))].filter(Boolean).sort();
        let html = '<option value="TODAS">Todas las Categorías</option>';
        
        categoriasUnicas.forEach(cat => {
            html += `<option value="${cat}">${cat}</option>`;
        });
        
        // Mantener la selección actual si existe
        let valorPrevio = select.value;
        select.innerHTML = html;
        if(categoriasUnicas.includes(valorPrevio)) select.value = valorPrevio;
    },

    formatearEnlaceDrive: function(url) {
        if (!url) return '';
        let match = url.match(/\/d\/(.+?)\//);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
        return url;
    },

    // ✨ LÓGICA DE RESETEO AL CAMBIAR FILTROS ✨
    cambiarFiltro: function() {
        this.paginaActual = 1; // Volvemos a la página 1 al buscar o filtrar
        let valCant = document.getElementById('filtro-cantidad').value;
        this.itemsPorPagina = valCant === 'TODOS' ? this.catalogo.length : parseInt(valCant);
        this.renderizarCatalogo();
    },

    // ✨ LÓGICA PARA NAVEGAR ENTRE PÁGINAS ✨
    cambiarPagina: function(pag) {
        this.paginaActual = pag;
        this.renderizarCatalogo();
        document.getElementById('tabsGestor').scrollIntoView({behavior: 'smooth'}); // Subir suavemente
    },

    renderizarCatalogo: function() {
        const contenedor = document.getElementById('contenedor-catalogo');
        const contPag = document.getElementById('contenedor-paginacion');
        if (!contenedor) return;

        let filtroCat = document.getElementById('filtro-categoria') ? document.getElementById('filtro-categoria').value : 'TODAS';
        let filtroTxt = document.getElementById('filtro-buscar') ? document.getElementById('filtro-buscar').value.toLowerCase() : '';

        // 1. Filtrar los datos
        let filtrados = this.catalogo.filter(c => {
            let pasaCat = filtroCat === 'TODAS' || c.categoria === filtroCat;
            let pasaTxt = c.titulo.toLowerCase().includes(filtroTxt) || (c.descripcion && c.descripcion.toLowerCase().includes(filtroTxt));
            return pasaCat && pasaTxt;
        });

        if (filtrados.length === 0) {
            contenedor.innerHTML = `<div class="col-12 text-center py-5"><h5 class="text-muted fw-bold"><i class="bi bi-journal-x fs-1 d-block mb-3"></i>No se encontraron cursos con esos filtros.</h5></div>`;
            if(contPag) contPag.innerHTML = '';
            return;
        }

        // 2. Matemáticas de Paginación
        let totalItems = filtrados.length;
        let totalPaginas = Math.ceil(totalItems / this.itemsPorPagina);
        if(this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;

        let inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        let fin = inicio + this.itemsPorPagina;
        let paginados = filtrados.slice(inicio, fin);

        // 3. Dibujar las tarjetas
        let html = '';
        paginados.forEach(curso => {
            let colorBadge = curso.nivel === 'Básico' ? 'bg-success' : (curso.nivel === 'Intermedio' ? 'bg-warning text-dark' : 'bg-danger');
            let imgFuente = curso.imagen_url ? curso.imagen_url : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80';
            
            html += `
            <div class="col-md-6 col-xl-4 d-flex align-items-stretch">
                <div class="card w-100 border-0 shadow-sm tarjeta-curso bg-white d-flex flex-column">
                    <div style="height: 160px; width: 100%; position: relative; background: #e2e8f0;">
                        <img src="${imgFuente}" alt="Curso" style="width: 100%; height: 100%; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 p-2">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light bg-white border-0 shadow-sm rounded-circle" type="button" data-bs-toggle="dropdown" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"><i class="bi bi-three-dots-vertical text-dark"></i></button>
                                <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                    <li><a class="dropdown-item fw-bold text-primary small py-2" href="javascript:void(0)" onclick="window.ModFormacion.editarCurso(${curso.id})"><i class="bi bi-pencil-square me-2"></i>Editar Curso</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item fw-bold text-danger small py-2" href="javascript:void(0)" onclick="window.ModFormacion.eliminarCurso(${curso.id}, '${curso.titulo.replace(/'/g, "\\'")}')"><i class="bi bi-trash3-fill me-2"></i>Eliminar</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-4 d-flex flex-column position-relative">
                        <span class="badge bg-purple text-purple bg-opacity-10 mb-2 align-self-start text-truncate" style="color:#6d28d9; border: 1px solid #c4b5fd; max-width: 100%;" title="${curso.categoria || 'Sin Categoría'}">${curso.categoria || 'Sin Categoría'}</span>
                        <h5 class="fw-bolder text-dark mb-2" style="line-height: 1.3;">${curso.titulo}</h5>
                        <p class="small text-muted mb-4" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${curso.descripcion || 'Sin descripción detallada.'}</p>
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                            <span class="small fw-bold text-secondary"><i class="bi bi-clock me-1"></i>${curso.duracion || 'N/A'}</span>
                            <span class="badge ${colorBadge} rounded-pill px-3">${curso.nivel || 'General'}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;

        // 4. Dibujar los botones de paginación
        this.renderizarPaginacion(totalPaginas);
    },

    renderizarPaginacion: function(totalPaginas) {
        const contPag = document.getElementById('contenedor-paginacion');
        if(!contPag) return;
        
        if(totalPaginas <= 1) {
            contPag.innerHTML = '';
            return;
        }

        // Paginación Inteligente (Ventana deslizante)
        let html = `<nav><ul class="pagination pagination-lg shadow-sm mb-0 flex-wrap justify-content-center">`;
        
        let disPrev = this.paginaActual === 1 ? 'disabled' : '';
        html += `<li class="page-item ${disPrev}"><a class="page-link fw-bold border-0" style="color: #8b5cf6;" href="javascript:void(0)" onclick="window.ModFormacion.cambiarPagina(${this.paginaActual - 1})">&laquo; Anterior</a></li>`;
        
        let maxPaginasVisibles = 5;
        let paginaInicial = Math.max(1, this.paginaActual - 2);
        let paginaFinal = Math.min(totalPaginas, this.paginaActual + 2);

        if (this.paginaActual <= 3) {
            paginaFinal = Math.min(totalPaginas, maxPaginasVisibles);
        }
        if (this.paginaActual >= totalPaginas - 2) {
            paginaInicial = Math.max(1, totalPaginas - 4);
        }

        if (paginaInicial > 1) {
            html += `<li class="page-item"><a class="page-link fw-bold" style="color: #8b5cf6; border-color: #f8f9fa;" href="javascript:void(0)" onclick="window.ModFormacion.cambiarPagina(1)">1</a></li>`;
            if (paginaInicial > 2) {
                html += `<li class="page-item disabled"><span class="page-link fw-bold border-0 text-muted bg-transparent">...</span></li>`;
            }
        }

        for(let i = paginaInicial; i <= paginaFinal; i++) {
            let act = this.paginaActual === i ? 'active' : '';
            let styleAct = act ? 'background-color: #8b5cf6; border-color: #8b5cf6; color: white;' : 'color: #8b5cf6; border-color: #f8f9fa;';
            html += `<li class="page-item ${act}"><a class="page-link fw-bold" style="${styleAct}" href="javascript:void(0)" onclick="window.ModFormacion.cambiarPagina(${i})">${i}</a></li>`;
        }

        if (paginaFinal < totalPaginas) {
            if (paginaFinal < totalPaginas - 1) {
                html += `<li class="page-item disabled"><span class="page-link fw-bold border-0 text-muted bg-transparent">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link fw-bold" style="color: #8b5cf6; border-color: #f8f9fa;" href="javascript:void(0)" onclick="window.ModFormacion.cambiarPagina(${totalPaginas})">${totalPaginas}</a></li>`;
        }

        let disNext = this.paginaActual === totalPaginas ? 'disabled' : '';
        html += `<li class="page-item ${disNext}"><a class="page-link fw-bold border-0" style="color: #8b5cf6;" href="javascript:void(0)" onclick="window.ModFormacion.cambiarPagina(${this.paginaActual + 1})">Siguiente &raquo;</a></li>`;
        
        html += `</ul></nav>`;
        contPag.innerHTML = html;
    },

    nuevoCurso: function() {
        let p1 = window.Aplicacion.permiso('Gestor de Catálogo', 'crear');
        let p2 = window.Aplicacion.permiso('Función: Crear Cursos', 'ver');
        if (!p1 && !p2) return Swal.fire('Denegado', 'No posees privilegios para crear cursos.', 'error');
        this.abrirModalCurso();
    },

    editarCurso: function(id) {
        let p1 = window.Aplicacion.permiso('Gestor de Catálogo', 'modificar');
        let p2 = window.Aplicacion.permiso('Función: Editar Cursos', 'ver');
        if (!p1 && !p2) return Swal.fire('Denegado', 'No posees privilegios para editar cursos.', 'error');
        let curso = this.catalogo.find(c => c.id === id);
        if(curso) this.abrirModalCurso(curso);
    },

    abrirModalCurso: function(curso = null) {
        let tituloModal = curso ? 'Editar Curso' : 'Nuevo Curso';
        let btnModal = curso ? 'Actualizar' : 'Crear Curso';

        Swal.fire({
            title: tituloModal,
            html: `
                <div class="text-start">
                    <div class="row">
                        <div class="col-12">
                            <label class="form-label small fw-bold mb-1 text-primary"><i class="bi bi-image me-1"></i>Enlace de la Imagen (Google Drive, Imgur, etc.)</label>
                            <input type="url" id="swal-img" class="input-moderno mb-3 border-primary" placeholder="Ej: https://drive.google.com/file/d/..." value="${curso ? (curso.imagen_url||'') : ''}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold mb-1">Categoría</label>
                            <input type="text" id="swal-cat" class="input-moderno mb-3" placeholder="Ej: Tecnología Educativa" value="${curso ? (curso.categoria||'') : ''}">
                        </div>
                    </div>
                    
                    <label class="form-label small fw-bold mb-1">Título del Curso</label>
                    <input type="text" id="swal-tit" class="input-moderno mb-3" placeholder="Ej: Robótica Básica" value="${curso ? curso.titulo : ''}">
                    
                    <label class="form-label small fw-bold mb-1">Descripción y Objetivo</label>
                    <textarea id="swal-desc" class="input-moderno mb-3" rows="3" placeholder="Breve descripción...">${curso ? (curso.descripcion||'') : ''}</textarea>
                    
                    <div class="row">
                        <div class="col-6">
                            <label class="form-label small fw-bold mb-1">Duración</label>
                            <input type="text" id="swal-dur" class="input-moderno" placeholder="Ej: 20 horas" value="${curso ? (curso.duracion||'') : ''}">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold mb-1">Nivel</label>
                            <select id="swal-niv" class="input-moderno">
                                <option value="Básico" ${curso && curso.nivel==='Básico'?'selected':''}>Básico</option>
                                <option value="Intermedio" ${curso && curso.nivel==='Intermedio'?'selected':''}>Intermedio</option>
                                <option value="Avanzado" ${curso && curso.nivel==='Avanzado'?'selected':''}>Avanzado</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true, confirmButtonText: btnModal, cancelButtonText: 'Cancelar', confirmButtonColor: '#8b5cf6',
            width: '600px',
            preConfirm: () => {
                let cat = document.getElementById('swal-cat').value.trim();
                let tit = document.getElementById('swal-tit').value.trim();
                let imgRaw = document.getElementById('swal-img').value.trim();
                
                // Formateamos la imagen por si es de Drive
                let imgFormatted = window.ModFormacion.formatearEnlaceDrive(imgRaw);

                if (!cat || !tit) { Swal.showValidationMessage('La Categoría y el Título son obligatorios'); return false; }
                
                return {
                    categoria: cat, titulo: tit,
                    descripcion: document.getElementById('swal-desc').value.trim(),
                    duracion: document.getElementById('swal-dur').value.trim(),
                    nivel: document.getElementById('swal-niv').value,
                    imagen_url: imgFormatted
                };
            }
        }).then(async (res) => {
            if (res.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    let payload = res.value;
                    let errorBD;
                    
                    if(curso) {
                        const { error } = await window.supabaseDB.from('catalogo_formaciones').update(payload).eq('id', curso.id).select();
                        errorBD = error;
                    } else {
                        const { error } = await window.supabaseDB.from('catalogo_formaciones').insert([payload]).select();
                        errorBD = error;
                    }
                    
                    if(errorBD) throw errorBD;
                    
                    window.Aplicacion.ocultarCarga();
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Catálogo Actualizado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Formación', curso ? 'Editar Curso' : 'Crear Curso', `Actualizó el curso: ${payload.titulo}`);
                    this.cargarDatos();

                } catch(e) {
                    window.Aplicacion.ocultarCarga();
                    console.error("Detalle del error en Base de Datos:", e);
                    Swal.fire('Error de Base de Datos', e.message || 'Falla al guardar el registro. Revise la consola.', 'error');
                }
            }
        });
    },

    eliminarCurso: function(id, tituloStr) {
        let p1 = window.Aplicacion.permiso('Gestor de Catálogo', 'eliminar');
        let p2 = window.Aplicacion.permiso('Función: Eliminar Cursos', 'ver');
        if (!p1 && !p2) return Swal.fire('Denegado', 'No puedes eliminar cursos.', 'error');
        
        Swal.fire({
            title: '¿Eliminar Curso?', text: `Se borrará "${tituloStr}" permanentemente del sistema.`, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if(result.isConfirmed) {
                window.Aplicacion.mostrarCarga();
                try {
                    const { error } = await window.supabaseDB.from('catalogo_formaciones').delete().eq('id', id);
                    window.Aplicacion.ocultarCarga();
                    if(error) throw error;
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Curso Eliminado', showConfirmButton: false, timer: 1500});
                    window.Aplicacion.auditar('Formación', 'Eliminar Curso', `Eliminó el curso: ${tituloStr}`);
                    this.cargarDatos();
                } catch(e) {
                    window.Aplicacion.ocultarCarga(); Swal.fire('Error', 'No se pudo eliminar el curso.', 'error');
                }
            }
        });
    },

    analizarDemanda: async function() {
        const contenedor = document.getElementById('contenedor-demanda');
        if(!contenedor) return;

        contenedor.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Analizando expedientes de docentes...</div>`;

        try {
            const { data, error } = await window.supabaseDB.from('expedientes_docentes').select('planificacion_estrategica');
            if (error) throw error;

            let conteoFormaciones = {};
            let totalSolicitudes = 0;
            let docentesConPlan = 0;

            if (data && data.length > 0) {
                data.forEach(exp => {
                    let plan = exp.planificacion_estrategica;
                    if (plan && plan.plan_formacion && Array.isArray(plan.plan_formacion) && plan.plan_formacion.length > 0) {
                        docentesConPlan++;
                        plan.plan_formacion.forEach(f => {
                            if (f.titulo) {
                                if (!conteoFormaciones[f.titulo]) {
                                    conteoFormaciones[f.titulo] = { cantidad: 0, categoria: f.categoria, nivel: f.nivel };
                                }
                                conteoFormaciones[f.titulo].cantidad++;
                                totalSolicitudes++;
                            }
                        });
                    }
                });
            }

            let ranking = Object.keys(conteoFormaciones).map(key => {
                return { titulo: key, ...conteoFormaciones[key] };
            }).sort((a, b) => b.cantidad - a.cantidad);

            this.renderizarRanking(ranking, totalSolicitudes, docentesConPlan);

        } catch (e) {
            console.error(e);
            contenedor.innerHTML = `<div class="alert alert-danger text-center"><i class="bi bi-exclamation-triangle-fill"></i> Error al calcular la demanda.</div>`;
        }
    },

    renderizarRanking: function(ranking, totalSolicitudes, docentesConPlan) {
        const contenedor = document.getElementById('contenedor-demanda');
        
        if (ranking.length === 0) {
            contenedor.innerHTML = `<div class="text-center py-5"><i class="bi bi-folder-x fs-1 text-muted d-block mb-3"></i><h5 class="fw-bold text-dark">Sin datos</h5><p class="text-muted">Aún no hay docentes que hayan guardado su Plan de Formación en el expediente.</p></div>`;
            return;
        }

        let maxVotos = ranking[0].cantidad;

        let html = `
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="p-3 bg-light rounded-4 border d-flex align-items-center">
                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle me-3"><i class="bi bi-people fs-4"></i></div>
                    <div>
                        <h3 class="fw-bold text-dark mb-0">${docentesConPlan}</h3>
                        <span class="small text-muted fw-bold">Docentes con planes registrados</span>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="p-3 bg-light rounded-4 border d-flex align-items-center">
                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle me-3"><i class="bi bi-ui-checks fs-4"></i></div>
                    <div>
                        <h3 class="fw-bold text-dark mb-0">${totalSolicitudes}</h3>
                        <span class="small text-muted fw-bold">Cursos solicitados en total</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="list-group list-group-flush border rounded-4 overflow-hidden shadow-sm">`;

        ranking.forEach((item, index) => {
            let porcentaje = Math.round((item.cantidad / maxVotos) * 100);
            let medalla = '';
            if(index === 0) medalla = '<i class="bi bi-trophy-fill text-warning fs-5 me-2"></i>';
            else if(index === 1) medalla = '<i class="bi bi-trophy-fill text-secondary fs-5 me-2"></i>';
            else if(index === 2) medalla = '<i class="bi bi-trophy-fill text-danger fs-5 me-2"></i>';
            else medalla = `<span class="text-muted fw-bold me-3 ms-2">#${index + 1}</span>`;

            html += `
            <div class="list-group-item p-4 hover-efecto bg-white">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center">
                        ${medalla}
                        <div>
                            <h6 class="fw-bold text-dark mb-0">${item.titulo}</h6>
                            <small class="text-muted">${item.categoria} | Nivel Solicitado: <span class="fw-bold text-dark">${item.nivel}</span></small>
                        </div>
                    </div>
                    <div class="text-end">
                        <h4 class="fw-bold text-primary mb-0">${item.cantidad}</h4>
                        <small class="text-muted">Solicitudes</small>
                    </div>
                </div>
                <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-primary" role="progressbar" style="width: ${porcentaje}%" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>`;
        });

        html += `</div>`;
        contenedor.innerHTML = html;
    }
};

window.init_Gestor_de_Catalogo = function() { if(window.ModFormacion) window.ModFormacion.init(); };