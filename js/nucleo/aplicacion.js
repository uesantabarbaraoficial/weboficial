// ✨ 1. INICIALIZAR SUPABASE (A PRUEBA DE ERRORES) ✨
const SUPABASE_URL = 'https://hxvdqhbbcezwuwjdqrhp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yYOogoS_fXumOBy0sESa_g_zSEt_kVd';

window.supabaseDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.ModulosSistema = {
    "Dirección y Sistema": { 
        icono: "bi-bank", color: "#FF8D00", desc: "Gestión institucional, calendario y configuración.", 
        items: [
            { vista: "Perfil de la Escuela", icono: "bi-building" }, 
            { vista: "Espacios Escolares", icono: "bi-door-open" },
            { vista: "Configuración del Sistema", icono: "bi-sliders" },
            { vista: "Calendario Escolar", icono: "bi-calendar-range" },
            { vista: "Gestión de Registros", icono: "bi-database-fill-gear" },
            { vista: "Panel de Control", icono: "bi-terminal-fill" }
        ] 
    },
    "Organización Escolar": { 
        icono: "bi-diagram-3", color: "#e11d48", desc: "Cargos, organigrama, colectivos y estructura.", 
        items: [
            { vista: "Cargos Institucionales", icono: "bi-briefcase-fill" }, 
            { vista: "Cadena Supervisoria", icono: "bi-diagram-2" },
            { vista: "Gestión de Colectivos", icono: "bi-people-fill" },
            { vista: "Estructura Empresa", icono: "bi-buildings-fill" }
        ] 
    },
    "Control de Estudios": { 
        icono: "bi-folder-check", color: "#00C3FF", desc: "Estructura académica de la institución.", 
        items: [
            { vista: "Grados y Salones", icono: "bi-grid-3x3-gap-fill" }
        ] 
    },
    "Gestión Estudiantil": { 
        icono: "bi-mortarboard-fill", color: "#8B5CF6", desc: "Inscripciones, expedientes y actualización de datos.", 
        items: [
            { vista: "Gestión de Admisiones", icono: "bi-ui-checks" },
            { vista: "Vincular Estudiante", icono: "bi-person-plus-fill" },
            { vista: "Expediente Estudiantil", icono: "bi-person-vcard" },
            { vista: "Actualización de Datos", icono: "bi-arrow-repeat" },
            { vista: "Solicitud de Cupos", icono: "bi-envelope-paper-fill" },
            { vista: "Verificaciones", icono: "bi-shield-check" },
            { vista: "Mis Solicitudes", icono: "bi-card-checklist" },
            { vista: "Gestión de Matrícula", icono: "bi-diagram-3-fill" }
        ] 
    },
    "Gestión Docente": { 
        icono: "bi-person-workspace", color: "#00E676", desc: "Administración del personal docente.", 
        items: [
            { vista: "Asignar Guiaturas", icono: "bi-person-video3" },
            { vista: "Mi Expediente", icono: "bi-person-vcard" },
            { vista: "Gestor de Expedientes", icono: "bi-folder-symlink" }
        ] 
    },
    "Formación y Capacitación": { 
        icono: "bi-award-fill", color: "#8b5cf6", desc: "Cursos, talleres y certificados para la comunidad.", 
        items: [
            { vista: "Gestor de Catálogo", icono: "bi-journal-plus" },
            { vista: "Oferta Académica", icono: "bi-shop-window" },
            { vista: "Mis Certificados", icono: "bi-patch-check" }
        ] 
    },
    "Servicios y Bienestar": { 
        icono: "bi-heart-pulse", color: "#FF3D00", desc: "Rutas y monitoreo de transporte escolar.", 
        items: [
            { vista: "Transporte Escolar", icono: "bi-bus-front" }
        ] 
    },
    "Seguridad y Accesos": { 
        icono: "bi-shield-lock", color: "#455A64", desc: "Usuarios, contraseñas y permisos del sistema.", 
        items: [
            { vista: "Mi Perfil", icono: "bi-person-badge" }, 
            { vista: "Gestión de Usuarios", icono: "bi-people" }, 
            { vista: "Roles y Privilegios", icono: "bi-key" },
            { vista: "Preguntas de Seguridad", icono: "bi-patch-question" },
            { vista: "Auditoría del Sistema", icono: "bi-list-check" } 
        ] 
    }
};

