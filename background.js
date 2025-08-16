// Service Worker para la extensión RoomCloud Auditor

// Evento cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
  console.log('RoomCloud Auditor instalado correctamente');
  
  // Configurar estado inicial
  chrome.storage.local.set({
    auditData: [],
    lastAudit: null,
    settings: {
      autoSave: true,
      notifications: true
    }
  });
});

// Evento cuando se hace clic en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  // Si no hay popup, abrir uno
  if (!tab.url.includes('secure.roomcloud.net')) {
    chrome.tabs.create({
      url: 'https://secure.roomcloud.net/'
    });
  }
});

// Manejar mensajes del content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveData') {
    // Guardar datos en el almacenamiento local
    chrome.storage.local.get(['auditData'], (result) => {
      const currentData = result.auditData || [];
      currentData.push(request.data);
      
      chrome.storage.local.set({
        auditData: currentData,
        lastAudit: new Date().toISOString()
      });
      
      sendResponse({ success: true });
    });
    
    return true; // Mantener el canal abierto
  }
  
  if (request.action === 'getData') {
    // Obtener datos guardados
    chrome.storage.local.get(['auditData'], (result) => {
      sendResponse({ success: true, data: result.auditData || [] });
    });
    
    return true;
  }
  
  if (request.action === 'clearData') {
    // Limpiar datos guardados
    chrome.storage.local.remove(['auditData', 'lastAudit'], () => {
      sendResponse({ success: true });
    });
    
    return true;
  }
});

// Función para mostrar notificaciones del sistema
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: title,
    message: message
  });
}

// Evento cuando se actualiza una pestaña
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('secure.roomcloud.net')) {
    // La página de RoomCloud se ha cargado completamente
    console.log('Página de RoomCloud cargada:', tab.url);
  }
});

// Función para exportar datos a CSV
function exportToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (let row of data) {
    const csvRow = headers.map(header => {
      const value = row[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(csvRow.join(','));
  }
  
  return csvRows.join('\n');
}

// Función para descargar archivo
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
}

