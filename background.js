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
  
  if (request.action === 'monitorHotelSearch') {
    const { hotelId } = request;
    monitorHotelSearchWindow(hotelId);
    sendResponse({ success: true });
  }
  
  if (request.action === 'hotelSearchWindowOpened') {
    const { windowId, url } = request;
    console.log('RoomCloud Auditor: Ventana de búsqueda abierta:', windowId, url);
    // La búsqueda automática se activará cuando se detecte la nueva pestaña
    sendResponse({ success: true });
  }
});

// Función para monitorear la ventana de búsqueda de hoteles
async function monitorHotelSearchWindow(hotelId) {
  try {
    console.log('RoomCloud Auditor: Monitoreando ventana de búsqueda para hotel ID:', hotelId);
    
    // Esperar a que se abra la nueva ventana (más tiempo para asegurar carga)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Buscar la nueva pestaña de búsqueda con múltiples criterios
    const tabs = await chrome.tabs.query({});
    console.log('RoomCloud Auditor: Todas las pestañas:', tabs.map(t => ({ id: t.id, url: t.url, title: t.title })));
    
    let searchTab = tabs.find(tab => 
      tab.url && tab.url.includes('HotelsList.jsp')
    );
    
    // Si no se encuentra con el primer criterio, buscar por título
    if (!searchTab) {
      searchTab = tabs.find(tab => 
        tab.title && tab.title.toLowerCase().includes('hotel')
      );
    }
    
    // Si aún no se encuentra, buscar la pestaña más reciente
    if (!searchTab) {
      searchTab = tabs[tabs.length - 1]; // Última pestaña abierta
    }
    
    if (searchTab) {
      console.log('RoomCloud Auditor: Ventana de búsqueda encontrada:', searchTab.id, searchTab.url);
      
      // Esperar un poco más para que la página cargue completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Inyectar script para buscar automáticamente
      try {
        await chrome.scripting.executeScript({
          target: { tabId: searchTab.id },
          function: searchHotelById,
          args: [hotelId]
        });
        console.log('RoomCloud Auditor: Script de búsqueda inyectado exitosamente');
      } catch (scriptError) {
        console.error('RoomCloud Auditor: Error inyectando script:', scriptError);
        
        // Intentar método alternativo: enviar mensaje a la pestaña
        try {
          await chrome.tabs.sendMessage(searchTab.id, {
            action: 'searchHotel',
            hotelId: hotelId
          });
        } catch (messageError) {
          console.error('RoomCloud Auditor: Error enviando mensaje:', messageError);
          
          // Método final: inyectar script de debugging
          try {
            await chrome.scripting.executeScript({
              target: { tabId: searchTab.id },
              files: ['debug_search.js']
            });
            console.log('RoomCloud Auditor: Script de debugging inyectado');
          } catch (debugError) {
            console.error('RoomCloud Auditor: Error inyectando script de debugging:', debugError);
          }
        }
      }
      
    } else {
      console.log('RoomCloud Auditor: No se encontró la ventana de búsqueda');
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error monitoreando ventana de búsqueda:', error);
  }
}

// Función para buscar hotel por ID (se ejecuta en la ventana de búsqueda)
function searchHotelById(hotelId) {
  console.log('RoomCloud Auditor: Buscando hotel ID:', hotelId);
  
  try {
    // Esperar a que la página cargue completamente
    if (document.readyState !== 'complete') {
      console.log('RoomCloud Auditor: Esperando a que la página cargue...');
      setTimeout(() => searchHotelById(hotelId), 1000);
      return;
    }
    
    console.log('RoomCloud Auditor: Página cargada, iniciando búsqueda inteligente...');
    
    // Método 1: Buscar en enlaces con clase rc_hotelname (método específico de RoomCloud)
    console.log('RoomCloud Auditor: Método 1 - Buscando en enlaces de hotel...');
    const hotelLinks = document.querySelectorAll('a.rc_hotelname');
    console.log('RoomCloud Auditor: Enlaces de hotel encontrados:', hotelLinks.length);
    
    let hotelFound = false;
    for (let link of hotelLinks) {
      const linkText = link.textContent.trim();
      console.log('RoomCloud Auditor: Verificando enlace:', linkText.substring(0, 50));
      
      // Buscar el ID del hotel en el onclick
      const onclick = link.getAttribute('onclick');
      if (onclick && onclick.includes(hotelId)) {
        console.log('RoomCloud Auditor: Hotel encontrado en onclick:', onclick);
        
        // Ejecutar la función changeFormData directamente
        try {
          // Extraer parámetros del onclick
          const match = onclick.match(/changeFormData\('([^']+)','([^']+)','([^']+)','([^']+)'\)/);
          if (match) {
            const [, field, formName, codice, descrizione] = match;
            console.log('RoomCloud Auditor: Ejecutando changeFormData:', { field, formName, codice, descrizione });
            
            // Ejecutar la función directamente
            if (typeof window.changeFormData === 'function') {
              window.changeFormData(field, formName, codice, descrizione);
              hotelFound = true;
              break;
            } else {
              console.log('RoomCloud Auditor: changeFormData no disponible, haciendo clic...');
              link.click();
              hotelFound = true;
              break;
            }
          }
        } catch (error) {
          console.log('RoomCloud Auditor: Error ejecutando changeFormData:', error);
          // Fallback: hacer clic directo
          link.click();
          hotelFound = true;
          break;
        }
      }
    }
    
    if (!hotelFound) {
      console.log('RoomCloud Auditor: Hotel no encontrado en esta página, buscando en dataSet...');
      
      // Método 2: Buscar en el array dataSet (si está disponible)
      if (typeof window.dataSet !== 'undefined') {
        console.log('RoomCloud Auditor: dataSet encontrado, buscando hotel...');
        
        for (let i = 0; i < window.dataSet.length; i++) {
          const row = window.dataSet[i];
          if (row && row[0] && row[0].includes(hotelId)) {
            console.log('RoomCloud Auditor: Hotel encontrado en dataSet, fila:', i);
            
            // Buscar el enlace correspondiente en el DOM
            const hotelLinks = document.querySelectorAll('a.rc_hotelname');
            if (hotelLinks[i]) {
              console.log('RoomCloud Auditor: Haciendo clic en enlace correspondiente...');
              hotelLinks[i].click();
              hotelFound = true;
              break;
            }
          }
        }
      }
    }
    
    if (!hotelFound) {
      console.log('RoomCloud Auditor: Hotel no encontrado en esta página, intentando navegación...');
      
      // Método 3: Buscar controles de paginación
      const paginationLinks = document.querySelectorAll('a[href*="page"], a[href*="start"], .pagination a, .dataTables_paginate a');
      console.log('RoomCloud Auditor: Enlaces de paginación encontrados:', paginationLinks.length);
      
      if (paginationLinks.length > 0) {
        console.log('RoomCloud Auditor: Navegando a la siguiente página...');
        
        // Buscar el enlace "Siguiente" o "Next"
        let nextLink = null;
        for (let link of paginationLinks) {
          const linkText = link.textContent.trim().toLowerCase();
          if (linkText.includes('siguiente') || linkText.includes('next') || linkText.includes('>')) {
            nextLink = link;
            break;
          }
        }
        
        if (nextLink) {
          console.log('RoomCloud Auditor: Enlace siguiente encontrado, navegando...');
          nextLink.click();
          
          // Esperar y buscar en la nueva página
          setTimeout(() => {
            searchHotelById(hotelId);
          }, 2000);
        } else {
          console.log('RoomCloud Auditor: No se encontró enlace de siguiente página');
        }
      } else {
        console.log('RoomCloud Auditor: No se encontraron controles de paginación');
      }
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error en búsqueda de hotel:', error);
  }
}

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
  
  // Detectar nueva ventana de búsqueda de hoteles
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('HotelsList.jsp')) {
    console.log('RoomCloud Auditor: Nueva ventana de búsqueda detectada:', tab.url);
    
    // Esperar un poco y ejecutar búsqueda automática
    setTimeout(async () => {
      try {
        console.log('RoomCloud Auditor: Ejecutando búsqueda automática en nueva ventana...');
        
        // Obtener el hotel ID del almacenamiento temporal
        const result = await chrome.storage.local.get(['tempHotelId']);
        if (result.tempHotelId) {
          console.log('RoomCloud Auditor: Hotel ID encontrado en almacenamiento:', result.tempHotelId);
          
          // Primero inyectar script de prueba
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['test_search.js']
          });
          
          // Luego inyectar script de búsqueda
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: searchHotelById,
            args: [result.tempHotelId]
          });
          
          // Limpiar el almacenamiento temporal
          await chrome.storage.local.remove(['tempHotelId']);
        }
      } catch (error) {
        console.error('RoomCloud Auditor: Error en búsqueda automática:', error);
      }
    }, 2000);
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

