# Solución de Errores - RoomCloud Auditor

## Error Corregido: Selector CSS Inválido

### Problema
```
Error: Failed to execute 'querySelector' on 'Document': 'h1:contains("Comparación de Tarifas")' is not a valid selector.
```

### Causa
El selector CSS `:contains()` no es un selector válido para `querySelector()`. Este selector es específico de jQuery y no funciona con la API nativa de JavaScript.

### Solución Implementada

#### Antes (Incorrecto)
```javascript
document.querySelector('h1:contains("Comparación de Tarifas")')
```

#### Después (Correcto)
```javascript
document.querySelector('h1')?.textContent.includes('Comparación de Tarifas')
```

### Cambios Realizados

1. **Corrección en `content.js` línea 45**:
   ```javascript
   // ANTES
   } else if (url.includes('comparison') || document.querySelector('form[name="formSearch"] input[name^="cp_"]') || document.querySelector('h1:contains("Comparación de Tarifas")')) {
   
   // DESPUÉS
   } else if (url.includes('comparison') || document.querySelector('form[name="formSearch"] input[name^="cp_"]') || document.querySelector('h1')?.textContent.includes('Comparación de Tarifas')) {
   ```

2. **Mejora en detección de metabuscadores**:
   ```javascript
   // ANTES
   } else if (url.includes('meta') || document.querySelector('[style*="green"]')) {
   
   // DESPUÉS
   } else if (url.includes('meta') || document.querySelector('h1')?.textContent.includes('Metabuscadores') || document.querySelector('[class*="meta-dashboard"]')) {
   ```

3. **Función de metabuscadores mejorada**:
   - Agregados logs detallados para debugging
   - Búsqueda más específica de elementos de metabuscadores
   - Detección de texto "Activo", "Online", "Connected" en tablas

### Archivos Modificados

- ✅ `content.js` - Corrección de selectores CSS inválidos
- ✅ `test_metabuscadores.html` - Página de prueba para metabuscadores

### Verificación

Para verificar que las correcciones funcionan:

1. **Abrir la extensión en una página de comparación de precios**
2. **Verificar que no aparezcan errores en la consola**
3. **Confirmar que la detección de páginas funciona correctamente**

### Logs de Debug

La extensión ahora incluye logs detallados:

```
RoomCloud Auditor: Verificando metabuscadores...
RoomCloud Auditor: Encontrados 3 elementos de metabuscadores
RoomCloud Auditor: Metabuscador activo encontrado en: Activo
RoomCloud Auditor: Metabuscadores ACTIVOS
```

### Prevención de Errores Futuros

1. **No usar selectores jQuery** (`:contains`, `:has`, etc.) con `querySelector()`
2. **Usar métodos nativos de JavaScript** para verificar contenido de texto
3. **Implementar manejo de errores** con try-catch
4. **Agregar logs de debug** para facilitar troubleshooting

### Selectores CSS Válidos vs Inválidos

| Inválido | Válido |
|----------|--------|
| `:contains("texto")` | `element.textContent.includes("texto")` |
| `:has(.child)` | `element.querySelector('.child')` |
| `:first` | `:first-child` |
| `:last` | `:last-child` |

## Mejoras en Metabuscadores

### Problema
La detección de metabuscadores no era específica y podía dar falsos positivos.

### Solución Implementada

#### Criterios de Detección Mejorados
- **Elementos con clase "online"**: `span.online` (metabuscadores activos)
- **Elementos con clase "offline"**: `span.offline` (metabuscadores inactivos)
- **Checkboxes activados**: `input.activateMeta:checked`
- **Switches de Bootstrap activados**: `.bootstrap-switch-on input[type="checkbox"]:checked`
- **Análisis de tabla específica**: Búsqueda en `table.table-striped` para metabuscadores

#### Resultado
- ✅ **Metabuscadores ACTIVOS**: Al menos un metabuscador con estado "online" o switch activado
- ❌ **Metabuscadores INACTIVOS**: Todos los metabuscadores con estado "offline" o switches desactivados

### Ejemplos de Detección

#### Metabuscador ACTIVO (meta_on.html)
```html
<!-- Google Hotel Ads activo -->
<span id="status_google" class="online"><i class="fa fa-fw fa-circle fa-lg"></i></span>
<input type="checkbox" class="activateMeta" id="google" value="google" checked="checked">
<div class="bootstrap-switch bootstrap-switch-wrapper bootstrap-switch-on">
```

