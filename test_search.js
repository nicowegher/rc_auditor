// Script de prueba para verificar inyección en nueva ventana
console.log('=== TEST SEARCH SCRIPT INJECTED ===');
console.log('URL:', window.location.href);
console.log('Título:', document.title);
console.log('Timestamp:', new Date().toISOString());

// Análisis completo de la página
console.log('=== ANÁLISIS COMPLETO DE LA PÁGINA ===');

// 1. Todos los elementos de input
const inputs = document.querySelectorAll('input');
console.log('1. Inputs encontrados:', inputs.length);
inputs.forEach((input, index) => {
  console.log(`   Input ${index}:`, {
    type: input.type,
    name: input.name,
    id: input.id,
    placeholder: input.placeholder,
    value: input.value,
    className: input.className
  });
});

// 2. Todos los enlaces
const links = document.querySelectorAll('a');
console.log('2. Enlaces encontrados:', links.length);
links.forEach((link, index) => {
  if (index < 10) { // Solo los primeros 10
    console.log(`   Enlace ${index}:`, {
      text: link.textContent.trim().substring(0, 50),
      href: link.href,
      onclick: link.onclick ? 'SÍ' : 'NO'
    });
  }
});

// 3. Elementos de formulario
const forms = document.querySelectorAll('form');
console.log('3. Formularios encontrados:', forms.length);
forms.forEach((form, index) => {
  console.log(`   Formulario ${index}:`, {
    action: form.action,
    method: form.method,
    id: form.id,
    name: form.name
  });
});

// 4. Elementos con IDs específicos
const specificElements = document.querySelectorAll('[id*="hotel"], [id*="search"], [id*="filter"]');
console.log('4. Elementos con IDs específicos:', specificElements.length);
specificElements.forEach((element, index) => {
  console.log(`   Elemento ${index}:`, {
    id: element.id,
    tagName: element.tagName,
    className: element.className
  });
});

// 5. Elementos con clases específicas
const classElements = document.querySelectorAll('.hotel, .search, .filter, .menu, .dropdown');
console.log('5. Elementos con clases específicas:', classElements.length);
classElements.forEach((element, index) => {
  console.log(`   Elemento ${index}:`, {
    className: element.className,
    tagName: element.tagName,
    id: element.id
  });
});

// 6. Scripts en la página
const scripts = document.querySelectorAll('script');
console.log('6. Scripts encontrados:', scripts.length);
scripts.forEach((script, index) => {
  const content = script.textContent || script.innerHTML;
  if (content.includes('hotel') || content.includes('search') || content.includes('filter')) {
    console.log(`   Script ${index} relevante:`, content.substring(0, 200) + '...');
  }
});

// 7. Buscar elementos que contengan el ID del hotel
const hotelId = '13677'; // ID que se está buscando
const allElements = document.querySelectorAll('*');
console.log('7. Buscando elementos que contengan el ID:', hotelId);
let foundElements = [];
allElements.forEach((element) => {
  const text = element.textContent;
  if (text && text.includes(hotelId)) {
    foundElements.push({
      tagName: element.tagName,
      text: text.trim().substring(0, 100),
      id: element.id,
      className: element.className
    });
  }
});
console.log('   Elementos que contienen el ID:', foundElements.length);
foundElements.forEach((element, index) => {
  if (index < 5) { // Solo los primeros 5
    console.log(`   Elemento ${index}:`, element);
  }
});

console.log('=== FIN ANÁLISIS COMPLETO ===');
