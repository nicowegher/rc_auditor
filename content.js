// Content script para extraer datos de RoomCloud
console.log('RoomCloud Auditor: Content script cargado');

let currentPage = '';

// Función para detectar en qué página estamos
function detectCurrentPage() {
  const url = window.location.href;
  const path = window.location.pathname;
  
  console.log('RoomCloud Auditor: Detectando página - URL:', url);
  
  // Detectar página de prueba
  if (url.includes('test.html')) {
    return 'test_page';
  }
  
  // Detectar por URL y elementos en la página
  if (url.includes('property_detail') || document.querySelector('select[name="F_category"]')) {
    console.log('RoomCloud Auditor: Página detectada como property_detail');
    return 'property_detail';
  } else if (url.includes('availability') || document.querySelector('table.availability-table')) {
    console.log('RoomCloud Auditor: Página detectada como availability');
    return 'availability';
  } else if (url.includes('channels') || (document.querySelector('table.table tbody tr') && document.querySelector('span.success'))) {
    console.log('RoomCloud Auditor: Página detectada como channels');
    return 'channels';
  } else if (url.includes('automation') || document.querySelector('input.pms_checkbox')) {
    console.log('RoomCloud Auditor: Página detectada como automation');
    return 'automation';
  } else if (url.includes('payment') || (document.querySelector('table.table tbody tr.pg_online, table.table tbody tr.pg_offline') && document.querySelector('td:nth-child(2) span b'))) {
    console.log('RoomCloud Auditor: Página detectada como payment_gateways');
    return 'payment_gateways';
  } else if (url.includes('users') || document.querySelector('.fa-envelope')) {
    console.log('RoomCloud Auditor: Página detectada como users_list');
    return 'users_list';
  } else if (url.includes('revenue') || document.querySelector('table.table tbody tr th a')) {
    console.log('RoomCloud Auditor: Página detectada como revenue_calendar');
    return 'revenue_calendar';
  } else if (url.includes('rules') || document.querySelector('.active-rule, [class*="rule"], [id*="rule"]')) {
    console.log('RoomCloud Auditor: Página detectada como rules');
    return 'rules';
  } else if (url.includes('comparison') || document.querySelector('form[name="formSearch"] input[name^="cp_"]') || document.querySelector('h1')?.textContent.includes('Comparación de Tarifas')) {
    console.log('RoomCloud Auditor: Página detectada como comparison');
    return 'comparison';
  } else if (url.includes('meta') || document.querySelector('h1')?.textContent.includes('Metabuscadores') || document.querySelector('[class*="meta-dashboard"]') || document.querySelector('table.table-striped tbody tr td span.online, table.table-striped tbody tr td span.offline')) {
    console.log('RoomCloud Auditor: Página detectada como meta_dashboard');
    return 'meta_dashboard';
  } else {
    console.log('RoomCloud Auditor: Página no reconocida, retornando unknown');
    return 'unknown';
  }
}

// Función para extraer información del hotel (nombre e ID)
function extractHotelInfo() {
  const data = {};
  
  try {
    // Buscar nombre del hotel en diferentes ubicaciones
    let hotelName = '';
    
    // Buscar en el campo específico de RoomCloud (F_description)
    const descriptionInput = document.querySelector('input[name="F_description"]');
    if (descriptionInput && descriptionInput.value) {
      hotelName = descriptionInput.value.trim();
    }
    
    // Buscar en el título de la página como fallback
    if (!hotelName) {
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent) {
        const titleText = titleElement.textContent.trim();
        // Extraer nombre del hotel del título (formato típico: "Hotel Name - RoomCloud")
        const nameMatch = titleText.match(/^(.+?)(?:\s*[-–]\s*RoomCloud|\s*[-–]\s*RC)/i);
        if (nameMatch) {
          hotelName = nameMatch[1].trim();
        }
      }
    }
    
    // Buscar en elementos de navegación o breadcrumbs como fallback
    if (!hotelName) {
      const navElements = document.querySelectorAll('.breadcrumb, .nav-item, .hotel-name, [class*="hotel"], [class*="property"]');
      for (let element of navElements) {
        const text = element.textContent.trim();
        if (text && text.length > 3 && text.length < 100 && !text.includes('RoomCloud')) {
          hotelName = text;
          break;
        }
      }
    }
    
    // Buscar en inputs o selects que puedan contener el nombre como último fallback
    if (!hotelName) {
      const nameInputs = document.querySelectorAll('input[name*="name"], input[name*="hotel"], select[name*="hotel"]');
      for (let input of nameInputs) {
        if (input.value && input.value.length > 3) {
          hotelName = input.value;
          break;
        }
      }
    }
    
    data.nombre_hotel = hotelName || 'N/A';
    
    // Buscar ID del hotel
    let hotelId = '';
    
    // Buscar en el campo específico de RoomCloud (hotels_id)
    const hotelsIdInput = document.querySelector('input[name="hotels_id"]');
    if (hotelsIdInput && hotelsIdInput.value) {
      hotelId = hotelsIdInput.value.trim();
    }
    
    // Buscar en la URL como fallback
    if (!hotelId) {
      const urlParams = new URLSearchParams(window.location.search);
      const rcId = urlParams.get('rc_id') || urlParams.get('id') || urlParams.get('hotel_id');
      if (rcId) {
        hotelId = rcId;
      }
    }
    
    // Buscar en elementos de la página como fallback
    if (!hotelId) {
      const idElements = document.querySelectorAll('[id*="rc"], [class*="rc-id"], [data-id]');
      for (let element of idElements) {
        const idValue = element.getAttribute('data-id') || element.textContent.trim();
        if (idValue && /^[A-Z0-9]+$/.test(idValue) && idValue.length > 3) {
          hotelId = idValue;
          break;
        }
      }
    }
    
    // Buscar en inputs ocultos como último fallback
    if (!hotelId) {
      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      for (let input of hiddenInputs) {
        const name = input.name || input.id || '';
        if (name.includes('rc') || name.includes('id') || name.includes('hotel')) {
          const value = input.value.trim();
          if (value && value.length > 0) {
            hotelId = value;
            break;
          }
        }
      }
    }
    
    data.id_hotel = hotelId || 'N/A';
    
  } catch (error) {
    console.error('Error extrayendo información del hotel:', error);
    data.nombre_hotel = 'N/A';
    data.id_hotel = 'N/A';
  }
  
  return data;
}

