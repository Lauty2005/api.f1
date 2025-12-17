// --- NAVEGACIÓN (TABS) ---
function showTab(tabName) {
    // 1. Guardar en memoria cuál es la pestaña actual
    localStorage.setItem('f1_last_tab', tabName); 

    // 2. Ocultar todas
    const contents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = 'none';
        contents[i].classList.remove('active'); // Por si usas clases
    }

    // 3. Desactivar botones
    const btns = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        // Un pequeño truco para resaltar el botón correcto
        if(btns[i].textContent.toLowerCase().includes(translateTab(tabName))) {
           btns[i].classList.add('active');
        }
        // O más fácil, asignales ID a los botones en el HTML (ej: btn-drivers)
        // Pero dejémoslo simple:
    }
    
    // 4. Mostrar la elegida
    const selected = document.getElementById(`tab-${tabName}`);
    if (selected) {
        selected.style.display = 'block';
        selected.classList.add('active');
    }

    // 5. Cargar datos específicos si es necesario
    if (tabName === 'drivers') loadDrivers();
    if (tabName === 'constructors') loadConstructors();
    if (tabName === 'circuits') loadCircuits();
    if (tabName === 'results') { loadResults(); populateSelectors(); }
    if (tabName === 'standings') calculateStandings();
}

// Helper simple para machear el texto del botón con el ID (opcional si tus botones ya tienen IDs)
function translateTab(tab) {
    if(tab === 'drivers') return 'pilotos';
    if(tab === 'constructors') return 'constructores';
    if(tab === 'circuits') return 'circuitos';
    if(tab === 'results') return 'resultados';
    if(tab === 'standings') return 'clasificación';
    return '';
}

const API_BASE = 'http://127.0.0.1:8000/api';
let editingDriverId = null;
const teamColors = { "Red Bull": "#0600EF", "Mercedes": "#00D2BE", "Ferrari": "#DC0000", "McLaren": "#FF8700", "Aston Martin": "#006F62", "Default": "#333" };

document.addEventListener('DOMContentLoaded', () => {
    loadDrivers(); loadConstructors(); loadCircuits(); loadResults(); populateSelectors();
});

// --- FUNCIÓN DE BÚSQUEDA (NUEVO) ---
function filterGrid(inputId, gridId) {
    // 1. Obtener texto escrito
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();

    // 2. Obtener todas las tarjetas de la grilla correspondiente
    const grid = document.getElementById(gridId);
    const cards = grid.getElementsByClassName('driver-card');

    // 3. Recorrer tarjetas y ocultar/mostrar
    for (let i = 0; i < cards.length; i++) {
        // Obtenemos todo el texto dentro de la tarjeta
        const txtValue = cards[i].textContent || cards[i].innerText;

        // Si el texto coincide con la búsqueda, mostramos, si no, ocultamos
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            cards[i].style.display = "";
        } else {
            cards[i].style.display = "none";
        }
    }
}

// --- FUNCIÓN DE BÚSQUEDA PARA TABLAS (NUEVO) ---
function filterTable(inputId, tableBodyId) {
    // 1. Obtener texto
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();

    // 2. Obtener las filas de la tabla
    const tbody = document.getElementById(tableBodyId);
    const rows = tbody.getElementsByTagName('tr');

    // 3. Recorrer y ocultar
    for (let i = 0; i < rows.length; i++) {
        // Obtenemos todo el texto de la fila (Circuito + Pos + Piloto + Equipo)
        const textValue = rows[i].textContent || rows[i].innerText;

        if (textValue.toUpperCase().indexOf(filter) > -1) {
            rows[i].style.display = ""; // Mostrar
        } else {
            rows[i].style.display = "none"; // Ocultar
        }
    }
}

