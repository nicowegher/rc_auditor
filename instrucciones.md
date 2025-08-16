# Auditoría de Hoteles en RoomCloud - IA

## 1. Preparación Inicial

### 1.1. Credenciales de Acceso
- **Usuario**: `cmreservas`  
- **Contraseña**: `2025CmReSeRvAs251!@`  
- **PIN de 2FA**: Proporcionado en tiempo real vía email al iniciar sesión.

### 1.2. Archivos Necesarios
| Archivo                         | Descripción                                                                 |
|---------------------------------|-----------------------------------------------------------------------------|
| `rc_ids.txt`                    | Lista de RC IDs de hoteles a auditar (uno por línea).                       |
| `AuditoriaRoomCloud_Actualizada-Hoja1.csv` | CSV base con datos precargados (RC ID, Nombre, Reseller). Actualizar con datos extraídos. |
| `AuditoríaRoomCloud-Hoja5(1).csv` | Lista de OTAs disponibles en Chamex para comparar con canales activos.      |

---

## 2. Proceso de Auditoría por Hotel
_Repetir para cada RC ID en `rc_ids.txt`_

### 2.1. Iniciar Sesión en RoomCloud
1. Acceder a: [https://secure.roomcloud.net/](https://secure.roomcloud.net/)  
2. Ingresar usuario y contraseña.  
3. Si se solicita 2FA, ingresar PIN recibido por email.  

### 2.2. Seleccionar Hotel
1. Tras iniciar sesión, hacer clic en **"Add Hotel"** (barra superior derecha).  
2. En nueva ventana, buscar el **RC ID** del hotel.  
3. Hacer clic en el nombre del hotel correspondiente.  
4. **Reglas clave**:  
   - Si el RC ID no aparece o está en estado **"CEASED"**, registrar en CSV como *"No Encontrado"* o *"CEASED"* y pasar al siguiente.  

---

### 2.3. Extracción de Información
#### 2.3.1. Habitaciones y Categoría  
- **URL**: [https://secure.roomcloud.net/be/owners_area/contentHotel.jsp?item=property_detail](https://secure.roomcloud.net/be/owners_area/contentHotel.jsp?item=property_detail)  
- **Datos a registrar**:  
  - Categoría  
  - Estrellas  
  - Apertura  
  - Cantidad total de habitaciones  

#### 2.3.2. Tarifa más Baja (USD)  
- **URL**: [https://secure.roomcloud.net/be/owners_area/availability_r2.jsp](https://secure.roomcloud.net/be/owners_area/availability_r2.jsp)  
- **Pasos**:  
  1. Verificar moneda de carga.  
  2. Identificar tarifa más baja en la tabla (ignorar "9999" o tarifas de cierre).  

#### 2.3.3. Cierre de Ventas por Canal  
- **URL**: [https://secure.roomcloud.net/be/owners_area/availability_r2.jsp](https://secure.roomcloud.net/be/owners_area/availability_r2.jsp)  
- **Regla**: Si aparece color **naranja** en una fecha = *Cierre parcial activo*.  

#### 2.3.4. Usuarios en RoomCloud  
- **URL**: [https://secure.roomcloud.net/be/owners_area/users_list.jsp?item=users_list](https://secure.roomcloud.net/be/owners_area/users_list.jsp?item=users_list)  
- **Acción**: Copiar lista de correos de la segunda columna.  

#### 2.3.5. Canales  
- **URL**: [https://secure.roomcloud.net/be/owners_area/config.jsp?item=cm_channels](https://secure.roomcloud.net/be/owners_area/config.jsp?item=cm_channels)  
- **Datos**:  
  - **Canales activos**: Nombres con check verde en columna *"Estado de conexión"*.  
  - Comparar con OTAs de Chamex (archivo `Hoja5(1).csv`).  

#### 2.3.6. Integración PMS  
- **URL**: [https://secure.roomcloud.net/be/owners_area/hotel_automation_config.jsp?item=automation](https://secure.roomcloud.net/be/owners_area/hotel_automation_config.jsp?item=automation)  
- **Pasos**:  
  1. Ir a pestaña **"PMS"**.  
  2. Si hay check (✓) en *"PMS Providers"* = **"Sí"** (registrar nombre en columna 3).  
  3. Si no hay check = **"No"** (registrar *"N/C"*).  

#### 2.3.7. Pasarelas de Pago  
- **URL**: [https://secure.roomcloud.net/be/owners_area/payment_gateways_hotel.jsp?item=payment_gateways](https://secure.roomcloud.net/be/owners_area/payment_gateways_hotel.jsp?item=payment_gateways)  
- **Acción**:  
  1. Activar *"Show Active Only"*.  
  2. Registrar nombres de pasarelas activas (columna *"Pasarela de pago"*).  

#### 2.3.8. Reglas de Revenue  
- **URL**: [https://secure.roomcloud.net/be/owners_area/revenue_management_calendar.jsp?item=revenue_calendar](https://secure.roomcloud.net/be/owners_area/revenue_management_calendar.jsp?item=revenue_calendar)  
- **Regla**:  
  - Si hay filas con celdas **rojo/verde** bajo fechas = *Sí usa reglas*.  
  - Si solo se ve calendario = *No usa reglas*.  

#### 2.3.9. Comparador de Precios  
- **URL**: [https://secure.roomcloud.net/be/owners_area/comparison.jsp?item=comparison](https://secure.roomcloud.net/be/owners_area/comparison.jsp?item=comparison)  
- **Regla**: 
  - Si la página muestra una lista de hoteles con checkboxes (nombres que empiezan con `cp_`) = *Con comparador*
  - Si la página solo muestra la tabla vacía sin hoteles = *Sin comparador*
  - La extensión detectará automáticamente si hay hoteles disponibles para comparar  

#### 2.3.10. Metabuscadores  
- **URL**: [https://secure.roomcloud.net/be/owners_area/meta_dashboard.jsp?item=meta_dashboard](https://secure.roomcloud.net/be/owners_area/meta_dashboard.jsp?item=meta_dashboard)  
- **Regla**: 
  - Si la página muestra al menos un metabuscador con estado "online" (punto verde) o switch activado = *Activo*
  - Si todos los metabuscadores están con estado "offline" (punto rojo) = *Inactivo*
  - La extensión detecta automáticamente los switches de Bootstrap y checkboxes activados  

---

## 3. Consolidación y Entrega
1. Actualizar `AuditoriaRoomCloud_Actualizada-Hoja1.csv` con datos extraídos.  
2. Conservar datos precargados (RC ID, Nombre, Reseller).  
3. Guardar archivo final como `AuditoriaRoomCloud_Final.csv`.  
4. Entregar CSV al equipo solicitante.  