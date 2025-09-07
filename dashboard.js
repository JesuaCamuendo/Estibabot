import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// 1. Variables Globales y Datos Fijos
// =========================================================
const pedidosCollection = collection(db, 'pedidos');
const egresosCollection = collection(db, 'egresos');
let pedidos = [];

// Precios de venta del usuario
const precios = {
    "Camiseta": 17.00,
    "Oversize": 20.00,
    "Hoddie": 25.00,
    "Chaqueta": 28.00,
    "Jogger": 20.00,
    "Crop-Top": 17.00,
    "Pantaloneta": 15.00
};

// Costos de los productos - Puedes editar estos valores
const costos = {
    "Camiseta": 3.50,
    "Oversize": 7.00,
    "Hoddie": 8.00,
    "Chaqueta": 10.00,
    "Jogger": 7.00,
    "Crop-Top": 3.50,
    "Pantaloneta": 5.00
};

const loadingOverlay = document.getElementById('loading-overlay');
let currentFilter = 'por-enviar';

// 2. Funciones de Utilidad para UI
// =========================================================
function showLoading() {
    loadingOverlay.classList.add('visible');
}

function hideLoading() {
    loadingOverlay.classList.remove('visible');
}

// 3. Control de Navegación y UI
// =========================================================
function setupNavigation() {
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const targetId = button.dataset.target;
            document.querySelectorAll('.page-section').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'list-section') {
                fetchPedidos();
            } else if (targetId === 'metrics-section') {
                fetchMetrics();
            }
        });
    });

    document.querySelector('.nav-button[data-target="add-section"]').click();
}

function setupPriceAutomation() {
    const selectProducto = document.getElementById('nombre-pedido');
    const inputPrecio = document.getElementById('precio-pedido');

    selectProducto.addEventListener('change', () => {
        const articuloSeleccionado = selectProducto.value;
        if (precios[articuloSeleccionado]) {
            inputPrecio.value = precios[articuloSeleccionado];
        } else {
            inputPrecio.value = '';
        }
    });
}

// 4. Lógica de Autenticación
// =========================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuario autenticado:", user.email);
    } else {
        window.location.href = 'login.html';
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    showLoading();
    await signOut(auth);
    hideLoading();
    window.location.href = 'login.html';
});

// 5. Lógica del CRUD (Crear, Leer, Actualizar, Borrar)
// =========================================================

// --- Crear Pedidos ---
const pedidoForm = document.getElementById('pedido-form');
pedidoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    try {
        const nombre = document.getElementById('nombre-pedido').value;
        const descripcion = document.getElementById('descripcion-pedido').value;
        const precio = document.getElementById('precio-pedido').value;
        const abono = document.getElementById('abono-pedido').value;
        const status = document.getElementById('status-pedido').value;
        const imagenFile = document.getElementById('imagen-pedido').files[0];

        let imagenURL = '';

        if (imagenFile) {
            const imageRef = ref(storage, `imagenes_pedidos/${imagenFile.name}`);
            const snapshot = await uploadBytes(imageRef, imagenFile);
            imagenURL = await getDownloadURL(snapshot.ref);
        }

        await addDoc(pedidosCollection, {
            nombre,
            descripcion,
            precio: parseFloat(precio),
            abono: abono ? parseFloat(abono) : 0,
            status,
            imagenURL,
            timestamp: new Date() // ¡Añade esta línea!
        });
        alert('Pedido guardado con éxito!');
        
        pedidoForm.reset();
        document.querySelector('.nav-button[data-target="list-section"]').click();
    } catch (error) {
        console.error("Error al guardar pedido: ", error);
        alert("Hubo un error al guardar el pedido: " + error.message);
    } finally {
        hideLoading();
    }
});

