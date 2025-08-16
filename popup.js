// Variables globales
let extractedData = [];
let auditInProgress = false;
let currentAuditPage = 0;
let auditPages = [
  {
    name: 'Detalles del Hotel',
    url: '/contentHotel.jsp?item=property_detail',
    type: 'property_detail'
  },
  {
    name: 'Inventario/Disponibilidad',
    url: '/availability_r2.jsp?item=availability',
    type: 'availability'
  },
  {
    name: 'Canales',
    url: '/config.jsp?item=cm_channels',
    type: 'channels'
  },
  {
    name: 'Usuarios',
    url: '/users_list.jsp?item=users_list',
    type: 'users_list'
  },
  {
    name: 'Integración PMS',
    url: '/hotel_automation_config.jsp?item=automation',
    type: 'automation'
  },
  {
    name: 'Pasarelas de Pago',
    url: '/payment_gateways_hotel.jsp?item=payment_gateways',
    type: 'payment_gateways'
  },
  {
    name: 'Revenue Management',
    url: '/revenue_management_calendar.jsp?item=revenue_calendar',
    type: 'revenue_calendar'
  },
  {
    name: 'Reglas de Negocio',
    url: '/business_rules_list.jsp?item=rules',
    type: 'rules'
  },
  {
    name: 'Comparador',
    url: '/comparison.jsp?item=comparison',
    type: 'comparison'
  },
  {
    name: 'Metabuscadores',
    url: '/meta_dashboard.jsp?item=meta_dashboard',
    type: 'meta_dashboard'
  }
];

