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

// Variables para auditoría masiva
let bulkHotelIds = [];
let bulkAuditState = {
  isRunning: false,
  currentHotelIndex: 0,
  currentBatchIndex: 0,
  totalHotels: 0,
  totalBatches: 0,
  completedHotels: 0,
  failedHotels: 0,
  batchSize: 25
};
let bulkAuditResults = [];

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
  
  // Mostrar botón de Google Sheets solo cuando la auditoría esté completada
  const sheetsButtonContainer = document.getElementById('sheetsButtonContainer');
  const copyToSheetsButton = document.getElementById('copyToSheets');
  
  if (sheetsButtonContainer && copyToSheetsButton) {
    // Solo mostrar si NO está en progreso Y hay datos extraídos
    if (!currentAuditState.isRunning && extractedData && extractedData.length > 0) {
      sheetsButtonContainer.style.display = 'block';
      copyToSheetsButton.disabled = false;
      copyToSheetsButton.style.opacity = '1';
      copyToSheetsButton.textContent = `📋 Copiar Datos (${extractedData.length})`;
    } else {
      sheetsButtonContainer.style.display = 'none';
      copyToSheetsButton.disabled = true;
      copyToSheetsButton.style.opacity = '0.6';
      copyToSheetsButton.textContent = '📋 Copiar Datos (sin datos)';
    }
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
    `${consolidatedData.moneda_carga || 'N/A'} | ${consolidatedData.tarifa_mas_baja || 'N/A'}`, '#2E7D32');
  
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
          
          // Lógica mejorada de consolidación para CSV
          if (consolidatedData[key] && consolidatedData[key] !== stringValue) {
            // Para campos numéricos, tomar el valor más alto o el último no vacío
            if (key === 'cantidad_usuarios' || key === 'cantidad_canales_activos' || 
                key === 'cantidad_pms_activos' || key === 'cantidad_pasarelas_activas' ||
                key === 'cantidad_reglas_revenue' || key === 'cantidad_hoteles_comparacion' ||
                key === 'cantidad_metabuscadores_activos') {
              const currentNum = parseInt(consolidatedData[key]) || 0;
              const newNum = parseInt(stringValue) || 0;
              consolidatedData[key] = Math.max(currentNum, newNum).toString();
            } else if (key === 'habitaciones' || key === 'estrellas') {
              // Para habitaciones y estrellas, tomar el último valor no vacío
              consolidatedData[key] = stringValue || consolidatedData[key];
            } else if (key === 'usuarios_roomcloud') {
              // Para usuarios, combinar listas únicas
              const currentUsers = consolidatedData[key].split('; ').filter(u => u && u !== 'N/A');
              const newUsers = stringValue.split('; ').filter(u => u && u !== 'N/A');
              const allUsers = [...new Set([...currentUsers, ...newUsers])];
              consolidatedData[key] = allUsers.length > 0 ? allUsers.join('; ') : 'N/A';
            } else {
              // Para otros campos, usar el último valor no vacío
              consolidatedData[key] = stringValue || consolidatedData[key];
            }
          } else {
            consolidatedData[key] = stringValue;
          }
        }
      });
    }
  });
  
  console.log('RoomCloud Auditor: Datos consolidados:', consolidatedData);
  
  // Definir el orden exacto de las columnas que necesitas
  const columnOrder = [
    'apertura', 'categoria', 'estrellas', 'habitaciones', 'id_hotel', 'nombre_hotel',
    'cierres_parciales', 'moneda_carga', 'tarifa_mas_baja', 'canales_activos',
    'cantidad_canales_activos', 'cantidad_usuarios', 'usuarios_roomcloud', 'cantidad_pms_activos',
    'integracion_pms', 'pms_provider', 'cantidad_pasarelas_activas', 'pasarelas_pago_activas',
    'cantidad_reglas_revenue', 'reglas_revenue_activas', 'cantidad_hoteles_comparacion',
    'comparador_precios', 'cantidad_metabuscadores_activos', 'metabuscadores'
  ];
  
  // Crear headers en el orden especificado
  const csvRows = [columnOrder.join(',')];
  
  // Crear fila de datos en el orden especificado
  const csvRow = columnOrder.map(column => {
    const value = consolidatedData[column] || '';
    return `"${String(value).replace(/"/g, '""')}"`;
  });
  
  csvRows.push(csvRow.join(','));
  
  const csvContent = csvRows.join('\n');
  console.log('RoomCloud Auditor: CSV generado:', csvContent);
  
  return csvContent;
}