#### Metabuscador INACTIVO (comparador_off.html)
```html
<!-- Trivago inactivo -->
<span id="status_trivago" class="offline"><i class="fa fa-fw fa-circle fa-lg"></i></span>
<input type="checkbox" class="activateMeta" id="trivago" value="trivago">
<div class="bootstrap-switch bootstrap-switch-wrapper bootstrap-switch-off">
```

### Logs de Debug Mejorados

```
RoomCloud Auditor: Verificando metabuscadores...
RoomCloud Auditor: Encontradas 3 filas en tabla de metabuscadores
RoomCloud Auditor: Metabuscador OFFLINE encontrado en fila 1
RoomCloud Auditor: Metabuscador OFFLINE encontrado en fila 2
RoomCloud Auditor: Metabuscador OFFLINE encontrado en fila 3
RoomCloud Auditor: Elementos online en tabla: 0
RoomCloud Auditor: Elementos offline en tabla: 3
RoomCloud Auditor: Metabuscadores activos en tabla: 0
RoomCloud Auditor: Total metabuscadores: 3
RoomCloud Auditor: Tiene metabuscadores activos: false
RoomCloud Auditor: Tiene elementos online en tabla: false
RoomCloud Auditor: Metabuscadores INACTIVOS
```

## Corrección de Error: Detección Incorrecta de Metabuscadores

### Problema Identificado
La extensión reportaba metabuscadores como "ACTIVOS" cuando todos estaban con estado "offline" (círculos rojos).

### Causa del Error
La función buscaba elementos `span.online` en toda la página, incluyendo la leyenda de estados, lo que causaba falsos positivos.

### Solución Implementada

#### Antes (Incorrecto)
```javascript
// Buscaba en toda la página
const onlineElements = document.querySelectorAll('span.online');
if (onlineElements.length > 0) {
    data.metabuscadores = 'Activo'; // ❌ Falso positivo
}
```

#### Después (Correcto)
```javascript
// Busca SOLO en la tabla de metabuscadores
const metaTable = document.querySelector('table.table-striped');
const onlineElementsInTable = metaTable ? metaTable.querySelectorAll('span.online') : [];
if (onlineElementsInTable.length > 0) {
    data.metabuscadores = 'Activo'; // ✅ Solo si hay online en la tabla
}
```

### Verificación
- ✅ **test_metabuscadores_offline.html**: Todos offline → Metabuscadores INACTIVOS
- ✅ **meta_on.html**: Al menos uno online → Metabuscadores ACTIVOS

## Corrección de Error: Conflicto de Detección de Página

### Problema Identificado
La extensión reportaba "Reglas Negocio: Sí" en lugar de metabuscadores cuando Google Hotel Ads tenía el switch "ON" pero estado "offline".

### Causa del Error
El selector de detección de reglas de negocio era demasiado genérico:
```javascript
document.querySelector('input[type="checkbox"]:checked, .active-rule')
```

Este selector capturaba los checkboxes de metabuscadores marcados, causando que la página se detectara como "rules" en lugar de "meta_dashboard".

### Solución Implementada

#### Antes (Incorrecto)
```javascript
// Detección de reglas muy genérica
} else if (url.includes('rules') || document.querySelector('input[type="checkbox"]:checked, .active-rule')) {
    return 'rules';
```

#### Después (Correcto)
```javascript
// Detección de reglas más específica
} else if (url.includes('rules') || document.querySelector('.active-rule, [class*="rule"], [id*="rule"]')) {
    return 'rules';

// Detección de metabuscadores mejorada
} else if (url.includes('meta') || document.querySelector('h1')?.textContent.includes('Metabuscadores') || 
           document.querySelector('[class*="meta-dashboard"]') || 
           document.querySelector('table.table-striped tbody tr td span.online, table.table-striped tbody tr td span.offline')) {
    return 'meta_dashboard';
```

### Resultado
- ✅ **Página de metabuscadores** → Detecta correctamente como `meta_dashboard`
- ✅ **Google ON pero offline** → Reporta metabuscadores, no reglas de negocio
- ✅ **No más conflictos** entre detección de páginas

