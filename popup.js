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
    downloadLink.classList.add('active');
  } else if (downloadLink) {
    downloadLink.style.backgroundColor = '#ccc';
    downloadLink.style.color = '#666';
    downloadLink.style.cursor = 'not-allowed';
    downloadLink.style.pointerEvents = 'none';
    downloadLink.textContent = '📥 Descargar CSV (sin datos)';
    downloadLink.classList.remove('active');
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

// Función para generar resumen de auditoría (versión resumida)
function generateAuditSummary(data) {
  if (data.length === 0) return '<p style="color: #666; text-align: center; padding: 20px;">No hay datos extraídos</p>';
  
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
  
  let summary = '<div style="max-height: 250px; overflow-y: auto; padding: 12px; background: #ffffff; border-radius: 8px; border: 2px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 13px;">';
  
  // Hotel (nombre + habitaciones)
  if (consolidatedData.nombre_hotel) {
    const habitaciones = consolidatedData.habitaciones || 'N/A';
    summary += `<div style="color: #1565C0; font-weight: 600; margin-bottom: 10px; font-size: 14px;">🏨 ${consolidatedData.nombre_hotel} (${habitaciones} hab.)</div>`;
  }
  
  // Función helper para crear secciones compactas
  const createCompactSection = (icon, title, data, color) => {
    if (!data) return '';
    return `<div style="margin: 6px 0; padding: 4px 8px; background: ${color}20; border-radius: 4px; border-left: 3px solid ${color};">
      <span style="color: ${color}; font-weight: 600; font-size: 12px;">${icon} ${title}:</span>
      <span style="color: #333; margin-left: 5px; font-size: 12px;">${data}</span>
    </div>`;
  };
  
  // Secciones principales (solo las más importantes)
  summary += createCompactSection('📊', 'Disponibilidad', 
    `${consolidatedData.moneda_carga || 'N/A'} | USD ${consolidatedData.tarifa_mas_baja_usd || 'N/A'}`, '#2E7D32');
  
  summary += createCompactSection('🌐', 'Canales', 
    consolidatedData.canales_activos ? `${consolidatedData.canales_activos.split(';').length} activos` : 'N/A', '#E65100');
  
  summary += createCompactSection('👥', 'Usuarios', 
    consolidatedData.cantidad_usuarios ? `${consolidatedData.cantidad_usuarios} usuarios` : 'N/A', '#6A1B9A');
  
  summary += createCompactSection('💳', 'Pasarelas', 
    consolidatedData.cantidad_pasarelas_activas ? `${consolidatedData.cantidad_pasarelas_activas} activas` : 'N/A', '#C2185B');
  
  summary += createCompactSection('🔗', 'PMS', 
    consolidatedData.integracion_pms === 'Sí' ? (consolidatedData.pms_provider || 'Sí') : 'N/A', '#455A64');
  
  summary += createCompactSection('💰', 'Revenue', 
    consolidatedData.cantidad_reglas_revenue ? `${consolidatedData.cantidad_reglas_revenue} reglas` : 'N/A', '#5D4037');
  
  summary += createCompactSection('📈', 'Comparador', 
    consolidatedData.comparador_precios || 'N/A', '#D84315');
  
  summary += createCompactSection('🔍', 'Metabuscadores', 
    consolidatedData.metabuscadores || 'N/A', '#00695C');
  
  // Contador de datos extraídos
  summary += `<div style="margin-top: 10px; padding: 6px; background: #f5f5f5; border-radius: 4px; text-align: center; font-size: 11px; color: #666;">
    📋 ${data.length} módulos auditados
  </div>`;
  
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
        
        // Actualizar UI inmediatamente para mostrar progreso
        updateUI();
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

// Función para verificar conexión con content script
async function checkContentScriptConnection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para usar esta funcionalidad', true);
      return false;
    }
    
    // Intentar enviar un mensaje de prueba
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    
    if (response && response.success) {
      console.log('RoomCloud Auditor: Conexión con content script establecida');
      return true;
    } else {
      console.error('RoomCloud Auditor: No se recibió respuesta del content script');
      return false;
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error de conexión con content script:', error);
    return false;
  }
}

