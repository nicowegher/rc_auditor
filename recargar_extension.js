// Script para recargar la extensión RoomCloud Auditor
console.log('Recargando extensión RoomCloud Auditor...');

// Recargar la extensión
chrome.runtime.reload();

// Verificar que se recargó correctamente
setTimeout(() => {
  console.log('Extensión recargada. Verificando funcionalidad...');
  
  // Verificar que el content script esté activo
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('secure.roomcloud.net')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error de conexión:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('✅ Content script funcionando correctamente');
        } else {
          console.log('❌ Content script no responde');
        }
      });
    } else {
      console.log('⚠️ No estás en una página de RoomCloud');
    }
  });
}, 2000);