// --- CLASIFICACIONES (Versión Limpia, sin gráficos) ---
async function calculateStandings() {
    const res = await fetch(`${API_BASE}/results`);
    const results = await res.json();

    const driverPoints = {};
    const teamPoints = {};

    results.forEach(r => {
        const dId = r.driver.id;
        if (!driverPoints[dId]) driverPoints[dId] = { name: r.driver.last_name, team: r.driver.team, pts: 0 };
        driverPoints[dId].pts += r.points;

        const teamName = r.driver.team;
        if (!teamPoints[teamName]) teamPoints[teamName] = 0;
        teamPoints[teamName] += r.points;
    });

    const sortedDrivers = Object.values(driverPoints).sort((a, b) => b.pts - a.pts);
    const sortedTeams = Object.keys(teamPoints).map(key => ({ name: key, pts: teamPoints[key] })).sort((a, b) => b.pts - a.pts);

    const dBody = document.getElementById('standings-drivers'); dBody.innerHTML = '';
    sortedDrivers.forEach((d, i) => dBody.innerHTML += `<tr><td style="font-weight:bold; color:#e10600;">${i + 1}</td><td>${d.name} <small>(${d.team})</small></td><td><strong>${d.pts}</strong></td></tr>`);

    const cBody = document.getElementById('standings-constructors'); cBody.innerHTML = '';
    sortedTeams.forEach((t, i) => cBody.innerHTML += `<tr><td style="font-weight:bold;">${i + 1}</td><td>${t.name}</td><td><strong>${t.pts}</strong></td></tr>`);
}

// --- RESULTADOS (Modificado para Sprints) ---
async function loadResults() {
    const res = await fetch(`${API_BASE}/results`);
    const results = await res.json();
    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '';

    results.forEach(r => {
        let badge = r.race_type === 'Sprint' ? '<span style="background:#FFD700; padding:2px 5px; border-radius:4px; font-size:0.8rem;">⚡ Sprint</span>' : '🏁 Race';

        tbody.innerHTML += `
            <tr>
                <td>${badge}</td>
                <td><strong>${r.circuit.name}</strong></td>
                <td>P${r.position}</td>
                <td style="color:green; font-weight:bold;">+${r.points}</td>
                <td>${r.driver.last_name}</td>
                <td><button class="btn-delete" style="width:auto; padding:5px;" onclick="deleteResult(${r.id})">X</button></td>
            </tr>
        `;
    });
}

const resForm = document.getElementById('resultForm');
if (resForm) {
    resForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            race_type: document.getElementById('resType').value, // <--- NUEVO CAMPO
            circuit_id: parseInt(document.getElementById('resCircuit').value),
            driver_id: parseInt(document.getElementById('resDriver').value),
            position: parseInt(document.getElementById('resPosition').value)
        };
        await fetch(`${API_BASE}/results`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        resForm.reset();
        loadResults();
    });
}

// --- UTILIDADES ---
function getTeamColor(teamName) {
    let color = teamColors["Default"];
    Object.keys(teamColors).forEach(key => { if (teamName && teamName.includes(key)) color = teamColors[key]; });
    return color;
}

// --- LÓGICA DE SELECTORES (Llenar Dropdowns) ---
async function populateSelectors() {
    console.log("🔄 Actualizando listas desplegables...");

    try {
        // 1. Llenar Circuitos
        const resC = await fetch(`${API_BASE}/circuits`);
        if (resC.ok) {
            const circuits = await resC.json();
            const selC = document.getElementById('resCircuit');
            // Guardamos la selección actual si existe para no perderla al refrescar
            const currentVal = selC.value;

            selC.innerHTML = '<option value="">Selecciona el Circuito...</option>';
            circuits.forEach(c => {
                // Mostramos Nombre + País + Hora de Carrera
                selC.innerHTML += `<option value="${c.id}">🏁 ${c.name} (${c.country}) - ${c.race_time}</option>`;
            });

            if (currentVal) selC.value = currentVal;
        }

        // 2. Llenar Pilotos
        const resD = await fetch(`${API_BASE}/drivers`);
        if (resD.ok) {
            const drivers = await resD.json();
            const selD = document.getElementById('resDriver');
            const currentVal = selD.value;

            selD.innerHTML = '<option value="">Selecciona el Piloto...</option>';
            drivers.forEach(d => {
                selD.innerHTML += `<option value="${d.id}">${d.number} - ${d.last_name} (${d.team})</option>`;
            });

            if (currentVal) selD.value = currentVal;
        }
    } catch (error) {
        console.error("Error llenando selectores:", error);
    }
}

async function deleteResult(id) {
    const result = await confirmDelete('¿Anular Resultado?', 'Se borrarán los puntos otorgados.');

    if (result.isConfirmed) {
        try {
            await fetch(`${API_BASE}/results/${id}`, { method: 'DELETE' });

            // Mensaje pequeño tipo "Toast" arriba a la derecha para resultados
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: 'Resultado eliminado' });

            loadResults();
            // Si tienes gráficos activados: calculateStandings();
        } catch (error) {
            Swal.fire('Error', 'Fallo al borrar.', 'error');
        }
    }
}

