/**
 * MÓDULO: VINCULACIÓN ESTUDIANTIL
 * Crea el perfil inamovible del estudiante y lo conecta con la cuenta de su representante.
 */

window.ModAsignacion = {
    estudiantesFallidos: [],

    init: function() {
        this.aplicarEventosFormateo();
    },

    aplicarEventosFormateo: function() {
        let camposTexto = ['asig-nombres', 'asig-apellidos'];
        camposTexto.forEach(id => {
            let el = document.getElementById(id);
            if(el) el.addEventListener('blur', e => e.target.value = this.formatearTexto(e.target.value));
        });
        
        let elEst = document.getElementById('asig-cedula-est');
        if (elEst) {
            elEst.addEventListener('input', e => {
                let val = e.target.value.replace(/\D/g, '');
                if(val.length > 12) val = val.substring(0, 12);
                e.target.value = val;
            });
        }

        let elRep = document.getElementById('asig-cedula-rep');
        if (elRep) {
            elRep.addEventListener('input', e => {
                let val = e.target.value.replace(/\D/g, '');
                if(val.length > 9) val = val.substring(0, 9);
                e.target.value = val;
            });
        }
    },

    formatearTexto: function(str) {
        if (!str) return "";
        let palabras = str.toLowerCase().trim().split(/\s+/);
        let conectivos = ["de", "del", "la", "las", "el", "los", "y", "e", "en", "con", "a", "para", "por", "un", "una", "unos", "unas", "al"];
        
        let resultado = palabras.map((p, i) => {
            let limpia = p.replace(/[.,]/g, ''); 
            if (i > 0 && conectivos.includes(limpia)) return p;
            if (p.length > 0) return p.charAt(0).toUpperCase() + p.slice(1);
            return "";
        });
        return resultado.join(" ");
    },

    // ✨ BÚSQUEDA EN VIVO: REPRESENTANTE ✨
    buscarRepresentante: async function(cedula) {
        const label = document.getElementById('asig-rep-nombre');
        const icon = document.getElementById('asig-rep-icono');
        if(!cedula || cedula.length < 5) {
            label.innerText = '';
            icon.innerHTML = '<i class="bi bi-search text-muted"></i>';
            return;
        }
        
        icon.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"></div>';
        
        try {
            const { data, error } = await window.supabaseDB.from('usuarios')
                .select('nombre_completo, rol')
                .eq('cedula', String(cedula).trim())
                .maybeSingle();
                
            if (data) {
                icon.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
                label.className = 'small fw-bold mt-1 text-success d-block';
                label.innerText = `✅ Usuario encontrado: ${data.nombre_completo} (${data.rol})`;
            } else {
                icon.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
                label.className = 'small fw-bold mt-1 text-danger d-block';
                label.innerText = '❌ El usuario no existe en la base de datos oficial.';
            }
        } catch(e) {
            icon.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i>';
        }
    },

    // ✨ BÚSQUEDA EN VIVO: ESTUDIANTE ✨
    verificarEstudiante: async function(cedula) {
        const label = document.getElementById('asig-est-status');
        const icon = document.getElementById('asig-est-icono');
        if(!cedula || cedula.length < 4) { 
            label.innerText = ''; 
            icon.innerHTML = '<i class="bi bi-search text-muted"></i>';
            return; 
        }
        
        icon.innerHTML = '<div class="spinner-border spinner-border-sm text-success" role="status"></div>';

        try {
            const { data } = await window.supabaseDB.from('expedientes')
                .select('nombres, apellidos')
                .eq('cedula_escolar', String(cedula).trim())
                .maybeSingle();
                
            if (data) {
                icon.innerHTML = '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
                label.className = 'small fw-bold mt-1 text-danger d-block';
                label.innerText = `⚠️ Cédula ya registrada a nombre de: ${data.nombres} ${data.apellidos}`;
            } else {
                icon.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
                label.className = 'small fw-bold mt-1 text-success d-block';
                label.innerText = '✅ Cédula disponible.';
            }
        } catch(e) {
            icon.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i>';
        }
    },

    guardarIndividual: async function() {
        let n = document.getElementById('asig-nombres').value.trim();
        let a = document.getElementById('asig-apellidos').value.trim();
        let ce = document.getElementById('asig-cedula-est').value.trim();
        let cr = document.getElementById('asig-cedula-rep').value.trim();

        if(!n || !a || !ce || !cr) return Swal.fire('Atención', 'Todos los campos son obligatorios.', 'warning');

        window.Aplicacion.mostrarCarga();
        
        try {
            const { data: rep } = await window.supabaseDB.from('usuarios').select('cedula').eq('cedula', cr).maybeSingle();
            if (!rep) {
                window.Aplicacion.ocultarCarga();
                return Swal.fire('Error', 'La cédula del representante no se encuentra registrada en el sistema.', 'error');
            }

            const { data: est } = await window.supabaseDB.from('expedientes').select('cedula_escolar').eq('cedula_escolar', ce).maybeSingle();
            if (est) {
                window.Aplicacion.ocultarCarga();
                return Swal.fire('Error', 'Ya existe un estudiante con esa cédula inscrito en el sistema.', 'error');
            }

            // Guardamos solo los datos estructurales del individuo
            const payload = {
                cedula_escolar: ce,
                nombres: n,
                apellidos: a,
                rep_cedula: cr,
                estatus: 'Activo'
            };

            const { error: insertErr } = await window.supabaseDB.from('expedientes').insert([payload]);
            if (insertErr) throw insertErr;

            window.Aplicacion.ocultarCarga();
            window.Aplicacion.auditar('Gestión Estudiantil', 'Vinculación', `Se vinculó al estudiante C.I: ${ce} con el representante C.I: ${cr}`);

            Swal.fire({ title: '¡Vinculado!', text: 'El estudiante fue registrado exitosamente.', icon: 'success', confirmButtonColor: '#10B981'
            }).then(() => {
                document.getElementById('asig-nombres').value = ''; document.getElementById('asig-apellidos').value = '';
                document.getElementById('asig-cedula-est').value = ''; document.getElementById('asig-cedula-rep').value = '';
                document.getElementById('asig-est-status').innerText = ''; document.getElementById('asig-rep-nombre').innerText = '';
                document.getElementById('asig-est-icono').innerHTML = '<i class="bi bi-search text-muted"></i>';
                document.getElementById('asig-rep-icono').innerHTML = '<i class="bi bi-search text-muted"></i>';
            });

        } catch(e) {
            window.Aplicacion.ocultarCarga();
            console.error(e);
            Swal.fire('Error', 'Falla de conexión al registrar al estudiante.', 'error');
        }
    },

    descargarPlantillaCSV: function() {
        let csvContent = "Nombres;Apellidos;Cedula_Estudiante;Cedula_Representante\nJuan Carlos;Perez Gomez;12018788707;18788707\n";
        let blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "Plantilla_Vinculacion.csv"); document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    },

    procesarCSV: function() {
        let input = document.getElementById('asig-file-csv');
        if(!input.files[0]) return Swal.fire('Atención', 'Debe adjuntar un archivo CSV.', 'warning');

        let reader = new FileReader();
        reader.onload = (e) => {
            let lineas = e.target.result.split(/\r\n|\n/).filter(l => l.trim() !== "");
            if(lineas.length < 2) return Swal.fire('Error', 'El archivo no contiene datos.', 'error');

            let estudiantesMasivos = [];
            for(let i = 1; i < lineas.length; i++) {
                let col = lineas[i].split(lineas[i].includes(';') ? ';' : ',');
                // Verificamos que al menos existan las 4 columnas básicas
                if(col.length >= 4) {
                    estudiantesMasivos.push({
                        nombres: this.formatearTexto(col[0]),
                        apellidos: this.formatearTexto(col[1]),
                        cedula_escolar: col[2].replace(/\D/g, '').substring(0, 12),
                        rep_cedula: col[3].replace(/\D/g, '').substring(0, 9),
                        estatus: 'Activo'
                    });
                }
            }

            if(estudiantesMasivos.length === 0) return Swal.fire('Error', 'No se detectaron datos válidos con la estructura correcta.', 'error');
            this.enviarLoteASupabase(estudiantesMasivos, input);
        };
        reader.readAsText(input.files[0], 'UTF-8');
    },

    enviarLoteASupabase: async function(estudiantesMasivos, inputHTML) {
        window.Aplicacion.mostrarCarga();
        try {
            const { data: usuarios } = await window.supabaseDB.from('usuarios').select('cedula');
            let cedulasReps = new Set();
            if (usuarios) usuarios.forEach(u => cedulasReps.add(String(u.cedula)));

            let exitosos = 0;
            let fallidos = [];
            let inserts = [];

            estudiantesMasivos.forEach(est => {
                if (cedulasReps.has(String(est.rep_cedula))) {
                    inserts.push(est);
                    exitosos++;
                } else {
                    fallidos.push(est);
                }
            });

            if (inserts.length > 0) {
                const { error } = await window.supabaseDB.from('expedientes').insert(inserts);
                if (error) throw error;
                window.Aplicacion.auditar('Gestión Estudiantil', 'Vinculación Masiva', `Se vincularon ${exitosos} estudiantes.`);
            }

            window.Aplicacion.ocultarCarga();
            
            document.getElementById('res-exitosos').innerText = exitosos;
            document.getElementById('res-fallidos').innerText = fallidos.length;
            document.getElementById('asig-resultados').style.display = 'block';
            inputHTML.value = ""; 
            
            Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Proceso Finalizado', showConfirmButton:false, timer:2000 });

        } catch(e) {
            window.Aplicacion.ocultarCarga();
            Swal.fire('Error', 'Falla al insertar los registros en la Nube.', 'error');
        }
    }
};

window.init_Vincular_Estudiante = function() { window.ModAsignacion.init(); };