// Función para detectar hotel actual
async function detectCurrentHotel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para detectar el hotel', true);
      return;
    }
    
    // Verificar conexión primero
    const isConnected = await checkContentScriptConnection();
    if (!isConnected) {
      showStatus('Error: No se puede conectar con la página. Recarga la página e intenta de nuevo.', true);
      return;
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentHotel' });
    
    if (response && response.success) {
      const currentHotelDiv = document.getElementById('currentHotel');
      if (currentHotelDiv) {
        currentHotelDiv.textContent = `${response.hotel.name} (ID: ${response.hotel.id})`;
        currentHotelDiv.style.color = '#4CAF50';
      }
      console.log('RoomCloud Auditor: Hotel actual detectado:', response.hotel);
    } else {
      const currentHotelDiv = document.getElementById('currentHotel');
      if (currentHotelDiv) {
        currentHotelDiv.textContent = 'Error detectando hotel';
        currentHotelDiv.style.color = '#f44336';
      }
      console.error('RoomCloud Auditor: Error detectando hotel:', response?.error);
    }
  } catch (error) {
    console.error('RoomCloud Auditor: Error en detección de hotel:', error);
    const currentHotelDiv = document.getElementById('currentHotel');
    if (currentHotelDiv) {
      currentHotelDiv.textContent = 'Error: ' + error.message;
      currentHotelDiv.style.color = '#f44336';
    }
  }
}

