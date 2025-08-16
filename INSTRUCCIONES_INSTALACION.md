# 🚀 Instrucciones de Instalación - RoomCloud Auditor

## 📋 Requisitos Previos
- Google Chrome (versión 88 o superior)
- Acceso a RoomCloud con credenciales válidas

## 🔧 Instalación de la Extensión

### Paso 1: Preparar los Archivos
1. Asegúrate de tener todos estos archivos en tu carpeta actual:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `content.js`
   - `background.js`
   - `README.md`
   - `test.html` (para pruebas)

### Paso 2: Cargar la Extensión en Chrome
1. Abre Google Chrome
2. Ve a `chrome://extensions/` (escribe esto en la barra de direcciones)
3. Activa el **"Modo desarrollador"** (toggle en la esquina superior derecha)
4. Haz clic en **"Cargar descomprimida"**
5. Selecciona tu carpeta actual que contiene todos los archivos
6. La extensión aparecerá en tu barra de herramientas con el icono 🏨

### Paso 3: Probar la Extensión
1. **Abre el archivo `test.html`** en Chrome (arrastra el archivo a Chrome o haz doble clic)
2. Haz clic en el **icono de la extensión** en la barra de herramientas
3. Haz clic en **"Extraer Datos"**
4. Deberías ver un mensaje de éxito y los datos extraídos
5. Si funciona, haz clic en **"Descargar CSV"** para ver el archivo generado

## 🎯 Cómo Usar la Extensión

### Paso 1: Iniciar Sesión en RoomCloud
1. Ve a https://secure.roomcloud.net/
2. Inicia sesión con tus credenciales
3. Selecciona el hotel que quieres auditar

### Paso 2: Navegar a las Páginas de Auditoría
La extensión puede extraer datos de estas páginas específicas:

| Página | URL | Datos Extraídos |
|--------|-----|----------------|
| **Detalles del Hotel** | `/contentHotel.jsp?item=property_detail` | Categoría, Estrellas, Apertura, Habitaciones |
| **Canales** | `/config.jsp?item=cm_channels` | Canales activos |
| **Usuarios** | `/users_list.jsp?item=users_list` | Lista de emails de usuarios |
| **Integración PMS** | `/hotel_automation_config.jsp?item=automation` | Estado de integración PMS |
| **Pasarelas de Pago** | `/payment_gateways_hotel.jsp?item=payment_gateways` | Pasarelas activas |
| **Revenue Management** | `/revenue_management_calendar.jsp?item=revenue_calendar` | Uso de reglas de revenue |
| **Comparador** | `/comparison.jsp?item=comparison` | Estado del comparador |
| **Metabuscadores** | `/meta_dashboard.jsp?item=meta_dashboard` | Estado de metabuscadores |

### Paso 3: Extraer Datos
1. **Navega** a cualquiera de las páginas listadas arriba
2. **Haz clic** en el icono 🏨 de la extensión en la barra de herramientas
3. **Presiona** "Extraer Datos del Hotel Actual"
4. **Espera** a que aparezca el mensaje de confirmación
5. **Repite** para cada página que quieras auditar

### Paso 4: Descargar el Reporte
1. Una vez que hayas extraído datos de todas las páginas deseadas
2. **Haz clic** en "Descargar CSV"
3. El archivo se guardará automáticamente con el nombre `roomcloud_audit_YYYY-MM-DD.csv`

## 📊 Estructura del CSV Generado

El archivo CSV incluirá estas columnas:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `categoria` | Categoría del hotel | Hotel, Apartment, etc. |
| `estrellas` | Número de estrellas | 3, 4, 5 |
| `apertura` | Tipo de apertura | annual, seasonal |
| `habitaciones` | Cantidad total de habitaciones | 66 |
| `canales_activos` | Canales conectados | Booking.com; Expedia |
| `usuarios_roomcloud` | Emails de usuarios | user1@hotel.com; user2@hotel.com |
| `integracion_pms` | ¿Tiene integración PMS? | Sí/No |
| `pms_provider` | Proveedor de PMS | PXSOL RC API |
| `pasarelas_pago` | Pasarelas activas | Cash; PayPal |
| `reglas_revenue` | ¿Usa reglas de revenue? | Sí/No |
| `comparador_precios` | Estado del comparador | Con comparador/Sin comparador |
| `metabuscadores` | Estado de metabuscadores | Activo/Inactivo |
| `pagina_actual` | Página de donde se extrajo | property_detail |
| `fecha_extraccion` | Fecha y hora de extracción | 2024-12-19T10:30:00.000Z |
| `url` | URL de la página | https://secure.roomcloud.net/... |

## 🔍 Solución de Problemas

### La extensión no aparece
- Verifica que esté instalada en `chrome://extensions/`
- Asegúrate de estar en una página de RoomCloud
- Recarga la página si es necesario

### No extrae datos
- Verifica que estés en una página soportada
- Recarga la página y vuelve a intentar
- Revisa la consola del navegador (F12) para errores

### Error de permisos
- La extensión necesita acceso a `secure.roomcloud.net`
- Verifica los permisos en `chrome://extensions/`

### Datos incompletos
- Algunas páginas pueden requerir tiempo de carga
- Espera a que la página cargue completamente antes de extraer
- Verifica que estés logueado correctamente

## 📝 Notas Importantes

1. **Una página a la vez**: La extensión extrae datos de la página actual únicamente
2. **Datos en tiempo real**: Los datos extraídos son los que se muestran en pantalla
3. **Múltiples hoteles**: Puedes cambiar de hotel y extraer datos de cada uno
4. **CSV único**: Cada descarga genera un nuevo archivo CSV
5. **Compatibilidad**: Funciona con la versión actual de RoomCloud

## 🆘 Soporte

Si encuentras problemas:
1. Verifica que todos los archivos estén en la carpeta correcta

## 🔧 Depuración

### Verificar que la extensión funciona:
1. **Abre la consola del navegador** (F12 → Console)
2. **Navega a una página de RoomCloud**
3. **Busca mensajes** que empiecen con "RoomCloud Auditor"
4. **Si no hay mensajes**, la extensión no se está cargando

### Errores comunes:
- **"Extension not found"**: Reinstala la extensión
- **"Permission denied"**: Verifica que estés en `secure.roomcloud.net`
- **"No data extracted"**: Verifica que estés en una página soportada

### Probar paso a paso:
1. **Instala la extensión** siguiendo los pasos anteriores
2. **Abre `test.html`** en Chrome
3. **Verifica que la extensión aparece** en la barra de herramientas
4. **Haz clic en el icono** y prueba "Extraer Datos"
5. **Si funciona en test.html**, prueba en RoomCloud real
2. Revisa que Chrome esté actualizado
3. Intenta desinstalar y reinstalar la extensión
4. Contacta al equipo de desarrollo con detalles del error

---

**¡Listo! Ya puedes comenzar a auditar hoteles en RoomCloud de forma automatizada.** 🎉