// Función para convertir datos a formato compatible con Google Sheets (solo fila de datos, sin encabezados)
function convertToSheetsFormat(data) {
  if (!data || data.length === 0) {
    console.log('RoomCloud Auditor: No hay datos para convertir a formato Google Sheets');
    return '';
  }
  
  console.log('RoomCloud Auditor: Convirtiendo datos a formato Google Sheets:', data);
  
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
          
          // Lógica mejorada de consolidación para Google Sheets
          if (consolidatedData[key] && consolidatedData[key] !== stringValue) {
            // Para campos numéricos, tomar el valor más alto o el último no vacío
            if (key === 'cantidad_usuarios' || key === 'cantidad_canales_activos' || 
                key === 'cantidad_pms_activos' || key === 'cantidad_pasarelas_activas' ||
                key === 'cantidad_reglas_revenue' || key === 'cantidad_hoteles_comparacion' ||
                key === 'cantidad_metabuscadores_activos') {
              const currentNum = parseInt(consolidatedData[key]) || 0;
              const newNum = parseInt(stringValue) || 0;
              consolidatedData[key] = Math.max(currentNum, newNum).toString();
            } else if (key === 'habitaciones' || key === 'estrellas') {
              // Para habitaciones y estrellas, tomar el último valor no vacío
              consolidatedData[key] = stringValue || consolidatedData[key];
            } else if (key === 'usuarios_roomcloud') {
              // Para usuarios, combinar listas únicas
              const currentUsers = consolidatedData[key].split('; ').filter(u => u && u !== 'N/A');
              const newUsers = stringValue.split('; ').filter(u => u && u !== 'N/A');
              const allUsers = [...new Set([...currentUsers, ...newUsers])];
              consolidatedData[key] = allUsers.length > 0 ? allUsers.join('; ') : 'N/A';
            } else {
              // Para otros campos, usar el último valor no vacío
              consolidatedData[key] = stringValue || consolidatedData[key];
            }
          } else {
            consolidatedData[key] = stringValue;
          }
        }
      });
    }
  });
  
  console.log('RoomCloud Auditor: Datos consolidados para Google Sheets:', consolidatedData);
  
  // Definir el orden exacto de las columnas que necesitas (igual que CSV)
  const columnOrder = [
    'apertura', 'categoria', 'estrellas', 'habitaciones', 'id_hotel', 'nombre_hotel',
    'cierres_parciales', 'moneda_carga', 'tarifa_mas_baja', 'canales_activos',
    'cantidad_canales_activos', 'cantidad_usuarios', 'usuarios_roomcloud', 'cantidad_pms_activos',
    'integracion_pms', 'pms_provider', 'cantidad_pasarelas_activas', 'pasarelas_pago_activas',
    'cantidad_reglas_revenue', 'reglas_revenue_activas', 'cantidad_hoteles_comparacion',
    'comparador_precios', 'cantidad_metabuscadores_activos', 'metabuscadores'
  ];
  
  // Crear la fila de datos en el orden especificado
  const dataRow = columnOrder.map(column => {
    const value = consolidatedData[column] || '';
    // Para Google Sheets, usar tabulación como separador
    return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
  });
  
  // Unir con tabulaciones para que Google Sheets lo interprete correctamente
  const sheetsContent = dataRow.join('\t');
  console.log('RoomCloud Auditor: Formato Google Sheets generado:', sheetsContent);
  
  return sheetsContent;
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
      const waitTime = 3000;
      showStatus(`Esperando ${waitTime/1000} segundos para que cargue: ${page.name}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      showStatus(`Extrayendo datos de: ${page.name}...`);
      
      // Para Revenue Management, verificar que la tabla esté cargada antes de extraer
      if (page.name === 'Revenue Management') {
        showStatus('Verificando que la tabla de Revenue Management esté cargada...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar que la página esté lista
        try {
          const checkResponse = await chrome.tabs.sendMessage(tab.id, { action: 'checkPageReady' });
          if (checkResponse && !checkResponse.ready) {
            showStatus('Esperando más tiempo para que cargue la tabla de Revenue...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (checkError) {
          console.log('RoomCloud Auditor: No se pudo verificar estado de página, continuando...');
        }
      }
      
      // Extraer datos usando la función wrapper robusta
      try {
        const response = await sendMessageToContentScript(tab.id, { action: 'extractData' });
        
        if (response && response.success) {
          // Debug: mostrar datos extraídos en consola del popup
          console.log(`RoomCloud Auditor: Datos extraídos de ${page.name}:`, response.data);
          
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
      } catch (extractError) {
        console.error(`RoomCloud Auditor: Error extrayendo datos de ${page.name}:`, extractError);
        showStatus(`❌ ${page.name}: ${extractError.message}`, true);
        
        // Continuar con la siguiente página en lugar de detener toda la auditoría
        continue;
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
    
    // Debug: mostrar todos los datos extraídos
    console.log('RoomCloud Auditor: === TODOS LOS DATOS EXTRAÍDOS ===');
    console.log('RoomCloud Auditor: Total de registros:', extractedData.length);
    extractedData.forEach((item, index) => {
      console.log(`RoomCloud Auditor: Registro ${index + 1} (${item.pagina_actual}):`, item);
    });
    console.log('RoomCloud Auditor: === FIN TODOS LOS DATOS ===');
    
    // Auditoría completada - el botón de Google Sheets se mostrará automáticamente
    
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

// Función para copiar datos al portapapeles en formato Google Sheets
async function copyToSheets() {
  if (!extractedData || extractedData.length === 0) {
    showStatus('No hay datos para copiar', true);
    return;
  }
  
  try {
    console.log('RoomCloud Auditor: Copiando datos al portapapeles...');
    
    // Generar formato para Google Sheets
    const sheetsContent = convertToSheetsFormat(extractedData);
    
    if (!sheetsContent) {
      showStatus('Error: No se pudo generar el contenido para Google Sheets', true);
      return;
    }
    
    // Copiar al portapapeles usando la API moderna
    try {
      await navigator.clipboard.writeText(sheetsContent);
      showStatus('✅ Datos copiados al portapapeles. Puedes pegarlos directamente en Google Sheets.');
      console.log('RoomCloud Auditor: Datos copiados al portapapeles:', sheetsContent);
    } catch (clipboardError) {
      console.error('RoomCloud Auditor: Error con clipboard API:', clipboardError);
      
      // Fallback: usar método tradicional
      const textArea = document.createElement('textarea');
      textArea.value = sheetsContent;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        showStatus('✅ Datos copiados al portapapeles. Puedes pegarlos directamente en Google Sheets.');
        console.log('RoomCloud Auditor: Datos copiados al portapapeles (fallback):', sheetsContent);
      } catch (execCommandError) {
        console.error('RoomCloud Auditor: Error con execCommand:', execCommandError);
        showStatus('❌ Error copiando al portapapeles: ' + execCommandError.message, true);
        return;
      } finally {
        document.body.removeChild(textArea);
      }
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error copiando datos:', error);
    showStatus('❌ Error: ' + error.message, true);
  }
}

// Función robusta para verificar conexión con content script (compatible con Windows)
async function checkContentScriptConnection(maxRetries = 3) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para usar esta funcionalidad', true);
      return false;
    }
    
    // Intentar múltiples veces con delays (especialmente útil en Windows)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`RoomCloud Auditor: Intento ${attempt}/${maxRetries} de conexión con content script`);
        
        // Intentar enviar un mensaje de prueba
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        
        if (response && response.success) {
          console.log('RoomCloud Auditor: Conexión con content script establecida');
          return true;
        } else {
          console.warn(`RoomCloud Auditor: Intento ${attempt}: No se recibió respuesta del content script`);
        }
        
      } catch (error) {
        console.warn(`RoomCloud Auditor: Intento ${attempt}: Error de conexión:`, error.message);
        
        // Si es el último intento, mostrar error específico
        if (attempt === maxRetries) {
          if (error.message.includes('Receiving end does not exist')) {
            console.error('RoomCloud Auditor: Content script no disponible. Posibles causas:');
            console.error('- La página se recargó recientemente');
            console.error('- El content script no se inyectó correctamente');
            console.error('- Problema de timing en Windows');
            
            showStatus('Error: Content script no disponible. Intenta recargar la página de RoomCloud', true);
          } else {
            console.error('RoomCloud Auditor: Error de conexión con content script:', error);
            showStatus('Error: No se pudo conectar con la página. Verifica que estés en RoomCloud', true);
          }
          return false;
        }
      }
      
      // Esperar antes del siguiente intento (más tiempo en Windows)
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.log(`RoomCloud Auditor: Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error general de conexión:', error);
    showStatus('Error: No se pudo verificar la conexión', true);
    return false;
  }
}

