// Variables globales
let ventas = JSON.parse(localStorage.getItem("ventas") || "[]") || [];
let inventario = JSON.parse(localStorage.getItem("inventario") || "{}") || {
  garrafon20L: { stock: 50, minimo: 10, costo: 15.0 },
};

const productosNombres = {
  garrafon20L: "Garrafón 20L",
};

// Inicializar aplicación
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("fechaVenta").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("fechaInicio").value = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];
  document.getElementById("fechaFin").value = new Date()
    .toISOString()
    .split("T")[0];

  actualizarDashboard();
  actualizarInventarioTabla();
  actualizarHistorial();

  // Event listeners
  document
    .getElementById("ventaForm")
    .addEventListener("submit", registrarVenta);
  document
    .getElementById("inventarioForm")
    .addEventListener("submit", actualizarInventario);
});

// Funciones de navegación
function showTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Mostrar pestaña seleccionada
  document.getElementById(tabName).classList.add("active");
  event.target.classList.add("active");
}

// Función para registrar venta
function registrarVenta(e) {
  e.preventDefault();

  const venta = {
    id: Date.now(),
    fecha: document.getElementById("fechaVenta").value,
    producto: document.getElementById("tipoProducto").value,
    cantidad: parseInt(document.getElementById("cantidad").value),
    precioUnitario: parseFloat(document.getElementById("precioUnitario").value),
    cliente: document.getElementById("cliente").value || "Cliente General",
    metodoPago: document.getElementById("metodoPago").value,
    notas: document.getElementById("notas").value,
    total:
      parseInt(document.getElementById("cantidad").value) *
      parseFloat(document.getElementById("precioUnitario").value),
  };

  // Verificar stock
  if (
    inventario[venta.producto] &&
    inventario[venta.producto].stock < venta.cantidad
  ) {
    mostrarAlerta(
      "ventaAlert",
      "Stock insuficiente para realizar la venta",
      "danger"
    );
    return;
  }

  // Registrar venta
  ventas.push(venta);

  // Actualizar stock
  if (inventario[venta.producto]) {
    inventario[venta.producto].stock -= venta.cantidad;
  }

  // Guardar datos
  localStorage.setItem("ventas", JSON.stringify(ventas));
  localStorage.setItem("inventario", JSON.stringify(inventario));

  // Limpiar formulario
  document.getElementById("ventaForm").reset();
  document.getElementById("fechaVenta").value = new Date()
    .toISOString()
    .split("T")[0];

  // Actualizar interfaz
  actualizarDashboard();
  actualizarInventarioTabla();
  actualizarHistorial();

  mostrarAlerta("ventaAlert", "¡Venta registrada exitosamente!", "success");
}

// Función para actualizar inventario
function actualizarInventario(e) {
  e.preventDefault();

  const producto = document.getElementById("productoInventario").value;
  const stock = parseInt(document.getElementById("stockActual").value);
  const minimo = parseInt(document.getElementById("stockMinimo").value);
  const costo = parseFloat(document.getElementById("costoUnitario").value);

  inventario[producto] = { stock, minimo, costo };
  localStorage.setItem("inventario", JSON.stringify(inventario));

  actualizarInventarioTabla();
  actualizarDashboard();

  mostrarAlerta(
    "inventarioAlert",
    "¡Inventario actualizado exitosamente!",
    "success"
  );
}

// Función para actualizar dashboard
function actualizarDashboard() {
  const hoy = new Date().toISOString().split("T")[0];
  const ventasHoy = ventas.filter((v) => v.fecha === hoy);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const ventasMes = ventas.filter((v) => v.fecha >= inicioMes);

  document.getElementById("ventasHoy").textContent = ventasHoy.length;
  document.getElementById("ingresosMes").textContent =
    "Q" + ventasMes.reduce((sum, v) => sum + v.total, 0).toFixed(2);
  document.getElementById("productosStock").textContent = Object.values(
    inventario
  ).reduce((sum, p) => sum + p.stock, 0);
  document.getElementById("clientesAtendidos").textContent = new Set(
    ventas.map((v) => v.cliente)
  ).size;

  actualizarGraficoVentas();
}

