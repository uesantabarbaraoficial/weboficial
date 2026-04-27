/**
 * MÓDULO: PERFIL DE LA ESCUELA (Supabase Edition)
 * Gestiona la información institucional, misión, visión y PEIC.
 * ✨ INCLUYE MODO DEPURACIÓN (DEBUG) ✨
 */

window.ModEscuela = {
    perfilId: null,

    init: function() {
        this.cargarPerfil();
    },

    cargarPerfil: async function() {
        window.Aplicacion.mostrarCarga();
        
        try {
            const { data, error } = await window.supabaseDB
                .from('perfil_escuela')
                .select('*')
                .limit(1)
                .maybeSingle();

            window.Aplicacion.ocultarCarga();
            if (error) throw error;

            if (data) {
                this.perfilId = data.id;
                
                const setVal = (id, val) => {
                    let el = document.getElementById(id);
                    if(el) el.value = val || '';
                };

                setVal('pe-nombre', data.nombre_institucion);
                setVal('pe-dea', data.codigo_dea);
                setVal('pe-rif', data.rif);
                setVal('pe-direccion', data.direccion);
                setVal('pe-mision', data.mision);
                setVal('pe-vision', data.vision);
                setVal('pe-objetivo', data.objetivo);
                setVal('pe-peic', data.peic);
            }
        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error("Error cargando el perfil:", e);
            // Mostramos el error real en pantalla
            Swal.fire('Error al Cargar', e.message || 'No se pudo leer la base de datos', 'error');
        }
    },

    guardarPerfil: async function() {
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';

        let nombre = getVal('pe-nombre');
        let dea    = getVal('pe-dea');
        let rif    = getVal('pe-rif');
        let dir    = getVal('pe-direccion');
        let mision = getVal('pe-mision');
        let vision = getVal('pe-vision');
        let obj    = getVal('pe-objetivo');
        let peic   = getVal('pe-peic');

        if(!nombre || !dea) {
            return Swal.fire('Atención', 'El nombre de la institución y el código DEA son obligatorios.', 'warning');
        }

        window.Aplicacion.mostrarCarga();

        const payload = {
            nombre_institucion: nombre,
            codigo_dea: dea,
            rif: rif,
            direccion: dir,
            mision: mision,
            vision: vision,
            objetivo: obj,
            peic: peic
        };

        try {
            let errorGuardado;

            if (this.perfilId) {
                // Actualización
                const { error } = await window.supabaseDB
                    .from('perfil_escuela')
                    .update(payload)
                    .eq('id', this.perfilId);
                errorGuardado = error;
            } else {
                // Inserción inicial (Forzamos un ID texto por si tu tabla usa VARCHAR)
                this.perfilId = 'PERFIL-BASE';
                payload.id = this.perfilId;
                
                const { error } = await window.supabaseDB
                    .from('perfil_escuela')
                    .insert([payload]);
                errorGuardado = error;
            }

            window.Aplicacion.ocultarCarga();
            if (errorGuardado) throw errorGuardado;

            Swal.fire({
                toast: true, position: 'top-end', icon: 'success', title: 'Perfil actualizado exitosamente', showConfirmButton: false, timer: 2000
            });
            
            window.Aplicacion.auditar('Perfil de la Escuela', 'Actualizar Perfil', `Se actualizaron los datos base de la institución (DEA: ${dea}).`);

        } catch(e) {
            window.Aplicacion.ocultarCarga();
            console.error("Error crítico en guardarPerfil:", e);
            
            // 🔥 AQUÍ ESTÁ LA MAGIA: Te mostrará el error EXACTO que envía Supabase
            Swal.fire({
                title: 'Error de Supabase',
                text: e.message || 'Error desconocido al guardar.',
                icon: 'error',
                footer: '<span class="text-danger fw-bold">Por favor, indícame qué dice este mensaje de error para solucionarlo.</span>'
            });
        }
    }
};

window.init_Perfil_de_la_Escuela = function() { window.ModEscuela.init(); };