// Función de diagnóstico para usuarios con problemas de conexión
async function runDiagnostic() {
  try {
    console.log('RoomCloud Auditor: Iniciando diagnóstico de conexión...');
    showStatus('🔧 Ejecutando diagnóstico...');
    
    // Obtener información de la pestaña actual
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('❌ Error: No se pudo obtener información de la pestaña', true);
      return;
    }
    
    console.log('RoomCloud Auditor: Información de pestaña:', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      status: tab.status
    });
    
    // Verificar si estamos en RoomCloud
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('❌ Error: No estás en RoomCloud. Navega a https://secure.roomcloud.net', true);
      return;
    }
    
    showStatus('✅ Pestaña de RoomCloud detectada. Verificando content script...');
    
    // Verificar conexión con content script
    const connectionOk = await checkContentScriptConnection(5); // 5 intentos para diagnóstico
    
    if (connectionOk) {
      showStatus('✅ Diagnóstico completado: Todo funciona correctamente');
      
      // Mostrar información adicional
      try {
        const hotelInfo = await sendMessageToContentScript(tab.id, { action: 'getCurrentHotel' });
        if (hotelInfo && hotelInfo.success) {
          showStatus(`✅ Hotel detectado: ${hotelInfo.data.name} (ID: ${hotelInfo.data.id})`);
        }
      } catch (hotelError) {
        console.warn('RoomCloud Auditor: No se pudo obtener información del hotel:', hotelError);
      }
      
    } else {
      showStatus('❌ Diagnóstico: Problema de conexión detectado. Intenta recargar la página', true);
      
      // Mostrar instrucciones específicas
      console.log('RoomCloud Auditor: Instrucciones para el usuario:');
      console.log('1. Recarga la página de RoomCloud (F5 o Ctrl+R)');
      console.log('2. Espera a que la página cargue completamente');
      console.log('3. Ejecuta el diagnóstico nuevamente');
      console.log('4. Si persiste, reinicia Chrome');
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error en diagnóstico:', error);
    showStatus(`❌ Error en diagnóstico: ${error.message}`, true);
  }
}

// Función para reinyectar el content script si es necesario
async function reinjectContentScript(tabId) {
  try {
    console.log('RoomCloud Auditor: Intentando reinyectar content script...');
    
    // Inyectar el content script manualmente
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    console.log('RoomCloud Auditor: Content script reinyectado exitosamente');
    
    // Esperar un momento para que se inicialice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('RoomCloud Auditor: Error reinyectando content script:', error);
    return false;
  }
}