// Función para extraer datos de la página de detalles del hotel
function extractPropertyDetails() {
  const data = {};
  
  try {
    // Extraer información del hotel primero
    const hotelInfo = extractHotelInfo();
    data.nombre_hotel = hotelInfo.nombre_hotel;
    data.id_hotel = hotelInfo.id_hotel;
    
    // Buscar categoría
    const categorySelect = document.querySelector('select[name="F_category"]');
    if (categorySelect) {
      data.categoria = categorySelect.options[categorySelect.selectedIndex]?.text || 'N/A';
    }
    
    // Buscar estrellas
    const starsSelect = document.querySelector('select[name="F_stars"]');
    if (starsSelect) {
      data.estrellas = starsSelect.options[starsSelect.selectedIndex]?.text || 'N/A';
    }
    
    // Buscar apertura
    const openingSelect = document.querySelector('select[name="F_opening"]');
    if (openingSelect) {
      data.apertura = openingSelect.options[openingSelect.selectedIndex]?.text || 'N/A';
    }
    
    // Buscar cantidad de habitaciones
    const roomsInput = document.querySelector('input[name="room_number"]');
    if (roomsInput) {
      data.habitaciones = roomsInput.value || 'N/A';
    }
    
    // Fallback: buscar por texto en labels
    if (!data.categoria || !data.estrellas || !data.apertura || !data.habitaciones) {
      const labels = document.querySelectorAll('label');
      for (let label of labels) {
        const text = label.textContent.trim();
        const row = label.closest('.row');
        
        if (text.includes('Categoría:') && !data.categoria) {
          const select = row?.querySelector('select');
          if (select) {
            data.categoria = select.options[select.selectedIndex]?.text || 'N/A';
          }
        }
        if (text.includes('Estrellas:') && !data.estrellas) {
          const select = row?.querySelector('select');
          if (select) {
            data.estrellas = select.options[select.selectedIndex]?.text || 'N/A';
          }
        }
        if (text.includes('Apertura:') && !data.apertura) {
          const select = row?.querySelector('select');
          if (select) {
            data.apertura = select.options[select.selectedIndex]?.text || 'N/A';
          }
        }
        if (text.includes('Cantidad total de habitaciones:') && !data.habitaciones) {
          const input = row?.querySelector('input');
          if (input) {
            data.habitaciones = input.value || 'N/A';
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error extrayendo detalles del hotel:', error);
  }
  
  return data;
}

// Función para extraer datos de disponibilidad, tarifas y cierre de ventas
function extractAvailabilityData() {
  const data = {};
  
  try {
    // No extraer nombre e ID del hotel aquí ya que se extrajo en el paso anterior
    // Solo extraer datos específicos de disponibilidad
    
    // Buscar moneda
    let moneda = 'N/A';
    const monedaElements = document.querySelectorAll('div');
    for (let element of monedaElements) {
      const text = element.textContent.trim();
      if (text.includes('Moneda:')) {
        const monedaMatch = text.match(/Moneda:\s*(\w+)/);
        if (monedaMatch) {
          moneda = monedaMatch[1];
          break;
        }
      }
    }
    data.moneda_carga = moneda;
    
    // Buscar tarifas en inputs de precio
    let lowestRate = Infinity;
    const priceInputs = document.querySelectorAll('input[type="number"][data-type="pr"]');
    
    for (let input of priceInputs) {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value > 0 && value < 9999 && value < lowestRate) {
        lowestRate = value;
      }
    }
    
    // Si no encontró en inputs, buscar en botones con clases específicas
    if (lowestRate === Infinity) {
      const rateButtons = document.querySelectorAll('.roomRateCs');
      for (let button of rateButtons) {
        const text = button.textContent.trim();
        const rateMatch = text.match(/(\d+(?:\.\d{2})?)/);
        if (rateMatch) {
          const rate = parseFloat(rateMatch[1]);
          if (!isNaN(rate) && rate > 0 && rate < 9999 && rate < lowestRate) {
            lowestRate = rate;
          }
        }
      }
    }
    
    data.tarifa_mas_baja_usd = lowestRate !== Infinity ? lowestRate : 'N/A';
    
    // ===== DETECCIÓN DE CIERRE DE VENTAS =====
    
    // Buscar elementos con la clase btn-closed en toda la página
    let cierreParcialColorElements = [];
    
    console.log('RoomCloud Auditor: === INICIO DETECCIÓN CIERRE PARCIAL ===');
    
    // Buscar elementos con la clase btn-closed en toda la página
    cierreParcialColorElements = document.querySelectorAll('.btn-closed');
    console.log('RoomCloud Auditor: Elementos con clase btn-closed encontrados en toda la página:', cierreParcialColorElements.length);
    
    if (cierreParcialColorElements.length > 0) {
      console.log('RoomCloud Auditor: Se encontraron elementos con clase btn-closed, mostrando primeros 3:');
      for (let i = 0; i < Math.min(3, cierreParcialColorElements.length); i++) {
        const element = cierreParcialColorElements[i];
        console.log('RoomCloud Auditor: Elemento', i + 1, ':', element.tagName, element.className, element.id);
      }
    } else {
      console.log('RoomCloud Auditor: No se encontraron elementos con clase btn-closed');
    }
    
    // Determinar si hay cierres parciales
    const hasCierresParciales = cierreParcialColorElements.length > 0;
    
    console.log('RoomCloud Auditor: Total de elementos con cierre parcial encontrados:', cierreParcialColorElements.length);
    console.log('RoomCloud Auditor: Resultado final - Cierres parciales:', hasCierresParciales ? 'Sí' : 'No');
    console.log('RoomCloud Auditor: === FIN DETECCIÓN CIERRE PARCIAL ===');
    
    data.cierres_parciales = hasCierresParciales ? 'Sí' : 'No';
    
  } catch (error) {
    console.error('Error extrayendo datos de disponibilidad:', error);
  }
  
  return data;
}



// Función para extraer lista de usuarios
function extractUsersList() {
  const data = {};
  
  try {
    // No extraer nombre e ID del hotel aquí ya que se extrajo en el paso anterior
    // Solo extraer datos específicos de usuarios
    
    const userEmails = [];
    const userRows = document.querySelectorAll('.row.margin-bottom');
    
    console.log('RoomCloud Auditor: Encontradas', userRows.length, 'filas de usuarios');
    
    for (let row of userRows) {
      const emailElement = row.querySelector('.fa-envelope');
      if (emailElement) {
        const emailText = emailElement.nextElementSibling?.textContent.trim();
        if (emailText && emailText.includes('@')) {
          // Limpiar el email (remover asteriscos)
          const cleanEmail = emailText.replace(/\*+/g, '');
          
          // Filtrar correos que terminen con @pxsol.com o @roomcloud.net
          if (!cleanEmail.endsWith('@pxsol.com') && !cleanEmail.endsWith('@roomcloud.net')) {
            userEmails.push(cleanEmail);
            console.log('RoomCloud Auditor: Usuario incluido:', cleanEmail);
          } else {
            console.log('RoomCloud Auditor: Usuario excluido:', cleanEmail);
          }
        }
      }
    }
    
    data.usuarios_roomcloud = userEmails.length > 0 ? userEmails.join('; ') : 'N/A';
    data.cantidad_usuarios = userEmails.length;
    console.log('RoomCloud Auditor: Usuarios extraídos:', data.usuarios_roomcloud);
    console.log('RoomCloud Auditor: Cantidad de usuarios:', data.cantidad_usuarios);
    
  } catch (error) {
    console.error('Error extrayendo lista de usuarios:', error);
    data.usuarios_roomcloud = 'Error en extracción';
    data.cantidad_usuarios = 0;
  }
  
  return data;
}

// Función para extraer canales activos
function extractChannels() {
  const data = {};
  
  try {
    // No extraer nombre e ID del hotel aquí ya que se extrajo en el paso anterior
    // Solo extraer datos específicos de canales
    
    const activeChannels = [];
    const channelRows = document.querySelectorAll('table.table tbody tr');
    
    console.log('RoomCloud Auditor: Encontradas', channelRows.length, 'filas de canales');
    
    // Verificar que todas las filas tienen la estructura esperada
    let validRows = 0;
    for (let i = 0; i < channelRows.length; i++) {
      const row = channelRows[i];
      const channelNameElement = row.querySelector('td:nth-child(2) a');
      const nameCell = row.querySelector('td:nth-child(2)');
      if (channelNameElement || (nameCell && nameCell.textContent.trim())) {
        validRows++;
      }
    }
    console.log('RoomCloud Auditor: Filas válidas con nombre de canal:', validRows);
    
    for (let i = 0; i < channelRows.length; i++) {
      const row = channelRows[i];
      console.log('RoomCloud Auditor: Procesando fila', i + 1, 'de', channelRows.length);
      
      // Debug: mostrar información de cada fila
      const statusCell = row.querySelector('td:nth-child(5)'); // Columna "estado de conexión"
      const hasSuccessSpan = statusCell ? statusCell.querySelector('span.success') : null;
      const hasCheckIcon = hasSuccessSpan ? hasSuccessSpan.querySelector('.fa-check') : null;
      
      // Buscar nombre del canal: primero en enlace <a>, luego en texto directo
      let channelNameElement = row.querySelector('td:nth-child(2) a');
      let channelName = '';
      
      if (channelNameElement) {
        // Canal con hipervínculo
        channelName = channelNameElement.textContent.trim();
        console.log('RoomCloud Auditor: Fila', i + 1, '- Canal (con enlace):', channelName, 'StatusCell:', !!statusCell, 'SuccessSpan:', !!hasSuccessSpan, 'CheckIcon:', !!hasCheckIcon);
      } else {
        // Canal sin hipervínculo - buscar texto directo en la celda
        const nameCell = row.querySelector('td:nth-child(2)');
        if (nameCell) {
          channelName = nameCell.textContent.trim();
          console.log('RoomCloud Auditor: Fila', i + 1, '- Canal (sin enlace):', channelName, 'StatusCell:', !!statusCell, 'SuccessSpan:', !!hasSuccessSpan, 'CheckIcon:', !!hasCheckIcon);
        }
      }
      
      if (channelName) {
        // Si tiene check verde, agregar a la lista de canales activos
        if (hasCheckIcon) {
          // Limpiar el nombre del canal (remover el número entre paréntesis)
          const cleanName = channelName.replace(/\s*\(\d+\)$/, '');
          activeChannels.push(cleanName);
          console.log('RoomCloud Auditor: Canal activo encontrado:', cleanName);
        } else {
          console.log('RoomCloud Auditor: Canal NO activo:', channelName);
        }
      } else {
        console.log('RoomCloud Auditor: Fila', i + 1, '- No se encontró nombre del canal');
      }
    }
    
    data.canales_activos = activeChannels.length > 0 ? activeChannels.join('; ') : 'N/A';
    data.cantidad_canales_activos = activeChannels.length;
    console.log('RoomCloud Auditor: Canales activos extraídos:', data.canales_activos);
    console.log('RoomCloud Auditor: Cantidad de canales activos:', data.cantidad_canales_activos);
    console.log('RoomCloud Auditor: Lista completa de canales activos:', activeChannels);
    
  } catch (error) {
    console.error('Error extrayendo canales:', error);
    data.canales_activos = 'Error en extracción';
    data.cantidad_canales_activos = 0;
  }
  
  return data;
}

// Función para extraer integración PMS
async function extractPMSIntegration() {
  const data = {};
  
  try {
    // No extraer nombre e ID del hotel aquí ya que se extrajo en el paso anterior
    // Solo extraer datos específicos de PMS
    
    console.log('RoomCloud Auditor: Buscando integración PMS...');
    
    // Verificar si la pestaña PMS está activa, si no, hacer clic en ella
    const pmsTab = document.querySelector('a[href*="#4"]');
    const pmsTabPane = document.querySelector('[id="4"].tab-pane.active');
    
    if (pmsTab && !pmsTabPane) {
      console.log('RoomCloud Auditor: Pestaña PMS no está activa, haciendo clic...');
      pmsTab.click();
      
      // Esperar un momento para que se cargue la tabla
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('RoomCloud Auditor: Pestaña PMS ya está activa');
    }
    
    // Buscar checkboxes de PMS marcados
    const checkedPMS = document.querySelectorAll('input.pms_checkbox:checked');
    console.log('RoomCloud Auditor: Encontrados', checkedPMS.length, 'PMS marcados');
    
    if (checkedPMS.length > 0) {
      data.integracion_pms = 'Sí';
      const pmsNames = [];
      
      for (let i = 0; i < checkedPMS.length; i++) {
        const checkbox = checkedPMS[i];
        const row = checkbox.closest('tr');
        if (row) {
          const nameCell = row.querySelector('td:nth-child(4)');
          if (nameCell) {
            const name = nameCell.textContent.trim().split('\n')[0]; // Tomar solo el nombre, no el ícono
            pmsNames.push(name);
            console.log('RoomCloud Auditor: PMS activo encontrado:', name);
          } else {
            console.log('RoomCloud Auditor: No se encontró celda de nombre para PMS', i + 1);
          }
        } else {
          console.log('RoomCloud Auditor: No se encontró fila para PMS', i + 1);
        }
      }
      
      data.pms_provider = pmsNames.join('; ');
      data.cantidad_pms_activos = pmsNames.length;
      console.log('RoomCloud Auditor: PMS activos extraídos:', data.pms_provider);
      console.log('RoomCloud Auditor: Cantidad de PMS activos:', data.cantidad_pms_activos);
    } else {
      data.integracion_pms = 'No';
      data.pms_provider = 'N/C';
      data.cantidad_pms_activos = 0;
      console.log('RoomCloud Auditor: No se encontraron PMS activos');
    }
    
  } catch (error) {
    console.error('Error extrayendo integración PMS:', error);
    data.integracion_pms = 'Error en extracción';
    data.pms_provider = 'Error';
    data.cantidad_pms_activos = 0;
  }
  
  return data;
}

// Función para extraer pasarelas de pago
async function extractPaymentGateways() {
  const data = {};
  try {
    console.log('RoomCloud Auditor: Buscando pasarelas de pago activas...');
    
    // PRIMERO: Activar el filtro "Show Active Only" si existe
    const showActiveOnlyCheckbox = document.querySelector('#sao');
    
    if (showActiveOnlyCheckbox) {
      console.log('RoomCloud Auditor: Encontrado checkbox "Show Active Only"');
      
      // Verificar si ya está activado
      const isChecked = showActiveOnlyCheckbox.checked;
      console.log('RoomCloud Auditor: Checkbox "Show Active Only" está activado:', isChecked);
      
      if (!isChecked) {
        console.log('RoomCloud Auditor: Activando checkbox "Show Active Only"...');
        
        // Activar el checkbox
        showActiveOnlyCheckbox.checked = true;
        
        // Disparar el evento change para que iCheck lo detecte
        const event = new Event('change', { bubbles: true });
        showActiveOnlyCheckbox.dispatchEvent(event);
        
        // También disparar el evento ifChecked de iCheck
        const ifCheckedEvent = new Event('ifChecked');
        showActiveOnlyCheckbox.dispatchEvent(ifCheckedEvent);
        
        // Esperar un momento para que se aplique el filtro
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('RoomCloud Auditor: Checkbox "Show Active Only" activado');
      } else {
        console.log('RoomCloud Auditor: Checkbox "Show Active Only" ya estaba activado');
      }
    } else {
      console.log('RoomCloud Auditor: No se encontró checkbox "Show Active Only"');
    }
    
    const activeGateways = [];
    const gatewayRows = document.querySelectorAll('table.table tbody tr');
    console.log('RoomCloud Auditor: Encontradas', gatewayRows.length, 'filas de pasarelas de pago (después del filtro)');
    
    for (let i = 0; i < gatewayRows.length; i++) {
      const row = gatewayRows[i];
      console.log('RoomCloud Auditor: Procesando fila', i + 1, 'de', gatewayRows.length);
      
      // Verificar si la fila tiene la clase pg_online (activa)
      const isOnline = row.classList.contains('pg_online');
      console.log('RoomCloud Auditor: Fila', i + 1, '- Es online:', isOnline);
      
      if (isOnline) {
        // Obtener nombre del medio de pago
        const nameElement = row.querySelector('td:nth-child(2) span b');
        let gatewayName = '';
        if (nameElement) {
          gatewayName = nameElement.textContent.trim();
          console.log('RoomCloud Auditor: Fila', i + 1, '- Nombre encontrado:', gatewayName);
        } else {
          console.log('RoomCloud Auditor: Fila', i + 1, '- No se encontró nombre del medio de pago');
        }
        
        // Verificar estado (círculo verde)
        const statusElement = row.querySelector('td:nth-child(6) span.online');
        const hasGreenCircle = statusElement && statusElement.querySelector('.fa-circle');
        console.log('RoomCloud Auditor: Fila', i + 1, '- Tiene círculo verde:', !!hasGreenCircle);
        
        // Verificar si tiene tarifas vinculadas
        const ratesElement = row.querySelector('td:nth-child(4)');
        let hasRates = false;
        if (ratesElement) {
          const ratesText = ratesElement.textContent.trim();
          // Verificar si hay enlaces a tarifas (no solo el enlace "add_rate")
          const rateLinks = ratesElement.querySelectorAll('a[href*="contentRates.jsp"]');
          hasRates = rateLinks.length > 0;
          console.log('RoomCloud Auditor: Fila', i + 1, '- Tiene tarifas vinculadas:', hasRates, '(enlaces encontrados:', rateLinks.length, ')');
        } else {
          console.log('RoomCloud Auditor: Fila', i + 1, '- No se encontró columna de tarifas');
        }
        
        // Solo incluir si tiene círculo verde Y tarifas vinculadas Y no es Cash o Credit Card
        if (gatewayName && hasGreenCircle && hasRates) {
          // Excluir Cash y Credit Card
          if (gatewayName.toLowerCase() !== 'cash' && gatewayName.toLowerCase() !== 'credit card') {
            activeGateways.push(gatewayName);
            console.log('RoomCloud Auditor: Pasarela activa agregada:', gatewayName);
          } else {
            console.log('RoomCloud Auditor: Pasarela excluida (Cash/Credit Card):', gatewayName);
          }
        } else {
          console.log('RoomCloud Auditor: Pasarela NO agregada:', gatewayName, '- Círculo verde:', !!hasGreenCircle, '- Tarifas:', hasRates);
        }
      } else {
        console.log('RoomCloud Auditor: Fila', i + 1, '- No es online, saltando');
      }
    }
    
    data.pasarelas_pago_activas = activeGateways.length > 0 ? activeGateways.join('; ') : 'N/A';
    data.cantidad_pasarelas_activas = activeGateways.length;
    console.log('RoomCloud Auditor: Pasarelas activas extraídas:', data.pasarelas_pago_activas);
    console.log('RoomCloud Auditor: Cantidad de pasarelas activas:', data.cantidad_pasarelas_activas);
    console.log('RoomCloud Auditor: Lista completa de pasarelas activas:', activeGateways);
  } catch (error) {
    console.error('Error extrayendo pasarelas de pago:', error);
    data.pasarelas_pago_activas = 'Error en extracción';
    data.cantidad_pasarelas_activas = 0;
  }
  return data;
}

// Función para extraer reglas de revenue management
function extractRevenueRules() {
  const data = {};
  try {
    console.log('RoomCloud Auditor: Buscando reglas de Revenue Management...');
    
    const activeRules = [];
    const ruleRows = document.querySelectorAll('table.table tbody tr');
    console.log('RoomCloud Auditor: Encontradas', ruleRows.length, 'filas de reglas');
    
    for (let row of ruleRows) {
      const ruleNameElement = row.querySelector('th a');
      if (ruleNameElement) {
        const ruleName = ruleNameElement.textContent.trim();
        // Verificar si la regla tiene celdas coloreadas (activas)
        const coloredCells = row.querySelectorAll('td[bgcolor]');
        if (coloredCells.length > 0) {
          activeRules.push(ruleName);
          console.log('RoomCloud Auditor: Regla activa encontrada:', ruleName);
        } else {
          console.log('RoomCloud Auditor: Regla inactiva:', ruleName);
        }
      }
    }
    
    data.reglas_revenue_activas = activeRules.length > 0 ? activeRules.join('; ') : 'N/A';
    data.cantidad_reglas_revenue = activeRules.length;
    console.log('RoomCloud Auditor: Reglas de revenue activas extraídas:', data.reglas_revenue_activas);
    console.log('RoomCloud Auditor: Cantidad de reglas de revenue:', data.cantidad_reglas_revenue);
    
  } catch (error) {
    console.error('Error extrayendo reglas de revenue:', error);
    data.reglas_revenue_activas = 'Error en extracción';
    data.cantidad_reglas_revenue = 0;
  }
  
  return data;
}

// Función para extraer comparador de precios
function extractPriceComparison() {
  const data = {};
  
  try {
    console.log('RoomCloud Auditor: Verificando estado del comparador de precios...');
    
    // Buscar checkboxes de hoteles para comparar (nombres que empiecen con 'cp_')
    const hotelCheckboxes = document.querySelectorAll('input[name^="cp_"]');
    console.log('RoomCloud Auditor: Encontrados', hotelCheckboxes.length, 'checkboxes de hoteles para comparar');
    
    // Buscar también en la tabla de comparación
    const comparisonTable = document.querySelector('table[border="1"]');
    const tableRows = comparisonTable ? comparisonTable.querySelectorAll('tbody tr') : [];
    console.log('RoomCloud Auditor: Encontradas', tableRows.length, 'filas en tabla de comparación');
    
    // Contar filas que contengan hoteles (excluyendo la fila de header)
    let hotelRows = 0;
    for (let row of tableRows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const hotelNameCell = cells[0];
        const checkboxCell = cells[1];
        
        // Verificar si la celda contiene nombre de hotel y checkbox
        const hasHotelName = hotelNameCell && hotelNameCell.textContent.trim().length > 0;
        const hasCheckbox = checkboxCell && checkboxCell.querySelector('input[type="checkbox"]');
        
        if (hasHotelName && hasCheckbox) {
          hotelRows++;
          console.log('RoomCloud Auditor: Fila de hotel encontrada:', hotelNameCell.textContent.trim());
        }
      }
    }
    
    // Determinar si el comparador está habilitado
    const hasHotelCheckboxes = hotelCheckboxes.length > 0;
    const hasHotelRows = hotelRows > 0;
    
    console.log('RoomCloud Auditor: Checkboxes de hoteles:', hasHotelCheckboxes);
    console.log('RoomCloud Auditor: Filas de hoteles en tabla:', hasHotelRows);
    
    if (hasHotelCheckboxes || hasHotelRows) {
      data.comparador_precios = 'Con comparador';
      data.cantidad_hoteles_comparacion = Math.max(hotelCheckboxes.length, hotelRows);
      console.log('RoomCloud Auditor: Comparador HABILITADO con', data.cantidad_hoteles_comparacion, 'hoteles');
    } else {
      data.comparador_precios = 'Sin comparador';
      data.cantidad_hoteles_comparacion = 0;
      console.log('RoomCloud Auditor: Comparador DESHABILITADO - no se encontraron hoteles para comparar');
    }
    
  } catch (error) {
    console.error('Error extrayendo comparador de precios:', error);
    data.comparador_precios = 'Error en extracción';
    data.cantidad_hoteles_comparacion = 0;
  }
  
  return data;
}

// Función para extraer metabuscadores
function extractMetaSearch() {
  const data = {};
  
  try {
    console.log('RoomCloud Auditor: Verificando metabuscadores...');
    
    // Buscar en la tabla de metabuscadores específicamente
    const metaTable = document.querySelector('table.table-striped');
    let activeMetaCount = 0;
    let totalMetaCount = 0;
    let onlineElementsInTable = 0;
    let offlineElementsInTable = 0;
    
    if (metaTable) {
      const rows = metaTable.querySelectorAll('tbody tr');
      console.log('RoomCloud Auditor: Encontradas', rows.length, 'filas en tabla de metabuscadores');
      
      for (let row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          totalMetaCount++;
          
          // Verificar si tiene switch activado
          const switchElement = row.querySelector('.bootstrap-switch-on');
          const checkbox = row.querySelector('input.activateMeta:checked');
          
          // Verificar si tiene estado online/offline SOLO en esta fila
          const statusOnline = row.querySelector('span.online');
          const statusOffline = row.querySelector('span.offline');
          
          if (statusOnline) {
            onlineElementsInTable++;
            console.log('RoomCloud Auditor: Metabuscador ONLINE encontrado en fila', totalMetaCount);
          }
          
          if (statusOffline) {
            offlineElementsInTable++;
            console.log('RoomCloud Auditor: Metabuscador OFFLINE encontrado en fila', totalMetaCount);
          }
          
          if (switchElement || checkbox || statusOnline) {
            activeMetaCount++;
            console.log('RoomCloud Auditor: Metabuscador activo encontrado en fila', totalMetaCount);
          }
        }
      }
    }
    
    // Buscar elementos online/offline SOLO en la tabla de metabuscadores
    const onlineElementsInTableSelector = metaTable ? metaTable.querySelectorAll('span.online') : [];
    const offlineElementsInTableSelector = metaTable ? metaTable.querySelectorAll('span.offline') : [];
    
    console.log('RoomCloud Auditor: Elementos online en tabla:', onlineElementsInTableSelector.length);
    console.log('RoomCloud Auditor: Elementos offline en tabla:', offlineElementsInTableSelector.length);
    console.log('RoomCloud Auditor: Metabuscadores activos en tabla:', activeMetaCount);
    console.log('RoomCloud Auditor: Total metabuscadores:', totalMetaCount);
    
    // Determinar estado de metabuscadores
    const hasActiveMeta = activeMetaCount > 0;
    const hasOnlineInTable = onlineElementsInTableSelector.length > 0;
    
    console.log('RoomCloud Auditor: Tiene metabuscadores activos:', hasActiveMeta);
    console.log('RoomCloud Auditor: Tiene elementos online en tabla:', hasOnlineInTable);
    
    if (hasActiveMeta || hasOnlineInTable) {
      data.metabuscadores = 'Activo';
      data.cantidad_metabuscadores_activos = Math.max(activeMetaCount, onlineElementsInTableSelector.length);
      console.log('RoomCloud Auditor: Metabuscadores ACTIVOS con', data.cantidad_metabuscadores_activos, 'metabuscadores');
    } else {
      data.metabuscadores = 'Inactivo';
      data.cantidad_metabuscadores_activos = 0;
      console.log('RoomCloud Auditor: Metabuscadores INACTIVOS');
    }
    
  } catch (error) {
    console.error('Error extrayendo metabuscadores:', error);
    data.metabuscadores = 'Error en extracción';
    data.cantidad_metabuscadores_activos = 0;
  }
  
  return data;
}

// Función para extraer reglas de negocio
function extractBusinessRules() {
  const data = {};
  
  try {
    // No extraer nombre e ID del hotel aquí ya que se extrajo en el paso anterior
    // Solo extraer datos específicos de reglas de negocio
    
    // Buscar reglas activas
    const activeRules = document.querySelectorAll('input[type="checkbox"]:checked, .active-rule, [style*="green"]');
    data.reglas_negocio = activeRules.length > 0 ? 'Sí' : 'No';
    
    // Buscar políticas específicas
    const policies = document.querySelectorAll('.policy, .rule-item, [class*="policy"]');
    const policyNames = [];
    
    policies.forEach(policy => {
      const text = policy.textContent.trim();
      if (text && text.length > 3 && text.length < 100) {
        policyNames.push(text);
      }
    });
    
    data.politicas_especificas = policyNames.length > 0 ? policyNames.join('; ') : 'N/A';
    
  } catch (error) {
    console.error('Error extrayendo reglas de negocio:', error);
  }
  
  return data;
}

// Función para extraer datos de la página de prueba
function extractTestPageData() {
  const data = {};
  
  try {
    // Extraer datos del hotel de la página de prueba (usando los mismos nombres que RoomCloud)
    const hotelNameInput = document.querySelector('input[name="F_description"]');
    data.nombre_hotel = hotelNameInput ? hotelNameInput.value : 'Hotel de Prueba';
    
    const hotelIdInput = document.querySelector('input[name="hotels_id"]');
    data.id_hotel = hotelIdInput ? hotelIdInput.value : 'TEST001';
    
    // Extraer datos de los elementos de prueba
    const categorySelect = document.querySelector('select[name="F_category"]');
    if (categorySelect) {
      data.categoria = categorySelect.options[categorySelect.selectedIndex]?.text || 'N/A';
    }
    
    const starsSelect = document.querySelector('select[name="F_stars"]');
    if (starsSelect) {
      data.estrellas = starsSelect.options[starsSelect.selectedIndex]?.text || 'N/A';
    }
    
    const openingSelect = document.querySelector('select[name="F_opening"]');
    if (openingSelect) {
      data.apertura = openingSelect.options[openingSelect.selectedIndex]?.text || 'N/A';
    }
    
    const roomsInput = document.querySelector('input[name="room_number"]');
    if (roomsInput) {
      data.habitaciones = roomsInput.value || 'N/A';
    }
    
    // Buscar tarifa más baja en la tabla
    const tables = document.querySelectorAll('table');
    let lowestRate = Infinity;
    
    for (let table of tables) {
      const rows = table.querySelectorAll('tr');
      for (let row of rows) {
        const cells = row.querySelectorAll('td');
        for (let cell of cells) {
          const text = cell.textContent.trim();
          const rateMatch = text.match(/(\d+(?:\.\d{2})?)/);
          if (rateMatch) {
            const rate = parseFloat(rateMatch[1]);
            if (!isNaN(rate) && rate > 0 && rate < 9999 && rate < lowestRate) {
              lowestRate = rate;
            }
          }
        }
      }
    }
    
    data.tarifa_mas_baja_usd = lowestRate !== Infinity ? lowestRate : 'N/A';
    data.cierres_parciales = 'No'; // En la página de prueba no hay cierres
    
  } catch (error) {
    console.error('Error extrayendo datos de prueba:', error);
  }
  
  return data;
}

// Función principal para extraer datos según la página actual
async function extractDataFromCurrentPage() {
  const page = detectCurrentPage();
  console.log('RoomCloud Auditor: Página detectada:', page);
  let data = {};
  
  switch (page) {
    case 'test_page':
      data = extractTestPageData();
      break;
    case 'property_detail':
      data = extractPropertyDetails();
      break;
    case 'availability':
      data = extractAvailabilityData();
      break;
    case 'users_list':
      data = extractUsersList();
      break;
    case 'channels':
      data = extractChannels();
      break;
    case 'automation':
      data = await extractPMSIntegration();
      break;
    case 'payment_gateways':
      data = await extractPaymentGateways();
      break;
    case 'revenue_calendar':
      data = extractRevenueRules();
      break;
    case 'rules':
      data = extractBusinessRules();
      break;
    case 'comparison':
      data = extractPriceComparison();
      break;
    case 'meta_dashboard':
      data = extractMetaSearch();
      break;
    default:
      data = { error: 'Página no reconocida para extracción de datos' };
  }
  
  // Agregar información de la página
  data.pagina_actual = page;
  data.fecha_extraccion = new Date().toISOString();
  data.url = window.location.href;
  
  return data;
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('RoomCloud Auditor: Mensaje recibido:', request);
  
  if (request.action === 'extractData') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Extrayendo datos...');
        const data = await extractDataFromCurrentPage();
        console.log('RoomCloud Auditor: Datos extraídos:', data);
        sendResponse({ success: true, data: [data] });
      } catch (error) {
        console.error('RoomCloud Auditor: Error extrayendo datos:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  return true; // Mantener el canal de comunicación abierto
});

// Función para mostrar notificación en la página
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 5px;
    color: white;
    font-family: Arial, sans-serif;
    z-index: 10000;
    max-width: 300px;
  `;
  
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    default:
      notification.style.backgroundColor = '#2196F3';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
