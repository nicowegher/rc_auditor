// Variables globales
let extractedData = [];
let currentAuditState = {
  isRunning: false,
  currentStep: 0,
  totalSteps: 9,
  progress: 0,
  startTime: null,
  lastUpdate: null
};

// URLs de las páginas de auditoría
const auditPages = [
  { name: 'Inventario/Disponibilidad', url: 'https://secure.roomcloud.net/availability' },
  { name: 'Canales', url: 'https://secure.roomcloud.net/channels' },
  { name: 'Usuarios', url: 'https://secure.roomcloud.net/users' },
  { name: 'Pasarelas de Pago', url: 'https://secure.roomcloud.net/payment-gateways' },
  { name: 'Integración PMS', url: 'https://secure.roomcloud.net/pms-integration' },
  { name: 'Revenue Management', url: 'https://secure.roomcloud.net/revenue-management' },
  { name: 'Reglas de Negocio', url: 'https://secure.roomcloud.net/business-rules' },
  { name: 'Comparador de Precios', url: 'https://secure.roomcloud.net/price-comparison' },
  { name: 'Metabuscadores', url: 'https://secure.roomcloud.net/metasearch' }
];

// Función para mostrar estado
function showStatus(message, isError = false) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#f44336' : '#4CAF50';
    statusDiv.style.display = 'block';
  }
  console.log('RoomCloud Auditor:', message);
}

// Función para cargar estado guardado
async function loadSavedState() {
  try {
    const result = await chrome.storage.local.get(['auditState', 'extractedData']);
    
    if (result.auditState) {
      currentAuditState = { ...currentAuditState, ...result.auditState };
      console.log('RoomCloud Auditor: Estado cargado:', currentAuditState);
    }
    
    if (result.extractedData) {
      extractedData = result.extractedData;
      console.log('RoomCloud Auditor: Datos cargados:', extractedData.length, 'registros');
    }
    
    updateUI();
  } catch (error) {
    console.error('RoomCloud Auditor: Error cargando estado:', error);
  }
}

// Función para guardar estado
async function saveState() {
  try {
    await chrome.storage.local.set({
      auditState: currentAuditState,
      extractedData: extractedData
    });
    console.log('RoomCloud Auditor: Estado guardado');
  } catch (error) {
    console.error('RoomCloud Auditor: Error guardando estado:', error);
  }
}