// Función para actualizar gráfico de ventas
function actualizarGraficoVentas() {
  const ctx = document.getElementById("ventasChart").getContext("2d");

  // Obtener datos de los últimos 7 días
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().split("T")[0];
    labels.push(
      fecha.toLocaleDateString("es-GT", {
        weekday: "short",
        day: "numeric",
      })
    );

    const ventasDia = ventas.filter((v) => v.fecha === fechaStr);
    data.push(ventasDia.reduce((sum, v) => sum + v.total, 0));
  }

  if (window.ventasChartInstance) {
    window.ventasChartInstance.destroy();
  }

  window.ventasChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ingresos (Q)",
          data: data,
          borderColor: "#4facfe",
          backgroundColor: "rgba(79, 172, 254, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "Q" + value.toFixed(0);
            },
          },
        },
      },
    },
  });
}

// Función para actualizar tabla de inventario
function actualizarInventarioTabla() {
  const tbody = document.querySelector("#inventarioTable tbody");
  tbody.innerHTML = "";

  Object.entries(inventario).forEach(([key, item]) => {
    const row = tbody.insertRow();
    const estado = item.stock <= item.minimo ? "⚠️ Bajo Stock" : "✅ Normal";
    const estadoClass = item.stock <= item.minimo ? "alert-danger" : "";

    row.innerHTML = `
                    <td>${productosNombres[key]}</td>
                    <td>${item.stock}</td>
                    <td>${item.minimo}</td>
                    <td>Q${item.costo.toFixed(2)}</td>
                    <td><span class="${estadoClass}">${estado}</span></td>
                `;
  });
}

// Función para generar reportes
function generarReporte() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;
  const tipoReporte = document.getElementById("tipoReporte").value;

  const ventasFiltradas = ventas.filter(
    (v) => v.fecha >= fechaInicio && v.fecha <= fechaFin
  );

  document.getElementById("reporteStats").style.display = "grid";

  // Actualizar estadísticas del reporte
  document.getElementById("totalVentasReporte").textContent =
    ventasFiltradas.length;
  document.getElementById("totalIngresosReporte").textContent =
    "Q" + ventasFiltradas.reduce((sum, v) => sum + v.total, 0).toFixed(2);
  document.getElementById("promedioVentas").textContent =
    "Q" +
    (ventasFiltradas.length > 0
      ? (
          ventasFiltradas.reduce((sum, v) => sum + v.total, 0) /
          ventasFiltradas.length
        ).toFixed(2)
      : "0.00");

  // Cliente más frecuente
  const ventasPorCliente = {};
  ventasFiltradas.forEach((v) => {
    ventasPorCliente[v.cliente] = (ventasPorCliente[v.cliente] || 0) + 1;
  });
  const clienteMasFrecuente = Object.keys(ventasPorCliente).reduce(
    (a, b) => (ventasPorCliente[a] > ventasPorCliente[b] ? a : b),
    ""
  );
  document.getElementById("clientesFrecuentes").textContent =
    clienteMasFrecuente || "N/A";

  // Generar gráfico según el tipo de reporte
  actualizarGraficoReporte(ventasFiltradas, tipoReporte, fechaInicio, fechaFin);
}