// ==========================================
// FUNCIÓN HELPER DE BORRADO (REUTILIZABLE)
// ==========================================
async function confirmDelete(title, text) {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e10600', // Rojo F1
        cancelButtonColor: '#333',     // Gris Oscuro
        confirmButtonText: '¡Sí, borrar!',
        cancelButtonText: 'Cancelar',
        background: '#fff',
        color: '#000'
    });
}

// --- RESTO (Pilotos, Constructores, Circuitos - Carga estándar) ---
// ================= PILOTOS =================
async function loadDrivers() {
    const res = await fetch(`${API_BASE}/drivers`);
    const drivers = await res.json();
    const grid = document.getElementById('drivers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    drivers.forEach(d => {
        const json = JSON.stringify(d).replace(/"/g, '&quot;');
        const color = getTeamColor(d.team);
        // Usamos una imagen por defecto si no tiene foto
        const imageUrl = d.image_url || "https://via.placeholder.com/150x150.png?text=No+Photo";

        grid.innerHTML += `
            <div class="driver-card" style="border-top:4px solid ${color}">
                <div class="card-header">
                    <span style="color:${color}">${d.team}</span>
                    <span>#${d.number}</span>
                </div>
                
                <div class="driver-photo-container">
                    <img src="${imageUrl}" alt="${d.first_name}" class="driver-photo" style="border-color:${color}">
                </div>

                <div class="driver-info">
                    <h3>${d.first_name} <span style="font-weight:900">${d.last_name}</span></h3>
                    <p style="color:#666; font-size:0.9rem;">🚩 ${d.country}</p>
                </div>

                <div class="card-actions" style="border-top:1px solid #eee; padding-top:15px;">
                    
                    <button class="btn-action btn-profile" 
                            onclick="openDriverProfile(${json})" 
                            data-tooltip="Ver Perfil"> <i class="fa-solid fa-user"></i>
                    </button>
                    
                    <button class="btn-action btn-edit-icon" 
                            onclick="startEditingDriver(${json})" 
                            data-tooltip="Editar Piloto">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    
                    <button class="btn-action btn-delete-icon" 
                            onclick="deleteDriver(${d.id})" 
                            data-tooltip="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
    });
}

async function loadConstructors() {
    try {
        const res = await fetch(`${API_BASE}/constructors`);
        if (!res.ok) return;
        const teams = await res.json();
        const grid = document.getElementById('constructors-grid');
        if (!grid) return;
        grid.innerHTML = '';

        teams.forEach(team => {
            let accentColor = teamColors["Default"];
            Object.keys(teamColors).forEach(key => {
                if (team.name.includes(key)) accentColor = teamColors[key];
            });

            grid.innerHTML += `
                <div class="driver-card" style="border-top: 4px solid ${accentColor}">
                    <div class="card-header">
                        <span style="font-weight:900; color:${accentColor}; font-size:1.2rem;">${team.name.toUpperCase()}</span>
                    </div>
                    
                    <div style="text-align:center; padding: 15px;">
                        <img src="${team.image_url}" alt="${team.name}" class="team-logo">
                    </div>

                    <div class="driver-info" style="margin-top:5px;">
                        <p><strong>Jefe:</strong> ${team.principal}</p>
                        <p><strong>Base:</strong> 🏭 ${team.base_country}</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-delete" onclick="deleteConstructor(${team.id})">Disolver Equipo</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error("Error Constructores:", e); }
}

const consForm = document.getElementById('constructorForm');
if (consForm) {
    consForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Crear FormData
        const formData = new FormData();
        formData.append('name', document.getElementById('consName').value);
        formData.append('principal', document.getElementById('consPrincipal').value);
        formData.append('base_country', document.getElementById('consBase').value);
        // 2. Adjuntar el archivo real
        formData.append('image', document.getElementById('consImage').files[0]);

        // 3. Enviar (SIN header Content-Type, el navegador lo pone solo)
        await fetch(`${API_BASE}/constructors`, {
            method: 'POST',
            body: formData
        });

        consForm.reset();
        loadConstructors();
    });
}

async function deleteConstructor(id) {
    const result = await confirmDelete('¿Disolver Escudería?', 'Se borrará el equipo y sus datos.');

    if (result.isConfirmed) {
        try {
            await fetch(`${API_BASE}/constructors/${id}`, { method: 'DELETE' });
            await Swal.fire('¡Eliminado!', 'La escudería ha cerrado sus puertas.', 'success');
            loadConstructors();
        } catch (error) {
            Swal.fire('Error', 'No se pudo borrar la escudería.', 'error');
        }
    }
}