// Función para actualizar la interfaz
function updateUI() {
  const autoAuditButton = document.getElementById('autoAuditButton');
  const downloadLink = document.getElementById('downloadCSV');
  const clearButton = document.getElementById('clearData');
  const auditSummary = document.getElementById('auditSummary');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');
  
  if (currentAuditState.isRunning) {
    // Auditoría en progreso
    if (autoAuditButton) {
      autoAuditButton.textContent = 'Auditoría en Progreso...';
      autoAuditButton.disabled = true;
      autoAuditButton.style.backgroundColor = '#ff9800';
    }
    
    // Mostrar progreso
    if (progressBar && progressText && progressContainer) {
      const progress = (currentAuditState.currentStep / currentAuditState.totalSteps) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Paso ${currentAuditState.currentStep + 1} de ${currentAuditState.totalSteps} - ${auditPages[currentAuditState.currentStep]?.name || 'Procesando...'}`;
      progressContainer.style.display = 'block';
    }
    
  } else {
    // Auditoría no en progreso
    if (autoAuditButton) {
      autoAuditButton.textContent = '🚀 Iniciar Auditoría Automatizada';
      autoAuditButton.disabled = false;
      autoAuditButton.style.backgroundColor = '';
    }
    
    // Ocultar progreso si no hay auditoría en curso
    if (progressContainer && currentAuditState.currentStep === 0) {
      progressContainer.style.display = 'none';
    }
  }
  
  // Habilitar descarga si hay datos
  if (downloadLink && extractedData.length > 0) {
    downloadLink.classList.add('active');
    downloadLink.style.cursor = 'pointer';
  } else {
    downloadLink.classList.remove('active');
    downloadLink.style.cursor = 'not-allowed';
  }
  
  // Mostrar resumen si hay datos
  if (auditSummary && extractedData.length > 0) {
    auditSummary.innerHTML = generateAuditSummary(extractedData);
    auditSummary.style.display = 'block';
  }
  
  // Actualizar lista de pasos
  updateStepsList();
}

// Función para actualizar la lista de pasos
function updateStepsList() {
  const stepsContent = document.getElementById('stepsContent');
  if (!stepsContent) return;
  
  let html = '';
  
  auditPages.forEach((page, index) => {
    let icon = '⏳';
    let status = 'Pendiente';
    let className = '';
    
    if (index < currentAuditState.currentStep) {
      icon = '✅';
      status = 'Completado';
      className = 'completed';
    } else if (index === currentAuditState.currentStep && currentAuditState.isRunning) {
      icon = '🔄';
      status = 'En progreso...';
      className = 'current';
    }
    
    html += `
      <div class="step-item ${className}">
        <div class="step-icon">${icon}</div>
        <div class="step-text">${page.name}</div>
        <div class="step-status">${status}</div>
      </div>
    `;
  });
  
  stepsContent.innerHTML = html;
}

// Función para generar resumen de auditoría
function generateAuditSummary(data) {
  if (data.length === 0) return '<p>No hay datos extraídos</p>';
  
  // Consolidar datos
  const consolidatedData = {};
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (!['url', 'fecha_extraccion', 'pagina_actual'].includes(key)) {
        if (consolidatedData[key] && consolidatedData[key] !== item[key]) {
          consolidatedData[key] = `${consolidatedData[key]} | ${item[key]}`;
        } else {
          consolidatedData[key] = item[key];
        }
      }
    });
  });
  
  let summary = '<div style="max-height: 400px; overflow-y: auto; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">';
  
  // Hotel
  if (consolidatedData.nombre_hotel) {
    summary += `<h3 style="color: #2196F3; margin: 15px 0;">🏨 Hotel: ${consolidatedData.nombre_hotel}</h3>`;
  }
  
  // Disponibilidad
  if (consolidatedData.moneda_carga || consolidatedData.tarifa_mas_baja_usd || consolidatedData.cierres_parciales) {
    summary += `<h4 style="color: #4CAF50; margin: 12px 0;">📊 Disponibilidad</h4>`;
    if (consolidatedData.moneda_carga) summary += `<p><strong>Moneda:</strong> ${consolidatedData.moneda_carga}</p>`;
    if (consolidatedData.tarifa_mas_baja_usd) summary += `<p><strong>Tarifa más baja USD:</strong> ${consolidatedData.tarifa_mas_baja_usd}</p>`;
    if (consolidatedData.cierres_parciales) summary += `<p><strong>Cierres parciales:</strong> ${consolidatedData.cierres_parciales}</p>`;
  }
  
  // Canales
  if (consolidatedData.canales_activos || consolidatedData.canales_inactivos) {
    summary += `<h4 style="color: #FF9800; margin: 12px 0;">🌐 Canales</h4>`;
    if (consolidatedData.canales_activos) summary += `<p><strong>Activos:</strong> ${consolidatedData.canales_activos}</p>`;
    if (consolidatedData.canales_inactivos) summary += `<p><strong>Inactivos:</strong> ${consolidatedData.canales_inactivos}</p>`;
  }
  
  // Usuarios
  if (consolidatedData.usuarios_activos || consolidatedData.usuarios_inactivos) {
    summary += `<h4 style="color: #9C27B0; margin: 12px 0;">👥 Usuarios</h4>`;
    if (consolidatedData.usuarios_activos) summary += `<p><strong>Activos:</strong> ${consolidatedData.usuarios_activos}</p>`;
    if (consolidatedData.usuarios_inactivos) summary += `<p><strong>Inactivos:</strong> ${consolidatedData.usuarios_inactivos}</p>`;
  }
  
  // Pasarelas de Pago
  if (consolidatedData.pasarelas_pago_activas || consolidatedData.pasarelas_pago_inactivas) {
    summary += `<h4 style="color: #E91E63; margin: 12px 0;">💳 Pasarelas de Pago</h4>`;
    if (consolidatedData.pasarelas_pago_activas) summary += `<p><strong>Activas:</strong> ${consolidatedData.pasarelas_pago_activas}</p>`;
    if (consolidatedData.pasarelas_pago_inactivas) summary += `<p><strong>Inactivas:</strong> ${consolidatedData.pasarelas_pago_inactivas}</p>`;
  }
  
  // Integración PMS
  if (consolidatedData.integraciones_pms) {
    summary += `<h4 style="color: #607D8B; margin: 12px 0;">🔗 Integración PMS</h4>`;
    summary += `<p><strong>Integraciones:</strong> ${consolidatedData.integraciones_pms}</p>`;
  }
  
  // Revenue Management
  if (consolidatedData.reglas_revenue) {
    summary += `<h4 style="color: #795548; margin: 12px 0;">💰 Revenue Management</h4>`;
    summary += `<p><strong>Reglas:</strong> ${consolidatedData.reglas_revenue}</p>`;
  }
  
  // Reglas de Negocio
  if (consolidatedData.reglas_negocio) {
    summary += `<h4 style="color: #3F51B5; margin: 12px 0;">⚙️ Reglas de Negocio</h4>`;
    summary += `<p><strong>Reglas:</strong> ${consolidatedData.reglas_negocio}</p>`;
  }
  
  // Comparador de Precios
  if (consolidatedData.comparador_precios) {
    summary += `<h4 style="color: #FF5722; margin: 12px 0;">📈 Comparador de Precios</h4>`;
    summary += `<p><strong>Estado:</strong> ${consolidatedData.comparador_precios}</p>`;
  }
  
  // Metabuscadores
  if (consolidatedData.metabuscadores) {
    summary += `<h4 style="color: #00BCD4; margin: 12px 0;">🔍 Metabuscadores</h4>`;
    summary += `<p><strong>Estado:</strong> ${consolidatedData.metabuscadores}</p>`;
  }
  
  summary += '</div>';
  return summary;
}

// Función para convertir datos a CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const consolidatedData = {};
  const excludedFields = ['url', 'fecha_extraccion', 'pagina_actual'];
  
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (!excludedFields.includes(key)) {
        if (consolidatedData[key] && consolidatedData[key] !== item[key]) {
          consolidatedData[key] = `${consolidatedData[key]} | ${item[key]}`;
        } else {
          consolidatedData[key] = item[key];
        }
      }
    });
  });
  
  const headers = Object.keys(consolidatedData);
  const csvRows = [headers.join(',')];
  
  const csvRow = headers.map(header => {
    const value = consolidatedData[header] || '';
    return `"${String(value).replace(/"/g, '""')}"`;
  });
  
  csvRows.push(csvRow.join(','));
  
  return csvRows.join('\n');
}

