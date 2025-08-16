// Variables globales
let extractedData = [];
let currentAuditState = {
  isRunning: false,
  currentStep: 0,
  totalSteps: 10,
  progress: 0,
  startTime: null,
  lastUpdate: null
};

// URLs de las páginas de auditoría
const auditPages = [
  { name: 'Detalles del Hotel', url: 'https://secure.roomcloud.net/be/owners_area/contentHotel.jsp?item=property_detail' },
  { name: 'Disponibilidad/Tarifas', url: 'https://secure.roomcloud.net/be/owners_area/availability_r2.jsp' },
  { name: 'Canales', url: 'https://secure.roomcloud.net/be/owners_area/config.jsp?item=cm_channels' },
  { name: 'Usuarios', url: 'https://secure.roomcloud.net/be/owners_area/users_list.jsp?item=users_list' },
  { name: 'Integración PMS', url: 'https://secure.roomcloud.net/be/owners_area/hotel_automation_config.jsp?item=automation' },
  { name: 'Pasarelas de Pago', url: 'https://secure.roomcloud.net/be/owners_area/payment_gateways_hotel.jsp?item=payment_gateways' },
  { name: 'Revenue Management', url: 'https://secure.roomcloud.net/be/owners_area/revenue_management_calendar.jsp?item=revenue_calendar' },
  { name: 'Comparador de Precios', url: 'https://secure.roomcloud.net/be/owners_area/comparison.jsp?item=comparison' },
  { name: 'Metabuscadores', url: 'https://secure.roomcloud.net/be/owners_area/meta_dashboard.jsp?item=meta_dashboard' }
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
      
      // Si hay una auditoría en progreso, mostrar mensaje informativo
      if (currentAuditState.isRunning) {
        console.log('RoomCloud Auditor: Auditoría en progreso detectada');
      }
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
  const openInTabButton = document.getElementById('openInTabButton');
  
  if (currentAuditState.isRunning) {
    // Auditoría en progreso
    if (autoAuditButton) {
      autoAuditButton.textContent = '🔄 Auditoría en Progreso...';
      autoAuditButton.disabled = true;
      autoAuditButton.style.backgroundColor = '#ff9800';
    }
    
    // Mostrar progreso
    if (progressBar && progressText) {
      const progress = (currentAuditState.currentStep / currentAuditState.totalSteps) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Paso ${currentAuditState.currentStep + 1} de ${currentAuditState.totalSteps} - ${auditPages[currentAuditState.currentStep]?.name || 'Procesando...'}`;
      progressBar.style.display = 'block';
      progressText.style.display = 'block';
    }
    
    // Mostrar mensaje de auditoría en progreso
    showAuditInProgressMessage();
    
  } else {
    // Auditoría no en progreso
    if (autoAuditButton) {
      autoAuditButton.textContent = '🚀 Auditoría Automatizada Completa';
      autoAuditButton.disabled = false;
      autoAuditButton.style.backgroundColor = '#4CAF50';
    }
    
    // Ocultar progreso
    if (progressBar && progressText) {
      progressBar.style.display = 'none';
      progressText.style.display = 'none';
    }
    
    // Ocultar mensaje de auditoría en progreso
    const statusDiv = document.getElementById('status');
    if (statusDiv && !statusDiv.textContent.includes('Error')) {
      statusDiv.style.display = 'none';
    }
  }
  
  // Habilitar descarga si hay datos
  if (downloadLink && extractedData && extractedData.length > 0) {
    downloadLink.style.backgroundColor = '#4CAF50';
    downloadLink.style.color = 'white';
    downloadLink.style.cursor = 'pointer';
    downloadLink.style.pointerEvents = 'auto';
    downloadLink.textContent = `📥 Descargar CSV (${extractedData.length} datos)`;
  } else if (downloadLink) {
    downloadLink.style.backgroundColor = '#ccc';
    downloadLink.style.color = '#666';
    downloadLink.style.cursor = 'not-allowed';
    downloadLink.style.pointerEvents = 'none';
    downloadLink.textContent = '📥 Descargar CSV (sin datos)';
  }
  
  // Mostrar resumen si hay datos
  if (auditSummary && extractedData && extractedData.length > 0) {
    auditSummary.innerHTML = generateAuditSummary(extractedData);
    auditSummary.style.display = 'block';
  } else if (auditSummary) {
    auditSummary.style.display = 'none';
  }
}

// Función para mostrar mensaje de auditoría en progreso
function showAuditInProgressMessage() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="background: #FFF3E0; border: 2px solid #FF9800; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <h4 style="color: #E65100; margin: 0 0 10px 0;">🔄 Auditoría en Progreso</h4>
        <p style="color: #333333; margin: 5px 0;">La auditoría está ejecutándose en segundo plano.</p>
        <p style="color: #555555; margin: 5px 0; font-size: 12px;">Puedes cerrar este popup y reabrirlo sin perder el progreso.</p>
      </div>
    `;
    statusDiv.style.display = 'block';
  }
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
  
  let summary = '<div style="max-height: 300px; overflow-y: auto; padding: 15px; background: #ffffff; border-radius: 8px; border: 2px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
  
  // Hotel
  if (consolidatedData.nombre_hotel) {
    summary += `<h3 style="color: #1565C0; margin: 10px 0; font-size: 18px; border-bottom: 2px solid #1565C0; padding-bottom: 5px;">🏨 Hotel: ${consolidatedData.nombre_hotel}</h3>`;
  }
  
  // Disponibilidad
  if (consolidatedData.moneda_carga || consolidatedData.tarifa_mas_baja_usd || consolidatedData.cierres_parciales) {
    summary += `<h4 style="color: #2E7D32; margin: 12px 0 8px 0; font-size: 16px; background: #E8F5E8; padding: 5px 10px; border-radius: 4px;">📊 Disponibilidad</h4>`;
    if (consolidatedData.moneda_carga) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #2E7D32;">Moneda:</strong> <span style="color: #555555;">${consolidatedData.moneda_carga}</span></p>`;
    if (consolidatedData.tarifa_mas_baja_usd) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #2E7D32;">Tarifa más baja USD:</strong> <span style="color: #555555;">${consolidatedData.tarifa_mas_baja_usd}</span></p>`;
    if (consolidatedData.cierres_parciales) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #2E7D32;">Cierres parciales:</strong> <span style="color: #555555;">${consolidatedData.cierres_parciales}</span></p>`;
  }
  
  // Canales
  if (consolidatedData.canales_activos || consolidatedData.canales_inactivos) {
    summary += `<h4 style="color: #E65100; margin: 12px 0 8px 0; font-size: 16px; background: #FFF3E0; padding: 5px 10px; border-radius: 4px;">🌐 Canales</h4>`;
    if (consolidatedData.canales_activos) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #E65100;">Activos:</strong> <span style="color: #555555;">${consolidatedData.canales_activos}</span></p>`;
    if (consolidatedData.canales_inactivos) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #E65100;">Inactivos:</strong> <span style="color: #555555;">${consolidatedData.canales_inactivos}</span></p>`;
  }
  
  // Usuarios
  if (consolidatedData.usuarios_activos || consolidatedData.usuarios_inactivos) {
    summary += `<h4 style="color: #6A1B9A; margin: 12px 0 8px 0; font-size: 16px; background: #F3E5F5; padding: 5px 10px; border-radius: 4px;">👥 Usuarios</h4>`;
    if (consolidatedData.usuarios_activos) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #6A1B9A;">Activos:</strong> <span style="color: #555555;">${consolidatedData.usuarios_activos}</span></p>`;
    if (consolidatedData.usuarios_inactivos) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #6A1B9A;">Inactivos:</strong> <span style="color: #555555;">${consolidatedData.usuarios_inactivos}</span></p>`;
  }
  
  // Pasarelas de Pago
  if (consolidatedData.pasarelas_pago_activas || consolidatedData.pasarelas_pago_inactivas) {
    summary += `<h4 style="color: #C2185B; margin: 12px 0 8px 0; font-size: 16px; background: #FCE4EC; padding: 5px 10px; border-radius: 4px;">💳 Pasarelas de Pago</h4>`;
    if (consolidatedData.pasarelas_pago_activas) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #C2185B;">Activas:</strong> <span style="color: #555555;">${consolidatedData.pasarelas_pago_activas}</span></p>`;
    if (consolidatedData.pasarelas_pago_inactivas) summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #C2185B;">Inactivas:</strong> <span style="color: #555555;">${consolidatedData.pasarelas_pago_inactivas}</span></p>`;
  }
  
  // Integración PMS
  if (consolidatedData.integraciones_pms) {
    summary += `<h4 style="color: #455A64; margin: 12px 0 8px 0; font-size: 16px; background: #ECEFF1; padding: 5px 10px; border-radius: 4px;">🔗 Integración PMS</h4>`;
    summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #455A64;">Integraciones:</strong> <span style="color: #555555;">${consolidatedData.integraciones_pms}</span></p>`;
  }
  
  // Revenue Management
  if (consolidatedData.reglas_revenue) {
    summary += `<h4 style="color: #5D4037; margin: 12px 0 8px 0; font-size: 16px; background: #EFEBE9; padding: 5px 10px; border-radius: 4px;">💰 Revenue Management</h4>`;
    summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #5D4037;">Reglas:</strong> <span style="color: #555555;">${consolidatedData.reglas_revenue}</span></p>`;
  }
  
  // Reglas de Negocio
  if (consolidatedData.reglas_negocio) {
    summary += `<h4 style="color: #303F9F; margin: 12px 0 8px 0; font-size: 16px; background: #E8EAF6; padding: 5px 10px; border-radius: 4px;">⚙️ Reglas de Negocio</h4>`;
    summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #303F9F;">Reglas:</strong> <span style="color: #555555;">${consolidatedData.reglas_negocio}</span></p>`;
  }
  
  // Comparador de Precios
  if (consolidatedData.comparador_precios) {
    summary += `<h4 style="color: #D84315; margin: 12px 0 8px 0; font-size: 16px; background: #FBE9E7; padding: 5px 10px; border-radius: 4px;">📈 Comparador de Precios</h4>`;
    summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #D84315;">Estado:</strong> <span style="color: #555555;">${consolidatedData.comparador_precios}</span></p>`;
  }
  
  // Metabuscadores
  if (consolidatedData.metabuscadores) {
    summary += `<h4 style="color: #00695C; margin: 12px 0 8px 0; font-size: 16px; background: #E0F2F1; padding: 5px 10px; border-radius: 4px;">🔍 Metabuscadores</h4>`;
    summary += `<p style="color: #333333; margin: 5px 0; padding: 3px 0;"><strong style="color: #00695C;">Estado:</strong> <span style="color: #555555;">${consolidatedData.metabuscadores}</span></p>`;
  }
  
  summary += '</div>';
  return summary;
}

// Función para convertir datos a CSV
function convertToCSV(data) {
  if (!data || data.length === 0) {
    console.log('RoomCloud Auditor: No hay datos para convertir a CSV');
    return '';
  }
  
  console.log('RoomCloud Auditor: Convirtiendo datos a CSV:', data);
  
  // Si solo hay un elemento, crear un array
  const dataArray = Array.isArray(data) ? data : [data];
  
  // Consolidar datos de múltiples páginas
  const consolidatedData = {};
  const excludedFields = ['url', 'fecha_extraccion', 'pagina_actual'];
  
  dataArray.forEach((item, index) => {
    console.log(`RoomCloud Auditor: Procesando item ${index}:`, item);
    
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => {
        if (!excludedFields.includes(key)) {
          const value = item[key];
          
          // Convertir arrays y objetos a string
          let stringValue = '';
          if (Array.isArray(value)) {
            stringValue = value.join('; ');
          } else if (value && typeof value === 'object') {
            stringValue = JSON.stringify(value);
          } else {
            stringValue = String(value || '');
          }
          
          if (consolidatedData[key] && consolidatedData[key] !== stringValue) {
            consolidatedData[key] = `${consolidatedData[key]} | ${stringValue}`;
          } else {
            consolidatedData[key] = stringValue;
          }
        }
      });
    }
  });
  
  console.log('RoomCloud Auditor: Datos consolidados:', consolidatedData);
  
  const headers = Object.keys(consolidatedData);
  const csvRows = [headers.join(',')];
  
  const csvRow = headers.map(header => {
    const value = consolidatedData[header] || '';
    return `"${String(value).replace(/"/g, '""')}"`;
  });
  
  csvRows.push(csvRow.join(','));
  
  const csvContent = csvRows.join('\n');
  console.log('RoomCloud Auditor: CSV generado:', csvContent);
  
  return csvContent;
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
    // Obtener pestaña activa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Verificar que estamos en RoomCloud
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para ejecutar la auditoría', true);
      currentAuditState.isRunning = false;
      updateUI();
      saveState();
      return;
    }
    
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
      downloadLink.style.backgroundColor = '#4CAF50';
      downloadLink.style.color = 'white';
      downloadLink.style.cursor = 'pointer';
      downloadLink.style.pointerEvents = 'auto';
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
    totalSteps: 10,
    progress: 0,
    startTime: null,
    lastUpdate: null
  };
  
  chrome.storage.local.remove(['auditState', 'extractedData']);
  updateUI();
  showStatus('Datos limpiados');
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('RoomCloud Auditor: Popup cargado');
  
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
  
  // Actualizar UI inicial
  updateUI();
});
