# Detección Automática del Comparador de Precios

## Descripción del Problema

Anteriormente, la extensión de Chrome no podía distinguir correctamente entre hoteles que tenían el comparador de precios habilitado y los que no lo tenían, siempre devolviendo el mismo resultado.

## Solución Implementada

### Criterios de Detección

La extensión ahora detecta automáticamente el estado del comparador de precios basándose en la **presencia de hoteles listados** en la página de comparación:

#### Comparador HABILITADO (Con comparador)
- ✅ **Presencia de checkboxes de hoteles**: `input[name^="cp_"]`
- ✅ **Filas de hoteles en la tabla**: Filas que contienen nombre de hotel + checkbox
- ✅ **Ejemplo**: `cp_2431161`, `cp_259720`, `cp_419012`, etc.

#### Comparador DESHABILITADO (Sin comparador)
- ❌ **Tabla vacía**: Solo estructura sin hoteles listados
- ❌ **Sin checkboxes**: No hay elementos `input[name^="cp_"]`
- ❌ **Sin filas de hoteles**: Tabla solo con header

### Código de Detección

```javascript
function extractPriceComparison() {
  const data = {};
  
  try {
    // Buscar checkboxes de hoteles para comparar
    const hotelCheckboxes = document.querySelectorAll('input[name^="cp_"]');
    
    // Buscar en la tabla de comparación
    const comparisonTable = document.querySelector('table[border="1"]');
    const tableRows = comparisonTable ? comparisonTable.querySelectorAll('tbody tr') : [];
    
    // Contar filas que contengan hoteles
    let hotelRows = 0;
    for (let row of tableRows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const hotelNameCell = cells[0];
        const checkboxCell = cells[1];
        
        const hasHotelName = hotelNameCell && hotelNameCell.textContent.trim().length > 0;
        const hasCheckbox = checkboxCell && checkboxCell.querySelector('input[type="checkbox"]');
        
        if (hasHotelName && hasCheckbox) {
          hotelRows++;
        }
      }
    }
    
    // Determinar estado del comparador
    const hasHotelCheckboxes = hotelCheckboxes.length > 0;
    const hasHotelRows = hotelRows > 0;
    
    if (hasHotelCheckboxes || hasHotelRows) {
      data.comparador_precios = 'Con comparador';
      data.cantidad_hoteles_comparacion = Math.max(hotelCheckboxes.length, hotelRows);
    } else {
      data.comparador_precios = 'Sin comparador';
      data.cantidad_hoteles_comparacion = 0;
    }
    
  } catch (error) {
    data.comparador_precios = 'Error en extracción';
    data.cantidad_hoteles_comparacion = 0;
  }
  
  return data;
}
```

### Datos Extraídos

La función ahora devuelve:

| Campo | Descripción | Valores Posibles |
|-------|-------------|------------------|
| `comparador_precios` | Estado del comparador | `"Con comparador"` / `"Sin comparador"` / `"Error en extracción"` |
| `cantidad_hoteles_comparacion` | Número de hoteles disponibles | `0` (sin comparador) / `N` (número de hoteles) |

### Ejemplos de Páginas

#### Página con Comparador Habilitado (`comparador_on.html`)
```html
<tr>
    <td><b><i><font color="blue">Hotel Arroyo de la Plata</font></i></b></td>
    <td align="center"><input name="cp_2431161" type="checkbox" value="1"></td>
</tr>
<tr>
    <td><b><i>HotelMision Argento Zacatecas</i></b></td>
    <td align="center"><input name="cp_259720" type="checkbox" value="1"></td>
</tr>
```

#### Página con Comparador Deshabilitado (`comparador_off.html`)
```html
<tr>
    <th>&nbsp;</th>
    <th>
        <table>
            <tr><th align="center">Select all</th></tr>
            <tr><td align="center">
                <input name="selectall" type="checkbox" onclick="changeAllComparison()">
            </td></tr>
        </table>
    </th>
</tr>
<!-- No hay filas de hoteles -->
```

### Archivos de Prueba

- `test_comparador.html`: Página de prueba con ambos casos (con y sin comparador)
- `comparador_on.html`: Ejemplo real con comparador habilitado
- `comparador_off.html`: Ejemplo real con comparador deshabilitado

### Logs de Debug

La función incluye logs detallados para facilitar el debugging:

```
RoomCloud Auditor: Verificando estado del comparador de precios...
RoomCloud Auditor: Encontrados 10 checkboxes de hoteles para comparar
RoomCloud Auditor: Encontradas 11 filas en tabla de comparación
RoomCloud Auditor: Fila de hotel encontrada: Hotel Arroyo de la Plata
RoomCloud Auditor: Fila de hotel encontrada: HotelMision Argento Zacatecas
RoomCloud Auditor: Checkboxes de hoteles: true
RoomCloud Auditor: Filas de hoteles en tabla: true
RoomCloud Auditor: Comparador HABILITADO con 10 hoteles
```

### Beneficios

1. **Detección Automática**: No requiere intervención manual
2. **Precisión**: Basada en elementos reales de la página
3. **Robustez**: Múltiples métodos de detección
4. **Información Adicional**: Incluye cantidad de hoteles disponibles
5. **Debugging**: Logs detallados para troubleshooting