// Función principal de auditoría automatizada
async function runCompleteAudit() {
  if (currentAuditState.isRunning) {
    showStatus('Auditoría ya en progreso...', true);
    return;
  }
  
  // Inicializar estado
  currentAuditState = {
    isRunning: true,
    currentStep: 0,
    totalSteps: auditPages.length,
    progress: 0,
    startTime: new Date(),
    lastUpdate: new Date()
  };
  
  extractedData = [];
  updateUI();
  saveState();
  
  showStatus('Iniciando auditoría automatizada...');
  
  try {
    // Obtener pestaña activa de RoomCloud
    const tabs = await chrome.tabs.query({ url: 'https://secure.roomcloud.net/*' });
    
    if (tabs.length === 0) {
      showStatus('Error: Debes tener una pestaña de RoomCloud abierta', true);
      currentAuditState.isRunning = false;
      updateUI();
      saveState();
      return;
    }
    
    const tab = tabs[0];
    
    // Extraer datos de cada página
    for (let i = 0; i < auditPages.length; i++) {
      const page = auditPages[i];
      currentAuditState.currentStep = i;
      updateUI();
      saveState();
      
      showStatus(`Navegando a: ${page.name}...`);
      
      // Navegar a la página
      await chrome.tabs.update(tab.id, { url: page.url });
      
      // Esperar a que cargue la página
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      showStatus(`Extrayendo datos de: ${page.name}...`);
      
      // Extraer datos
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      
      if (response && response.success) {
        extractedData.push({
          ...response.data,
          pagina_actual: page.name,
          fecha_extraccion: new Date().toISOString()
        });
        showStatus(`✅ ${page.name}: Datos extraídos correctamente`);
      } else {
        showStatus(`❌ ${page.name}: Error al extraer datos`, true);
      }
      
      // Guardar progreso
      saveState();
      
      // Pausa entre páginas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Auditoría completada
    currentAuditState.isRunning = false;
    currentAuditState.progress = 100;
    updateUI();
    saveState();
    
    showStatus('✅ Auditoría completada exitosamente');
    
    // Configurar descarga CSV
    const downloadLink = document.getElementById('downloadCSV');
    if (downloadLink) {
      const csvContent = convertToCSV(extractedData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = `roomcloud_audit_${new Date().toISOString().split('T')[0]}.csv`;
      downloadLink.classList.add('active');
    }
    
    // Mostrar notificación
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'RoomCloud Auditor',
      message: 'Auditoría completada exitosamente'
    });
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error en auditoría:', error);
    showStatus(`Error: ${error.message}`, true);
    currentAuditState.isRunning = false;
    updateUI();
    saveState();
  }
}

// Función para limpiar datos
function clearData() {
  extractedData = [];
  currentAuditState = {
    isRunning: false,
    currentStep: 0,
    totalSteps: 9,
    progress: 0,
    startTime: null,
    lastUpdate: null
  };
  
  chrome.storage.local.remove(['auditState', 'extractedData']);
  updateUI();
  showStatus('Datos limpiados');
}

// Función para sincronizar estado en tiempo real
function startStateSync() {
  // Sincronizar cada 2 segundos
  setInterval(async () => {
    await loadSavedState();
  }, 2000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('RoomCloud Auditor: Interfaz completa cargada');
  
  // Cargar estado guardado
  await loadSavedState();
  
  // Configurar event listeners
  const autoAuditButton = document.getElementById('autoAuditButton');
  const downloadLink = document.getElementById('downloadCSV');
  const clearButton = document.getElementById('clearData');
  
  if (autoAuditButton) {
    autoAuditButton.addEventListener('click', runCompleteAudit);
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', clearData);
  }
  
  // Configurar descarga CSV
  if (downloadLink) {
    downloadLink.addEventListener('click', function(e) {
      if (!downloadLink.classList.contains('active')) {
        e.preventDefault();
        showStatus('No hay datos para descargar', true);
      }
    });
  }
  
  // Actualizar UI inicial
  updateUI();
  
  // Iniciar sincronización de estado
  startStateSync();
  
  showStatus('Interfaz lista. Puedes iniciar la auditoría o ver el progreso actual.');
});