// Función wrapper para enviar mensajes al content script con manejo robusto de errores
async function sendMessageToContentScript(tabId, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`RoomCloud Auditor: Enviando mensaje (intento ${attempt}/${maxRetries}):`, message.action);
      const response = await chrome.tabs.sendMessage(tabId, message);
      
      if (response) {
        console.log('RoomCloud Auditor: Respuesta recibida:', response);
        return response;
      } else {
        console.warn(`RoomCloud Auditor: Intento ${attempt}: No se recibió respuesta`);
      }
      
    } catch (error) {
      console.warn(`RoomCloud Auditor: Intento ${attempt}: Error enviando mensaje:`, error.message);
      
      // Si es error de "Receiving end does not exist" y no es el último intento, intentar reinyectar
      if (error.message.includes('Receiving end does not exist') && attempt < maxRetries) {
        console.log('RoomCloud Auditor: Content script no disponible, intentando reinyectar...');
        const reinjected = await reinjectContentScript(tabId);
        
        if (reinjected) {
          console.log('RoomCloud Auditor: Content script reinyectado, continuando...');
          // Continuar con el siguiente intento después de reinyectar
          continue;
        }
      }
      
      if (attempt === maxRetries) {
        if (error.message.includes('Receiving end does not exist')) {
          throw new Error('Content script no disponible después de múltiples intentos. Intenta recargar la página de RoomCloud.');
        } else {
          throw new Error(`Error de comunicación: ${error.message}`);
        }
      }
      
      // Esperar antes del siguiente intento
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s
        console.log(`RoomCloud Auditor: Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error('No se pudo enviar mensaje después de múltiples intentos');
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

// ===== FUNCIONES DE AUDITORÍA MASIVA =====

// Función para cargar IDs de hoteles
function loadBulkHotelIds() {
  const textarea = document.getElementById('bulkHotelIds');
  const loadButton = document.getElementById('loadBulkIdsButton');
  const startButton = document.getElementById('startBulkAuditButton');
  const statsDiv = document.getElementById('bulkStats');
  const statsText = document.getElementById('bulkStatsText');
  
  if (!textarea || !loadButton || !startButton || !statsDiv || !statsText) {
    showStatus('Error: Elementos de interfaz no encontrados', true);
    return;
  }
  
  const inputText = textarea.value.trim();
  if (!inputText) {
    showStatus('Error: Debes ingresar al menos un ID de hotel', true);
    return;
  }
  
  // Procesar IDs
  const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const validIds = lines.filter(id => /^\d+$/.test(id));
  
  if (validIds.length === 0) {
    showStatus('Error: No se encontraron IDs válidos', true);
    return;
  }
  
  // Guardar IDs y calcular lotes
  bulkHotelIds = validIds;
  bulkAuditState.totalHotels = validIds.length;
  bulkAuditState.totalBatches = Math.ceil(validIds.length / bulkAuditState.batchSize);
  
  // Mostrar estadísticas
  statsText.textContent = `IDs cargados: ${validIds.length} | Lotes: ${bulkAuditState.totalBatches} (${bulkAuditState.batchSize} por lote)`;
  statsDiv.style.display = 'block';
  
  // Habilitar botón de inicio
  startButton.style.display = 'block';
  
  showStatus(`✅ ${validIds.length} IDs cargados exitosamente`);
  console.log('RoomCloud Auditor: IDs cargados:', validIds);
}

// Función eliminada - ya no necesitamos mostrar páginas calculadas

// Función para iniciar auditoría masiva
async function startBulkAudit() {
  if (bulkAuditState.isRunning) {
    showStatus('Auditoría masiva ya en progreso...', true);
    return;
  }
  
  if (bulkHotelIds.length === 0) {
    showStatus('Error: No hay IDs cargados', true);
    return;
  }
  
  // Verificar conexión con content script
  const isConnected = await checkContentScriptConnection();
  if (!isConnected) {
    showStatus('Error: No se pudo conectar con RoomCloud. Recarga la página e intenta de nuevo.', true);
    return;
  }
  
  // Inicializar estado
  bulkAuditState.isRunning = true;
  bulkAuditState.currentHotelIndex = 0;
  bulkAuditState.currentBatchIndex = 0;
  bulkAuditState.completedHotels = 0;
  bulkAuditState.failedHotels = 0;
  bulkAuditResults = [];
  
  // Actualizar UI
  updateBulkUI();
  
  showStatus('🚀 Abriendo panel de auditoría masiva...');
  console.log('RoomCloud Auditor: Abriendo panel de auditoría masiva para', bulkHotelIds.length, 'hoteles');
  console.log('RoomCloud Auditor: Datos a enviar:', { hotelIds: bulkHotelIds, auditState: bulkAuditState });
  
  try {
    // Abrir panel de auditoría masiva en nueva pestaña
    const response = await chrome.runtime.sendMessage({ 
      action: 'openBulkAuditPanel', 
      hotelIds: bulkHotelIds, 
      auditState: bulkAuditState 
    });
    
    console.log('RoomCloud Auditor: Respuesta del background:', response);
    
    if (response && response.success) {
      showStatus('✅ Panel de auditoría masiva abierto correctamente');
    } else {
      showStatus('❌ Error al abrir panel de auditoría masiva', true);
    }
  } catch (error) {
    console.error('RoomCloud Auditor: Error enviando mensaje:', error);
    showStatus('❌ Error al abrir panel de auditoría masiva: ' + error.message, true);
  }
}

// Función de test para abrir panel directamente
async function testOpenPanel() {
  console.log('RoomCloud Auditor: Test - Abriendo panel directamente...');
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'openBulkAuditPanel', 
      hotelIds: ['1018', '1041', '1218'], 
      auditState: { isRunning: false } 
    });
    
    console.log('RoomCloud Auditor: Test - Respuesta:', response);
    showStatus('Test completado - Revisa la consola');
  } catch (error) {
    console.error('RoomCloud Auditor: Test - Error:', error);
    showStatus('Test falló: ' + error.message, true);
  }
}

// Función para procesar auditoría masiva
async function processBulkAudit() {
  try {
    // Guardar estado inicial en storage para persistencia
    await chrome.storage.local.set({
      bulkAuditState: bulkAuditState,
      bulkHotelIds: bulkHotelIds,
      bulkAuditResults: bulkAuditResults
    });
    
    for (let batchIndex = 0; batchIndex < bulkAuditState.totalBatches; batchIndex++) {
      bulkAuditState.currentBatchIndex = batchIndex;
      
      const startIndex = batchIndex * bulkAuditState.batchSize;
      const endIndex = Math.min(startIndex + bulkAuditState.batchSize, bulkHotelIds.length);
      const batchIds = bulkHotelIds.slice(startIndex, endIndex);
      
      console.log(`RoomCloud Auditor: Procesando lote ${batchIndex + 1}/${bulkAuditState.totalBatches} (hoteles ${startIndex + 1}-${endIndex})`);
      
      // Procesar cada hotel en el lote
      for (let i = 0; i < batchIds.length; i++) {
        if (!bulkAuditState.isRunning) {
          console.log('RoomCloud Auditor: Auditoría masiva cancelada');
          break;
        }
        
        const hotelId = batchIds[i];
        const globalIndex = startIndex + i;
        
        bulkAuditState.currentHotelIndex = globalIndex;
        
        // Guardar estado actual en storage
        await chrome.storage.local.set({
          bulkAuditState: bulkAuditState,
          currentHotelId: hotelId,
          currentHotelIndex: globalIndex
        });
        
        updateBulkUI();
        
        console.log(`RoomCloud Auditor: Procesando hotel ${globalIndex + 1}/${bulkHotelIds.length} (ID: ${hotelId})`);
        
        try {
          // Calcular página del hotel ANTES de cambiar
          const targetPage = calculateHotelPage(hotelId);
          console.log(`RoomCloud Auditor: Hotel ${hotelId} → Página ${targetPage}`);
          
          // Cambiar al hotel con información de página
          console.log(`RoomCloud Auditor: Iniciando cambio a hotel ${hotelId}...`);
          await changeToHotel(hotelId, targetPage);
          console.log(`RoomCloud Auditor: Cambio a hotel ${hotelId} completado exitosamente`);
          
          // Pausa después del cambio para asegurar que la página esté lista
          console.log(`RoomCloud Auditor: Esperando 3 segundos antes de iniciar auditoría...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Ejecutar auditoría completa
          console.log(`RoomCloud Auditor: Iniciando auditoría para hotel ${hotelId}...`);
          const auditResult = await runSingleHotelAudit(hotelId);
          
          // Guardar resultado
          bulkAuditResults.push(auditResult);
          bulkAuditState.completedHotels++;
          
          // Guardar resultados actualizados
          await chrome.storage.local.set({
            bulkAuditResults: bulkAuditResults,
            bulkAuditState: bulkAuditState
          });
          
          console.log(`RoomCloud Auditor: Hotel ${hotelId} completado exitosamente`);
          
        } catch (error) {
          console.error(`RoomCloud Auditor: Error procesando hotel ${hotelId}:`, error);
          
          // Guardar resultado de error
          bulkAuditResults.push({
            id_hotel: hotelId,
            nombre_hotel: 'N/A',
            estado_auditoria: 'ERROR',
            error_mensaje: error.message,
            fecha_auditoria: new Date().toISOString()
          });
          
          bulkAuditState.failedHotels++;
          
          // Guardar estado actualizado
          await chrome.storage.local.set({
            bulkAuditResults: bulkAuditResults,
            bulkAuditState: bulkAuditState
          });
        }
        
        // Pausa entre hoteles
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Pausa entre lotes
      if (batchIndex < bulkAuditState.totalBatches - 1) {
        console.log('RoomCloud Auditor: Pausa entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
      }
    }
    
    // Auditoría masiva completada
    bulkAuditState.isRunning = false;
    updateBulkUI();
    
    showStatus(`✅ Auditoría masiva completada: ${bulkAuditState.completedHotels} exitosos, ${bulkAuditState.failedHotels} fallidos`);
    
    // Generar CSV consolidado
    await generateBulkCSV();
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error en auditoría masiva:', error);
    bulkAuditState.isRunning = false;
    updateBulkUI();
    showStatus('❌ Error en auditoría masiva: ' + error.message, true);
  }
}