// --- Registrar Egresos ---
const expenseForm = document.getElementById('expense-form');
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    try {
        const monto = document.getElementById('expense-amount').value;
        const categoria = document.getElementById('expense-category').value;
        const descripcion = document.getElementById('expense-description').value;
        const fecha = new Date().toISOString();

        await addDoc(egresosCollection, {
            monto: parseFloat(monto),
            categoria,
            descripcion,
            fecha
        });
        alert('Egreso registrado con éxito!');
        expenseForm.reset();
    } catch (error) {
        console.error("Error al registrar egreso: ", error);
        alert("Hubo un error al registrar el egreso: " + error.message);
    } finally {
        hideLoading();
    }
});

// --- Leer y filtrar pedidos ---
async function fetchPedidos() {
    showLoading();
    try {
        pedidos = [];
        const querySnapshot = await getDocs(pedidosCollection);
        querySnapshot.forEach((doc) => {
            pedidos.push({ ...doc.data(), id: doc.id });
        });
        filterPedidos(currentFilter);
    } catch (error) {
        console.error("Error al cargar pedidos: ", error);
        alert("Hubo un error al cargar los pedidos.");
    } finally {
        hideLoading();
    }
}

function filterPedidos(filter) {
    let filteredPedidos = [];

    switch(filter) {
        case 'pago-pendiente':
            filteredPedidos = pedidos.filter(p => p.abono < p.precio);
            break;
        case 'pago-completo':
            filteredPedidos = pedidos.filter(p => p.abono >= p.precio);
            break;
        case 'por-enviar':
            filteredPedidos = pedidos.filter(p => p.status === 'por_enviar');
            break;
        case 'completado':
            filteredPedidos = pedidos.filter(p => p.status === 'completado');
            break;
        default:
            filteredPedidos = pedidos;
            break;
    }
    renderPedidos(filteredPedidos);
}

function renderPedidos(pedidosToRender) {
    const pedidosList = document.getElementById('pedidos-list');
    pedidosList.innerHTML = '';
    
    pedidosToRender.forEach(pedido => {
        const estadoLabel = pedido.status === 'por_enviar' ? 'Por Enviar' : 'Completado';
        const estadoStyle = `color: ${pedido.status === 'por_enviar' ? 'orange' : 'green'}`;

        const pagoLabel = pedido.abono >= pedido.precio ? 'Pago Completo' : 'Pago Pendiente';
        const pagoStyle = `color: ${pedido.abono >= pedido.precio ? 'green' : 'red'}`;

        const pedidoCard = document.createElement('div');
        pedidoCard.className = 'pedido-card';
        pedidoCard.innerHTML = `
            ${pedido.imagenURL ? `<img src="${pedido.imagenURL}" alt="${pedido.nombre}">` : ''}
            <h3>${pedido.nombre}</h3>
            <p>${pedido.descripcion}</p>
            <p><strong>Precio:</strong> $${pedido.precio}</p>
            <p><strong>Abono:</strong> $${pedido.abono || 0}</p>
            <p><strong>Estado:</strong> <span style="${estadoStyle}">${estadoLabel}</span></p>
            <p><strong>Estado de Pago:</strong> <span style="${pagoStyle}">${pagoLabel}</span></p>
            <div class="pedido-actions">
                <button class="action-button edit-button" data-id="${pedido.id}">Editar</button>
                <button class="action-button delete-button" data-id="${pedido.id}">Eliminar</button>
            </div>
        `;
        pedidosList.appendChild(pedidoCard);
    });

    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', handleEdit);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', handleDelete);
    });
}

// --- Lógica de los botones de filtro ---
document.getElementById('filter-pendiente').addEventListener('click', () => {
    currentFilter = 'pago-pendiente';
    document.querySelectorAll('.filter-buttons button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-pendiente').classList.add('active');
    filterPedidos(currentFilter);
});

document.getElementById('filter-completo').addEventListener('click', () => {
    currentFilter = 'pago-completo';
    document.querySelectorAll('.filter-buttons button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-completo').classList.add('active');
    filterPedidos(currentFilter);
});

document.getElementById('filter-por-enviar').addEventListener('click', () => {
    currentFilter = 'por-enviar';
    document.querySelectorAll('.filter-buttons button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-por-enviar').classList.add('active');
    filterPedidos(currentFilter);
});