window.Aplicacion = {
    usuario: null, 
    ModulosSistema: window.ModulosSistema, 
    momentoActual: null, 
    rolesDelSistema: [], 
    permisosActuales: {}, 
    tiempoInactividad: 30 * 60 * 1000, 
    tiempoAdvertencia: 60 * 1000, 
    temporizadorInactivo: null, 
    temporizadorCierre: null,
    diferenciaTiempoMs: 0,
    preguntaRecuperacionActiva: 1,
    
    audioCtx: null,
    alertasActivas: [],
    sonidoHabilitado: true,
    radarIntervalo: null,

    init: async function() { 
        await this.sincronizarRelojInternet(); 
        
        let snd = localStorage.getItem('sigae_sonido_notif');
        if(snd !== null) this.sonidoHabilitado = (snd === 'true');

        const guardado = localStorage.getItem('sigae_usuario'); 
        if (guardado) { 
            this.usuario = JSON.parse(guardado); 
            this.prepararApp(false); 
        } else { 
            setTimeout(() => { 
                document.getElementById('pantalla-carga').style.display = 'none'; 
                document.getElementById('vista-login').style.display = 'flex'; 
                let inputCedula = document.getElementById('inputCedula');
                if(inputCedula) inputCedula.addEventListener('keypress', function(e) { if (e.key === 'Enter') window.Aplicacion.verificarUsuario(); });
                let inputClave = document.getElementById('inputClave');
                if(inputClave) inputClave.addEventListener('keypress', function(e) { if (e.key === 'Enter') window.Aplicacion.iniciarSesion(); });
            }, 1000); 
        } 
    },

    sincronizarRelojInternet: async function() {
        try {
            const r = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=America/Caracas', { cache: 'no-store' });
            const d = await r.json();
            const horaInternet = new Date(d.dateTime + "-04:00").getTime();
            this.diferenciaTiempoMs = horaInternet - new Date().getTime();
        } catch (e) {
            this.diferenciaTiempoMs = 0;
        }
    },

    obtenerFechaReal: function() { return new Date(new Date().getTime() + this.diferenciaTiempoMs); },
    
    peticion: function(payload, callback) { 
        fetch(Configuracion.obtenerApiUrl(), { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(data => { try { callback(data); } catch(e) {} })
        .catch(err => { this.ocultarCarga(); if(typeof Swal !== 'undefined') Swal.fire('Error', 'Falla de conexión al servidor.', 'error'); }); 
    },

    mostrarCarga: function() { const el = document.getElementById('pantalla-carga'); if(el) { el.style.opacity = '1'; el.style.display = 'flex'; } }, 
    ocultarCarga: function() { const el = document.getElementById('pantalla-carga'); if(el) el.style.display = 'none'; },
    
    prepararApp: async function(esLoginNuevo = false) {
        if (!esLoginNuevo) { 
            document.getElementById('vista-login').style.display = 'none'; 
        }
        
        this.mostrarCarga(); 

        try {
            const [perRes, lapRes, rolesRes] = await Promise.all([
                window.supabaseDB.from('conf_periodos').select('*'),
                window.supabaseDB.from('conf_lapsos').select('*'),
                window.supabaseDB.from('roles').select('*')
            ]);

            let hoy = new Date().getTime();
            let encontrarActivo = (lista) => {
                if (!lista || lista.length === 0) return null;
                let activo = lista.find(item => {
                    if (item.fecha_inicio && item.fecha_fin) {
                        let pIn = new Date(item.fecha_inicio + "T00:00:00").getTime();
                        let pOut = new Date(item.fecha_fin + "T23:59:59").getTime();
                        return hoy >= pIn && hoy <= pOut;
                    }
                    return false;
                });
                return activo ? activo.valor : null;
            };

            let anio = encontrarActivo(perRes.data) || 'No definido';
            let lapso = encontrarActivo(lapRes.data) || 'Fuera de Fase / Vacaciones';

            this.momentoActual = { anioEscolar: anio, lapso: lapso };

            const elAnio = document.getElementById('global-anio-escolar'); 
            const elLapso = document.getElementById('global-lapso-escolar');
            if(elAnio) elAnio.innerHTML = `<i class="bi bi-calendar3 me-1"></i> Año Escolar: <span class="fw-bold">${anio}</span>`;
            if(elLapso) { 
                let claseColor = lapso.includes('Fuera') ? 'text-danger' : 'text-success'; 
                elLapso.innerHTML = `<i class="bi bi-clock-history me-1"></i> Fase Actual: <span class="${claseColor} fw-bold">${lapso}</span>`; 
            }

            if(rolesRes.data) {
                this.rolesDelSistema = rolesRes.data;
                let miRol = this.rolesDelSistema.find(r => r.nombre === this.usuario.rol);
                
                if (miRol && miRol.permisos) {
                    try {
                        this.permisosActuales = typeof miRol.permisos === 'string' ? JSON.parse(miRol.permisos) : miRol.permisos;
                    } catch(e) {
                        console.error("Error decodificando permisos:", e);
                        this.permisosActuales = {};
                    }
                } else {
                    this.permisosActuales = {};
                }
            }
            
            if(this.usuario) { 
                const navNombre = document.getElementById('nombre-usuario-nav'); 
                const navRol = document.getElementById('rol-usuario-nav'); 
                if(navNombre) navNombre.innerText = this.usuario.nombre; 
                if(navRol) navRol.innerText = this.usuario.rol; 
            }
            
            this.dibujarMenuPrincipal(); 
            this.iniciarControlSesion();
            
            this.iniciarMotorNotificaciones(); 

            setTimeout(() => {
                const btnSonido = document.getElementById('btn-toggle-sonido');
                if(btnSonido) btnSonido.innerHTML = this.sonidoHabilitado ? '<i class="bi bi-volume-up-fill fs-5"></i>' : '<i class="bi bi-volume-mute-fill fs-5"></i>';
            }, 500);
            
            const ultimaVista = localStorage.getItem('sigae_ultima_vista') || 'Inicio'; 
            
            if (esLoginNuevo && typeof window.ejecutarTransicionDigital === 'function') {
                document.getElementById('contenedor-transicion').style.zIndex = '99999999';

                window.ejecutarTransicionDigital(() => {
                    this.ocultarCarga(); 
                    document.getElementById('vista-login').style.display = 'none';
                    document.getElementById('vista-app').style.display = 'block';
                    if(typeof Enrutador !== 'undefined') Enrutador.navegar(ultimaVista);
                    
                    setTimeout(() => { document.getElementById('contenedor-transicion').style.zIndex = ''; }, 1000);
                });
            } else {
                this.ocultarCarga();
                document.getElementById('vista-login').style.display = 'none';
                document.getElementById('vista-app').style.display = 'block';
                if(typeof Enrutador !== 'undefined') Enrutador.navegar(ultimaVista);
            }
        } catch(e) {
            console.error(e);
            this.ocultarCarga();
            Swal.fire('Error', 'No se pudo sincronizar la sesión con la base de datos.', 'error');
        }
    },

    permiso: function(modulo, accion = 'ver') {
        if(!this.usuario) return false; 
        if(modulo === "Mi Perfil") return true; 
        
        if(!this.permisosActuales || !this.permisosActuales[modulo]) return false;
        return this.permisosActuales[modulo][accion] === true;
    },

    verificarUsuario: async function() { 
        const c = document.getElementById('inputCedula').value; 
        if(!c) return Swal.fire('Atención', 'Ingrese cédula.', 'warning'); 
        
        this.mostrarCarga(); 
        
        try {
            const { data, error } = await window.supabaseDB
                .from('usuarios')
                .select('*')
                .eq('cedula', String(c))
                .maybeSingle();

            if (error || !data || data.rol === 'Invitado' || data.rol === 'Visitante') {
                this.ocultarCarga(); 
                return Swal.fire({
                    title: 'Usuario No Registrado',
                    text: 'Su cédula no pertenece al personal oficial de la institución. Si usted es Representante, Aspirante o Visitante, por favor ingrese mediante el "Acceso Invitado".',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0066FF',
                    confirmButtonText: '<i class="bi bi-person-badge me-1"></i> Ir a Acceso Invitado',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.Aplicacion.accesoInvitado();
                        document.getElementById('inv-cedula').value = c;
                        window.Aplicacion.buscarInvitado(c);
                    }
                });
            }

            let requiere_config = (data.primer_ingreso === true || !data.password);
            
            if(requiere_config) { 
                this.ocultarCarga();
                document.getElementById('paso-cedula').style.display = 'none'; 
                document.getElementById('pi-nombre').value = data.nombre_completo; 
                document.getElementById('lbl-pi-nombre').innerText = data.nombre_completo;
                
                document.getElementById('paso-primer-ingreso').style.display = 'block';
                let htmlSelect = '<option value="">Seleccione una pregunta...</option>';
                const { data: pregData } = await window.supabaseDB.from('conf_preguntas_seguridad').select('pregunta').order('pregunta', { ascending: true });
                
                if(pregData && pregData.length > 0) {
                    pregData.forEach(p => { htmlSelect += `<option value="${p.pregunta}">${p.pregunta}</option>`; });
                } else {
                    htmlSelect += '<option value="¿Color favorito?">¿Color favorito?</option>';
                }
                
                document.getElementById('pi-preg1').innerHTML = htmlSelect;
                document.getElementById('pi-preg2').innerHTML = htmlSelect;

            } else { 
                this.ocultarCarga(); 
                document.getElementById('lbl-nombre-login').innerText = data.nombre_completo; 
                document.getElementById('paso-cedula').style.display = 'none'; 
                document.getElementById('paso-clave').style.display = 'block'; 
                setTimeout(() => document.getElementById('inputClave').focus(), 100); 
            } 
        } catch (e) {
            this.ocultarCarga(); 
            Swal.fire('Error', 'Falla de conexión al servidor Supabase.', 'error');
        }
    },

    iniciarSesion: async function() { 
        const c = document.getElementById('inputCedula').value; 
        const p = document.getElementById('inputClave').value; 
        if (!p) return Swal.fire('Atención', 'Ingrese contraseña.', 'warning'); 
        
        this.mostrarCarga(); 
        
        try {
            const { data, error } = await window.supabaseDB
                .from('usuarios')
                .select('*')
                .eq('cedula', String(c))
                .maybeSingle();

            if (error || !data || data.rol === 'Invitado' || data.rol === 'Visitante') {
                this.ocultarCarga(); 
                return Swal.fire('Atención', 'Error de servidor o usuario no encontrado.', 'error');
            }

            // ✨ BARRERA DE MANTENIMIENTO: Expulsa a cualquiera que no sea administrador
            const { data: sysConf } = await window.supabaseDB.from('conf_sistema').select('valor_booleano').eq('id_config', 'modo_mantenimiento').maybeSingle();
            if (sysConf && sysConf.valor_booleano === true) {
                if (!data.rol || !data.rol.toLowerCase().includes('administrador')) {
                    this.ocultarCarga();
                    return Swal.fire({
                        title: '⚙️ Sistema en Mantenimiento',
                        text: 'La plataforma se encuentra temporalmente fuera de servicio por mantenimiento programado. Intente más tarde.',
                        icon: 'info',
                        confirmButtonColor: '#0066FF'
                    });
                }
            }

            if (data.estado === "Bloqueado") {
                this.ocultarCarga();
                return Swal.fire('Atención', 'Usuario BLOQUEADO permanentemente.', 'error');
            }
            
            if (data.bloqueo_hasta) {
                let bloqueo = new Date(data.bloqueo_hasta).getTime();
                let ahora = new Date().getTime();
                if (bloqueo > ahora) {
                    let faltan = Math.ceil((bloqueo - ahora) / 60000);
                    this.ocultarCarga();
                    return Swal.fire('Atención', `Cuenta bloqueada temporalmente por seguridad. Intente en ${faltan} minutos.`, 'error');
                }
            }

            if (data.password !== p) {
                let intentos = (data.intentos_fallidos || 0) + 1;
                if(intentos >= 3) {
                    let bloqueoHasta = new Date(new Date().getTime() + 30*60000).toISOString();
                    await window.supabaseDB.from('usuarios').update({ intentos_fallidos: 0, bloqueo_hasta: bloqueoHasta }).eq('cedula', String(c));
                    this.ocultarCarga();
                    return Swal.fire('Atención', 'Ha superado los 3 intentos fallidos. Su cuenta ha sido bloqueada por 30 minutos.', 'error');
                } else {
                    await window.supabaseDB.from('usuarios').update({ intentos_fallidos: intentos }).eq('cedula', String(c));
                    this.ocultarCarga();
                    return Swal.fire('Atención', `Contraseña incorrecta. Intento ${intentos} de 3.`, 'error');
                }
            }

            if (data.intentos_fallidos > 0 || data.bloqueo_hasta) {
                await window.supabaseDB.from('usuarios').update({ intentos_fallidos: 0, bloqueo_hasta: null }).eq('cedula', String(c));
            }

            this.usuario = {
                id: data.id_usuario,
                cedula: data.cedula,
                nombre: data.nombre_completo,
                rol: data.rol,
                cargo: data.cargo,
                token: 'supa-' + new Date().getTime()
            }; 
            localStorage.setItem('sigae_usuario', JSON.stringify(this.usuario)); 
            
            this.prepararApp(true); 
            this.auditar('Seguridad y Accesos', 'Inicio de Sesión', 'El usuario accedió exitosamente al sistema.');

        } catch (e) {
            this.ocultarCarga();
            Swal.fire('Atención', 'Error de conexión con Supabase.', 'error');
        }
    },

    procesarPrimerIngreso: async function() { 
        const c = document.getElementById('inputCedula').value; 
        const p1 = document.getElementById('pi-clave1').value; 
        const p2 = document.getElementById('pi-clave2').value; 
        const email = document.getElementById('pi-email').value.trim(); 
        const tel = document.getElementById('pi-telefono').value.trim(); 
        const preg1 = document.getElementById('pi-preg1').value; 
        const resp1 = document.getElementById('pi-resp1').value.trim(); 
        const preg2 = document.getElementById('pi-preg2').value; 
        const resp2 = document.getElementById('pi-resp2').value.trim(); 
        
        if(!p1 || !p2 || !email || !tel || !preg1 || !resp1 || !preg2 || !resp2) {
            return Swal.fire('Datos Incompletos', 'Por motivos de seguridad, TODOS los campos son obligatorios para garantizar la recuperación de tu cuenta.', 'warning'); 
        }

        if(p1 !== p2) return Swal.fire('Error', 'Las contraseñas no coinciden.', 'error'); 
        if(preg1 === preg2) return Swal.fire('Error', 'Debe seleccionar dos preguntas de seguridad distintas.', 'error'); 
        if(!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]{8,}$/.test(p1)) return Swal.fire('Contraseña Débil', 'Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo (@$!%*?&#.).', 'error'); 
        
        this.mostrarCarga(); 
        
        const { error } = await window.supabaseDB
            .from('usuarios')
            .update({ 
                password: p1, 
                email: email, 
                telefono: tel, 
                pregunta_1: preg1, 
                respuesta_1: resp1, 
                pregunta_2: preg2, 
                respuesta_2: resp2,
                primer_ingreso: false,
                fecha_ult_clave: new Date().toISOString()
            })
            .eq('cedula', String(c));

        this.ocultarCarga(); 

        if(!error) { 
            Swal.fire('¡Éxito!', 'Cuenta configurada correctamente. Ahora inicie sesión con su nueva contraseña.', 'success').then(() => { 
                document.getElementById('paso-primer-ingreso').style.display = 'none'; 
                document.getElementById('lbl-nombre-login').innerText = document.getElementById('pi-nombre').value || document.getElementById('lbl-pi-nombre').innerText; 
                document.getElementById('paso-clave').style.display = 'block'; 
                document.getElementById('inputClave').value = ''; 
            }); 
        } else { 
            Swal.fire('Error', 'No se pudo configurar la cuenta en el servidor.', 'error'); 
        } 
    },

    iniciarRecuperacion: async function() { 
        const cedula = document.getElementById('inputCedula').value; 
        if(!cedula) return Swal.fire('Error', 'Debe ingresar su cédula primero.', 'error'); 
        
        this.mostrarCarga(); 
        
        const { data, error } = await window.supabaseDB.from('usuarios').select('pregunta_1, pregunta_2, bloqueo_hasta, estado').eq('cedula', String(cedula)).maybeSingle();
        this.ocultarCarga();

        if (error || !data) return Swal.fire('Atención', 'Usuario no encontrado.', 'warning');
        if (data.estado === "Bloqueado") return Swal.fire('Atención', 'Usuario bloqueado permanentemente.', 'error');
        
        let p1 = data.pregunta_1, p2 = data.pregunta_2;
        if (!p1 && !p2) return Swal.fire('Atención', 'Este usuario no tiene preguntas de seguridad configuradas. Contacte a soporte.', 'warning');
        
        let nP = (Math.random() < 0.5 && p1) ? 1 : (p2 ? 2 : 1);
        this.preguntaRecuperacionActiva = nP;
        
        document.getElementById('paso-clave').style.display = 'none';
        document.getElementById('lbl-pregunta-recuperacion').innerText = (nP === 1 ? p1 : p2);
        document.getElementById('rec-respuesta').value = '';
        document.getElementById('rec-clave1').value = '';
        document.getElementById('rec-clave2').value = '';
        document.getElementById('paso-recuperacion').style.display = 'block';
    },

    cancelarRecuperacion: function() { 
        document.getElementById('paso-recuperacion').style.display = 'none'; 
        document.getElementById('paso-clave').style.display = 'block'; 
    },

    procesarRecuperacion: async function() { 
        const c = document.getElementById('inputCedula').value; 
        const resp = document.getElementById('rec-respuesta').value; 
        const c1 = document.getElementById('rec-clave1').value; 
        const c2 = document.getElementById('rec-clave2').value; 
        
        if(!resp || !c1 || !c2) return Swal.fire('Datos Incompletos', 'Complete su respuesta y contraseña.', 'warning'); 
        if(c1 !== c2) return Swal.fire('Error', 'Las contraseñas no coinciden.', 'error'); 
        if(!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]{8,}$/.test(c1)) return Swal.fire('Contraseña Débil', 'Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo.', 'error'); 
        
        this.mostrarCarga(); 
        
        const { data, error } = await window.supabaseDB.from('usuarios').select('respuesta_1, respuesta_2, intentos_fallidos').eq('cedula', String(c)).maybeSingle();
        
        if (error || !data) { this.ocultarCarga(); return Swal.fire('Error', 'Falla de servidor', 'error'); }

        let rReal = this.preguntaRecuperacionActiva === 1 ? data.respuesta_1 : data.respuesta_2;
        
        if (String(resp).trim().toLowerCase() !== String(rReal).trim().toLowerCase()) {
            this.ocultarCarga();
            return Swal.fire('Error', 'Respuesta de seguridad incorrecta.', 'error');
        }

        const { error: updErr } = await window.supabaseDB.from('usuarios').update({ password: c1, intentos_fallidos: 0, bloqueo_hasta: null }).eq('cedula', String(c));
        this.ocultarCarga();

        if (updErr) return Swal.fire('Error', 'Falla al guardar en el servidor', 'error');

        Swal.fire('¡Éxito!', 'Contraseña restablecida correctamente.', 'success').then(() => {
            this.cancelarRecuperacion();
            document.getElementById('inputClave').value = '';
        });
    },

    accesoInvitado: function() { document.getElementById('paso-cedula').style.display = 'none'; document.getElementById('paso-invitado').style.display = 'block'; },
    
    buscarInvitado: async function(cedula) {
        if (!cedula || String(cedula).trim().length < 5) return;
        
        try {
            const { data: oficial } = await window.supabaseDB
                .from('usuarios')
                .select('cedula, rol')
                .eq('cedula', String(cedula).trim())
                .maybeSingle();

            if (oficial && oficial.rol !== 'Invitado' && oficial.rol !== 'Visitante') {
                 Swal.fire({
                    title: '¡Acceso Incorrecto!',
                    text: 'Usted pertenece al personal oficial de la institución. Por favor, utilice el inicio de sesión principal.',
                    icon: 'warning',
                    confirmButtonColor: '#0066FF',
                    confirmButtonText: 'Ir a Inicio Principal'
                }).then(() => {
                    document.getElementById('paso-invitado').style.display = 'none';
                    document.getElementById('paso-cedula').style.display = 'block';
                    document.getElementById('inputCedula').value = cedula;
                });
                return;
            }

            const { data } = await window.supabaseDB
                .from('invitados')
                .select('*')
                .eq('cedula', String(cedula).trim())
                .maybeSingle();
                
            if (data) {
                document.getElementById('inv-nombre').value = data.nombre_completo || '';
                document.getElementById('inv-correo').value = data.email || '';
                document.getElementById('inv-telefono').value = data.telefono || '';
                
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: '¡Bienvenido de nuevo!',
                    text: 'Hemos recuperado sus datos. Actualice si es necesario.',
                    showConfirmButton: false,
                    timer: 4000
                });
                
                document.getElementById('inv-motivo').focus();
            }
        } catch(e) {}
    },

    enviarRegistroInvitado: async function() { 
        const cedulaInv = document.getElementById('inv-cedula').value.trim();
        const nombreInv = document.getElementById('inv-nombre').value.trim(); 
        const correoInv = document.getElementById('inv-correo').value.trim(); 
        const telefonoInv = document.getElementById('inv-telefono').value.trim(); 
        const motivoInv = document.getElementById('inv-motivo').value.trim(); 
        
        if(!cedulaInv || !nombreInv || !correoInv || !telefonoInv || !motivoInv) {
            return Swal.fire('Campos Incompletos', 'Debe llenar todos los datos obligatorios, incluyendo su cédula.', 'warning'); 
        }

        this.mostrarCarga(); 
        
        try {
            const { data: usuarioOficial } = await window.supabaseDB
                .from('usuarios')
                .select('cedula, rol')
                .eq('cedula', String(cedulaInv))
                .maybeSingle();

            if (usuarioOficial && usuarioOficial.rol !== 'Invitado' && usuarioOficial.rol !== 'Visitante') {
                this.ocultarCarga();
                return Swal.fire({
                    title: '¡Acceso Incorrecto!',
                    text: 'Usted pertenece al personal oficial de la institución. Debe ingresar a través del inicio de sesión principal.',
                    icon: 'info',
                    confirmButtonColor: '#0066FF',
                    confirmButtonText: 'Ir al Inicio de Sesión'
                }).then(() => {
                    document.getElementById('paso-invitado').style.display = 'none';
                    document.getElementById('paso-cedula').style.display = 'block';
                    document.getElementById('inputCedula').value = cedulaInv;
                });
            }

            // ✨ BARRERA DE MANTENIMIENTO
            const { data: sysConf } = await window.supabaseDB.from('conf_sistema').select('valor_booleano').eq('id_config', 'modo_mantenimiento').maybeSingle();
            if (sysConf && sysConf.valor_booleano === true) {
                this.ocultarCarga();
                return Swal.fire({
                    title: '⚙️ Sistema en Mantenimiento',
                    text: 'La plataforma se encuentra temporalmente fuera de servicio. Por favor, intente acceder más tarde.',
                    icon: 'info',
                    confirmButtonColor: '#0066FF'
                });
            }

            // 🔒 NUEVA BARRERA: CONTROL DE ACCESO PARA INVITADOS
            const { data: invConf } = await window.supabaseDB.from('conf_sistema').select('valor_booleano').eq('id_config', 'acceso_invitados').maybeSingle();
            if (invConf && invConf.valor_booleano === false) {
                this.ocultarCarga();
                return Swal.fire({
                    title: 'Acceso Restringido',
                    text: 'El acceso para invitados y visitantes ha sido deshabilitado temporalmente por la administración del sistema.',
                    icon: 'warning',
                    confirmButtonColor: '#e11d48'
                });
            }

            const { data: invitadoExistente } = await window.supabaseDB
                .from('invitados')
                .select('id')
                .eq('cedula', String(cedulaInv))
                .maybeSingle();

            if (invitadoExistente) {
                const { error: errUpdate } = await window.supabaseDB.from('invitados')
                    .update({ 
                        nombre_completo: nombreInv, 
                        email: correoInv, 
                        telefono: telefonoInv, 
                        ultimo_ingreso: new Date().toISOString() 
                    })
                    .eq('cedula', String(cedulaInv));
                if(errUpdate) throw errUpdate;
            } else {
                const { error: errInsert } = await window.supabaseDB.from('invitados')
                    .insert([{ 
                        cedula: String(cedulaInv), 
                        nombre_completo: nombreInv, 
                        email: correoInv, 
                        telefono: telefonoInv, 
                        ultimo_ingreso: new Date().toISOString() 
                    }]);
                if(errInsert) throw errInsert;
            }

            window.supabaseDB.from('historial_auditoria').insert([{
                usuario_cedula: String(cedulaInv),
                usuario_nombre: nombreInv,
                modulo: 'Acceso de Invitados',
                accion: 'Ingreso al Sistema',
                detalles: `Motivo: ${motivoInv} | Tel: ${telefonoInv}`
            }]).then(()=>{});

            this.ocultarCarga();

            this.usuario = {
                id: 'inv-' + Date.now(),
                cedula: String(cedulaInv),
                nombre: nombreInv,
                rol: 'Invitado',
                cargo: 'Visitante',
                token: 'supa-inv-' + Date.now()
            };
            localStorage.setItem('sigae_usuario', JSON.stringify(this.usuario));
            this.prepararApp(true);

        } catch (e) {
            this.ocultarCarga();
            console.error(e);
            Swal.fire('Error', 'No se pudo registrar al invitado en la base de datos.', 'error');
        }
    },
    
    cerrarSesion: function() { 
        Swal.fire({ title: '¿Cerrar Sesión?', icon: 'question', showCancelButton: true, confirmButtonColor: '#FF3D00', confirmButtonText: 'Sí, salir', cancelButtonText: 'Cancelar' }).then((result) => { 
            if (result.isConfirmed) { 
                this.auditar('Seguridad y Accesos', 'Cierre de Sesión', 'El usuario cerró sesión manualmente.');
                localStorage.clear(); 
                location.reload(); 
            } 
        }); 
    },
    iniciarControlSesion: function() { if(!localStorage.getItem('sigae_usuario')) return; const resetearTiempo = () => { if(typeof Swal !== 'undefined' && Swal.isVisible() && Swal.getTitle().textContent === '¿Sigues ahí?') return; clearTimeout(this.temporizadorInactivo); clearTimeout(this.temporizadorCierre); this.temporizadorInactivo = setTimeout(() => { this.mostrarAdvertenciaSesion(); }, this.tiempoInactividad); }; window.addEventListener('mousemove', resetearTiempo); window.addEventListener('keypress', resetearTiempo); window.addEventListener('click', resetearTiempo); window.addEventListener('scroll', resetearTiempo); resetearTiempo(); },
    mostrarAdvertenciaSesion: function() { Swal.fire({ title: '¿Sigues ahí?', text: 'Cerraremos la sesión en 1 minuto por inactividad.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0066FF', cancelButtonColor: '#FF3D00', confirmButtonText: 'Seguir activo', cancelButtonText: 'Cerrar sesión', allowOutsideClick: false, allowEscapeKey: false }).then((result) => { clearTimeout(this.temporizadorCierre); if (result.isConfirmed) { this.iniciarControlSesion(); } else { this.cerrarSesionSilenciosa(); } }); this.temporizadorCierre = setTimeout(() => { this.cerrarSesionSilenciosa(); }, this.tiempoAdvertencia); },
    cerrarSesionSilenciosa: function() { if(this.radarIntervalo) clearInterval(this.radarIntervalo); localStorage.clear(); location.reload(); },

    dibujarMenuPrincipal: function() { 
        const contenedorEnlaces = document.getElementById('contenedor-enlaces'); 
        if(!contenedorEnlaces) return; 
        
        let htmlMenu = `<div class="px-4 mb-3"><button onclick="Enrutador.navegar('Inicio')" id="btn-menu-Inicio" class="btn-moderno btn-primario w-100 btn-inicio-sidebar text-start" style="padding: 12px; display:flex; align-items:center;"><i class="bi bi-house-door-fill me-3 fs-5"></i> <span class="texto-menu-ocultable fw-bold">Panel Principal</span></button></div><div class="px-3"><div class="small text-muted fw-bold mb-2 px-3 texto-menu-ocultable" style="font-size:0.75rem; letter-spacing:1px;">MÓDULOS DEL SISTEMA</div>`; 
        
        for (const [nombreCategoria, datosModulo] of Object.entries(this.ModulosSistema)) { 
            let tieneAccesoAlMenosAUno = false;
            for(let i=0; i < datosModulo.items.length; i++) {
                if(this.permiso(datosModulo.items[i].vista, 'ver')) {
                    tieneAccesoAlMenosAUno = true;
                    break;
                }
            }

            if (tieneAccesoAlMenosAUno) {
                const idBoton = `btn-menu-${nombreCategoria.replace(/[\s/()]/g, '-')}`; 
                htmlMenu += `<a href="javascript:void(0)" onclick="Enrutador.navegar('${nombreCategoria}')" id="${idBoton}" class="menu-item d-flex align-items-center mb-1 rounded-3" style="padding: 12px 20px; text-decoration:none;"><i class="bi ${datosModulo.icono} me-3 fs-5" style="color: ${datosModulo.color};"></i><span class="texto-menu-ocultable">${nombreCategoria}</span></a>`; 
            }
        } 
        htmlMenu += `</div>`; 
        contenedorEnlaces.innerHTML = htmlMenu; 
    },

    marcarMenuActivo: function(nombreVista) { document.querySelectorAll('.menu-item').forEach(el => { el.classList.remove('activo'); el.style.background = 'transparent'; el.style.borderLeft = '4px solid transparent'; }); const btnInicio = document.getElementById('btn-menu-Inicio'); if (btnInicio) { btnInicio.classList.replace('btn-secundario', 'btn-primario'); } if (nombreVista === 'Inicio') return; if (btnInicio) { btnInicio.classList.replace('btn-primario', 'btn-secundario'); btnInicio.style.background = 'transparent'; btnInicio.style.color = 'var(--color-primario)'; btnInicio.style.boxShadow = 'none'; btnInicio.style.border = '2px solid var(--color-primario)'; } let categoriaPadre = nombreVista; for (const [padre, datos] of Object.entries(this.ModulosSistema)) { if (datos.items.some(i => i.vista === nombreVista)) { categoriaPadre = padre; break; } } const itemActivo = document.getElementById(`btn-menu-${categoriaPadre.replace(/[\s/()]/g, '-')}`); if (itemActivo) { itemActivo.classList.add('activo'); itemActivo.style.background = 'rgba(0, 102, 255, 0.08)'; itemActivo.style.borderLeft = '4px solid var(--color-primario)'; } },
    
    generarDashboardModulo: function(nombreCategoria) { 
        const modulo = this.ModulosSistema[nombreCategoria]; 
        if(!modulo) return ""; 
        let htmlTarjetas = ''; 
        
        const estilos = `
        <style>
            @keyframes flotar-suave { 0% { transform: translateY(0) translateX(0) scale(1); } 33% { transform: translateY(-15px) translateX(10px) scale(1.02); } 66% { transform: translateY(10px) translateX(-10px) scale(0.98); } 100% { transform: translateY(0) translateX(0) scale(1); } } 
            .burbuja-3d { position: absolute; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%); box-shadow: inset -15px -15px 30px rgba(0, 0, 0, 0.15), inset 15px 15px 30px rgba(255, 255, 255, 0.3), 0 15px 35px rgba(0, 0, 0, 0.1); backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.15); pointer-events: none; } 
            .burbuja-1 { width: 300px; height: 300px; top: -100px; right: -50px; animation: flotar-suave 8s infinite ease-in-out; } 
            .burbuja-2 { width: 200px; height: 200px; bottom: -50px; right: 150px; animation: flotar-suave 12s infinite ease-in-out reverse; } 
            .burbuja-3 { width: 150px; height: 150px; top: 50px; left: 15%; animation: flotar-suave 10s infinite ease-in-out 1s; }
            .banner-padre { border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            
            .tarjeta-modulo-nueva { background: #ffffff; border-radius: 20px; cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; min-height: 190px; text-align: left; }
            .tarjeta-modulo-nueva:hover { transform: translateY(-6px); box-shadow: 0 15px 35px rgba(0,0,0,0.08) !important; }
            .bg-icono-gigante { position: absolute; right: -5%; bottom: -15%; font-size: 10rem; opacity: 0.05; transition: all 0.4s ease; pointer-events: none; line-height: 1; }
            .tarjeta-modulo-nueva:hover .bg-icono-gigante { transform: scale(1.1) rotate(-5deg); opacity: 0.12; }
            .contenido-t { padding: 1.5rem; display: flex; flex-direction: column; height: 100%; position: relative; z-index: 2; }
            .icono-caja { width: 50px; height: 50px; border-radius: 14px; background: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: auto; }
            .titulo-t { font-weight: 800; color: #1e293b; font-size: 1.3rem; margin-top: 2rem; margin-bottom: 0.4rem; line-height: 1.2; }
            .link-t { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; }
            .link-t i { margin-left: 5px; transition: transform 0.3s; }
            .tarjeta-modulo-nueva:hover .link-t i { transform: translateX(5px); }
        </style>`; 
        
        const paleta = [ 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', border: '#bfdbfe', text: '#0066FF' }, 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '#bbf7d0', text: '#198754' }, 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '#fde68a', text: '#d97706' }, 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)', border: '#a5f3fc', text: '#0dcaf0' }, 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', border: '#ddd6fe', text: '#6d28d9' }, 
            { bg: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)', border: '#fecdd3', text: '#e11d48' } 
        ]; 
        
        let asignados = 0;

        modulo.items.forEach((item) => { 
            const tieneAcceso = this.permiso(item.vista, 'ver'); 
            if(tieneAcceso) { 
                const color = paleta[asignados % paleta.length]; 
                htmlTarjetas += `
                <div class="col-12 col-md-6 col-xl-4 animate__animated animate__fadeInUp" style="animation-delay: ${asignados * 0.1}s">
                    <div class="tarjeta-modulo-nueva shadow-sm" style="background: ${color.bg}; border: 2px solid ${color.border};" onclick="Enrutador.navegar('${item.vista}')">
                        <i class="bi ${item.icono} bg-icono-gigante" style="color: ${color.text};"></i>
                        <div class="contenido-t">
                            <div class="icono-caja shadow-sm" style="color: ${color.text}; border: 1px solid ${color.border};">
                                <i class="bi ${item.icono}"></i>
                            </div>
                            <h4 class="titulo-t">${item.vista}</h4>
                            <span class="link-t" style="color: ${color.text};">Entrar al submódulo <i class="bi bi-arrow-right"></i></span>
                        </div>
                    </div>
                </div>`; 
                asignados++;
            } 
        }); 
        
        if(asignados === 0) {
            htmlTarjetas = `<div class="col-12 text-center py-5 mt-4"><div class="bg-light d-inline-block p-4 rounded-circle mb-3"><i class="bi bi-shield-lock-fill text-muted" style="font-size: 3rem;"></i></div><h4 class="fw-bold text-dark">Área Restringida</h4><p class="text-muted">No tiene permisos asignados para visualizar los submódulos de esta categoría.</p></div>`;
        }
        
        return `${estilos}
        <div class="row mb-5 animate__animated animate__fadeInDown">
            <div class="col-12">
                <div class="banner-padre p-4 p-md-5 text-white" style="background: linear-gradient(135deg, ${modulo.color} 0%, rgba(0,0,0,0.4) 150%);">
                    <div class="burbuja-3d burbuja-1"></div>
                    <div class="burbuja-3d burbuja-2"></div>
                    <div class="burbuja-3d burbuja-3"></div>
                    <div class="row align-items-center position-relative z-1">
                        <div class="col-md-9 text-center text-md-start mb-3 mb-md-0">
                            <span class="badge bg-white shadow-sm mb-3 px-3 py-2 fw-bold" style="color: ${modulo.color}; letter-spacing: 1px; font-size: 0.85rem;">
                                <i class="bi ${modulo.icono} me-1"></i> CATEGORÍA DEL SISTEMA
                            </span>
                            <h1 class="fw-bolder mb-2 text-white" style="font-size: 2.8rem; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${nombreCategoria}</h1>
                            <p class="mb-0 fw-bold fs-5" style="color: rgba(255,255,255,0.9);">${modulo.desc}</p>
                        </div>
                        <div class="col-md-3 text-center text-md-end d-none d-md-block">
                            <img src="assets/img/logo.png" alt="Logo Escuela" style="max-height: 130px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row g-4">${htmlTarjetas}</div>`; 
    },
    
    alternarMenu: function() { document.body.classList.toggle('menu-colapsado'); }, 
    alternarMenuMovil: function() { document.body.classList.toggle('menu-abierto'); },
    alternarClave: function(idInput) { const input = document.getElementById(idInput); const icono = input.nextElementSibling.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icono.classList.replace('bi-eye', 'bi-eye-slash'); } else { input.type = 'password'; icono.classList.replace('bi-eye-slash', 'bi-eye'); } },

    auditar: function(modulo, accion, detalles = "") {
        if(!this.usuario) return; 
        
        window.supabaseDB.from('historial_auditoria').insert([{
            usuario_cedula: this.usuario.cedula,
            usuario_nombre: this.usuario.nombre,
            modulo: modulo,
            accion: accion,
            detalles: detalles
        }]).then(({error}) => {
            if(error) console.warn("Error escribiendo en auditoría:", error);
        });
    },

    // =========================================================
    // ✨ MOTOR GLOBAL DE NOTIFICACIONES PUSH ✨
    // =========================================================

    iniciarMotorNotificaciones: function() {
        document.body.addEventListener('click', () => {
            if(!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if(this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }, { once: true });

        if(this.radarIntervalo) clearInterval(this.radarIntervalo);
        this.radarIntervalo = setInterval(() => this.escanearNotificaciones(), 10000);
        this.escanearNotificaciones();
    },

    reproducirTresPitos: function() {
        if (!this.sonidoHabilitado) return;

        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (this.audioCtx.state === 'suspended') return; 

        let ctx = this.audioCtx;

        const tocarPito = (tiempoDeInicio) => {
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(880, tiempoDeInicio);

            gain.gain.setValueAtTime(0, tiempoDeInicio);
            gain.gain.linearRampToValueAtTime(0.5, tiempoDeInicio + 0.02);
            gain.gain.linearRampToValueAtTime(0, tiempoDeInicio + 0.15); 

            osc.start(tiempoDeInicio);
            osc.stop(tiempoDeInicio + 0.15);
        };

        let ahora = ctx.currentTime;
        tocarPito(ahora);                 
        tocarPito(ahora + 0.25);          
        tocarPito(ahora + 0.50);          
    },

    escanearNotificaciones: async function() {
        if (!this.usuario) return;
        
        let miRol = this.usuario.rol ? this.usuario.rol.split(' ')[0] : '';
        let miCedula = String(this.usuario.cedula || '');

        let inicioDiaLocal = this.obtenerFechaReal();
        inicioDiaLocal.setHours(0, 0, 0, 0); 
        let inicioDiaUTC = inicioDiaLocal.toISOString();

        try {
            const { data, error } = await window.supabaseDB.from('notificaciones')
                .select('*')
                .eq('leido', false)
                .gte('created_at', inicioDiaUTC) 
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            let misNotificaciones = (data || []).filter(n => {
                let paraMiRol = n.roles_destino && n.roles_destino.includes(miRol);
                let paraMiCedula = n.usuarios_destino && n.usuarios_destino.includes(miCedula);
                return paraMiRol || paraMiCedula;
            });

            let hayNuevas = false;
            misNotificaciones.forEach(n => {
                if (!this.alertasActivas.find(a => a.id_notificacion === n.id_notificacion)) {
                    hayNuevas = true;
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: n.titulo, text: n.mensaje, showConfirmButton: false, timer: 6000 });
                }
            });

            this.alertasActivas = misNotificaciones;

            if (hayNuevas) {
                this.reproducirTresPitos();
            }
            
            this.actualizarBandejaUI();
        } catch(e) { console.log("Error de notificaciones: ", e.message); }
    },

    actualizarBandejaUI: function() {
        let badge = document.getElementById('badge-notificaciones');
        let lista = document.getElementById('lista-notificaciones');
        if (!badge || !lista) return;

        if (this.alertasActivas.length > 0) {
            badge.style.display = 'flex'; badge.style.alignItems = 'center'; badge.style.justifyContent = 'center';
            badge.style.fontSize = '0.65rem'; badge.style.fontWeight = 'bold';
            badge.innerText = this.alertasActivas.length;
            
            badge.classList.remove('animate__animated', 'animate__heartBeat');
            void badge.offsetWidth; 
            badge.classList.add('animate__animated', 'animate__heartBeat');

            let html = '';
            this.alertasActivas.forEach(n => {
                let fecha = new Date(n.created_at).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});
                html += `<div class="p-3 border-bottom bg-white hover-efecto" style="border-left: 4px solid #0066FF;">
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 0.85rem;">${n.titulo}</h6>
                    <p class="small text-muted mb-1" style="font-size: 0.75rem; line-height: 1.3;">${n.mensaje}</p>
                    <div class="text-end"><small class="text-secondary fw-bold" style="font-size:0.65rem;"><i class="bi bi-clock me-1"></i>${fecha}</small></div>
                </div>`;
            });
            lista.innerHTML = html;
        } else {
            badge.style.display = 'none';
            lista.innerHTML = '<div class="p-4 text-center text-muted small"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No tienes notificaciones recientes</div>';
        }
    },

    alternarPanelNotificaciones: function() {
        let panel = document.getElementById('panel-notificaciones');
        if(!panel) return;
        if (panel.classList.contains('d-none')) {
            panel.classList.remove('d-none'); panel.classList.remove('animate__fadeOutUp'); panel.classList.add('animate__fadeInDown');
        } else {
            panel.classList.replace('animate__fadeInDown', 'animate__fadeOutUp');
            setTimeout(() => panel.classList.add('d-none'), 300);
        }
    },

    marcarNotificacionesLeidas: async function() {
        if(this.alertasActivas.length === 0) return;
        let ids = this.alertasActivas.map(n => n.id_notificacion);
        
        if(typeof this.mostrarCarga === 'function') this.mostrarCarga();
        await window.supabaseDB.from('notificaciones').update({leido: true}).in('id_notificacion', ids);
        if(typeof this.ocultarCarga === 'function') this.ocultarCarga();
        
        this.alertasActivas = []; this.actualizarBandejaUI(); this.alternarPanelNotificaciones();
        Swal.fire({toast:true, position:'top-end', icon:'success', title:'Bandeja limpia', showConfirmButton:false, timer:2000});
    },

    toggleSonidoNotificaciones: function() {
        this.sonidoHabilitado = !this.sonidoHabilitado;
        localStorage.setItem('sigae_sonido_notif', this.sonidoHabilitado);
        let btn = document.getElementById('btn-toggle-sonido'); if(!btn) return;
        if(this.sonidoHabilitado) { 
            btn.innerHTML = '<i class="bi bi-volume-up-fill fs-5"></i>'; btn.classList.remove('text-danger'); 
            
            this.reproducirTresPitos();

            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Sonido activado', showConfirmButton: false, timer: 1500});
        } else { 
            btn.innerHTML = '<i class="bi bi-volume-mute-fill fs-5"></i>'; btn.classList.add('text-danger'); 
            Swal.fire({toast: true, position: 'top-end', icon: 'info', title: 'Notificaciones silenciadas', showConfirmButton: false, timer: 1500});
        }
    }
};