// Función para cambiar a un hotel específico
async function changeToHotel(hotelId, targetPage = null) {
  console.log(`RoomCloud Auditor: Cambiando a hotel ${hotelId}...`);
  
  // Guardar ID temporal y página objetivo
  await chrome.storage.local.set({ 
    tempHotelId: hotelId,
    targetPage: targetPage 
  });
  
  // Obtener pestaña activa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Enviar mensaje para abrir búsqueda de hotel
  const response = await chrome.tabs.sendMessage(tab.id, { action: 'openHotelSearch' });
  
  if (!response || !response.success) {
    throw new Error('No se pudo abrir la búsqueda de hotel');
  }
  
  // Activar monitoreo de la ventana de búsqueda
  console.log(`RoomCloud Auditor: Activando monitoreo para hotel ${hotelId}...`);
  await chrome.runtime.sendMessage({ action: 'monitorHotelSearch', hotelId: hotelId });
  
  // Esperar a que se complete el cambio usando polling
  console.log(`RoomCloud Auditor: Esperando cambio a hotel ${hotelId}...`);
  
  let attempts = 0;
  const maxAttempts = 60; // 60 intentos * 2 segundos = 2 minutos máximo
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
    
    try {
      // Verificar que el cambio fue exitoso
      const verifyResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentHotel' });
      
      if (verifyResponse && verifyResponse.success) {
        if (verifyResponse.hotel.id === hotelId.toString()) {
          console.log(`RoomCloud Auditor: Cambio exitoso a hotel ${hotelId} después de ${attempts + 1} intentos`);
          return; // Cambio exitoso
        }
      }
    } catch (error) {
      console.log(`RoomCloud Auditor: Error verificando hotel (intento ${attempts + 1}):`, error.message);
    }
    
    attempts++;
    console.log(`RoomCloud Auditor: Intento ${attempts}/${maxAttempts} - Hotel actual no coincide con ${hotelId}`);
  }
  
  // Si llegamos aquí, el cambio no fue exitoso
  throw new Error(`No se pudo cambiar al hotel ${hotelId} después de ${maxAttempts} intentos`);
}