document.getElementById('filter-completado').addEventListener('click', () => {
    currentFilter = 'completado';
    document.querySelectorAll('.filter-buttons button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-completado').classList.add('active');
    filterPedidos(currentFilter);
});

// --- Lógica del modal de edición ---
const editModal = document.getElementById('edit-modal');
const closeButton = editModal.querySelector('.close-button');
const editForm = document.getElementById('edit-form');
const editNombreSelect = document.getElementById('edit-nombre-pedido');
const editPrecioInput = document.getElementById('edit-precio-pedido');
const editAbonoInput = document.getElementById('edit-abono-pedido');
const editStatusSelect = document.getElementById('edit-status-pedido');
const editDescripcionTextarea = document.getElementById('edit-descripcion-pedido');
const editPedidoIdInput = document.getElementById('edit-pedido-id');

function showEditModal(pedido) {
    editPedidoIdInput.value = pedido.id;
    editNombreSelect.value = pedido.nombre;
    editPrecioInput.value = pedido.precio;
    editAbonoInput.value = pedido.abono;
    editStatusSelect.value = pedido.status;
    editDescripcionTextarea.value = pedido.descripcion;
    editModal.style.display = 'block';
}

function closeEditModal() {
    editModal.style.display = 'none';
}

closeButton.addEventListener('click', closeEditModal);

window.addEventListener('click', (event) => {
    if (event.target === editModal) {
        closeEditModal();
    }
});

editNombreSelect.addEventListener('change', () => {
    const articulo = editNombreSelect.value;
    editPrecioInput.value = precios[articulo] || '';
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    try {
        const pedidoId = editPedidoIdInput.value;
        const nombre = editNombreSelect.value;
        const precio = editPrecioInput.value;
        const abono = editAbonoInput.value;
        const status = editStatusSelect.value;
        const descripcion = editDescripcionTextarea.value;

        const pedidoDoc = doc(db, 'pedidos', pedidoId);
        await updateDoc(pedidoDoc, {
            nombre,
            precio: parseFloat(precio),
            abono: abono ? parseFloat(abono) : 0,
            status,
            descripcion
        });

        alert('Pedido actualizado con éxito!');
        closeEditModal();
        fetchPedidos();
    } catch (error) {
        console.error("Error al actualizar pedido: ", error);
        alert("Hubo un error al actualizar el pedido: " + error.message);
    } finally {
        hideLoading();
    }
});

// --- Manejar Editar y Eliminar ---
function handleEdit(e) {
    const id = e.target.dataset.id;
    const pedidoToEdit = pedidos.find(p => p.id === id);

    if (pedidoToEdit) {
        showEditModal(pedidoToEdit);
    }
}

async function handleDelete(e) {
    const id = e.target.dataset.id;
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
        showLoading();
        try {
            const pedidoToDelete = pedidos.find(p => p.id === id);
            if (pedidoToDelete.imagenURL) {
                const imageRef = ref(storage, pedidoToDelete.imagenURL);
                await deleteObject(imageRef).catch(error => console.warn("No se pudo eliminar la imagen de Storage:", error));
            }
            await deleteDoc(doc(db, 'pedidos', id));
            alert('Pedido eliminado con éxito!');
            fetchPedidos();
        } catch (error) {
            console.error("Error al eliminar el pedido: ", error);
            alert("Hubo un error al eliminar el pedido.");
        } finally {
            hideLoading();
        }
    }
}

// 6. Lógica de Métricas
// =========================================================

let productChart;
let financialChart;
let expensesChart;