// Función para actualizar gráfico de reportes
function actualizarGraficoReporte(
  ventasFiltradas,
  tipoReporte,
  fechaInicio,
  fechaFin
) {
  const ctx = document.getElementById("reporteChart").getContext("2d");

  if (window.reporteChartInstance) {
    window.reporteChartInstance.destroy();
  }

  let labels = [];
  let data = [];
  let titulo = "";

  if (tipoReporte === "ventas") {
    titulo = "Ventas por Producto";
    const ventasPorProducto = {};
    ventasFiltradas.forEach((v) => {
      ventasPorProducto[v.producto] =
        (ventasPorProducto[v.producto] || 0) + v.cantidad;
    });

    labels = Object.keys(ventasPorProducto).map((key) => productosNombres[key]);
    data = Object.values(ventasPorProducto);

    window.reporteChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: ["#4facfe", "#00f2fe", "#667eea", "#764ba2"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } else if (tipoReporte === "ingresos") {
    titulo = "Ingresos Diarios";
    const ingresosPorDia = {};

    ventasFiltradas.forEach((v) => {
      ingresosPorDia[v.fecha] = (ingresosPorDia[v.fecha] || 0) + v.total;
    });

    labels = Object.keys(ingresosPorDia)
      .sort()
      .map((fecha) => {
        return new Date(fecha).toLocaleDateString("es-GT", {
          month: "short",
          day: "numeric",
        });
      });
    data = Object.keys(ingresosPorDia)
      .sort()
      .map((fecha) => ingresosPorDia[fecha]);

    window.reporteChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Ingresos (Q)",
            data: data,
            backgroundColor: "rgba(79, 172, 254, 0.8)",
            borderColor: "#4facfe",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Q" + value.toFixed(0);
              },
            },
          },
        },
      },
    });
  } else if (tipoReporte === "clientes") {
    titulo = "Análisis de Clientes";
    const ventasPorCliente = {};

    ventasFiltradas.forEach((v) => {
      ventasPorCliente[v.cliente] =
        (ventasPorCliente[v.cliente] || 0) + v.total;
    });

    // Tomar los top 10 clientes
    const clientesOrdenados = Object.entries(ventasPorCliente)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    labels = clientesOrdenados.map(([cliente]) =>
      cliente.length > 15 ? cliente.substring(0, 15) + "..." : cliente
    );
    data = clientesOrdenados.map(([, total]) => total);

    window.reporteChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Total Compras (Q)",
            data: data,
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "#667eea",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Q" + value.toFixed(0);
              },
            },
          },
        },
      },
    });
  }

  document.getElementById("reporteTitle").textContent =
    titulo + ` (${fechaInicio} - ${fechaFin})`;
}

// Función para actualizar historial
function actualizarHistorial() {
  const tbody = document.querySelector("#historialTable tbody");
  tbody.innerHTML = "";

  // Mostrar las últimas 50 ventas ordenadas por fecha descendente
  const ventasOrdenadas = [...ventas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 50);

  ventasOrdenadas.forEach((venta) => {
    const row = tbody.insertRow();
    row.innerHTML = `
                    <td>${new Date(venta.fecha).toLocaleDateString(
                      "es-GT"
                    )}</td>
                    <td>${productosNombres[venta.producto]}</td>
                    <td>${venta.cantidad}</td>
                    <td>Q${venta.precioUnitario.toFixed(2)}</td>
                    <td>Q${venta.total.toFixed(2)}</td>
                    <td>${venta.cliente}</td>
                    <td>${venta.metodoPago}</td>
                    <td>
                        <button class="delete-btn" onclick="eliminarVenta(${
                          venta.id
                        })">
                           <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </td>
                `;
  });
}

// Función para eliminar venta
function eliminarVenta(id) {
  if (confirm("¿Estás seguro de que quieres eliminar esta venta?")) {
    const venta = ventas.find((v) => v.id === id);
    if (venta) {
      // Restaurar stock
      if (inventario[venta.producto]) {
        inventario[venta.producto].stock += venta.cantidad;
      }

      // Eliminar venta
      ventas = ventas.filter((v) => v.id !== id);

      // Guardar cambios
      localStorage.setItem("ventas", JSON.stringify(ventas));
      localStorage.setItem("inventario", JSON.stringify(inventario));

      // Actualizar interfaz
      actualizarDashboard();
      actualizarInventarioTabla();
      actualizarHistorial();
    }
  }
}

// Función para mostrar alertas
function mostrarAlerta(containerId, mensaje, tipo) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
                <div class="alert alert-${tipo}">
                    ${mensaje}
                </div>
            `;

  // Ocultar alerta después de 5 segundos
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

// Función para exportar datos
function exportarDatos() {
  const datos = {
    ventas: ventas,
    inventario: inventario,
    fechaExportacion: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(datos, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = `agua_pura_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
}

// Función para importar datos
function importarDatos(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const datos = JSON.parse(e.target.result);
        if (datos.ventas && datos.inventario) {
          ventas = datos.ventas;
          inventario = datos.inventario;

          localStorage.setItem("ventas", JSON.stringify(ventas));
          localStorage.setItem("inventario", JSON.stringify(inventario));

          actualizarDashboard();
          actualizarInventarioTabla();
          actualizarHistorial();

          alert("Datos importados exitosamente");
        } else {
          alert("Archivo de respaldo inválido");
        }
      } catch (error) {
        alert("Error al importar datos: " + error.message);
      }
    };
    reader.readAsText(file);
  }
}