// Función para verificar que la pestaña esté activa y en RoomCloud
async function verifyTabActive() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('secure.roomcloud.net')) {
    throw new Error('La pestaña activa no está en RoomCloud');
  }
  
  return tab;
}

// Función para ejecutar auditoría de un solo hotel
async function runSingleHotelAudit(hotelId) {
  console.log(`RoomCloud Auditor: Ejecutando auditoría para hotel ${hotelId}...`);
  
  // Buscar la pestaña de RoomCloud (no necesariamente la activa)
  const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
  let tab = null;
  
  // Buscar la pestaña principal de RoomCloud (no la de búsqueda)
  for (const t of tabs) {
    if (t.url.includes('secure.roomcloud.net') && !t.url.includes('HotelsList.jsp')) {
      tab = t;
      break;
    }
  }
  
  if (!tab) {
    throw new Error('No se encontró la pestaña principal de RoomCloud después del cambio de hotel');
  }
  
  console.log(`RoomCloud Auditor: Pestaña de RoomCloud encontrada: ${tab.url}`);
  
  // Activar la pestaña de RoomCloud
  await chrome.tabs.update(tab.id, { active: true });
  console.log(`RoomCloud Auditor: Pestaña de RoomCloud activada`);
  
  // Esperar un momento para que la pestaña se active completamente
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verificar conexión con content script después del cambio de hotel
  let connectionVerified = false;
  console.log('RoomCloud Auditor: Verificando conexión con content script...');
  
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      console.log(`RoomCloud Auditor: Intento ${attempt + 1} de verificar conexión...`);
      const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      if (pingResponse && pingResponse.success) {
        connectionVerified = true;
        console.log('RoomCloud Auditor: Conexión con content script verificada exitosamente');
        break;
      }
    } catch (error) {
      console.log(`RoomCloud Auditor: Intento ${attempt + 1} falló: ${error.message}`);
      // Esperar más tiempo entre intentos
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!connectionVerified) {
    console.error('RoomCloud Auditor: No se pudo establecer conexión con el content script');
    console.log('RoomCloud Auditor: Intentando recargar el content script...');
    
    // Intentar recargar el content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('RoomCloud Auditor: Content script recargado');
      
      // Esperar un poco más y verificar de nuevo
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalPingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      if (finalPingResponse && finalPingResponse.success) {
        connectionVerified = true;
        console.log('RoomCloud Auditor: Conexión establecida después de recargar content script');
      }
    } catch (reloadError) {
      console.error('RoomCloud Auditor: Error recargando content script:', reloadError);
    }
  }
  
  if (!connectionVerified) {
    throw new Error('No se pudo establecer conexión con el content script después del cambio de hotel');
  }
  
  const hotelData = {
    id_hotel: hotelId,
    nombre_hotel: 'N/A',
    estado_auditoria: 'COMPLETADO',
    fecha_auditoria: new Date().toISOString()
  };
  
  console.log(`RoomCloud Auditor: Iniciando extracción de datos para hotel ${hotelId}`);
  console.log(`RoomCloud Auditor: Total de páginas a auditar: ${auditPages.length}`);
  
  // Extraer datos de cada página
  for (let i = 0; i < auditPages.length; i++) {
    const page = auditPages[i];
    console.log(`RoomCloud Auditor: Procesando página ${i + 1}/${auditPages.length}: ${page.name}`);
    
    try {
      console.log(`RoomCloud Auditor: Navegando a ${page.name} (${page.url})`);
      
      // Navegar a la página
      await chrome.tabs.update(tab.id, { url: page.url });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar que la página cargó correctamente
      const tabInfo = await chrome.tabs.get(tab.id);
      if (tabInfo.status !== 'complete') {
        console.log('RoomCloud Auditor: Esperando a que la página cargue completamente...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Extraer datos
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      
      if (response && response.success) {
        console.log(`RoomCloud Auditor: Datos extraídos de ${page.name}:`, response.data);
        
        // Consolidar datos en hotelData
        Object.assign(hotelData, response.data);
        
        // Obtener nombre del hotel si no se ha obtenido
        if (hotelData.nombre_hotel === 'N/A' && response.data.nombre_hotel) {
          hotelData.nombre_hotel = response.data.nombre_hotel;
        }
      } else {
        console.log(`RoomCloud Auditor: No se pudieron extraer datos de ${page.name}`);
      }
      
    } catch (error) {
      console.error(`RoomCloud Auditor: Error en página ${page.name}:`, error);
    }
  }
  
  console.log(`RoomCloud Auditor: Auditoría completada para hotel ${hotelId}:`, hotelData);
  console.log(`RoomCloud Auditor: Retornando datos del hotel ${hotelId}`);
  return hotelData;
}

// Función para verificar y restaurar estado de auditoría masiva
async function checkAndRestoreBulkAuditState() {
  try {
    const result = await chrome.storage.local.get([
      'bulkAuditState', 
      'bulkHotelIds', 
      'bulkAuditResults', 
      'currentHotelId', 
      'currentHotelIndex'
    ]);
    
    if (result.bulkAuditState && result.bulkAuditState.isRunning) {
      console.log('RoomCloud Auditor: Auditoría masiva en progreso detectada, restaurando estado...');
      
      // Restaurar estado
      bulkAuditState = result.bulkAuditState;
      bulkHotelIds = result.bulkHotelIds || [];
      bulkAuditResults = result.bulkAuditResults || [];
      
      // Actualizar UI
      updateBulkUI();
      
      // Si hay un hotel actual en progreso, continuar
      if (result.currentHotelId && result.currentHotelIndex !== undefined) {
        console.log(`RoomCloud Auditor: Continuando auditoría para hotel ${result.currentHotelId}...`);
        
        // Esperar un momento para que la página esté lista
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Continuar con la auditoría del hotel actual
        try {
          const auditResult = await runSingleHotelAudit(result.currentHotelId);
          
          // Guardar resultado
          bulkAuditResults.push(auditResult);
          bulkAuditState.completedHotels++;
          
          // Guardar estado actualizado
          await chrome.storage.local.set({
            bulkAuditResults: bulkAuditResults,
            bulkAuditState: bulkAuditState
          });
          
          console.log(`RoomCloud Auditor: Hotel ${result.currentHotelId} completado después del refresh`);
          
          // Continuar con el siguiente hotel
          await processBulkAudit();
          
        } catch (error) {
          console.error(`RoomCloud Auditor: Error continuando auditoría para hotel ${result.currentHotelId}:`, error);
          
          // Marcar como fallido y continuar
          bulkAuditResults.push({
            id_hotel: result.currentHotelId,
            nombre_hotel: 'N/A',
            estado_auditoria: 'ERROR',
            error_mensaje: error.message,
            fecha_auditoria: new Date().toISOString()
          });
          
          bulkAuditState.failedHotels++;
          
          // Guardar estado y continuar
          await chrome.storage.local.set({
            bulkAuditResults: bulkAuditResults,
            bulkAuditState: bulkAuditState
          });
          
          await processBulkAudit();
        }
      } else {
        // Continuar desde donde se quedó
        await processBulkAudit();
      }
    }
  } catch (error) {
    console.error('RoomCloud Auditor: Error restaurando estado de auditoría masiva:', error);
  }
}

// Función para actualizar UI de auditoría masiva
function updateBulkUI() {
  const startButton = document.getElementById('startBulkAuditButton');
  const progressDiv = document.getElementById('bulkProgress');
  const progressText = document.getElementById('bulkProgressText');
  
  if (bulkAuditState.isRunning) {
    if (startButton) {
      startButton.textContent = '🔄 Auditoría Masiva en Progreso...';
      startButton.disabled = true;
      startButton.style.backgroundColor = '#ff9800';
    }
    
    if (progressDiv && progressText) {
      const currentHotel = bulkAuditState.currentHotelIndex + 1;
      const currentBatch = bulkAuditState.currentBatchIndex + 1;
      
      progressText.textContent = `Hotel ${currentHotel} de ${bulkAuditState.totalHotels} (Lote ${currentBatch}/${bulkAuditState.totalBatches}) | Completados: ${bulkAuditState.completedHotels} | Fallidos: ${bulkAuditState.failedHotels}`;
      progressDiv.style.display = 'block';
    }
  } else {
    if (startButton) {
      startButton.textContent = '🚀 Iniciar Auditoría Masiva';
      startButton.disabled = false;
      startButton.style.backgroundColor = '#4CAF50';
    }
    
    if (progressDiv) {
      progressDiv.style.display = 'none';
    }
  }
}

// Función para generar CSV de auditoría masiva
async function generateBulkCSV() {
  if (bulkAuditResults.length === 0) {
    showStatus('No hay resultados para generar CSV', true);
    return;
  }
  
  try {
    console.log('RoomCloud Auditor: Generando CSV de auditoría masiva...');
    
    // Crear CSV con todos los resultados
    const headers = [
      'id_hotel', 'nombre_hotel', 'estado_auditoria', 'categoria', 'estrellas', 'habitaciones',
      'moneda_carga', 'tarifa_mas_baja_usd', 'cierres_parciales', 'canales_activos', 'cantidad_usuarios',
      'integracion_pms', 'pms_provider', 'cantidad_pasarelas_activas', 'cantidad_reglas_revenue',
      'comparador_precios', 'metabuscadores', 'fecha_auditoria', 'error_mensaje'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const result of bulkAuditResults) {
      const row = headers.map(header => {
        const value = result[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Crear nombre de archivo con fecha
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `roomcloud_bulk_audit_${dateStr}.csv`;
    
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
    
    showStatus(`✅ CSV de auditoría masiva descargado: ${filename}`);
    console.log('RoomCloud Auditor: CSV de auditoría masiva generado:', filename);
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error generando CSV de auditoría masiva:', error);
    showStatus('❌ Error generando CSV: ' + error.message, true);
  }
}

// Función para crear índice de hoteles basado en search.html
function createHotelIndex() {
  // DataSet extraído del search.html - 20 hoteles por página
  const hotelIndex = {
    // Página 1 (hoteles 1-20)
    18411: 1, 19483: 1, 6825: 1, 7249: 1, 16797: 1, 19448: 1, 19146: 1, 18722: 1, 12049: 1, 16340: 1,
    13157: 1, 3131: 1, 19522: 1, 13980: 1, 15120: 1, 19498: 1, 19485: 1, 19147: 1, 19499: 1, 18420: 1,
    
    // Página 2 (hoteles 21-40) - basado en el patrón del dataSet
    21347: 2, 13677: 2, 19484: 2, 19486: 2, 19487: 2, 19488: 2, 19489: 2, 19490: 2, 19491: 2, 19492: 2,
    19493: 2, 19494: 2, 19495: 2, 19496: 2, 19497: 2, 19500: 2, 19501: 2, 19502: 2, 19503: 2, 19504: 2,
    
    // Página 3 (hoteles 41-60)
    19505: 3, 19506: 3, 19507: 3, 19508: 3, 19509: 3, 19510: 3, 19511: 3, 19512: 3, 19513: 3, 19514: 3,
    19515: 3, 19516: 3, 19517: 3, 19518: 3, 19519: 3, 19520: 3, 19521: 3, 19523: 3, 19524: 3, 19525: 3,
    
    // Página 4 (hoteles 61-80)
    19526: 4, 19527: 4, 19528: 4, 19529: 4, 19530: 4, 19531: 4, 19532: 4, 19533: 4, 19534: 4, 19535: 4,
    19536: 4, 19537: 4, 19538: 4, 19539: 4, 19540: 4, 19541: 4, 19542: 4, 19543: 4, 19544: 4, 19545: 4,
    
    // Página 5 (hoteles 81-100)
    19546: 5, 19547: 5, 19548: 5, 19549: 5, 19550: 5, 19551: 5, 19552: 5, 19553: 5, 19554: 5, 19555: 5,
    19556: 5, 19557: 5, 19558: 5, 19559: 5, 19560: 5, 19561: 5, 19562: 5, 19563: 5, 19564: 5, 19565: 5
  };
  
  return hotelIndex;
}

// Función para calcular la página de un hotel específico
function calculateHotelPage(hotelId) {
  const hotelIndex = createHotelIndex();
  
  // Si el hotel está en nuestro índice, devolver la página
  if (hotelIndex[hotelId]) {
    console.log(`RoomCloud Auditor: Hotel ${hotelId} encontrado en página ${hotelIndex[hotelId]}`);
    return hotelIndex[hotelId];
  }
  
  // Si no está en el índice, calcular basado en el patrón (20 hoteles por página)
  // Asumiendo que los IDs están ordenados secuencialmente
  const estimatedPage = Math.floor(hotelId / 20) + 1;
  console.log(`RoomCloud Auditor: Hotel ${hotelId} estimado en página ${estimatedPage}`);
  return estimatedPage;
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('RoomCloud Auditor: Popup cargado');
  
  // Cargar estado guardado
  await loadSavedState();
  
  // Configurar event listeners
  const autoAuditButton = document.getElementById('autoAuditButton');
  const diagnosticLink = document.getElementById('diagnosticLink');
  const clearButton = document.getElementById('clearData');
  const copyToSheetsButton = document.getElementById('copyToSheets');
  const changeHotelButton = document.getElementById('changeHotelButton');
  const loadBulkIdsButton = document.getElementById('loadBulkIdsButton');
  const startBulkAuditButton = document.getElementById('startBulkAuditButton');
  
  if (autoAuditButton) {
    autoAuditButton.addEventListener('click', runCompleteAudit);
  }
  
  if (diagnosticLink) {
    diagnosticLink.addEventListener('click', function(e) {
      e.preventDefault();
      runDiagnostic();
    });
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', clearData);
  }
  
  if (copyToSheetsButton) {
    copyToSheetsButton.addEventListener('click', copyToSheets);
  }
  
  if (changeHotelButton) {
    changeHotelButton.addEventListener('click', changeHotel);
  }
  
  const verifyHotelChangeButton = document.getElementById('verifyHotelChangeButton');
  if (verifyHotelChangeButton) {
    verifyHotelChangeButton.addEventListener('click', verifyHotelChange);
  }
  
  // Event listeners para auditoría masiva
  if (loadBulkIdsButton) {
    loadBulkIdsButton.addEventListener('click', loadBulkHotelIds);
  }
  
  if (startBulkAuditButton) {
    startBulkAuditButton.addEventListener('click', startBulkAudit);
  }
  
  const testPanelButton = document.getElementById('testPanelButton');
  if (testPanelButton) {
    testPanelButton.addEventListener('click', testOpenPanel);
  }
  

  
  // Detectar hotel actual al cargar
  await detectCurrentHotel();
  
  // Actualizar UI inicial
  updateUI();
  
  // Verificar si hay una auditoría masiva en progreso
  await checkAndRestoreBulkAuditState();
});

// Función de test para abrir panel directamente
async function testOpenPanel() {
  console.log('RoomCloud Auditor: Test - Abriendo panel directamente...');
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'openBulkAuditPanel', 
      hotelIds: ['1018', '1041', '1218'], 
      auditState: { isRunning: false } 
    });
    
    console.log('RoomCloud Auditor: Test - Respuesta:', response);
    showStatus('Test completado - Revisa la consola');
  } catch (error) {
    console.error('RoomCloud Auditor: Test - Error:', error);
    showStatus('Test falló: ' + error.message, true);
  }
}