async function fetchMetrics() {
    showLoading();
    try {
        const pedidosSnapshot = await getDocs(pedidosCollection);
        const egresosSnapshot = await getDocs(egresosCollection);
        
        const todosLosPedidos = pedidosSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const todosLosEgresos = egresosSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // 1. Rendimiento de Productos
        renderProductPerformanceChart(todosLosPedidos);

        // 2. Rentabilidad Financiera
        renderFinancialProfitabilityChart(todosLosPedidos, todosLosEgresos);

        // 3. Egresos por Categoría
        renderExpensesChart(todosLosEgresos);
    } catch (error) {
        console.error("Error al cargar métricas: ", error);
        alert("Hubo un error al cargar las métricas.");
    } finally {
        hideLoading();
    }
}

function renderProductPerformanceChart(pedidos) {
    if (productChart) productChart.destroy();

    const productCounts = {};
    const productRevenues = {};
    const productGrossProfits = {}; // Nuevo objeto para la ganancia bruta

    for (const p of pedidos) {
        productCounts[p.nombre] = (productCounts[p.nombre] || 0) + 1;
        productRevenues[p.nombre] = (productRevenues[p.nombre] || 0) + p.precio;
        // Calcula la ganancia bruta restando el costo del precio
        productGrossProfits[p.nombre] = (productGrossProfits[p.nombre] || 0) + (p.precio - (costos[p.nombre] || 0));
    }

    const labels = Object.keys(productCounts);
    const dataCounts = Object.values(productCounts);
    const dataRevenues = Object.values(productRevenues);
    const dataGrossProfits = Object.values(productGrossProfits); // Nuevos datos

    const ctx = document.getElementById('product-performance-chart').getContext('2d');
    productChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unidades Vendidas',
                data: dataCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Ganancia Bruta ($)', // Etiqueta cambiada a Ganancia Bruta
                data: dataGrossProfits, // Usando los nuevos datos de ganancia
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderFinancialProfitabilityChart(pedidos, egresos) {
    if (financialChart) financialChart.destroy();
    
    const monthlyData = {};

    // Agrupa ingresos y abonos por mes
    pedidos.forEach(p => {
        const date = new Date(p.timestamp.seconds * 1000);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { ingresos: 0, abonos: 0, egresos: 0 };
        }
        monthlyData[monthYear].ingresos += p.precio;
        monthlyData[monthYear].abonos += p.abono || 0;
    });

    // Agrupa egresos por mes
    egresos.forEach(e => {
        const date = new Date(e.fecha);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { ingresos: 0, abonos: 0, egresos: 0 };
        }
        monthlyData[monthYear].egresos += e.monto;
    });

    const labels = Object.keys(monthlyData).sort();
    const dataIngresos = labels.map(key => monthlyData[key].ingresos);
    const dataGananciaBruta = labels.map(key => monthlyData[key].ingresos - monthlyData[key].egresos);
    const dataGananciaTemporal = labels.map(key => monthlyData[key].abonos - monthlyData[key].egresos);

    const ctx = document.getElementById('financial-profitability-chart').getContext('2d');
    financialChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: dataIngresos,
                backgroundColor: 'rgba(221, 5, 5, 1)',
                borderColor: 'rgba(247, 0, 53, 1)',
                tension: 0.1
            }, {
                label: 'Ganancia Bruta ($)',
                data: dataGananciaBruta,
                backgroundColor: 'rgba(0, 82, 206, 1)',
                borderColor: 'rgba(41, 98, 255, 1)',
                tension: 0.1
            }, {
                label: 'Ganancia Temporal ($)',
                data: dataGananciaTemporal,
                backgroundColor: 'rgba(255, 166, 0, 1)',
                borderColor: 'rgb(255, 159, 64)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderExpensesChart(egresos) {
    if (expensesChart) expensesChart.destroy();

    const expenseTotals = {};
    for (const e of egresos) {
        expenseTotals[e.categoria] = (expenseTotals[e.categoria] || 0) + e.monto;
    }

    const labels = Object.keys(expenseTotals);
    const data = Object.values(expenseTotals);

    const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
    ];

    const ctx = document.getElementById('expenses-chart').getContext('2d');
    expensesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });     
}


// 7. Inicialización de la Aplicación
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupPriceAutomation();
});