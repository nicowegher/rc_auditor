// Content script para extraer datos de RoomCloud
console.log('RoomCloud Auditor: Content script cargado en:', window.location.href);

// Verificar que estamos en RoomCloud
if (window.location.href.includes('secure.roomcloud.net')) {
  console.log('RoomCloud Auditor: Página de RoomCloud detectada');
} else {
  console.log('RoomCloud Auditor: No es una página de RoomCloud');
}

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
  
  // Detectar página principal (home.jsp) - PRIMERA PRIORIDAD
  if (url.includes('home.jsp') || url.includes('owners_area/home.jsp')) {
    console.log('RoomCloud Auditor: Página detectada como home (dashboard principal)');
    return 'home';
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
  } else if (url.includes('users_list.jsp') || (url.includes('users') && document.querySelector('.fa-envelope') && !url.includes('meta'))) {
    console.log('RoomCloud Auditor: Página detectada como users_list');
    return 'users_list';
  } else if (url.includes('revenue_management_calendar.jsp') || (url.includes('revenue') && document.querySelector('table.table tbody tr th a'))) {
    console.log('RoomCloud Auditor: Página detectada como revenue_calendar');
    return 'revenue_calendar';
  } else if (url.includes('rules') || document.querySelector('.active-rule, [class*="rule"], [id*="rule"]')) {
    console.log('RoomCloud Auditor: Página detectada como rules');
    return 'rules';
  } else if (url.includes('comparison.jsp') || (url.includes('comparison') && (document.querySelector('form[name="formSearch"] input[name^="cp_"]') || document.querySelector('h1')?.textContent.includes('Comparación de Tarifas')))) {
    console.log('RoomCloud Auditor: Página detectada como comparison');
    return 'comparison';
  } else if (url.includes('meta_dashboard.jsp') || (url.includes('meta') && (document.querySelector('h1')?.textContent.includes('Metabuscadores') || document.querySelector('[class*="meta-dashboard"]') || document.querySelector('table.table-striped tbody tr td span.online, table.table-striped tbody tr td span.offline')))) {
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
    console.log('RoomCloud Auditor: Extrayendo información del hotel...');
    
    // Buscar nombre del hotel en diferentes ubicaciones
    let hotelName = '';
    let hotelId = '';
    
    // PRIMERA PRIORIDAD: Buscar en el menú de navegación donde siempre está disponible
    const hotelMenuElement = document.querySelector('.hotels-menu .dropdown-toggle .hidden-xs');
    if (hotelMenuElement && hotelMenuElement.textContent) {
      const menuText = hotelMenuElement.textContent.trim();
      console.log('RoomCloud Auditor: Texto del menú encontrado:', menuText);
      
      // Extraer nombre e ID del formato "Hotel Name [ID]"
      const hotelMatch = menuText.match(/^(.+?)\s*\[(\d+)\]$/);
      if (hotelMatch) {
        hotelName = hotelMatch[1].trim();
        hotelId = hotelMatch[2].trim();
        console.log('RoomCloud Auditor: Hotel extraído del menú - Nombre:', hotelName, 'ID:', hotelId);
      }
    }
    
    // Si no se encontró en el menú, buscar en el campo específico de RoomCloud (F_description)
    if (!hotelName) {
      const descriptionInput = document.querySelector('input[name="F_description"]');
      if (descriptionInput && descriptionInput.value) {
        hotelName = descriptionInput.value.trim();
        console.log('RoomCloud Auditor: Nombre encontrado en F_description:', hotelName);
      }
    }
    
    // Si no se encontró en el menú, buscar ID en el campo específico de RoomCloud (F_id)
    if (!hotelId) {
      const idInput = document.querySelector('input[name="F_id"]');
      if (idInput && idInput.value) {
        hotelId = idInput.value.trim();
        console.log('RoomCloud Auditor: ID encontrado en F_id:', hotelId);
      }
    }
    
    // Buscar en el título de la página como fallback
    if (!hotelName) {
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent) {
        const titleText = titleElement.textContent.trim();
        console.log('RoomCloud Auditor: Título de página:', titleText);
        // Extraer nombre del hotel del título (formato típico: "Hotel Name - RoomCloud")
        const nameMatch = titleText.match(/^(.+?)(?:\s*[-–]\s*RoomCloud|\s*[-–]\s*RC)/i);
        if (nameMatch) {
          hotelName = nameMatch[1].trim();
          console.log('RoomCloud Auditor: Nombre extraído del título:', hotelName);
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
    data.id_hotel = hotelId || 'N/A';
    
    console.log('RoomCloud Auditor: Resultado final - Nombre:', data.nombre_hotel, 'ID:', data.id_hotel);
    
    // Buscar en el campo específico de RoomCloud (hotels_id)
    const hotelsIdInput = document.querySelector('input[name="hotels_id"]');
    if (hotelsIdInput && hotelsIdInput.value) {
      hotelId = hotelsIdInput.value.trim();
      console.log('RoomCloud Auditor: ID encontrado en hotels_id:', hotelId);
    }
    
    // Buscar en el campo específico de RoomCloud (hotel_id)
    if (!hotelId) {
      const hotelIdInput = document.querySelector('input[name="hotel_id"]');
      if (hotelIdInput && hotelIdInput.value) {
        hotelId = hotelIdInput.value.trim();
        console.log('RoomCloud Auditor: ID encontrado en hotel_id:', hotelId);
      }
    }
    
    // Buscar en el campo específico de RoomCloud (rc_id)
    if (!hotelId) {
      const rcIdInput = document.querySelector('input[name="rc_id"]');
      if (rcIdInput && rcIdInput.value) {
        hotelId = rcIdInput.value.trim();
        console.log('RoomCloud Auditor: ID encontrado en rc_id:', hotelId);
      }
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
          console.log('RoomCloud Auditor: ID encontrado en elemento DOM:', hotelId);
          break;
        }
      }
    }
    
    // Buscar en elementos que contengan números que podrían ser IDs de hotel
    if (!hotelId) {
      const allElements = document.querySelectorAll('*');
      for (let element of allElements) {
        const text = element.textContent.trim();
        // Buscar números de 3-5 dígitos que podrían ser IDs de hotel
        const idMatch = text.match(/\b(\d{3,5})\b/);
        if (idMatch) {
          const potentialId = idMatch[1];
          // Verificar que no sea parte de una fecha o número de teléfono
          if (!text.includes('@') && !text.includes('-') && !text.includes('/')) {
            hotelId = potentialId;
            console.log('RoomCloud Auditor: ID encontrado en texto del DOM:', hotelId);
            break;
          }
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
    
    // Guardar la tarifa más baja independientemente de la moneda
    data.tarifa_mas_baja = lowestRate !== Infinity ? lowestRate : 'N/A';
    
    // Mantener compatibilidad con el campo anterior
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
          
          // Filtrar correos que terminen con @pxsol.com, @roomcloud.net o @cmreservas.com
          if (!cleanEmail.endsWith('@pxsol.com') && !cleanEmail.endsWith('@roomcloud.net') && !cleanEmail.endsWith('@cmreservas.com')) {
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
    console.log('RoomCloud Auditor: === PASARELAS RESULTADO FINAL ===');
    console.log('RoomCloud Auditor: pasarelas_pago_activas:', data.pasarelas_pago_activas);
    console.log('RoomCloud Auditor: cantidad_pasarelas_activas:', data.cantidad_pasarelas_activas);
    console.log('RoomCloud Auditor: === FIN PASARELAS ===');
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
    console.log('RoomCloud Auditor: URL actual:', window.location.href);
    
    const activeRules = [];
    
    // Buscar la tabla principal de Revenue Calendar - múltiples selectores
    let revenueTable = document.querySelector('table.table');
    if (!revenueTable) {
      revenueTable = document.querySelector('table');
      console.log('RoomCloud Auditor: Usando selector alternativo para tabla');
    }
    
    if (!revenueTable) {
      console.log('RoomCloud Auditor: No se encontró tabla de Revenue Calendar');
      console.log('RoomCloud Auditor: Tablas disponibles:', document.querySelectorAll('table').length);
      data.reglas_revenue_activas = 'N/A';
      data.cantidad_reglas_revenue = 0;
      return data;
    }
    
    // Buscar filas que contengan reglas (filas con <th> que contengan enlaces)
    const ruleRows = revenueTable.querySelectorAll('tbody tr');
    console.log('RoomCloud Auditor: Encontradas', ruleRows.length, 'filas de reglas en tabla de Revenue Calendar');
    
    for (let row of ruleRows) {
      // Buscar elementos <th> que contengan enlaces (nombres de reglas)
      const ruleNameElement = row.querySelector('th a');
      if (ruleNameElement) {
        const ruleName = ruleNameElement.textContent.trim();
        console.log('RoomCloud Auditor: Regla encontrada:', ruleName);
        
        // Verificar si la regla tiene celdas coloreadas (activas)
        // Las reglas activas tienen celdas con bgcolor="#83F79A" (verde para Stock), "#E04158" (rojo para Precio), "#00ffff" (azul para Opener)
        const coloredCells = row.querySelectorAll('td[bgcolor="#83F79A"], td[bgcolor="#00ffff"], td[bgcolor="#E04158"]');
        
        if (coloredCells.length > 0) {
          activeRules.push(ruleName);
          console.log('RoomCloud Auditor: Regla ACTIVA encontrada:', ruleName, 'con', coloredCells.length, 'celdas coloreadas');
        } else {
          console.log('RoomCloud Auditor: Regla INACTIVA:', ruleName, '- no tiene celdas coloreadas');
        }
      }
    }
    
    // Si no encontramos reglas en tbody, buscar en toda la tabla
    if (activeRules.length === 0) {
      console.log('RoomCloud Auditor: No se encontraron reglas en tbody, buscando en toda la tabla...');
      const allRows = revenueTable.querySelectorAll('tr');
      
      for (let row of allRows) {
        const ruleNameElement = row.querySelector('th a');
        if (ruleNameElement) {
          const ruleName = ruleNameElement.textContent.trim();
          console.log('RoomCloud Auditor: Regla encontrada (búsqueda ampliada):', ruleName);
          
          // Verificar si la regla tiene celdas coloreadas (activas)
          const coloredCells = row.querySelectorAll('td[bgcolor="#83F79A"], td[bgcolor="#00ffff"], td[bgcolor="#E04158"]');
          
          if (coloredCells.length > 0) {
            activeRules.push(ruleName);
            console.log('RoomCloud Auditor: Regla ACTIVA encontrada (búsqueda ampliada):', ruleName, 'con', coloredCells.length, 'celdas coloreadas');
          }
        }
      }
    }
    
    // También buscar reglas que tengan iconos de engranaje (indicador de reglas activas)
    const gearIcons = revenueTable.querySelectorAll('i.fa-cogs');
    console.log('RoomCloud Auditor: Encontrados', gearIcons.length, 'iconos de engranaje (reglas activas)');
    
    // Si hay iconos de engranaje pero no se detectaron reglas por color, buscar las reglas que los contengan
    if (gearIcons.length > 0 && activeRules.length === 0) {
      const allRows = revenueTable.querySelectorAll('tr');
      for (let row of allRows) {
        const ruleNameElement = row.querySelector('th a');
        const hasGearIcon = row.querySelector('i.fa-cogs');
        
        if (ruleNameElement && hasGearIcon) {
          const ruleName = ruleNameElement.textContent.trim();
          if (!activeRules.includes(ruleName)) {
            activeRules.push(ruleName);
            console.log('RoomCloud Auditor: Regla ACTIVA encontrada por icono de engranaje:', ruleName);
          }
        }
      }
    }
    
    data.reglas_revenue_activas = activeRules.length > 0 ? activeRules.join('; ') : 'N/A';
    data.cantidad_reglas_revenue = activeRules.length;
    console.log('RoomCloud Auditor: Reglas de revenue activas extraídas:', data.reglas_revenue_activas);
    console.log('RoomCloud Auditor: Cantidad de reglas de revenue:', data.cantidad_reglas_revenue);
    console.log('RoomCloud Auditor: === REVENUE MANAGEMENT RESULTADO FINAL ===');
    console.log('RoomCloud Auditor: reglas_revenue_activas:', data.reglas_revenue_activas);
    console.log('RoomCloud Auditor: cantidad_reglas_revenue:', data.cantidad_reglas_revenue);
    console.log('RoomCloud Auditor: === FIN REVENUE MANAGEMENT ===');
    
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
    console.log('RoomCloud Auditor: URL actual:', window.location.href);
    
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
    
    console.log('RoomCloud Auditor: === COMPARADOR RESULTADO FINAL ===');
    console.log('RoomCloud Auditor: comparador_precios:', data.comparador_precios);
    console.log('RoomCloud Auditor: cantidad_hoteles_comparacion:', data.cantidad_hoteles_comparacion);
    console.log('RoomCloud Auditor: === FIN COMPARADOR ===');
    
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
    console.log('RoomCloud Auditor: URL actual:', window.location.href);
    
    // Buscar en la tabla de metabuscadores específicamente
    const metaTable = document.querySelector('table.table-striped');
    let trulyActiveMetaCount = 0; // Solo metabuscadores verdaderamente activos (ON + On-Line verde)
    let totalMetaCount = 0;
    let onlineElementsInTable = 0;
    let offlineElementsInTable = 0;
    let pendingElementsInTable = 0;
    
    if (metaTable) {
      const rows = metaTable.querySelectorAll('tbody tr');
      console.log('RoomCloud Auditor: Encontradas', rows.length, 'filas en tabla de metabuscadores');
      
      for (let row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          totalMetaCount++;
          
          // Verificar si tiene switch activado (Activation: ON)
          const switchElement = row.querySelector('.bootstrap-switch-on');
          const checkbox = row.querySelector('input.activateMeta:checked');
          const isActivated = switchElement || checkbox;
          
          // Verificar estado específico (Estado: On-Line, Pending, Off-Line)
          const statusOnline = row.querySelector('span.online'); // Verde - On-Line
          const statusOffline = row.querySelector('span.offline'); // Rojo - Off-Line
          
          // Para detectar Pending (naranja), buscamos elementos que NO sean online ni offline
          // pero que tengan algún indicador de estado
          const hasStatusIndicator = row.querySelector('td:nth-child(3) span, td:nth-child(3) i, td:nth-child(3) .fa');
          const isPending = hasStatusIndicator && !statusOnline && !statusOffline;
          
          if (statusOnline) {
            onlineElementsInTable++;
            console.log('RoomCloud Auditor: Metabuscador ONLINE (verde) encontrado en fila', totalMetaCount);
          } else if (statusOffline) {
            offlineElementsInTable++;
            console.log('RoomCloud Auditor: Metabuscador OFFLINE (rojo) encontrado en fila', totalMetaCount);
          } else if (isPending) {
            pendingElementsInTable++;
            console.log('RoomCloud Auditor: Metabuscador PENDING (naranja) encontrado en fila', totalMetaCount);
          }
          
          // SOLO considerar como verdaderamente activo si está ACTIVADO Y ONLINE (verde)
          if (isActivated && statusOnline) {
            trulyActiveMetaCount++;
            console.log('RoomCloud Auditor: Metabuscador VERDADERAMENTE ACTIVO encontrado en fila', totalMetaCount, '(ON + On-Line verde)');
          } else if (isActivated && !statusOnline) {
            console.log('RoomCloud Auditor: Metabuscador activado pero NO online en fila', totalMetaCount, '(ON pero no On-Line verde)');
          }
        }
      }
    }
    
    // Buscar elementos online/offline SOLO en la tabla de metabuscadores para verificación
    const onlineElementsInTableSelector = metaTable ? metaTable.querySelectorAll('span.online') : [];
    const offlineElementsInTableSelector = metaTable ? metaTable.querySelectorAll('span.offline') : [];
    
    console.log('RoomCloud Auditor: Elementos online (verde) en tabla:', onlineElementsInTableSelector.length);
    console.log('RoomCloud Auditor: Elementos offline (rojo) en tabla:', offlineElementsInTableSelector.length);
    console.log('RoomCloud Auditor: Elementos pending (naranja) en tabla:', pendingElementsInTable);
    console.log('RoomCloud Auditor: Metabuscadores VERDADERAMENTE activos:', trulyActiveMetaCount);
    console.log('RoomCloud Auditor: Total metabuscadores:', totalMetaCount);
    
    // Determinar estado de metabuscadores - SOLO activo si hay al menos uno verdaderamente activo
    const hasTrulyActiveMeta = trulyActiveMetaCount > 0;
    
    console.log('RoomCloud Auditor: Tiene metabuscadores verdaderamente activos:', hasTrulyActiveMeta);
    
    if (hasTrulyActiveMeta) {
      data.metabuscadores = 'Activo';
      data.cantidad_metabuscadores_activos = trulyActiveMetaCount;
      console.log('RoomCloud Auditor: Metabuscadores ACTIVOS con', data.cantidad_metabuscadores_activos, 'metabuscadores verdaderamente activos');
    } else {
      data.metabuscadores = 'Inactivo';
      data.cantidad_metabuscadores_activos = 0;
      console.log('RoomCloud Auditor: Metabuscadores INACTIVOS - No hay metabuscadores con ON + On-Line verde');
    }
    
    console.log('RoomCloud Auditor: === METABUSCADORES RESULTADO FINAL ===');
    console.log('RoomCloud Auditor: metabuscadores:', data.metabuscadores);
    console.log('RoomCloud Auditor: cantidad_metabuscadores_activos:', data.cantidad_metabuscadores_activos);
    console.log('RoomCloud Auditor: === FIN METABUSCADORES ===');
    
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
    case 'home':
      console.log('RoomCloud Auditor: En página home, extrayendo información básica...');
      data = await extractAuditDataFromCurrentPage();
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
  
  // Debug: mostrar qué datos se extrajeron
  console.log('RoomCloud Auditor: Datos extraídos para página', page, ':', data);
  console.log('RoomCloud Auditor: === RESUMEN DE EXTRACCIÓN ===');
  console.log('RoomCloud Auditor: Página:', page);
  console.log('RoomCloud Auditor: URL:', window.location.href);
  console.log('RoomCloud Auditor: Campos extraídos:', Object.keys(data));
  console.log('RoomCloud Auditor: Valores extraídos:', data);
  console.log('RoomCloud Auditor: === FIN RESUMEN ===');
  
  return data;
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('RoomCloud Auditor: Mensaje recibido:', request);
  
  if (request.action === 'ping') {
    console.log('RoomCloud Auditor: Ping recibido, respondiendo...');
    sendResponse({ success: true, message: 'Content script activo' });
    return true;
  }
  
  if (request.action === 'checkPageReady') {
    // Verificar si la página de Revenue Management está lista
    const url = window.location.href;
    if (url.includes('revenue_management_calendar.jsp')) {
      const revenueTable = document.querySelector('table.table');
      const hasRules = revenueTable && revenueTable.querySelectorAll('tbody tr th a').length > 0;
      const hasColoredCells = revenueTable && revenueTable.querySelectorAll('td[bgcolor]').length > 0;
      
      console.log('RoomCloud Auditor: Verificación de página Revenue:', {
        hasTable: !!revenueTable,
        hasRules: hasRules,
        hasColoredCells: hasColoredCells,
        ready: hasRules || hasColoredCells
      });
      
      sendResponse({ 
        ready: hasRules || hasColoredCells,
        hasTable: !!revenueTable,
        hasRules: hasRules,
        hasColoredCells: hasColoredCells
      });
    } else {
      sendResponse({ ready: true });
    }
    return true;
  }
  
  if (request.action === 'extractData') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Extrayendo datos...');
        const data = await extractDataFromCurrentPage();
        console.log('RoomCloud Auditor: Datos extraídos:', data);
        sendResponse({ success: true, data: data });
      } catch (error) {
        console.error('RoomCloud Auditor: Error extrayendo datos:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'getCurrentHotel') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Detectando hotel actual...');
        const hotel = getCurrentHotel();
        console.log('RoomCloud Auditor: Hotel actual:', hotel);
        sendResponse({ success: true, hotel: hotel });
      } catch (error) {
        console.error('RoomCloud Auditor: Error detectando hotel:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
  return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'openHotelSearch') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Abriendo búsqueda de hoteles...');
        const result = await openHotelSearch();
        sendResponse({ success: true, result: result });
      } catch (error) {
        console.error('RoomCloud Auditor: Error abriendo búsqueda:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'runCompleteAudit') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Ejecutando auditoría completa desde content script');
        console.log('RoomCloud Auditor: Parámetros recibidos:', request);
        const hotelId = request.hotelId;
        
        console.log(`RoomCloud Auditor: 🚀 INICIANDO AUDITORÍA COMPLETA para hotel ${hotelId}...`);
        
        // Extraer datos de la página actual (esto incluirá navegación automática)
        const currentData = await extractDataFromCurrentPage();
        
        if (currentData && currentData.error) {
          throw new Error(currentData.error);
        }
        
        // Asegurar que tenemos la información del hotel
        const hotelInfo = extractHotelInfo();
        const hotelData = {
          id_hotel: hotelId,
          nombre_hotel: hotelInfo.nombre_hotel || 'N/A',
          estado_auditoria: 'COMPLETADO',
          fecha_auditoria: new Date().toISOString(),
          ...currentData
        };
        
        console.log(`🎉 RoomCloud Auditor: AUDITORÍA COMPLETADA para hotel ${hotelId}:`, hotelData);
        console.log('✅ RoomCloud Auditor: Enviando respuesta exitosa...');
        sendResponse({ success: true, data: hotelData });
        console.log('✅ RoomCloud Auditor: Respuesta enviada exitosamente');
        
      } catch (error) {
        console.error(`❌ RoomCloud Auditor: Error en auditoría para hotel ${request.hotelId}:`, error);
        console.log('❌ RoomCloud Auditor: Enviando respuesta de error...');
        sendResponse({ 
          success: false, 
          error: error.message,
          data: {
            id_hotel: request.hotelId,
            nombre_hotel: 'N/A',
            estado_auditoria: 'ERROR',
            error_mensaje: error.message,
            fecha_auditoria: new Date().toISOString()
          }
        });
        console.log('❌ RoomCloud Auditor: Respuesta de error enviada');
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'extractPageData') {
    (async () => {
      try {
        console.log(`RoomCloud Auditor: Extrayendo datos de página: ${request.pageName}`);
        
        let pageData = {};
        
        // Extraer datos según la página actual
        switch (request.pageName) {
          case 'property_detail':
            pageData = await extractPropertyDetails();
            break;
          case 'availability':
            pageData = await extractAvailabilityData();
            break;
          case 'users_list':
            pageData = await extractUsersList();
            break;
          case 'channels':
            pageData = await extractChannels();
            break;
          case 'automation':
            pageData = await extractPMSIntegration();
            break;
          case 'payment_gateways':
            pageData = await extractPaymentGateways();
            break;
          case 'revenue_calendar':
            pageData = await extractRevenueRules();
            break;
          case 'rules':
            pageData = await extractBusinessRules();
            break;
          default:
            pageData = { error: `Página ${request.pageName} no reconocida` };
        }
        
        console.log(`RoomCloud Auditor: Datos extraídos de ${request.pageName}:`, pageData);
        sendResponse({ success: true, data: pageData });
        
      } catch (error) {
        console.error(`RoomCloud Auditor: Error extrayendo datos de ${request.pageName}:`, error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  
  if (request.action === 'searchHotel') {
    (async () => {
      try {
        console.log('RoomCloud Auditor: Búsqueda de hotel solicitada:', request.hotelId);
        const result = await searchHotelInCurrentPage(request.hotelId);
        sendResponse({ success: true, result: result });
      } catch (error) {
        console.error('RoomCloud Auditor: Error en búsqueda de hotel:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Mantener el canal de comunicación abierto
  }
  
  return true; // Mantener el canal de comunicación abierto
});

// Función para detectar el hotel actual
function getCurrentHotel() {
  try {
    const hotelInfo = extractHotelInfo();
    return {
      name: hotelInfo.nombre_hotel,
      id: hotelInfo.id_hotel
    };
  } catch (error) {
    console.error('Error detectando hotel actual:', error);
    return { name: 'N/A', id: 'N/A' };
  }
}

// Función para abrir la búsqueda de hoteles
async function openHotelSearch() {
  try {
    console.log('RoomCloud Auditor: Abriendo búsqueda de hoteles...');
    
    // Buscar el dropdown del hotel actual (basado en el HTML proporcionado)
    const hotelDropdown = document.querySelector('.hotels-menu .dropdown-toggle');
    if (!hotelDropdown) {
      throw new Error('No se encontró el dropdown del hotel actual');
    }
    
    console.log('RoomCloud Auditor: Dropdown del hotel encontrado:', hotelDropdown);
    
    // Hacer clic en el dropdown para abrirlo
    hotelDropdown.click();
    
    // Esperar a que se abra el dropdown
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Buscar el botón "ADD HOTEL" específicamente (basado en el HTML)
    const addHotelButton = document.querySelector('.hotels-menu .footer a[onclick*="loadHotel"]');
    if (!addHotelButton) {
      throw new Error('No se encontró el botón "ADD HOTEL"');
    }
    
    console.log('RoomCloud Auditor: Botón ADD HOTEL encontrado:', addHotelButton);
    
    // Método alternativo: simular la apertura de ventana directamente
    console.log('RoomCloud Auditor: Usando método alternativo para abrir búsqueda...');
    
    try {
      // Crear la URL de búsqueda de hoteles basada en el HTML proporcionado
      const searchUrl = 'https://secure.roomcloud.net/be/owners_area/HotelsList.jsp?caller=xx&formName=hotels&field=add_hotels';
      
      // Abrir la ventana directamente
      const newWindow = window.open(searchUrl, 'LoadHotel', 'width=800,height=800,screenX=5,screeny=5,directories=no,location=no,menubar=no,scrollbars=yes,status=no,toolbar=no,resizable=no');
      
      if (newWindow) {
        console.log('RoomCloud Auditor: Ventana de búsqueda abierta directamente');
        
        // Notificar al background script sobre la nueva ventana
        chrome.runtime.sendMessage({
          action: 'hotelSearchWindowOpened',
          windowId: newWindow.name,
          url: searchUrl
        });
        
      } else {
        throw new Error('No se pudo abrir la ventana de búsqueda');
      }
      
    } catch (error) {
      console.error('RoomCloud Auditor: Error abriendo ventana de búsqueda:', error);
      throw error;
    }
    
    console.log('RoomCloud Auditor: Búsqueda de hoteles abierta en nueva ventana');
    return true;
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error abriendo búsqueda de hoteles:', error);
    throw error;
  }
}

// Función para buscar hotel en la página actual
async function searchHotelInCurrentPage(hotelId) {
  console.log('RoomCloud Auditor: Buscando hotel ID:', hotelId, 'en página actual');
  
  try {
    // Esperar a que la página cargue completamente
    if (document.readyState !== 'complete') {
      console.log('RoomCloud Auditor: Esperando a que la página cargue...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Buscar el campo de búsqueda específico de RoomCloud
    let searchInput = document.getElementById('hotel_filter');
    
    if (searchInput) {
      console.log('RoomCloud Auditor: Campo hotel_filter encontrado:', searchInput);
      
      // Simular escritura humana
      await simulateHumanTyping(searchInput, hotelId);
      
      // Esperar a que se procese la búsqueda
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('RoomCloud Auditor: Buscando resultados filtrados...');
      
      // Buscar enlaces de hotel en el menú filtrado
      const menuItems = document.querySelectorAll('#hotel_filter_data a, .menu a, ul.menu a');
      console.log('RoomCloud Auditor: Elementos de menú encontrados:', menuItems.length);
      
      let hotelFound = false;
      for (let item of menuItems) {
        const itemText = item.textContent.trim();
        console.log('RoomCloud Auditor: Verificando elemento:', itemText);
        
        if (itemText.includes(hotelId)) {
          console.log('RoomCloud Auditor: Hotel encontrado, haciendo clic:', itemText);
          
          // Simular clic real
          item.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          }));
          
          hotelFound = true;
          break;
        }
      }
      
      if (!hotelFound) {
        console.log('RoomCloud Auditor: Hotel no encontrado en resultados filtrados');
        
        // Intentar búsqueda manual en todos los elementos
        const allLinks = document.querySelectorAll('a');
        console.log('RoomCloud Auditor: Buscando en todos los enlaces:', allLinks.length);
        
        for (let link of allLinks) {
          const linkText = link.textContent.trim();
          if (linkText.includes(hotelId)) {
            console.log('RoomCloud Auditor: Hotel encontrado en búsqueda manual:', linkText);
            link.click();
            break;
          }
        }
      }
      
      return { success: true, message: 'Búsqueda completada' };
      
    } else {
      console.log('RoomCloud Auditor: hotel_filter no encontrado, buscando alternativas...');
      
      // Método alternativo: buscar cualquier input de texto
      const textInputs = document.querySelectorAll('input[type="text"]');
      console.log('RoomCloud Auditor: Inputs de texto encontrados:', textInputs.length);
      
      if (textInputs.length > 0) {
        const firstInput = textInputs[0];
        console.log('RoomCloud Auditor: Usando primer input de texto:', firstInput);
        
        await simulateHumanTyping(firstInput, hotelId);
        
        // Buscar resultados después de un tiempo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const allLinks = document.querySelectorAll('a');
        for (let link of allLinks) {
          const linkText = link.textContent.trim();
          if (linkText.includes(hotelId)) {
            console.log('RoomCloud Auditor: Hotel encontrado:', linkText);
            link.click();
            break;
          }
        }
      } else {
        console.log('RoomCloud Auditor: No se encontraron inputs de texto');
      }
      
      return { success: false, message: 'Campo de búsqueda no encontrado' };
    }
    
  } catch (error) {
    console.error('RoomCloud Auditor: Error buscando hotel:', error);
    return { success: false, error: error.message };
  }
}

// Función para simular escritura humana
async function simulateHumanTyping(inputElement, text) {
  console.log('RoomCloud Auditor: Simulando escritura humana:', text);
  
  // Limpiar el campo primero
  inputElement.value = '';
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Esperar un momento
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Escribir carácter por carácter
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    inputElement.value += char;
    
    // Disparar eventos para cada carácter
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('keydown', { bubbles: true }));
    inputElement.dispatchEvent(new Event('keyup', { bubbles: true }));
    
    // Pequeña pausa entre caracteres
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Evento final
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
  
  console.log('RoomCloud Auditor: Escritura simulada completada');
}

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

// Función para extraer datos de auditoría desde la página actual
async function extractAuditDataFromCurrentPage() {
  const data = {};
  
  try {
    console.log('RoomCloud Auditor: Extrayendo datos de auditoría desde la página actual...');
    
    // Extraer información del hotel primero
    const hotelInfo = extractHotelInfo();
    data.nombre_hotel = hotelInfo.nombre_hotel;
    data.id_hotel = hotelInfo.id_hotel;
    
    // Detectar la página actual y extraer datos correspondientes
    const currentPage = detectCurrentPage();
    console.log(`RoomCloud Auditor: Página actual detectada: ${currentPage}`);
    
    switch (currentPage) {
      case 'property_detail':
        data.property_detail = await extractPropertyDetails();
        break;
      case 'availability':
        data.availability = await extractAvailabilityData();
        break;
      case 'users_list':
        data.users_list = await extractUsersList();
        break;
      case 'channels':
        data.channels = await extractChannels();
        break;
      case 'automation':
        data.automation = await extractPMSIntegration();
        break;
      case 'payment_gateways':
        data.payment_gateways = await extractPaymentGateways();
        break;
      case 'revenue_calendar':
        data.revenue_calendar = await extractRevenueRules();
        break;
      case 'rules':
        data.rules = await extractBusinessRules();
        break;
      case 'home':
        // En home, iniciar auditoría completa con navegación
        console.log('RoomCloud Auditor: En home.jsp, iniciando auditoría completa con navegación...');
        return await executeCompleteAuditWithNavigation();
      default:
        data.unknown_page = {
          pagina: currentPage,
          url_actual: window.location.href,
          mensaje: 'Página no reconocida para auditoría'
        };
    }
    
    // Marcar estado de auditoría
    data.estado_auditoria = 'COMPLETADO';
    data.fecha_auditoria = new Date().toISOString();
    data.pagina_auditada = currentPage;
    
    console.log('🎉 RoomCloud Auditor: DATOS EXTRAÍDOS de la página actual:', data);
    console.log('✅ RoomCloud Auditor: Extracción de datos completada');
    
  } catch (error) {
    console.error('❌ Error extrayendo datos de la página actual:', error);
    data.error = error.message;
    data.estado_auditoria = 'ERROR';
  }
  
  return data;
}

// Función para ejecutar auditoría completa con navegación coordinada
async function executeCompleteAuditWithNavigation() {
  const data = {};
  
  try {
    console.log('RoomCloud Auditor: Iniciando auditoría completa con navegación coordinada...');
    
    // Extraer información del hotel primero
    const hotelInfo = extractHotelInfo();
    data.nombre_hotel = hotelInfo.nombre_hotel;
    data.id_hotel = hotelInfo.id_hotel;
    
    // Coordinar auditoría con el background script
    const auditResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'executeCompleteAudit',
        hotelId: data.id_hotel
      }, (response) => {
        if (response && response.success) {
          console.log('RoomCloud Auditor: Auditoría completa exitosa');
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Error en auditoría completa'));
        }
      });
    });
    
    // Combinar datos
    Object.assign(data, auditResult);
    
    // Marcar estado de auditoría
    data.estado_auditoria = 'COMPLETADO';
    data.fecha_auditoria = new Date().toISOString();
    
    console.log('🎉 RoomCloud Auditor: AUDITORÍA COMPLETA CON NAVEGACIÓN TERMINADA:', data);
    console.log('✅ RoomCloud Auditor: Auditoría completa del hotel terminada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en auditoría completa con navegación:', error);
    data.error = error.message;
    data.estado_auditoria = 'ERROR';
  }
  
  return data;
}