// ================= CIRCUITOS =================
async function loadCircuits() {
    try {
        const res = await fetch(`${API_BASE}/circuits`);
        if (!res.ok) return;
        const circuits = await res.json();
        const grid = document.getElementById('circuits-grid');
        if (!grid) return;
        grid.innerHTML = '';

        circuits.forEach(c => {
            // Prácticas
            let fpHtml = '';
            if (c.fp1_time && c.fp1_time !== "N/A") fpHtml += `<li><span>FP1</span> <strong>${c.fp1_time}</strong></li>`;
            if (c.fp2_time && c.fp2_time !== "N/A") fpHtml += `<li><span>FP2</span> <strong>${c.fp2_time}</strong></li>`;
            if (c.fp3_time && c.fp3_time !== "N/A") fpHtml += `<li><span>FP3</span> <strong>${c.fp3_time}</strong></li>`;
            if (fpHtml === '') fpHtml = '<li style="color:#aaa; font-style:italic;">Sin prácticas</li>';

            // Sprint & Sprint Qualy
            let sprintHtml = '';
            if (c.sprint_time && c.sprint_time !== "N/A" && c.sprint_time !== "") {
                // Si hay Sprint, mostramos también su clasificación si existe
                if (c.sprint_qualifying_time && c.sprint_qualifying_time !== "N/A") {
                    sprintHtml += `<li style="color:#d4af37; background: #fffbe6;"><span>⏱️ Sprint Shootout</span> <strong>${c.sprint_qualifying_time}</strong></li>`;
                }
                sprintHtml += `<li style="color:#d4af37; background: #fffbe6;"><span>⚡ Sprint Race</span> <strong>${c.sprint_time}</strong></li>`;
            }

            grid.innerHTML += `
                <div class="driver-card" style="border-top: 4px solid #4CAF50">
                    <div class="card-header">
                        <span style="color:#4CAF50; font-weight:900;">GP</span>
                        <span class="driver-number" style="font-size:1rem;">${c.laps} Laps</span>
                    </div>
                    
                    <div style="text-align:center; padding: 10px; background:#fff;">
                        <img src="${c.image_url}" alt="${c.name}" class="circuit-map">
                    </div>

                    <div class="driver-info">
                        <h3 class="name">${c.name.toUpperCase()}</h3>
                        <p class="country">🚩 ${c.country}</p>
                        
                        <div class="circuit-agenda">
                            <h5 style="margin:10px 0 5px; color:#666; border-bottom:1px solid #eee;">Cronograma</h5>
                            <ul class="schedule-list">
                                ${fpHtml}
                                ${sprintHtml}
                                <li style="margin-top:5px; border-top:1px solid #eee;"><span>⏱️ Qualy (Principal)</span> <strong>${c.qualifying_time}</strong></li>
                                <li style="color:#e10600; font-weight:bold;"><span>🏁 Carrera</span> <span>${c.race_time}</span></li>
                            </ul>
                        </div>
                        <p style="font-size:0.8rem; color:#888; margin-top:10px; text-align:right;">${c.length_km} km</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-delete" onclick="deleteCircuit(${c.id})">Eliminar</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error("Error Circuitos:", e); }
}

// Listener del formulario de Circuitos
const circForm = document.getElementById('circuitForm');

if (circForm) {
    circForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. OBTENER VALORES CRUDOS (Para validar)
        const sprintTime = document.getElementById('circSprint').value;
        const sprintQualy = document.getElementById('circSprintQualy').value;

        const fp1 = document.getElementById('circFP1').value;
        const fp2 = document.getElementById('circFP2').value;
        const fp3 = document.getElementById('circFP3').value;

        // 2. VALIDACIÓN LÓGICA (TUS REGLAS DE ORO) 🛡️

        // ESCENARIO A: Fin de semana SPRINT
        if (sprintTime) {
            // Regla: Si hay Sprint, debe haber Sprint Qualy y FP1
            if (!sprintQualy) {
                alert("⚠️ Error de Formato Sprint:\nSi hay Carrera Sprint, es OBLIGATORIO definir la 'Clasificación Sprint'.");
                return; // Detiene la función, no guarda nada.
            }
            if (!fp1) {
                alert("⚠️ Error de Formato Sprint:\nUn fin de semana Sprint necesita al menos la 'FP1'.");
                return;
            }
            // (Opcional) Podríamos avisar que FP2 y FP3 no deberían estar, pero lo dejamos pasar.
        }

        // ESCENARIO B: Fin de semana ESTÁNDAR (Sin Sprint)
        else {
            // Regla: Si NO hay Sprint, deben estar las 3 Prácticas
            if (!fp1 || !fp2 || !fp3) {
                alert("⚠️ Error de Formato Estándar:\nSi no es fin de semana Sprint, debes cargar las 3 Prácticas Libres (FP1, FP2 y FP3).");
                return;
            }
        }

        // 3. PREPARAR DATOS (Si pasó la validación)
        const getTime = (id) => {
            const val = document.getElementById(id).value;
            return val ? val : "N/A";
        };

        const formData = new FormData();
        formData.append('name', document.getElementById('circName').value);
        formData.append('country', document.getElementById('circCountry').value);
        formData.append('length_km', document.getElementById('circLength').value);
        formData.append('laps', document.getElementById('circLaps').value);

        formData.append('fp1_time', getTime('circFP1'));
        formData.append('fp2_time', getTime('circFP2'));
        formData.append('fp3_time', getTime('circFP3'));
        formData.append('qualifying_time', getTime('circQualy'));
        formData.append('sprint_qualifying_time', getTime('circSprintQualy'));
        formData.append('sprint_time', getTime('circSprint'));
        formData.append('race_time', getTime('circRace'));

        // El Archivo
        formData.append('image', document.getElementById('circImage').files[0]);

        await fetch(`${API_BASE}/circuits`, {
            method: 'POST',
            body: formData
        });

        circForm.reset();
        loadCircuits();
        populateSelectors();
    });
}

// Listeners Formularios CRUD (Pilotos, etc)
const driverForm = document.getElementById('driverForm');
if (driverForm) {
    driverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('first_name', document.getElementById('firstName').value);
        formData.append('last_name', document.getElementById('lastName').value);
        formData.append('team', document.getElementById('team').value);
        formData.append('country', document.getElementById('country').value);
        formData.append('number', document.getElementById('number').value);
        formData.append('birth_date', document.getElementById('birthDate').value);

        // Agregar la imagen
        const imageFile = document.getElementById('driverImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        let url = `${API_BASE}/drivers`;
        // IMPORTANTE: Por ahora, para simplificar, solo permitiremos CREAR con foto.
        // Si es edición, usaremos PUT sin foto.
        if (editingDriverId) {
            // Lógica de edición sin foto (opcional por ahora)
            url += `/${editingDriverId}`;
            // Para editar con foto se requeriría otro endpoint o lógica en el backend.
            // Mantengamoslo simple: Solo Crear sube foto.
        }

        await fetch(url, { method: 'POST', body: formData });

        resetDriverForm();
        loadDrivers();
        populateSelectors();
    });
}

window.startEditingDriver = function (d) {
    document.getElementById('firstName').value = d.first_name; document.getElementById('lastName').value = d.last_name;
    document.getElementById('team').value = d.team; document.getElementById('country').value = d.country;
    document.getElementById('number').value = d.number; document.getElementById('birthDate').value = d.birth_date;
    editingDriverId = d.id; window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.resetDriverForm = function () { if (dForm) dForm.reset(); editingDriverId = null; };

async function deleteDriver(id) {
    const result = await confirmDelete('¿Despedir Piloto?', 'Esta acción no se puede deshacer.');

    if (result.isConfirmed) {
        try {
            await fetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' });
            await Swal.fire('¡Eliminado!', 'El piloto ha sido eliminado de la grilla.', 'success');
            loadDrivers();
            populateSelectors();
        } catch (error) {
            Swal.fire('Error', 'No se pudo borrar el piloto.', 'error');
        }
    }
}

async function deleteCircuit(id) {
    const result = await confirmDelete('¿Demoler Circuito?', 'El trazado será eliminado del calendario.');

    if (result.isConfirmed) {
        try {
            await fetch(`${API_BASE}/circuits/${id}`, { method: 'DELETE' });
            await Swal.fire('¡Eliminado!', 'El circuito ha sido borrado.', 'success');
            loadCircuits();
            populateSelectors();
        } catch (error) {
            Swal.fire('Error', 'No se pudo borrar el circuito.', 'error');
        }
    }
}
// ================= PERFIL DETALLADO (MODAL) =================

async function openDriverProfile(driver) {
    // 1. Mostrar Modal
    document.getElementById('profileModal').style.display = 'block';

    // 2. Llenar Encabezado
    const header = document.getElementById('modalHeader');
    header.innerHTML = `
        <h2 style="margin:0;">${driver.first_name} ${driver.last_name}</h2>
        <p style="margin:5px 0 0; opacity:0.8;">${driver.team} | #${driver.number}</p>
    `;

    // 3. Obtener Historial desde Backend
    const res = await fetch(`${API_BASE}/results/driver/${driver.id}`);
    const results = await res.json();

    // 4. Calcular Estadísticas
    let totalPoints = 0;
    let wins = 0;
    let podiums = 0;

    const tbody = document.getElementById('modalHistoryBody');
    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sin carreras registradas</td></tr>';
    }

    results.forEach(r => {
        totalPoints += r.points;

        // Lógica de Victorias (Solo carreras principales, o sprints también? F1 cuenta solo GP como victoria)
        if (r.position === 1 && r.race_type === 'Race') wins++;

        // Podios (Top 3)
        if (r.position <= 3) podiums++;

        // Pintar fila
        let posColor = r.position === 1 ? '#d4af37' : (r.position === 2 ? '#c0c0c0' : (r.position === 3 ? '#cd7f32' : '#333'));
        let typeBadge = r.race_type === 'Sprint' ? '⚡' : '🏁';

        tbody.innerHTML += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${r.circuit.name}</td>
                <td>${typeBadge}</td>
                <td style="color:${posColor}; font-weight:bold;">P${r.position}</td>
                <td>+${r.points}</td>
            </tr>
        `;
    });

    // 5. Actualizar cajitas de estadísticas
    document.getElementById('statPoints').innerText = totalPoints;
    document.getElementById('statWins').innerText = wins;
    document.getElementById('statPodiums').innerText = podiums;
}

function closeModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Cerrar si hacen click fuera de la ventana blanca
window.onclick = function (event) {
    const modal = document.getElementById('profileModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// ================= SEGURIDAD Y PERSISTENCIA =================

let isAdmin = false;

// 1. FUNCIÓN QUE SE EJECUTA AL INICIAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    // A. Recuperar Sesión de Admin
    if (localStorage.getItem('f1_admin') === 'true') {
        activarModoAdmin(false); // false = sin alerta de bienvenida
    }

    // B. Recuperar la última pestaña visitada
    const lastTab = localStorage.getItem('f1_last_tab') || 'drivers';
    showTab(lastTab); // Esta función ya la tienes, pero la haremos persistente
});

function toggleLogin() {
    if (isAdmin) {
        // CERRAR SESIÓN
        isAdmin = false;
        document.body.classList.remove('admin-mode');
        localStorage.removeItem('f1_admin'); // <--- BORRAMOS EL RASTRO

        // Visuales
        const icon = document.querySelector('#loginBtn i');
        icon.classList.remove('fa-unlock');
        icon.classList.add('fa-lock');
        document.getElementById('loginBtn').style.backgroundColor = 'white';
        document.getElementById('loginBtn').style.color = '#333';

        Swal.fire('Sesión Cerrada', 'Modo visitante.', 'info');
    } else {
        // ABRIR LOGIN
        document.getElementById('loginModal').style.display = 'block';
        setTimeout(() => document.getElementById('adminPassword').focus(), 100);
    }
}

function checkLogin() {
    const pass = document.getElementById('adminPassword').value;
    
    if (pass === "admin123") {
        localStorage.setItem('f1_admin', 'true'); // <--- GUARDAMOS EL RASTRO
        activarModoAdmin(true); // true = mostrar alerta
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPassword').value = '';
    } else {
        Swal.fire('Error', 'Contraseña incorrecta.', 'error');
    }
}

// Función auxiliar para activar los visuales de Admin
function activarModoAdmin(showAlert) {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    
    // Cambiar icono candado
    const icon = document.querySelector('#loginBtn i');
    if(icon) {
        icon.classList.remove('fa-lock');
        icon.classList.add('fa-unlock');
    }
    const btn = document.getElementById('loginBtn');
    if(btn) {
        btn.style.backgroundColor = '#4CAF50';
        btn.style.color = 'white';
    }

    if (showAlert) {
        Swal.fire({
            icon: 'success',
            title: '¡Acceso Concedido!',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkLogin();
});