// Función para cambiar hotel
async function changeHotel() {
  const newHotelIdInput = document.getElementById('newHotelId');
  const changeHotelButton = document.getElementById('changeHotelButton');
  
  if (!newHotelIdInput || !changeHotelButton) {
    showStatus('Error: Elementos de interfaz no encontrados', true);
    return;
  }
  
  const newHotelId = newHotelIdInput.value.trim();
  if (!newHotelId) {
    showStatus('Error: Debes ingresar un ID de hotel', true);
    return;
  }
  
  // Deshabilitar botón durante el proceso
  changeHotelButton.disabled = true;
  changeHotelButton.textContent = '🔄 Cambiando...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para cambiar de hotel', true);
      return;
    }
    
    // Verificar conexión primero
    const isConnected = await checkContentScriptConnection();
    if (!isConnected) {
      showStatus('Error: No se puede conectar con la página. Recarga la página e intenta de nuevo.', true);
      return;
    }
    
    showStatus('🔄 Abriendo búsqueda de hoteles...');
    
    // Abrir búsqueda de hoteles
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'openHotelSearch' });
    
    if (response && response.success) {
      showStatus('✅ Nueva ventana de búsqueda abierta. Iniciando búsqueda automática...');
      
      // Guardar hotel ID temporalmente y activar monitoreo automático
      try {
        await chrome.storage.local.set({ tempHotelId: newHotelId });
        await chrome.runtime.sendMessage({ 
          action: 'monitorHotelSearch', 
          hotelId: newHotelId 
        });
      } catch (error) {
        console.error('RoomCloud Auditor: Error activando monitoreo:', error);
      }
      
      // Mostrar instrucciones actualizadas
      const statusDiv = document.getElementById('status');
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div style="background: #E8F5E8; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; margin: 10px 0;">
            <h4 style="color: #2E7D32; margin: 0 0 10px 0;">🤖 Búsqueda Automática Activada</h4>
            <p style="color: #333333; margin: 5px 0;">1. ✅ Se abrió una nueva ventana de búsqueda</p>
            <p style="color: #333333; margin: 5px 0;">2. 🔍 Búsqueda automática iniciada para ID: <strong style="color: #D32F2F; font-size: 16px;">${newHotelId}</strong></p>
            <p style="color: #333333; margin: 5px 0;">3. ⏳ Esperando resultados de búsqueda...</p>
            <p style="color: #333333; margin: 5px 0;">4. 🎯 Si se encuentra el hotel, se seleccionará automáticamente</p>
            <p style="color: #333333; margin: 5px 0;">5. ✅ La ventana se cerrará automáticamente</p>
            <p style="color: #333333; margin: 5px 0;">6. 🔄 Regresa aquí y haz clic en "Verificar Cambio"</p>
            <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 10px; margin-top: 10px;">
              <p style="color: #E65100; margin: 0; font-size: 12px;"><strong>💡 Tip:</strong> Si la búsqueda automática falla, puedes buscar manualmente</p>
            </div>
          </div>
        `;
        statusDiv.style.display = 'block';
      }
      
      // Mostrar botón de verificación
      const verifyButton = document.getElementById('verifyHotelChangeButton');
      if (verifyButton) {
        verifyButton.style.display = 'block';
      }
      
    } else {
      showStatus('❌ Error abriendo búsqueda: ' + (response?.error || 'Error desconocido'), true);
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error cambiando hotel:', error);
    showStatus('❌ Error: ' + error.message, true);
  } finally {
    // Restaurar botón
    changeHotelButton.disabled = false;
    changeHotelButton.textContent = '🔄 Cambiar Hotel';
  }
}

// Función para verificar cambio de hotel
async function verifyHotelChange() {
  const verifyButton = document.getElementById('verifyHotelChangeButton');
  
  if (verifyButton) {
    verifyButton.disabled = true;
    verifyButton.textContent = '🔄 Verificando...';
  }
  
  try {
    // Detectar el hotel actual para verificar si cambió
    await detectCurrentHotel();
    
    // Obtener el hotel actual después del cambio
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentHotel' });
    
    if (response && response.success) {
      const newHotelIdInput = document.getElementById('newHotelId');
      const expectedId = newHotelIdInput ? newHotelIdInput.value.trim() : '';
      
      if (response.hotel.id === expectedId) {
        showStatus('✅ ¡Cambio de hotel exitoso! Hotel actual: ' + response.hotel.name, false);
        
        // Ocultar botón de verificación
        if (verifyButton) {
          verifyButton.style.display = 'none';
        }
        
        // Limpiar campo de entrada
        if (newHotelIdInput) {
          newHotelIdInput.value = '';
        }
        
        // Mostrar mensaje de éxito
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div style="background: #E8F5E8; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; margin: 10px 0;">
              <h4 style="color: #2E7D32; margin: 0 0 10px 0;">✅ Cambio Exitoso</h4>
              <p style="color: #333333; margin: 5px 0;"><strong>Hotel Actual:</strong> ${response.hotel.name}</p>
              <p style="color: #333333; margin: 5px 0;"><strong>ID:</strong> ${response.hotel.id}</p>
              <p style="color: #555555; margin: 5px 0; font-size: 12px;">Ya puedes iniciar una nueva auditoría para este hotel</p>
            </div>
          `;
          statusDiv.style.display = 'block';
        }
        
      } else {
        showStatus('❌ El hotel no cambió. ID esperado: ' + expectedId + ', ID actual: ' + response.hotel.id, true);
        
        // Mostrar mensaje de error
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div style="background: #FFEBEE; border: 2px solid #F44336; border-radius: 8px; padding: 15px; margin: 10px 0;">
              <h4 style="color: #D32F2F; margin: 0 0 10px 0;">❌ Cambio No Completado</h4>
              <p style="color: #333333; margin: 5px 0;"><strong>Hotel Actual:</strong> ${response.hotel.name}</p>
              <p style="color: #333333; margin: 5px 0;"><strong>ID Actual:</strong> ${response.hotel.id}</p>
              <p style="color: #333333; margin: 5px 0;"><strong>ID Esperado:</strong> ${expectedId}</p>
              <p style="color: #555555; margin: 5px 0; font-size: 12px;">Verifica que seleccionaste el hotel correcto en la ventana de búsqueda</p>
            </div>
          `;
          statusDiv.style.display = 'block';
        }
      }
    } else {
      showStatus('❌ Error verificando hotel: ' + (response?.error || 'Error desconocido'), true);
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error verificando cambio de hotel:', error);
    showStatus('❌ Error: ' + error.message, true);
  } finally {
    // Restaurar botón
    if (verifyButton) {
      verifyButton.disabled = false;
      verifyButton.textContent = '✅ Verificar Cambio';
    }
  }
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
  const changeHotelButton = document.getElementById('changeHotelButton');
  
  if (autoAuditButton) {
    autoAuditButton.addEventListener('click', runCompleteAudit);
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', clearData);
  }
  
  if (changeHotelButton) {
    changeHotelButton.addEventListener('click', changeHotel);
  }
  
  const verifyHotelChangeButton = document.getElementById('verifyHotelChangeButton');
  if (verifyHotelChangeButton) {
    verifyHotelChangeButton.addEventListener('click', verifyHotelChange);
  }
  
  // Configurar descarga CSV
  if (downloadLink) {
    downloadLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (!extractedData || extractedData.length === 0) {
        showStatus('No hay datos para descargar', true);
        return;
      }
      
      try {
        console.log('RoomCloud Auditor: Iniciando descarga CSV...');
        
        // Generar CSV
        const csvContent = convertToCSV(extractedData);
        
        if (!csvContent) {
          showStatus('Error: No se pudo generar el CSV', true);
          return;
        }
        
        // Crear nombre de archivo con fecha
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `roomcloud_audit_${dateStr}.csv`;
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Crear enlace temporal y hacer clic
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = filename;
        tempLink.style.display = 'none';
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        
        // Limpiar URL
        URL.revokeObjectURL(url);
        
        showStatus('✅ CSV descargado exitosamente: ' + filename);
        console.log('RoomCloud Auditor: CSV descargado:', filename);
        
      } catch (error) {
        console.error('RoomCloud Auditor: Error descargando CSV:', error);
        showStatus('❌ Error descargando CSV: ' + error.message, true);
      }
    });
  }
  
  // Detectar hotel actual al cargar
  await detectCurrentHotel();
  
  // Actualizar UI inicial
  updateUI();
});
