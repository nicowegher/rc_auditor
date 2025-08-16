# 🏨 RoomCloud Auditor Extension

Una extensión de Chrome para automatizar auditorías completas de hoteles en RoomCloud, extrayendo datos de todos los módulos y generando reportes consolidados.

## 🚀 Características

### ✨ Funcionalidades Principales
- **Auditoría Automatizada Completa**: Ejecuta automáticamente todos los pasos de auditoría
- **Extracción de Datos**: Recopila información de 10 módulos diferentes de RoomCloud
- **Resumen Visual**: Muestra un resumen organizado y colorido de todos los datos extraídos
- **Exportación CSV**: Genera archivos CSV consolidados para análisis posterior
- **Interfaz Simplificada**: Diseño limpio y enfocado en la automatización

### 📊 Módulos Auditados
1. **Detalles del Hotel**: Nombre, ID, categoría, estrellas, habitaciones
2. **Inventario/Disponibilidad**: Moneda, tarifa más baja, cierres parciales
3. **Canales**: Canales activos y cantidad
4. **Usuarios**: Usuarios de RoomCloud y cantidad
5. **Integración PMS**: Integraciones de sistemas de gestión
6. **Pasarelas de Pago**: Pasarelas activas y cantidad
7. **Revenue Management**: Reglas de revenue activas
8. **Reglas de Negocio**: Reglas de negocio configuradas
9. **Comparador de Precios**: Estado del comparador
10. **Metabuscadores**: Metabuscadores activos

## 🛠️ Instalación

### Requisitos
- Google Chrome
- Acceso a RoomCloud (https://secure.roomcloud.net)

### Pasos de Instalación
1. **Descargar el proyecto**:
   ```bash
   git clone https://github.com/[tu-usuario]/roomcloud-auditor.git
   cd roomcloud-auditor
   ```

2. **Abrir Chrome** y navegar a `chrome://extensions/`

3. **Activar el modo desarrollador** (toggle en la esquina superior derecha)

4. **Hacer clic en "Cargar descomprimida"**

5. **Seleccionar la carpeta** del proyecto descargado

6. **La extensión aparecerá** en la barra de herramientas de Chrome

## 📖 Uso

### Auditoría Automatizada
1. **Navegar a RoomCloud** y acceder a un hotel específico
2. **Hacer clic en el ícono de la extensión** en la barra de herramientas
3. **Hacer clic en "🤖 Auditoría Automatizada Completa"**
4. **Confirmar** cuando se solicite
5. **Esperar** ~2-3 minutos mientras se ejecuta automáticamente
6. **Revisar el resumen** que aparece al finalizar
7. **Descargar CSV** si se desea para análisis posterior

### Proceso Automatizado
La extensión:
- Navega automáticamente por todas las páginas de auditoría
- Extrae datos de cada módulo
- Espera tiempos apropiados para carga de páginas
- Maneja errores sin detener el proceso
- Consolida todos los datos en un resumen visual

## 📁 Estructura del Proyecto

```
roomcloud-auditor/
├── manifest.json          # Configuración de la extensión
├── popup.html            # Interfaz de usuario
├── popup.js              # Lógica de la interfaz
├── content.js            # Script de extracción de datos
├── DESARROLLO_LOG.md     # Log de desarrollo y cambios
└── README.md             # Este archivo
```

## 🔧 Configuración

### Tiempos de Espera
- **Carga inicial**: 5 segundos por página
- **Pasarelas de pago**: 3 segundos adicionales
- **Pausa entre páginas**: 2 segundos

### Personalización
Los tiempos y configuraciones se pueden modificar en `popup.js` en la función `runCompleteAudit()`.

## 📊 Formato de Datos

### Resumen Visual
- **Códigos de color** para cada categoría de datos
- **Emojis descriptivos** para mejor identificación
- **Separadores visuales** entre secciones

### Exportación CSV
- **Una fila por hotel** con todos los datos consolidados
- **Campos excluidos**: URL, fecha de extracción, página actual
- **Concatenación inteligente** de valores múltiples con separador `|`

## 🐛 Solución de Problemas

### La auditoría no inicia
1. Verificar que estás en una página de RoomCloud
2. Revisar la consola del navegador (F12) para errores
3. Recargar la extensión en `chrome://extensions/`

### Datos faltantes en el resumen
1. Verificar que todos los pasos se ejecutaron correctamente
2. Revisar los logs en la consola del navegador
3. Ejecutar la auditoría nuevamente

### Error de conexión
1. Verificar conexión a internet
2. Asegurar que RoomCloud esté accesible
3. Recargar la página de RoomCloud

## 📝 Log de Desarrollo

Ver `DESARROLLO_LOG.md` para un historial completo de cambios, mejoras y correcciones realizadas durante el desarrollo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

Desarrollado para automatizar auditorías de hoteles en RoomCloud.

## 🙏 Agradecimientos

- RoomCloud por proporcionar la plataforma
- Comunidad de desarrolladores de extensiones de Chrome
- Todos los que contribuyeron con feedback y testing

---

**Nota**: Esta extensión está diseñada específicamente para RoomCloud y requiere acceso válido a la plataforma para funcionar correctamente.

