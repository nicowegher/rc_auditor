// Script de debugging para analizar la página de búsqueda de hoteles
console.log('=== DEBUGGING HOTEL SEARCH PAGE ===');

// Información básica de la página
console.log('URL:', window.location.href);
console.log('Título:', document.title);
console.log('Ready State:', document.readyState);

// Buscar todos los elementos de input
console.log('=== TODOS LOS INPUTS ===');
const allInputs = document.querySelectorAll('input');
allInputs.forEach((input, index) => {
  console.log(`Input ${index}:`, {
    type: input.type,
    name: input.name,
    id: input.id,
    placeholder: input.placeholder,
    value: input.value,
    className: input.className
  });
});

// Buscar elementos de búsqueda específicos
console.log('=== ELEMENTOS DE BÚSQUEDA ===');
const searchElements = document.querySelectorAll('[id*="search"], [name*="search"], [placeholder*="buscar"], [placeholder*="search"]');
searchElements.forEach((element, index) => {
  console.log(`Elemento de búsqueda ${index}:`, element);
});

// Buscar filtros de hotel
console.log('=== FILTROS DE HOTEL ===');
const hotelFilters = document.querySelectorAll('#hotel_filter, .hotel-filter, [id*="hotel"], [class*="hotel"]');
hotelFilters.forEach((filter, index) => {
  console.log(`Filtro de hotel ${index}:`, filter);
});

// Buscar enlaces de hotel
console.log('=== ENLACES DE HOTEL ===');
const hotelLinks = document.querySelectorAll('a[href*="submitHotel"], a[onclick*="submitHotel"], a[href*="javascript:void"]');
hotelLinks.forEach((link, index) => {
  console.log(`Enlace de hotel ${index}:`, {
    text: link.textContent.trim(),
    href: link.href,
    onclick: link.onclick
  });
});

// Buscar elementos de menú
console.log('=== ELEMENTOS DE MENÚ ===');
const menuElements = document.querySelectorAll('.menu, ul.menu, .dropdown-menu');
menuElements.forEach((menu, index) => {
  console.log(`Menú ${index}:`, menu);
  const menuItems = menu.querySelectorAll('a, li');
  menuItems.forEach((item, itemIndex) => {
    console.log(`  Item ${itemIndex}:`, item.textContent.trim());
  });
});

// Verificar si hay scripts de filtrado
console.log('=== SCRIPTS DE FILTRADO ===');
const scripts = document.querySelectorAll('script');
scripts.forEach((script, index) => {
  const content = script.textContent || script.innerHTML;
  if (content.includes('filter') || content.includes('search') || content.includes('hotel')) {
    console.log(`Script ${index} relevante:`, content.substring(0, 200) + '...');
  }
});

// Buscar funciones globales
console.log('=== FUNCIONES GLOBALES ===');
if (typeof window.loadHotel !== 'undefined') {
  console.log('loadHotel function found:', window.loadHotel);
}
if (typeof window.submitHotel !== 'undefined') {
  console.log('submitHotel function found:', window.submitHotel);
}

// Intentar activar búsqueda manualmente
console.log('=== INTENTO DE BÚSQUEDA MANUAL ===');
const testId = '11070';

// Método 1: Buscar por ID específico
const hotelFilter = document.getElementById('hotel_filter');
if (hotelFilter) {
  console.log('Encontrado hotel_filter:', hotelFilter);
  hotelFilter.value = testId;
  hotelFilter.dispatchEvent(new Event('input', { bubbles: true }));
  hotelFilter.dispatchEvent(new Event('change', { bubbles: true }));
  hotelFilter.dispatchEvent(new Event('keyup', { bubbles: true }));
  console.log('Eventos disparados en hotel_filter');
}

// Método 2: Buscar por nombre
const searchInput = document.querySelector('input[name="search"]');
if (searchInput) {
  console.log('Encontrado input[name="search"]:', searchInput);
  searchInput.value = testId;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
  searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
  console.log('Eventos disparados en input[name="search"]');
}

// Método 3: Buscar cualquier input de texto
const textInputs = document.querySelectorAll('input[type="text"]');
textInputs.forEach((input, index) => {
  console.log(`Probando input[type="text"] ${index}:`, input);
  input.value = testId;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('keyup', { bubbles: true }));
});

console.log('=== FIN DEBUGGING ===');