window.verificarExpedientePendiente = async function() {
    let usr = window.Aplicacion.usuario;
    let rolesExcluidos = ['Estudiante', 'Representante', 'Visitante', 'Invitado'];
    
    if (!usr || rolesExcluidos.includes(usr.rol)) return;

    try {
        const { data, error } = await window.supabaseDB
            .from('expedientes_docentes')
            .select('id')
            .eq('cedula', usr.cedula);

        if (!error && (!data || data.length === 0)) {
            Swal.fire({
                title: '¡Aviso Importante!',
                text: 'Aún no has actualizado tu Expediente de Personal (Datos, Familia, Salud y Corporativo). Por favor, ingresa al módulo para completar tu perfil.',
                icon: 'warning',
                confirmButtonColor: '#0ea5e9',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="bi bi-person-vcard me-2"></i>Ir a Mi Expediente',
                showCancelButton: true,
                cancelButtonText: 'Más tarde',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.assign('#Mi-Expediente');
                    setTimeout(() => {
                        let enlaces = document.querySelectorAll('a, .nav-link, .menu-item');
                        for (let el of enlaces) {
                            if (el.innerText.includes('Mi Expediente')) {
                                el.click();
                                break;
                            }
                        }
                    }, 100);
                }
            });
        }
    } catch (e) { console.log("Error al verificar el expediente", e); }
};

window._alertaExpedienteMostrada = false;

setInterval(() => {
    let usr = window.Aplicacion.usuario;
    
    if (usr && !window._alertaExpedienteMostrada) {
        window._alertaExpedienteMostrada = true; 
        
        setTimeout(() => {
            if(!window.location.hash.includes('Mi-Expediente')) {
                window.verificarExpedientePendiente();
            }
        }, 2000);
    }
    
    if (!usr) {
        window._alertaExpedienteMostrada = false;
    }
}, 1000); 
document.addEventListener('DOMContentLoaded', () => { if(window.Aplicacion) window.Aplicacion.init(); });