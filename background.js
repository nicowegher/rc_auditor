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
    console.log('RoomCloud Auditor: Monitoreo de búsqueda solicitado para hotel:', hotelId);
    
    (async () => {
      try {
        // Buscar la pestaña principal de RoomCloud
        const tabs = await chrome.tabs.query({});
        const roomcloudTabs = tabs.filter(tab => tab.url && tab.url.includes('roomcloud.net') && !tab.url.includes('HotelsList.jsp'));
        
        if (roomcloudTabs.length === 0) {
          throw new Error('No se encontró pestaña principal de RoomCloud');
        }
        
        const mainTab = roomcloudTabs[0];
        console.log('RoomCloud Auditor: Pestaña principal encontrada:', mainTab.url);
        
        // Enviar mensaje al content script para abrir la ventana de búsqueda
        await chrome.tabs.sendMessage(mainTab.id, {
          action: 'openHotelSearch',
          hotelId: hotelId
        });
        
        console.log('RoomCloud Auditor: Orden de apertura de ventana enviada al content script');
        
        // Iniciar monitoreo de la ventana de búsqueda
        console.log('RoomCloud Auditor: Iniciando monitorHotelSearchWindow...');
        monitorHotelSearchWindow(hotelId);
        console.log('RoomCloud Auditor: monitorHotelSearchWindow iniciado');
        
        sendResponse({ success: true });
        
      } catch (error) {
        console.error('RoomCloud Auditor: Error en monitorHotelSearch:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'startBulkAudit') {
    const { hotelIds, auditState } = request;
    startBulkAuditFromBackground(hotelIds, auditState);
    sendResponse({ success: true });
  }
  
  if (request.action === 'continueBulkAudit') {
    const { hotelId, auditState } = request;
    continueBulkAuditFromBackground(hotelId, auditState);
    sendResponse({ success: true });
  }
  
  if (request.action === 'openBulkAuditPanel') {
    console.log('RoomCloud Auditor: Mensaje openBulkAuditPanel recibido');
    console.log('RoomCloud Auditor: Datos recibidos:', request);
    
    const { hotelIds, auditState } = request;
    console.log('RoomCloud Auditor: Llamando a openBulkAuditPanel...');
    
    openBulkAuditPanel(hotelIds, auditState);
    sendResponse({ success: true });
  }
  
  if (request.action === 'hotelSearchWindowOpened') {
    const { windowId, url } = request;
    console.log('RoomCloud Auditor: Ventana de búsqueda abierta:', windowId, url);
    // La búsqueda automática se activará cuando se detecte la nueva pestaña
    sendResponse({ success: true });
  }
  
  // Manejador para navegación controlada desde content script
  if (request.action === 'navigateToPage') {
    console.log('RoomCloud Auditor: Recibida solicitud de navegación a:', request.url);
    
    try {
      // Buscar la pestaña de RoomCloud activa
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const roomcloudTab = tabs.find(tab => tab.url && tab.url.includes('roomcloud.net'));
          
          if (roomcloudTab) {
            console.log('RoomCloud Auditor: Navegando pestaña', roomcloudTab.id, 'a:', request.url);
            
            // Navegar a la URL especificada
            chrome.tabs.update(roomcloudTab.id, { url: request.url }, () => {
              console.log('RoomCloud Auditor: Navegación exitosa a:', request.url);
              sendResponse({ success: true, url: request.url });
            });
          } else {
            console.error('RoomCloud Auditor: No se encontró pestaña de RoomCloud activa');
            sendResponse({ success: false, error: 'No se encontró pestaña de RoomCloud activa' });
          }
        } else {
          console.error('RoomCloud Auditor: No se encontraron pestañas activas');
          sendResponse({ success: false, error: 'No se encontraron pestañas activas' });
        }
      });
    } catch (error) {
      console.error('RoomCloud Auditor: Error en navegación:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Mantener el canal de comunicación abierto
  }
  
  // Manejador para ejecutar auditoría completa con navegación
  if (request.action === 'executeAuditNavigation') {
    console.log('RoomCloud Auditor: Ejecutando auditoría con navegación para hotel:', request.hotelId);
    
    (async () => {
      try {
        const { hotelId } = request;
        const auditData = {};
        
        // Definir las páginas a visitar para la auditoría
        const auditPages = [
          { name: 'property_detail', url: 'contentHotel.jsp?item=property_detail' },
          { name: 'availability', url: 'availability_r2.jsp?item=availability202509&month=09&year=2025' },
          { name: 'users_list', url: 'users_list.jsp?item=users_list' },
          { name: 'channels', url: 'config.jsp?item=cm_channels' },
          { name: 'automation', url: 'hotel_automation_config.jsp?item=automation' },
          { name: 'payment_gateways', url: 'payment_gateways_hotel.jsp?item=payment_gateways' },
          { name: 'revenue_calendar', url: 'revratecal.jsp?item=rates_calendar' },
          { name: 'rules', url: 'business_rules_list.jsp?item=rules' }
        ];
        
        // Buscar pestaña de RoomCloud principal
        const tabs = await chrome.tabs.query({});
        const roomcloudTabs = tabs.filter(tab => 
          tab.url && tab.url.includes('roomcloud.net') && !tab.url.includes('HotelsList.jsp')
        );
        
        if (roomcloudTabs.length === 0) {
          throw new Error('No se encontró pestaña principal de RoomCloud');
        }
        
        const mainTab = roomcloudTabs[0];
        console.log('RoomCloud Auditor: Pestaña principal encontrada:', mainTab.url);
        
        // Procesar cada página de auditoría
        for (let i = 0; i < auditPages.length; i++) {
          const page = auditPages[i];
          console.log(`RoomCloud Auditor: [${i + 1}/${auditPages.length}] Procesando página ${page.name}...`);
          
          try {
            // Navegar a la página
            const fullUrl = `https://secure.roomcloud.net/be/owners_area/${page.url}`;
            console.log(`RoomCloud Auditor: Navegando a ${fullUrl}`);
            
            await new Promise((resolve, reject) => {
              chrome.tabs.update(mainTab.id, { url: fullUrl }, () => {
                console.log(`RoomCloud Auditor: Navegación iniciada a ${page.name}`);
                resolve();
              });
            });
            
            // Esperar a que la página cargue
            console.log(`RoomCloud Auditor: Esperando carga de página ${page.name}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verificar que la página se cargó
            let attempts = 0;
            const maxAttempts = 15;
            while (attempts < maxAttempts) {
              const updatedTab = await chrome.tabs.get(mainTab.id);
              if (updatedTab.url && updatedTab.url.includes(page.url.split('?')[0])) {
                console.log(`RoomCloud Auditor: Página ${page.name} cargada correctamente`);
                break;
              }
              console.log(`RoomCloud Auditor: Esperando carga de página ${page.name}... (intento ${attempts + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
            
            // Extraer datos de la página
            console.log(`RoomCloud Auditor: Extrayendo datos de ${page.name}...`);
            const pageData = await chrome.tabs.sendMessage(mainTab.id, {
              action: 'extractPageData',
              pageName: page.name
            });
            
            if (pageData && pageData.success) {
              auditData[page.name] = pageData.data;
              console.log(`RoomCloud Auditor: ✅ Datos extraídos de ${page.name}:`, pageData.data);
            } else {
              auditData[page.name] = { error: pageData?.error || 'Error desconocido' };
              console.log(`RoomCloud Auditor: ❌ Error extrayendo datos de ${page.name}:`, pageData?.error);
            }
            
            // Volver a home para continuar
            console.log(`RoomCloud Auditor: Volviendo a home...`);
            await new Promise((resolve, reject) => {
              chrome.tabs.update(mainTab.id, { url: 'https://secure.roomcloud.net/be/owners_area/home.jsp' }, () => {
                console.log(`RoomCloud Auditor: Navegación a home completada`);
                resolve();
              });
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
          } catch (error) {
            console.error(`RoomCloud Auditor: Error procesando página ${page.name}:`, error);
            auditData[page.name] = { error: error.message };
          }
        }
        
        console.log('RoomCloud Auditor: Auditoría completada exitosamente');
        sendResponse({ success: true, data: auditData });
        
      } catch (error) {
        console.error('RoomCloud Auditor: Error en auditoría:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Mantener el canal de comunicación abierto
  }
  
  // Manejador para ejecutar auditoría completa coordinada
  if (request.action === 'executeCompleteAudit') {
    console.log('RoomCloud Auditor: Ejecutando auditoría completa coordinada para hotel:', request.hotelId);
    
    (async () => {
      try {
        const { hotelId } = request;
        const auditData = {};
        
        // Definir las páginas a visitar para la auditoría
        const auditPages = [
          { name: 'property_detail', url: 'contentHotel.jsp?item=property_detail' },
          { name: 'availability', url: 'availability_r2.jsp?item=availability202509&month=09&year=2025' },
          { name: 'users_list', url: 'users_list.jsp?item=users_list' },
          { name: 'channels', url: 'config.jsp?item=cm_channels' },
          { name: 'automation', url: 'hotel_automation_config.jsp?item=automation' },
          { name: 'payment_gateways', url: 'payment_gateways_hotel.jsp?item=payment_gateways' },
          { name: 'revenue_calendar', url: 'revratecal.jsp?item=rates_calendar' },
          { name: 'rules', url: 'business_rules_list.jsp?item=rules' }
        ];
        
        // Buscar pestaña de RoomCloud principal
        const tabs = await chrome.tabs.query({});
        const roomcloudTabs = tabs.filter(tab => 
          tab.url && tab.url.includes('roomcloud.net') && !tab.url.includes('HotelsList.jsp')
        );
        
        if (roomcloudTabs.length === 0) {
          throw new Error('No se encontró pestaña principal de RoomCloud');
        }
        
        const mainTab = roomcloudTabs[0];
        console.log('RoomCloud Auditor: Pestaña principal encontrada:', mainTab.url);
        
        // Procesar cada página de auditoría
        for (let i = 0; i < auditPages.length; i++) {
          const page = auditPages[i];
          console.log(`RoomCloud Auditor: [${i + 1}/${auditPages.length}] Procesando página ${page.name}...`);
          
          try {
            // Navegar a la página
            const fullUrl = `https://secure.roomcloud.net/be/owners_area/${page.url}`;
            console.log(`RoomCloud Auditor: Navegando a ${fullUrl}`);
            
            await new Promise((resolve, reject) => {
              chrome.tabs.update(mainTab.id, { url: fullUrl }, () => {
                console.log(`RoomCloud Auditor: Navegación iniciada a ${page.name}`);
                resolve();
              });
            });
            
            // Esperar a que la página cargue
            console.log(`RoomCloud Auditor: Esperando carga de página ${page.name}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verificar que la página se cargó
            let attempts = 0;
            const maxAttempts = 15;
            while (attempts < maxAttempts) {
              const updatedTab = await chrome.tabs.get(mainTab.id);
              if (updatedTab.url && updatedTab.url.includes(page.url.split('?')[0])) {
                console.log(`RoomCloud Auditor: Página ${page.name} cargada correctamente`);
                break;
              }
              console.log(`RoomCloud Auditor: Esperando carga de página ${page.name}... (intento ${attempts + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
            
            // Extraer datos de la página
            console.log(`RoomCloud Auditor: Extrayendo datos de ${page.name}...`);
            const pageData = await chrome.tabs.sendMessage(mainTab.id, {
              action: 'extractPageData',
              pageName: page.name
            });
            
            if (pageData && pageData.success) {
              auditData[page.name] = pageData.data;
              console.log(`RoomCloud Auditor: ✅ Datos extraídos de ${page.name}:`, pageData.data);
            } else {
              auditData[page.name] = { error: pageData?.error || 'Error desconocido' };
              console.log(`RoomCloud Auditor: ❌ Error extrayendo datos de ${page.name}:`, pageData?.error);
            }
            
            // Volver a home para continuar
            console.log(`RoomCloud Auditor: Volviendo a home...`);
            await new Promise((resolve, reject) => {
              chrome.tabs.update(mainTab.id, { url: 'https://secure.roomcloud.net/be/owners_area/home.jsp' }, () => {
                console.log(`RoomCloud Auditor: Navegación a home completada`);
                resolve();
              });
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
          } catch (error) {
            console.error(`RoomCloud Auditor: Error procesando página ${page.name}:`, error);
            auditData[page.name] = { error: error.message };
          }
        }
        
        console.log('RoomCloud Auditor: Auditoría completa coordinada terminada exitosamente');
        console.log('RoomCloud Auditor: Enviando respuesta al panel con datos:', auditData);
        sendResponse({ success: true, data: auditData });
        console.log('RoomCloud Auditor: Respuesta enviada al panel exitosamente');
        
      } catch (error) {
        console.error('RoomCloud Auditor: Error en auditoría completa coordinada:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Mantener el canal de comunicación abierto
  }
});

// Función para monitorear la ventana de búsqueda de hoteles
async function monitorHotelSearchWindow(hotelId) {
  try {
    console.log('RoomCloud Auditor: Monitoreando ventana de búsqueda para hotel ID:', hotelId);
    
    // Esperar a que se abra la nueva ventana
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Buscar la pestaña de búsqueda
    const tabs = await chrome.tabs.query({});
    console.log('RoomCloud Auditor: Todas las pestañas:', tabs.map(t => ({ id: t.id, url: t.url, title: t.title })));
    
    let searchTab = tabs.find(tab => 
      tab.url && tab.url.includes('HotelsList.jsp')
    );
    
    if (searchTab) {
      console.log('RoomCloud Auditor: Ventana de búsqueda encontrada:', searchTab.id, searchTab.url);
      
      // Esperar a que la página cargue
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Inyectar script de búsqueda directa
      try {
        await chrome.scripting.executeScript({
          target: { tabId: searchTab.id },
          func: (hotelId) => {
            console.log('RoomCloud Auditor: Script de búsqueda directa inyectado para hotel:', hotelId);
            
            // Función simplificada para buscar hotel directamente
            function searchHotelDirectly(hotelId) {
              console.log('RoomCloud Auditor: Búsqueda directa para hotel ' + hotelId);
              
              try {
                // Buscar el campo de búsqueda
                const searchInput = document.querySelector('#hotelsList_filter input');
                if (!searchInput) {
                  console.log('RoomCloud Auditor: Campo de búsqueda no encontrado');
                  return;
                }
                
                console.log('RoomCloud Auditor: Campo de búsqueda encontrado, limpiando...');
                
                // Limpiar campo de búsqueda
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                
                // Esperar un momento y escribir el ID del hotel
                setTimeout(() => {
                  console.log('RoomCloud Auditor: Escribiendo ID del hotel: ' + hotelId);
                  
                  // Escribir el ID del hotel
                  searchInput.value = hotelId;
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Esperar a que se filtre y buscar el enlace
                  setTimeout(() => {
                    console.log('RoomCloud Auditor: Buscando enlace del hotel...');
                    
                    // Buscar el enlace del hotel con múltiples selectores
                    let hotelLink = null;
                    
                    // Método 1: Buscar por href con hotelId
                    hotelLink = document.querySelector(`a[href*="hotelId=${hotelId}"]`);
                    
                    // Método 2: Si no se encuentra, buscar por texto del ID en la fila
                    if (!hotelLink) {
                      console.log('RoomCloud Auditor: Buscando por ID en la tabla...');
                      const rows = document.querySelectorAll('table tbody tr');
                      for (const row of rows) {
                        const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                        if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                          hotelLink = row.querySelector('a');
                          break;
                        }
                      }
                    }
                    
                    // Método 3: Si aún no se encuentra, buscar cualquier enlace en la fila que contenga el hotel
                    if (!hotelLink) {
                      console.log('RoomCloud Auditor: Buscando cualquier enlace en la fila...');
                      const rows = document.querySelectorAll('table tbody tr');
                      for (const row of rows) {
                        const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                        if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                          hotelLink = row.querySelector('a[href*="hotelId"]') || row.querySelector('a');
                          break;
                        }
                      }
                    }
                    
                    if (hotelLink) {
                      console.log('RoomCloud Auditor: Hotel encontrado, haciendo clic en:', hotelLink.href);
                      hotelLink.click();
                    } else {
                      // Método 4: Hacer clic directamente en la fila que contiene el ID
                      console.log('RoomCloud Auditor: Intentando clic directo en la fila...');
                      const rows = document.querySelectorAll('table tbody tr');
                      for (const row of rows) {
                        const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                        if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                          console.log('RoomCloud Auditor: Haciendo clic directo en la fila del hotel');
                          row.click();
                          return;
                        }
                      }
                      
                      console.log('RoomCloud Auditor: Hotel no encontrado en búsqueda. Filas disponibles:');
                      rows.forEach((row, index) => {
                        const idCell = row.querySelector('td:nth-child(4)');
                        const links = row.querySelectorAll('a');
                        console.log(`Fila ${index + 1}: ID=${idCell?.textContent.trim()}, Enlaces=${links.length}`);
                      });
                    }
                  }, 2000);
                  
                }, 1000);
                
              } catch (error) {
                console.error('RoomCloud Auditor: Error en búsqueda directa:', error);
              }
            }
            
            // Iniciar búsqueda directa
            console.log('RoomCloud Auditor: Iniciando búsqueda directa para hotel ' + hotelId);
            searchHotelDirectly(hotelId);
          },
          args: [hotelId]
        });
        
        console.log('RoomCloud Auditor: Script de navegación simple inyectado exitosamente');
        
      } catch (scriptError) {
        console.error('RoomCloud Auditor: Error inyectando script:', scriptError);
      }
      
    } else {
      console.log('RoomCloud Auditor: No se encontró la ventana de búsqueda');
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error monitoreando ventana de búsqueda:', error);
  }
}

// Función para iniciar auditoría masiva desde background
async function startBulkAuditFromBackground(hotelIds, auditState) {
  console.log('RoomCloud Auditor: Iniciando auditoría masiva desde background');
  
  // Guardar estado en storage
  await chrome.storage.local.set({
    bulkAuditState: auditState,
    bulkHotelIds: hotelIds,
    bulkAuditResults: []
  });
  
  // Procesar el primer hotel
  if (hotelIds.length > 0) {
    await processNextHotel(hotelIds, 0, auditState);
  }
}

// Función para continuar auditoría masiva desde background
async function continueBulkAuditFromBackground(hotelId, auditState) {
  console.log(`RoomCloud Auditor: Continuando auditoría para hotel ${hotelId} desde background`);
  
  // Buscar la pestaña principal de RoomCloud
  const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
  let mainTab = null;
  
  for (const tab of tabs) {
    if (tab.url.includes('secure.roomcloud.net') && !tab.url.includes('HotelsList.jsp')) {
      mainTab = tab;
      break;
    }
  }
  
  if (!mainTab) {
    console.error('RoomCloud Auditor: No se encontró la pestaña principal de RoomCloud');
    return;
  }
  
  // Activar la pestaña principal
  await chrome.tabs.update(mainTab.id, { active: true });
  
  // Esperar a que se cargue el content script
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Verificar conexión con content script
  let connectionVerified = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const pingResponse = await chrome.tabs.sendMessage(mainTab.id, { action: 'ping' });
      if (pingResponse && pingResponse.success) {
        connectionVerified = true;
        console.log('RoomCloud Auditor: Conexión con content script verificada');
        break;
      }
    } catch (error) {
      console.log(`RoomCloud Auditor: Intento ${attempt + 1} de verificar conexión: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!connectionVerified) {
    console.error('RoomCloud Auditor: No se pudo establecer conexión con el content script');
    return;
  }
  
  // Ejecutar auditoría
  await executeHotelAudit(mainTab.id, hotelId, auditState);
}

// Función para procesar el siguiente hotel
async function processNextHotel(hotelIds, currentIndex, auditState) {
  if (currentIndex >= hotelIds.length) {
    console.log('RoomCloud Auditor: Auditoría masiva completada');
    await chrome.storage.local.set({ bulkAuditState: { ...auditState, isRunning: false } });
    return;
  }
  
  const hotelId = hotelIds[currentIndex];
  console.log(`RoomCloud Auditor: Procesando hotel ${currentIndex + 1}/${hotelIds.length} (ID: ${hotelId})`);
  
  // Actualizar estado
  auditState.currentHotelIndex = currentIndex;
  await chrome.storage.local.set({ 
    bulkAuditState: auditState,
    currentHotelId: hotelId
  });
  
  // Buscar pestaña principal de RoomCloud
  const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
  let mainTab = null;
  
  for (const tab of tabs) {
    if (tab.url.includes('secure.roomcloud.net') && !tab.url.includes('HotelsList.jsp')) {
      mainTab = tab;
      break;
    }
  }
  
  if (!mainTab) {
    console.error('RoomCloud Auditor: No se encontró la pestaña principal de RoomCloud');
    return;
  }
  
  // Activar la pestaña principal
  await chrome.tabs.update(mainTab.id, { active: true });
  
  // Iniciar cambio de hotel
  await chrome.tabs.sendMessage(mainTab.id, { action: 'openHotelSearch' });
  
  // Activar monitoreo
  await monitorHotelSearchWindow(hotelId);
}

// Función para ejecutar auditoría de un hotel
async function executeHotelAudit(tabId, hotelId, auditState) {
  console.log(`RoomCloud Auditor: Ejecutando auditoría para hotel ${hotelId}`);
  
  try {
    // Ejecutar auditoría completa
    const auditResult = await chrome.tabs.sendMessage(tabId, { 
      action: 'runCompleteAudit',
      hotelId: hotelId
    });
    
    if (auditResult && auditResult.success) {
      console.log(`RoomCloud Auditor: Auditoría completada para hotel ${hotelId}`);
      
      // Guardar resultado
      const currentResults = await chrome.storage.local.get(['bulkAuditResults']);
      const results = currentResults.bulkAuditResults || [];
      results.push(auditResult.data);
      
      auditState.completedHotels++;
      await chrome.storage.local.set({
        bulkAuditResults: results,
        bulkAuditState: auditState
      });
      
      // Procesar siguiente hotel
      const hotelIds = await chrome.storage.local.get(['bulkHotelIds']);
      if (hotelIds.bulkHotelIds) {
        await processNextHotel(hotelIds.bulkHotelIds, auditState.currentHotelIndex + 1, auditState);
      }
    }
  } catch (error) {
    console.error(`RoomCloud Auditor: Error en auditoría para hotel ${hotelId}:`, error);
    
    // Marcar como fallido y continuar
    const currentResults = await chrome.storage.local.get(['bulkAuditResults']);
    const results = currentResults.bulkAuditResults || [];
    results.push({
      id_hotel: hotelId,
      nombre_hotel: 'N/A',
      estado_auditoria: 'ERROR',
      error_mensaje: error.message,
      fecha_auditoria: new Date().toISOString()
    });
    
    auditState.failedHotels++;
    await chrome.storage.local.set({
      bulkAuditResults: results,
      bulkAuditState: auditState
    });
    
    // Procesar siguiente hotel
    const hotelIds = await chrome.storage.local.get(['bulkHotelIds']);
    if (hotelIds.bulkHotelIds) {
      await processNextHotel(hotelIds.bulkHotelIds, auditState.currentHotelIndex + 1, auditState);
    }
  }
}

// Función para abrir el panel de auditoría masiva
async function openBulkAuditPanel(hotelIds, auditState) {
  console.log('RoomCloud Auditor: Abriendo panel de auditoría masiva');
  
  try {
    // Crear URL con parámetros
    const hotelIdsParam = encodeURIComponent(JSON.stringify(hotelIds));
    const auditStateParam = encodeURIComponent(JSON.stringify(auditState));
    
    const panelUrl = chrome.runtime.getURL('bulk-audit-panel.html') + 
                    `?hotelIds=${hotelIdsParam}&auditState=${auditStateParam}`;
    
    // Abrir nueva pestaña con el panel
    const tab = await chrome.tabs.create({
      url: panelUrl,
      active: true
    });
    
    console.log('RoomCloud Auditor: Panel de auditoría masiva abierto en pestaña:', tab.id);
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error abriendo panel de auditoría masiva:', error);
  }
}

// Función para inyectar el script de búsqueda optimizada
function injectSearchScript(tabId) {
  console.log('RoomCloud Auditor: Inyectando script de búsqueda optimizada en tab:', tabId);
  
  // Inyectar el script usando executeScript
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      console.log('RoomCloud Auditor: Script de búsqueda optimizada inyectado');
      
      // Función para calcular la página donde está un hotel específico
      function calculateHotelPage(hotelId) {
        console.log('RoomCloud Auditor: Calculando página para hotel ID: ' + hotelId);
        
        try {
          // Verificar que dataSet esté disponible
          if (typeof window.dataSet === 'undefined') {
            console.log('RoomCloud Auditor: dataSet no disponible, usando búsqueda secuencial');
            return null;
          }
          
          console.log('RoomCloud Auditor: dataSet encontrado con ' + window.dataSet.length + ' hoteles');
          
          // Buscar el hotel en el dataSet
          let hotelIndex = -1;
          for (let i = 0; i < window.dataSet.length; i++) {
            const row = window.dataSet[i];
            if (row && row[0] && row[0].includes(hotelId)) {
              hotelIndex = i;
              break;
            }
          }
          
          if (hotelIndex === -1) {
            console.log('RoomCloud Auditor: Hotel ID ' + hotelId + ' no encontrado en dataSet');
            return null;
          }
          
          // Calcular página (20 hoteles por página, empezando en 0)
          const pageNumber = Math.floor(hotelIndex / 20) + 1;
          const positionInPage = hotelIndex % 20;
          
          console.log('RoomCloud Auditor: Hotel ' + hotelId + ' encontrado en índice ' + hotelIndex + ', página ' + pageNumber + ', posición ' + (positionInPage + 1));
          
          return {
            page: pageNumber,
            position: positionInPage,
            index: hotelIndex
          };
          
        } catch (error) {
          console.error('RoomCloud Auditor: Error calculando página del hotel:', error);
          return null;
        }
      }

      // Función para navegar directamente a una página específica
      function navigateToPage(targetPage) {
        console.log('RoomCloud Auditor: Navegando a página ' + targetPage);
        
        try {
          // Obtener página actual
          const currentPageElement = document.querySelector('.paginate_button.active a');
          if (currentPageElement) {
            const currentPage = parseInt(currentPageElement.textContent);
            console.log('RoomCloud Auditor: Página actual: ' + currentPage);
            
            if (currentPage === targetPage) {
              console.log('RoomCloud Auditor: Ya estamos en la página ' + targetPage);
              return true;
            }
          }
          
          // Buscar el enlace de la página objetivo
          const pageLinks = document.querySelectorAll('.paginate_button a');
          let targetLink = null;
          
          for (let link of pageLinks) {
            const pageText = link.textContent.trim();
            if (pageText === targetPage.toString()) {
              targetLink = link;
              break;
            }
          }
          
          if (targetLink) {
            console.log('RoomCloud Auditor: Enlace de página ' + targetPage + ' encontrado, navegando...');
            targetLink.click();
            return true;
          } else {
            console.log('RoomCloud Auditor: Enlace de página ' + targetPage + ' no encontrado');
            return false;
          }
          
        } catch (error) {
          console.error('RoomCloud Auditor: Error navegando a página:', error);
          return false;
        }
      }

      // Función para ejecutar la selección del hotel
      function executeHotelSelection(link, onclick) {
        try {
          // Extraer parámetros del onclick usando regex más simple
          const match = onclick.match(/changeFormData\('([^']+)','([^']+)','([^']+)','([^']+)'\)/);
          if (match) {
            const field = match[1];
            const formName = match[2];
            const codice = match[3];
            const descrizione = match[4];
            console.log('RoomCloud Auditor: Ejecutando changeFormData:', { field, formName, codice, descrizione });
            
            // Ejecutar la función directamente
            if (typeof window.changeFormData === 'function') {
              window.changeFormData(field, formName, codice, descrizione);
            } else {
              console.log('RoomCloud Auditor: changeFormData no disponible, haciendo clic...');
              link.click();
            }
          } else {
            console.log('RoomCloud Auditor: No se pudieron extraer parámetros, haciendo clic...');
            link.click();
          }
        } catch (error) {
          console.log('RoomCloud Auditor: Error ejecutando changeFormData:', error);
          link.click();
        }
      }

      // Función para buscar hotel en la página actual
      function searchHotelInCurrentPage(hotelId, pageInfo = null) {
        console.log('RoomCloud Auditor: Buscando hotel ' + hotelId + ' en página actual...');
        
        const hotelLinks = document.querySelectorAll('a.rc_hotelname');
        console.log('RoomCloud Auditor: Enlaces de hotel encontrados:', hotelLinks.length);
        
        let hotelFound = false;
        
        // Si tenemos información de posición, buscar en esa posición específica
        if (pageInfo && pageInfo.position !== undefined) {
          const targetLink = hotelLinks[pageInfo.position];
          if (targetLink) {
            const onclick = targetLink.getAttribute('onclick');
            if (onclick && onclick.includes(hotelId)) {
              console.log('RoomCloud Auditor: Hotel encontrado en posición esperada ' + (pageInfo.position + 1));
              executeHotelSelection(targetLink, onclick);
              return;
            }
          }
        }
        
        // Búsqueda en todos los enlaces de la página
        for (let link of hotelLinks) {
          const onclick = link.getAttribute('onclick');
          if (onclick && onclick.includes(hotelId)) {
            console.log('RoomCloud Auditor: Hotel encontrado en onclick:', onclick);
            executeHotelSelection(link, onclick);
            hotelFound = true;
            break;
          }
        }
        
        if (!hotelFound) {
          console.log('RoomCloud Auditor: Hotel no encontrado en esta página, navegando a la siguiente...');
          
          // Navegar a la siguiente página
          const nextButton = document.querySelector('#hotelsList_next a');
          if (nextButton) {
            const parentLi = nextButton.closest('li');
            if (parentLi && !parentLi.classList.contains('disabled')) {
              console.log('RoomCloud Auditor: Navegando a la siguiente página...');
              nextButton.click();
              
              setTimeout(() => {
                searchHotelById(hotelId, (pageInfo ? pageInfo.page : 1) + 1, 100);
              }, 3000);
            } else {
              console.log('RoomCloud Auditor: Botón Next está deshabilitado, hotel no encontrado');
            }
          }
        }
      }

      // Función principal para buscar hotel por ID
      function searchHotelById(hotelId, currentPage = 1, maxPages = 100) {
        console.log('RoomCloud Auditor: Buscando hotel ID: ' + hotelId + ' (página ' + currentPage + '/' + maxPages + ')');
        
        try {
          // Verificar límite de páginas para evitar recursión infinita
          if (currentPage > maxPages) {
            console.log('RoomCloud Auditor: Límite de páginas alcanzado (100), hotel no encontrado');
            return;
          }
          
          // Esperar a que la página cargue completamente
          if (document.readyState !== 'complete') {
            console.log('RoomCloud Auditor: Esperando a que la página cargue...');
            setTimeout(() => searchHotelById(hotelId, currentPage, maxPages), 1000);
            return;
          }
          
          console.log('RoomCloud Auditor: Página cargada, iniciando búsqueda optimizada...');
          
          // Método 0: Calcular página exacta usando dataSet
          const pageInfo = calculateHotelPage(hotelId);
          
          if (pageInfo) {
            console.log('RoomCloud Auditor: Método 0 - Navegando directamente a página ' + pageInfo.page);
            
            // Si no estamos en la página correcta, navegar a ella
            if (currentPage !== pageInfo.page) {
              const navigationSuccess = navigateToPage(pageInfo.page);
              
              if (navigationSuccess) {
                // Esperar a que la página cargue y buscar el hotel
                setTimeout(() => {
                  searchHotelInCurrentPage(hotelId, pageInfo);
                }, 3000);
                return;
              } else {
                console.log('RoomCloud Auditor: Fallback a búsqueda secuencial');
              }
            } else {
              // Ya estamos en la página correcta, buscar directamente
              searchHotelInCurrentPage(hotelId, pageInfo);
              return;
            }
          }
          
          // Método 1: Búsqueda secuencial (fallback)
          console.log('RoomCloud Auditor: Método 1 - Búsqueda secuencial...');
          searchHotelInCurrentPage(hotelId);
          
        } catch (error) {
          console.error('RoomCloud Auditor: Error en búsqueda de hotel:', error);
        }
      }

      // Ejecutar la búsqueda con el hotelId almacenado
      chrome.storage.local.get(['tempHotelId'], function(result) {
        if (result.tempHotelId) {
          console.log('RoomCloud Auditor: Iniciando búsqueda para hotel ID: ' + result.tempHotelId);
          searchHotelById(result.tempHotelId);
        } else {
          console.log('RoomCloud Auditor: No se encontró hotelId temporal');
        }
      });

    }
  }).then(() => {
    console.log('RoomCloud Auditor: Script inyectado exitosamente');
  }).catch((error) => {
    console.error('RoomCloud Auditor: Error inyectando script:', error);
  });
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
          
          // Inyectar script completo de búsqueda
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (hotelId) => {
              console.log('RoomCloud Auditor: Iniciando búsqueda para hotel ID: ' + hotelId);
              
              // Función simplificada para buscar hotel directamente
              function searchHotelDirectly(hotelId) {
                console.log('RoomCloud Auditor: Búsqueda directa para hotel ' + hotelId);
                
                try {
                  // Buscar el campo de búsqueda
                  const searchInput = document.querySelector('#hotelsList_filter input');
                  if (!searchInput) {
                    console.log('RoomCloud Auditor: Campo de búsqueda no encontrado');
                    return;
                  }
                  
                  console.log('RoomCloud Auditor: Campo de búsqueda encontrado, limpiando...');
                  
                  // Limpiar campo de búsqueda
                  searchInput.value = '';
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                  
                  // Esperar un momento y escribir el ID del hotel
                  setTimeout(() => {
                    console.log('RoomCloud Auditor: Escribiendo ID del hotel: ' + hotelId);
                    
                    // Escribir el ID del hotel
                    searchInput.value = hotelId;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Esperar a que se filtre y buscar el enlace
                    setTimeout(() => {
                      console.log('RoomCloud Auditor: Buscando enlace del hotel...');
                      
                      // Buscar el enlace del hotel con múltiples selectores
                      let hotelLink = null;
                      
                      // Método 1: Buscar por href con hotelId
                      hotelLink = document.querySelector(`a[href*="hotelId=${hotelId}"]`);
                      
                      // Método 2: Si no se encuentra, buscar por texto del ID en la fila
                      if (!hotelLink) {
                        console.log('RoomCloud Auditor: Buscando por ID en la tabla...');
                        const rows = document.querySelectorAll('table tbody tr');
                        for (const row of rows) {
                          const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                          if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                            hotelLink = row.querySelector('a');
                            break;
                          }
                        }
                      }
                      
                      // Método 3: Si aún no se encuentra, buscar cualquier enlace en la fila que contenga el hotel
                      if (!hotelLink) {
                        console.log('RoomCloud Auditor: Buscando cualquier enlace en la fila...');
                        const rows = document.querySelectorAll('table tbody tr');
                        for (const row of rows) {
                          const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                          if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                            hotelLink = row.querySelector('a[href*="hotelId"]') || row.querySelector('a');
                            break;
                          }
                        }
                      }
                      
                      if (hotelLink) {
                        console.log('RoomCloud Auditor: Hotel encontrado, haciendo clic en:', hotelLink.href);
                        hotelLink.click();
                      } else {
                        // Método 4: Hacer clic directamente en la fila que contiene el ID
                        console.log('RoomCloud Auditor: Intentando clic directo en la fila...');
                        const rows = document.querySelectorAll('table tbody tr');
                        for (const row of rows) {
                          const idCell = row.querySelector('td:nth-child(4)'); // Columna ID
                          if (idCell && idCell.textContent.trim() === hotelId.toString()) {
                            console.log('RoomCloud Auditor: Haciendo clic directo en la fila del hotel');
                            row.click();
                            return;
                          }
                        }
                        
                        console.log('RoomCloud Auditor: Hotel no encontrado en búsqueda. Filas disponibles:');
                        rows.forEach((row, index) => {
                          const idCell = row.querySelector('td:nth-child(4)');
                          const links = row.querySelectorAll('a');
                          console.log(`Fila ${index + 1}: ID=${idCell?.textContent.trim()}, Enlaces=${links.length}`);
                        });
                      }
                    }, 2000);
                    
                  }, 1000);
                  
                } catch (error) {
                  console.error('RoomCloud Auditor: Error en búsqueda directa:', error);
                }
              }
              
              // Iniciar búsqueda directa
              console.log('RoomCloud Auditor: Iniciando búsqueda directa para hotel ' + hotelId);
              searchHotelDirectly(hotelId);
            },
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