// Función para mostrar estados
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Ocultar después de 5 segundos para mensajes de éxito
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Función para automatización completa de auditoría
async function runCompleteAudit() {
  console.log('RoomCloud Auditor: Función runCompleteAudit iniciada');
  
  if (auditInProgress) {
    console.log('RoomCloud Auditor: Auditoría ya en progreso');
    showStatus('Auditoría ya en progreso', 'error');
    return;
  }
  
  auditInProgress = true;
  currentAuditPage = 0;
  extractedData = []; // Limpiar datos anteriores
  
  console.log('RoomCloud Auditor: Iniciando auditoría automatizada completa');
  showStatus('🚀 Iniciando auditoría automatizada completa...', 'info');
  
  try {
    // Obtener la pestaña activa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Verificar que estamos en RoomCloud
    if (!tab.url.includes('secure.roomcloud.net')) {
      showStatus('Error: Debes estar en RoomCloud para ejecutar la auditoría', 'error');
      auditInProgress = false;
      return;
    }
    
    // Ejecutar cada paso automáticamente
    for (let i = 0; i < auditPages.length; i++) {
      const page = auditPages[i];
      currentAuditPage = i;
      
      console.log(`RoomCloud Auditor: Procesando paso ${i + 1}/${auditPages.length}: ${page.name}`);
      showStatus(`📋 Paso ${i + 1}/${auditPages.length}: ${page.name}`, 'info');
      
      // Navegar a la página
      const baseUrl = 'https://secure.roomcloud.net/be/owners_area';
      const fullUrl = baseUrl + page.url;
      
      await chrome.tabs.update(tab.id, { url: fullUrl });
      
      // Esperar a que la página cargue completamente
      console.log('RoomCloud Auditor: Esperando carga de página...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos para carga inicial
      
      // Esperar adicional para páginas que requieren más tiempo
      if (page.type === 'payment_gateways') {
        console.log('RoomCloud Auditor: Página de pasarelas - esperando tiempo adicional...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos adicionales
      }
      
      // Extraer datos de la página actual
      console.log('RoomCloud Auditor: Extrayendo datos...');
      showStatus(`🔍 Extrayendo datos de: ${page.name}`, 'info');
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
        
        if (response && response.success && response.data && response.data.length > 0) {
          const data = response.data[0];
          console.log('RoomCloud Auditor: Datos extraídos exitosamente:', data);
          
          // Agregar datos al array
          extractedData.push(data);
          
          showStatus(`✅ ${page.name}: Datos extraídos exitosamente`, 'success');
          
          // Actualizar contador
          const dataCountSpan = document.getElementById('dataCount');
          if (dataCountSpan) {
            dataCountSpan.textContent = extractedData.length;
          }
          
          // Mostrar datos en la interfaz
          showExtractedData(data);
          
        } else {
          console.log('RoomCloud Auditor: No se encontraron datos en esta página');
          showStatus(`⚠️ ${page.name}: No se encontraron datos`, 'info');
        }
        
      } catch (error) {
        console.error('RoomCloud Auditor: Error extrayendo datos:', error);
        showStatus(`❌ ${page.name}: Error en extracción`, 'error');
      }
      
      // Pausa entre páginas para evitar sobrecarga
      if (i < auditPages.length - 1) {
        console.log('RoomCloud Auditor: Pausa entre páginas...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de pausa
      }
    }
    
    // Auditoría completada
    console.log('RoomCloud Auditor: Auditoría automatizada completada');
    showStatus('🎉 ¡Auditoría automatizada completada!', 'success');
    
    // Habilitar descarga
    const downloadLink = document.getElementById('downloadCSV');
    console.log('RoomCloud Auditor: Buscando enlace de descarga...');
    console.log('RoomCloud Auditor: Elemento encontrado:', !!downloadLink);
    
    if (downloadLink) {
      console.log('RoomCloud Auditor: Configurando enlace de descarga...');
      
      // Generar CSV y crear URL de descarga
      const csvContent = convertToCSV(extractedData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Configurar el enlace
      downloadLink.href = url;
      downloadLink.download = `roomcloud_audit_${new Date().toISOString().split('T')[0]}.csv`;
      downloadLink.style.backgroundColor = '#4CAF50';
      downloadLink.style.color = 'white';
      downloadLink.style.cursor = 'pointer';
      downloadLink.style.pointerEvents = 'auto';
      
      console.log('RoomCloud Auditor: Enlace de descarga configurado');
      console.log('RoomCloud Auditor: URL generada:', url);
    } else {
      console.error('RoomCloud Auditor: Enlace de descarga no encontrado');
    }
    
    console.log('RoomCloud Auditor: Datos extraídos disponibles para descarga:', extractedData.length, 'registros');
    console.log('RoomCloud Auditor: Contenido de extractedData:', extractedData);
    
    // Mostrar vista previa de datos
    const dataPreviewDiv = document.getElementById('dataPreview');
    if (dataPreviewDiv) {
      dataPreviewDiv.style.display = 'block';
    }
    
    // Mostrar resumen de auditoría
    const auditSummaryDiv = document.getElementById('auditSummary');
    const summaryContentDiv = document.getElementById('summaryContent');
    if (auditSummaryDiv && summaryContentDiv) {
      const summary = generateAuditSummary(extractedData);
      summaryContentDiv.innerHTML = summary;
      auditSummaryDiv.style.display = 'block';
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error en auditoría automatizada:', error);
    showStatus(`❌ Error en auditoría: ${error.message}`, 'error');
  } finally {
    auditInProgress = false;
  }
}

// Elementos del DOM
document.addEventListener('DOMContentLoaded', function() {
  const autoAuditButton = document.getElementById('autoAudit');
  const downloadLink = document.getElementById('downloadCSV');
  const clearButton = document.getElementById('clearData');
  
  console.log('RoomCloud Auditor: Inicializando elementos DOM...');
  console.log('RoomCloud Auditor: autoAuditButton encontrado:', !!autoAuditButton);
  console.log('RoomCloud Auditor: downloadLink encontrado:', !!downloadLink);
  console.log('RoomCloud Auditor: clearButton encontrado:', !!clearButton);
  const confirmDataButton = document.getElementById('confirmData');
  const nextPageButton = document.getElementById('nextPage');
  const statusDiv = document.getElementById('status');
  const dataPreviewDiv = document.getElementById('dataPreview');
  const auditSectionDiv = document.getElementById('auditSection');
  const extractedDataDiv = document.getElementById('extractedData');
  const dataCountSpan = document.getElementById('dataCount');
  const currentPageSpan = document.getElementById('currentPage');
  const progressPercentSpan = document.getElementById('progressPercent');
  const progressBarDiv = document.getElementById('progressBar');
  const currentPageNameSpan = document.getElementById('currentPageName');
  const pagesListDiv = document.getElementById('pagesList');



  // Evento para auditoría automatizada completa
  if (autoAuditButton) {
    console.log('RoomCloud Auditor: Botón de auditoría automatizada encontrado, agregando evento');
    autoAuditButton.addEventListener('click', async function() {
    console.log('RoomCloud Auditor: Botón de auditoría automatizada clickeado');
    
    try {
      if (auditInProgress) {
        console.log('RoomCloud Auditor: Auditoría ya en progreso');
        showStatus('Auditoría ya en progreso', 'error');
        return;
      }
      
      // Confirmar antes de iniciar
      if (!confirm('¿Estás seguro de que quieres iniciar la auditoría automatizada completa? Esto tomará varios minutos.')) {
        console.log('RoomCloud Auditor: Usuario canceló la auditoría');
        return;
      }
      
      console.log('RoomCloud Auditor: Usuario confirmó, iniciando auditoría...');
      
      // Deshabilitar botón durante la auditoría
      if (autoAuditButton) autoAuditButton.disabled = true;
      
      await runCompleteAudit();
      
    } catch (error) {
      console.error('RoomCloud Auditor: Error en evento de auditoría automatizada:', error);
      showStatus(`Error: ${error.message}`, 'error');
          } finally {
        // Rehabilitar botón
        if (autoAuditButton) autoAuditButton.disabled = false;
      }
    });
  } else {
    console.error('RoomCloud Auditor: Botón de auditoría automatizada no encontrado');
  }
  




  // Evento para confirmar datos de la página actual
  confirmDataButton.addEventListener('click', async function() {
    try {
      // Prevenir múltiples clics
      if (confirmDataButton.disabled) {
        return;
      }
      
      confirmDataButton.disabled = true;
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Mostrar estado de extracción
      showExtractionStatus('Extrayendo datos...', 'info');
      
      console.log('RoomCloud Auditor: Extrayendo datos de página:', currentAuditPage, auditPages[currentAuditPage].name);
      
      // Extraer datos de la página actual
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      
      if (response && response.success) {
        // Mostrar datos extraídos de la página actual
        showCurrentPageData(response.data[0]);
        
        // Agregar datos extraídos al total (solo una vez)
        response.data.forEach(data => {
          showExtractedData(data);
        });
        
        // Marcar página como completada
        auditPages[currentAuditPage].completed = true;
        updatePagesList();
        
        console.log('RoomCloud Auditor: Datos extraídos exitosamente. Total de registros:', extractedData.length);
        
        showExtractionStatus(`✅ Datos extraídos exitosamente de: ${auditPages[currentAuditPage].name}`, 'success');
        showStatus(`Datos extraídos de: ${auditPages[currentAuditPage].name}`, 'success');
        nextPageButton.disabled = false;
        
      } else {
        showExtractionStatus(`❌ Error: ${response?.error || 'No se pudieron extraer datos'}`, 'error');
        showStatus(`Error: ${response?.error || 'No se pudieron extraer datos'}`, 'error');
        confirmDataButton.disabled = false; // Re-habilitar en caso de error
      }
    } catch (error) {
      showExtractionStatus(`❌ Error: ${error.message}`, 'error');
      showStatus(`Error al confirmar datos: ${error.message}`, 'error');
      confirmDataButton.disabled = false; // Re-habilitar en caso de error
    }
  });

  // Evento para pasar a la siguiente página
  nextPageButton.addEventListener('click', async function() {
    try {
      currentAuditPage++;
      
      if (currentAuditPage >= auditPages.length) {
        // Auditoría completada
        await completeAudit();
        return;
      }
      
      // Navegar a la siguiente página
      await navigateToPage(currentAuditPage);
      
      // Resetear botones
      confirmDataButton.disabled = false;
      nextPageButton.disabled = true;
      
    } catch (error) {
      showStatus(`Error al navegar: ${error.message}`, 'error');
    }
  });

  // Evento para saltar a paso específico (QA)
  jumpToStepButton.addEventListener('click', async function() {
    try {
      const selectedStep = stepSelector.value;
      if (!selectedStep) {
        showStatus('Error: Selecciona un paso para saltar', 'error');
        return;
      }
      
      const stepIndex = parseInt(selectedStep);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('secure.roomcloud.net')) {
        showStatus('Error: Debes estar en RoomCloud para usar esta función', 'error');
        return;
      }
      
      // Inicializar auditoría si no está en progreso
      if (!auditInProgress) {
        auditInProgress = true;
        currentAuditPage = stepIndex;
        extractedData = [];
        
        // Mostrar interfaz de auditoría
        auditSectionDiv.style.display = 'block';
        dataPreviewDiv.style.display = 'none';
        startAuditButton.disabled = true;
        extractButton.disabled = true;
        
        // Generar lista de páginas
        generatePagesList();
      } else {
        // Si ya está en progreso, solo cambiar la página actual
        currentAuditPage = stepIndex;
      }
      
      // Navegar directamente al paso seleccionado
      await navigateToPage(currentAuditPage);
      
      showStatus(`Saltado al paso ${stepIndex + 1}: ${auditPages[stepIndex].name}`, 'success');
      
    } catch (error) {
      showStatus(`Error al saltar al paso: ${error.message}`, 'error');
    }
  });

  // Evento para limpiar datos
  clearButton.addEventListener('click', function() {
    extractedData = [];
    dataPreviewDiv.style.display = 'none';
    auditSectionDiv.style.display = 'none';
    downloadButton.disabled = true;
    auditInProgress = false;
    currentAuditPage = 0;
    startAuditButton.disabled = false;
    extractButton.disabled = false;
    showStatus('Datos limpiados', 'info');
  });

  // Configuración del enlace de descarga (no necesita eventos)
  console.log('RoomCloud Auditor: Enlace de descarga configurado automáticamente');
});



// Función para mostrar datos extraídos
function showExtractedData(data) {
  const dataPreviewDiv = document.getElementById('dataPreview');
  const extractedDataDiv = document.getElementById('extractedData');
  const dataCountSpan = document.getElementById('dataCount');
  
  // Verificar que los elementos existen
  if (!dataPreviewDiv || !extractedDataDiv || !dataCountSpan) {
    console.error('Elementos del DOM no encontrados para mostrar datos');
    return;
  }
  
  // Verificar si ya existe un registro similar para evitar duplicados
  const isDuplicate = extractedData.some(existingData => 
    existingData.pagina_actual === data.pagina_actual &&
    existingData.fecha_extraccion === data.fecha_extraccion &&
    JSON.stringify(existingData) === JSON.stringify(data)
  );
  
  if (isDuplicate) {
    console.log('RoomCloud Auditor: Datos duplicados detectados, omitiendo...');
    return;
  }
  
  // Agregar nuevos datos al array
  extractedData.push(data);
  console.log('RoomCloud Auditor: Datos agregados al array. Total actual:', extractedData.length);
  
  // Mostrar todos los datos extraídos
  let html = '';
  extractedData.forEach((item, index) => {
    html += `<div style="margin-bottom: 15px; padding: 8px; background-color: white; border-radius: 3px; border-left: 3px solid #4CAF50;">`;
    html += `<strong style="color: #4CAF50;">Registro ${index + 1}</strong> (${item.pagina_actual || 'Página'})<br>`;
    
    // Mostrar solo los campos que tienen datos
    Object.keys(item).forEach(key => {
      if (key !== 'pagina_actual' && key !== 'fecha_extraccion' && key !== 'url' && item[key] && item[key] !== 'N/A') {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<span style="color: #666;">${label}:</span> <span style="color: #333;">${item[key]}</span><br>`;
      }
    });
    
    html += `<small style="color: #999;">${new Date(item.fecha_extraccion).toLocaleString()}</small>`;
    html += `</div>`;
  });
  
  extractedDataDiv.innerHTML = html;
  dataCountSpan.textContent = extractedData.length;
  dataPreviewDiv.style.display = 'block';
}

// Función para navegar a una página específica
async function navigateToPage(pageIndex) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = auditPages[pageIndex];
  
  // Construir URL completa
  const baseUrl = 'https://secure.roomcloud.net/be/owners_area';
  const fullUrl = baseUrl + page.url;
  
  // Mostrar estado de navegación
  showExtractionStatus(`Navegando a: ${page.name}...`, 'info');
  
  // Ocultar datos de página anterior
  const currentPageDataDiv = document.getElementById('currentPageData');
  if (currentPageDataDiv) currentPageDataDiv.style.display = 'none';
  
  // Navegar a la página
  await chrome.tabs.update(tab.id, { url: fullUrl });
  
  // Actualizar interfaz
  updateAuditInterface(pageIndex);
  
  // Esperar a que la página cargue
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Mostrar estado listo para extraer
  showExtractionStatus('✅ Página cargada. Haz clic en "Extraer Datos" para obtener información.', 'success');
}

// Función para actualizar la interfaz de auditoría
function updateAuditInterface(pageIndex) {
  const page = auditPages[pageIndex];
  const progress = ((pageIndex + 1) / auditPages.length) * 100;
  
  // Obtener elementos del DOM
  const currentPageSpan = document.getElementById('currentPage');
  const progressPercentSpan = document.getElementById('progressPercent');
  const progressBarDiv = document.getElementById('progressBar');
  const currentPageNameSpan = document.getElementById('currentPageName');
  const confirmDataButton = document.getElementById('confirmData');
  const nextPageButton = document.getElementById('nextPage');
  
  // Actualizar elementos si existen
  if (currentPageSpan) currentPageSpan.textContent = `Página ${pageIndex + 1} de ${auditPages.length}`;
  if (progressPercentSpan) progressPercentSpan.textContent = `${Math.round(progress)}%`;
  if (progressBarDiv) progressBarDiv.style.width = `${progress}%`;
  if (currentPageNameSpan) currentPageNameSpan.textContent = page.name;
  
  // Actualizar botones
  if (confirmDataButton) confirmDataButton.disabled = false;
  if (nextPageButton) nextPageButton.disabled = true;
}

// Función para generar la lista de páginas
function generatePagesList() {
  const pagesListDiv = document.getElementById('pagesList');
  if (!pagesListDiv) return;
  
  let html = '';
  
  auditPages.forEach((page, index) => {
    const status = page.completed ? '✅' : '⏳';
    const color = page.completed ? '#4CAF50' : '#666';
    html += `<div style="color: ${color}; margin-bottom: 2px;">${status} ${page.name}</div>`;
  });
  
  pagesListDiv.innerHTML = html;
}

// Función para actualizar la lista de páginas
function updatePagesList() {
  generatePagesList();
}

// Función para mostrar estado de extracción
function showExtractionStatus(message, type = 'info') {
  const extractionStatusDiv = document.getElementById('extractionStatus');
  const extractionStatusTextSpan = document.getElementById('extractionStatusText');
  
  if (extractionStatusDiv && extractionStatusTextSpan) {
    extractionStatusTextSpan.textContent = message;
    
    // Cambiar color según el tipo
    switch (type) {
      case 'success':
        extractionStatusDiv.style.backgroundColor = '#d4edda';
        extractionStatusDiv.style.color = '#155724';
        break;
      case 'error':
        extractionStatusDiv.style.backgroundColor = '#f8d7da';
        extractionStatusDiv.style.color = '#721c24';
        break;
      default:
        extractionStatusDiv.style.backgroundColor = '#fff3cd';
        extractionStatusDiv.style.color = '#856404';
    }
    
    extractionStatusDiv.style.display = 'block';
  }
}

// Función para mostrar datos de la página actual
function showCurrentPageData(data) {
  const currentPageDataDiv = document.getElementById('currentPageData');
  const currentPageDataContentDiv = document.getElementById('currentPageDataContent');
  
  if (currentPageDataDiv && currentPageDataContentDiv) {
    let html = '';
    
    // Mostrar solo los campos que tienen datos
    Object.keys(data).forEach(key => {
      if (key !== 'pagina_actual' && key !== 'fecha_extraccion' && key !== 'url' && data[key] && data[key] !== 'N/A') {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<div style="margin-bottom: 2px;"><span style="color: #666;">${label}:</span> <span style="color: #333;">${data[key]}</span></div>`;
      }
    });
    
    if (html === '') {
      html = '<div style="color: #999; font-style: italic;">No se encontraron datos en esta página</div>';
    }
    
    currentPageDataContentDiv.innerHTML = html;
    currentPageDataDiv.style.display = 'block';
  }
}

// Función para completar la auditoría
async function completeAudit() {
  const dataPreviewDiv = document.getElementById('dataPreview');
  const auditSectionDiv = document.getElementById('auditSection');
  const downloadButton = document.getElementById('downloadCSV');
  
  // Ocultar interfaz de auditoría
  if (auditSectionDiv) auditSectionDiv.style.display = 'none';
  
  // Mostrar vista previa de datos
  if (dataPreviewDiv) dataPreviewDiv.style.display = 'block';
  
  // Habilitar descarga
  if (downloadButton) downloadButton.disabled = false;
  
  // Resetear estado
  auditInProgress = false;
  currentAuditPage = 0;
  
  showStatus('¡Auditoría completada! Puedes descargar el CSV con todos los datos.', 'success');
}

// Función para generar resumen de auditoría
function generateAuditSummary(data) {
  if (data.length === 0) return 'No hay datos para mostrar';
  
  // Consolidar todos los datos en un solo objeto
  const consolidatedData = {};
  
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'url' && key !== 'fecha_extraccion' && key !== 'pagina_actual') {
        if (consolidatedData[key] && consolidatedData[key] !== item[key]) {
          consolidatedData[key] = `${consolidatedData[key]} | ${item[key]}`;
        } else {
          consolidatedData[key] = item[key];
        }
      }
    });
  });
  
  let summary = '';
  
  // Información básica del hotel
  if (consolidatedData.nombre_hotel) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">🏨 Hotel:</strong> ${consolidatedData.nombre_hotel}</div>`;
  }
  if (consolidatedData.id_hotel) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">🆔 ID:</strong> ${consolidatedData.id_hotel}</div>`;
  }
  if (consolidatedData.categoria) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">📋 Categoría:</strong> ${consolidatedData.categoria}</div>`;
  }
  if (consolidatedData.estrellas) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">⭐ Estrellas:</strong> ${consolidatedData.estrellas}</div>`;
  }
  if (consolidatedData.habitaciones) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">🛏️ Habitaciones:</strong> ${consolidatedData.habitaciones}</div>`;
  }
  
  summary += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">';
  
  // Información de disponibilidad
  if (consolidatedData.moneda_carga) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #4CAF50;">💰 Moneda:</strong> ${consolidatedData.moneda_carga}</div>`;
  }
  if (consolidatedData.tarifa_mas_baja_usd) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #4CAF50;">💵 Tarifa más baja USD:</strong> ${consolidatedData.tarifa_mas_baja_usd}</div>`;
  }
  if (consolidatedData.cierres_parciales) {
    const cierreColor = consolidatedData.cierres_parciales === 'Sí' ? '#f44336' : '#4CAF50';
    summary += `<div style="margin-bottom: 8px;"><strong style="color: ${cierreColor};">🚫 Cierres parciales:</strong> ${consolidatedData.cierres_parciales}</div>`;
  }
  
  summary += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">';
  
  // Información de canales
  if (consolidatedData.canales_activos) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #FF9800;">🌐 Canales activos:</strong> ${consolidatedData.canales_activos}</div>`;
  }
  if (consolidatedData.cantidad_canales) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #FF9800;">📊 Cantidad canales:</strong> ${consolidatedData.cantidad_canales}</div>`;
  }
  
  // Información de usuarios
  if (consolidatedData.usuarios_roomcloud) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #9C27B0;">👥 Usuarios:</strong> ${consolidatedData.usuarios_roomcloud}</div>`;
  }
  if (consolidatedData.cantidad_usuarios) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #9C27B0;">👤 Cantidad usuarios:</strong> ${consolidatedData.cantidad_usuarios}</div>`;
  }
  
  // Información de pasarelas
  if (consolidatedData.pasarelas_pago_activas) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #607D8B;">💳 Pasarelas activas:</strong> ${consolidatedData.pasarelas_pago_activas}</div>`;
  }
  if (consolidatedData.cantidad_pasarelas_activas) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #607D8B;">🔢 Cantidad pasarelas:</strong> ${consolidatedData.cantidad_pasarelas_activas}</div>`;
  }
  
  summary += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">';
  
  // Información de integración PMS
  if (consolidatedData.integraciones_pms) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #795548;">🔗 Integraciones PMS:</strong> ${consolidatedData.integraciones_pms}</div>`;
  }
  if (consolidatedData.cantidad_integraciones_pms) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #795548;">🔢 Cantidad integraciones PMS:</strong> ${consolidatedData.cantidad_integraciones_pms}</div>`;
  }
  
  // Información de Revenue Management
  if (consolidatedData.reglas_revenue) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #E91E63;">📈 Reglas Revenue:</strong> ${consolidatedData.reglas_revenue}</div>`;
  }
  if (consolidatedData.cantidad_reglas_revenue) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #E91E63;">🔢 Cantidad reglas Revenue:</strong> ${consolidatedData.cantidad_reglas_revenue}</div>`;
  }
  
  // Información de Reglas de Negocio
  if (consolidatedData.reglas_negocio) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #3F51B5;">⚙️ Reglas de Negocio:</strong> ${consolidatedData.reglas_negocio}</div>`;
  }
  if (consolidatedData.cantidad_reglas_negocio) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #3F51B5;">🔢 Cantidad reglas:</strong> ${consolidatedData.cantidad_reglas_negocio}</div>`;
  }
  
  // Información de Comparador de Precios
  if (consolidatedData.comparador_precios) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #009688;">📊 Comparador Precios:</strong> ${consolidatedData.comparador_precios}</div>`;
  }
  
  // Información de Metabuscadores
  if (consolidatedData.metabuscadores) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #FF5722;">🔍 Metabuscadores:</strong> ${consolidatedData.metabuscadores}</div>`;
  }
  if (consolidatedData.cantidad_metabuscadores) {
    summary += `<div style="margin-bottom: 8px;"><strong style="color: #FF5722;">🔢 Cantidad metabuscadores:</strong> ${consolidatedData.cantidad_metabuscadores}</div>`;
  }
  
  return summary;
}

// Función para convertir datos a CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  // Consolidar todos los datos en un solo objeto
  const consolidatedData = {};
  
  // Filtrar campos que no queremos incluir
  const excludedFields = ['url', 'fecha_extraccion', 'pagina_actual'];
  
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      // Solo incluir campos que no están en la lista de exclusión
      if (!excludedFields.includes(key)) {
        // Si el campo ya existe, agregar el nuevo valor con un separador
        if (consolidatedData[key] && consolidatedData[key] !== item[key]) {
          consolidatedData[key] = `${consolidatedData[key]} | ${item[key]}`;
        } else {
          consolidatedData[key] = item[key];
        }
      }
    });
  });
  
  // Obtener headers (solo los campos incluidos)
  const headers = Object.keys(consolidatedData);
  
  // Crear fila de headers
  const csvRows = [headers.join(',')];
  
  // Crear una sola fila de datos consolidados
  const csvRow = headers.map(header => {
    const value = consolidatedData[header] || '';
    // Escapar comillas y envolver en comillas si contiene coma
    return `"${String(value).replace(/"/g, '""')}"`;
  });
  
  csvRows.push(csvRow.join(','));
  
  return csvRows.join('\n');
}
