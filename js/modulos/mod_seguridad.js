/**
 * MÓDULO: MI PERFIL (Versión Final Blindada)
 * Sincronización exacta con esquema SQL y manejo defensivo de DOM.
 */

window.ModPerfil = {
    preguntasBase: [],
    
    init: function() {
        console.log("Iniciando Módulo de Perfil...");
        this.aplicarEventos();
        this.cargarTodo();
    },

    aplicarEventos: function() {
        // Manejador de visibilidad para Clave
        const chkClave = document.getElementById('check-clave');
        if(chkClave) {
            chkClave.onchange = () => {
                const blk = document.getElementById('bloque-claves');
                if(blk) blk.style.display = chkClave.checked ? 'flex' : 'none';
            };
        }
        
        // Manejador de visibilidad para Preguntas
        const chkPreguntas = document.getElementById('check-preguntas');
        if(chkPreguntas) {
            chkPreguntas.onchange = () => {
                const blk = document.getElementById('bloque-preguntas');
                if(blk) blk.style.display = chkPreguntas.checked ? 'flex' : 'none';
            };
        }

        // Manejador del Formulario
        const form = document.getElementById('form-mi-perfil');
        if(form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.guardarCambios();
            };
        }
    },

    cargarTodo: async function() {
        if (!window.Aplicacion.usuario) return;
        
        const cedula = String(window.Aplicacion.usuario.cedula).trim();
        window.Aplicacion.mostrarCarga();
        
        try {
            // 1. Cargar catálogo de preguntas
            const { data: qData } = await window.supabaseDB
                .from('conf_preguntas_seguridad')
                .select('pregunta')
                .order('pregunta', { ascending: true });
            
            this.preguntasBase = qData || [];

            // 2. Cargar datos reales del usuario
            const { data: user, error: userErr } = await window.supabaseDB
                .from('usuarios')
                .select('*')
                .eq('cedula', cedula)
                .maybeSingle();

            window.Aplicacion.ocultarCarga();

            if (userErr) throw userErr;

            if (user) {
                // Sincronización con columnas: nombre_completo, email, telefono
                const nom = user.nombre_completo || 'Usuario';
                if(document.getElementById('perfil-nombre-display')) document.getElementById('perfil-nombre-display').innerText = nom;
                if(document.getElementById('perfil-cedula-display')) document.getElementById('perfil-cedula-display').innerText = user.cedula;
                if(document.getElementById('perfil-rol-display')) document.getElementById('perfil-rol-display').innerText = user.rol || 'Sin Rol';
                
                if(document.getElementById('perfil-nombre')) document.getElementById('perfil-nombre').value = nom;
                if(document.getElementById('perfil-email')) document.getElementById('perfil-email').value = user.email || '';
                if(document.getElementById('perfil-telefono')) document.getElementById('perfil-telefono').value = user.telefono || '';
                
                this.llenarSelects(user.pregunta_1, user.pregunta_2);
            }

        } catch (e) {
            window.Aplicacion.ocultarCarga();
            console.error("Error cargando perfil:", e);
            Swal.fire('Error', 'Falla al conectar con el servidor de datos.', 'error');
        }
    },

    llenarSelects: function(p1, p2) {
        const s1 = document.getElementById('perfil-preg1');
        const s2 = document.getElementById('perfil-preg2');
        if (!s1 || !s2) return;

        let html = '<option value="">-- Seleccione Pregunta --</option>';
        this.preguntasBase.forEach(item => {
            html += `<option value="${item.pregunta}">${item.pregunta}</option>`;
        });

        s1.innerHTML = html;
        s2.innerHTML = html;

        if (p1) s1.value = p1;
        if (p2) s2.value = p2;
    },

    guardarCambios: async function() {
        const cedula = window.Aplicacion.usuario.cedula;
        const nombreVal = document.getElementById('perfil-nombre').value.trim();
        const emailVal  = document.getElementById('perfil-email').value.trim();
        const telfVal   = document.getElementById('perfil-telefono').value.trim();

        const updClave = document.getElementById('check-clave')?.checked;
        const updPreg  = document.getElementById('check-preguntas')?.checked;

        if (updClave) {
            const cAct = document.getElementById('perfil-clave-actual').value;
            const cNue = document.getElementById('perfil-clave-nueva').value;
            const cCon = document.getElementById('perfil-clave-confirmar').value;
            if (!cAct || !cNue || !cCon) return Swal.fire('Atención', 'Debe completar todos los campos de clave.', 'warning');
            if (cNue !== cCon) return Swal.fire('Atención', 'La confirmación no coincide.', 'warning');
        }

        window.Aplicacion.mostrarCarga();

        try {
            // Verificación de clave actual
            if (updClave) {
                const { data: vUser } = await window.supabaseDB
                    .from('usuarios').select('password').eq('cedula', cedula).single();
                
                if (vUser.password !== document.getElementById('perfil-clave-actual').value) {
                    window.Aplicacion.ocultarCarga();
                    return Swal.fire('Error', 'La clave actual es incorrecta.', 'error');
                }
            }

            // PAYLOAD DEFINITIVO (Sin columnas fantasma)
            let payload = {
                nombre_completo: nombreVal,
                email: emailVal,
                telefono: telfVal
            };

            if (updClave) {
                payload.password = document.getElementById('perfil-clave-nueva').value;
                payload.primer_ingreso = false;
            }

            if (updPreg) {
                payload.pregunta_1 = document.getElementById('perfil-preg1').value;
                payload.respuesta_1 = document.getElementById('perfil-resp1').value.trim().toLowerCase();
                payload.pregunta_2 = document.getElementById('perfil-preg2').value;
                payload.respuesta_2 = document.getElementById('perfil-resp2').value.trim().toLowerCase();
            }

            const { error: updErr } = await window.supabaseDB
                .from('usuarios')
                .update(payload)
                .eq('cedula', cedula);

            window.Aplicacion.ocultarCarga();

            if (updErr) throw updErr;

            // Actualizar sesión local
            window.Aplicacion.usuario.nombre = nombreVal;
            localStorage.setItem('sigae_usuario', JSON.stringify(window.Aplicacion.usuario));

            Swal.fire('¡Éxito!', 'Perfil actualizado correctamente.', 'success').then(() => {
                location.reload(); 
            });

        } catch (err) {
            window.Aplicacion.ocultarCarga();
            console.error("Fallo al guardar:", err);
            Swal.fire('Error de Servidor', `Detalle: ${err.message}`, 'error');
        }
    }
};

window.init_Mi_Perfil = function() { window.ModPerfil.init(); };