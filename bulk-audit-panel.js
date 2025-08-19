// Panel de Auditoría Masiva - RoomCloud Auditor
class BulkAuditPanel {
    constructor() {
        this.hotelIds = [];
        this.auditState = {
            isRunning: false,
            currentHotelIndex: 0,
            completedHotels: 0,
            failedHotels: 0
        };
        this.auditResults = [];
        this.currentHotelId = null;
        
        // Gestor de tareas
        this.taskManager = {
            hotelIds: [],
            currentIndex: 0,
            isProcessing: false,
            completedHotels: new Set(),
            failedHotels: new Set(),
            currentStep: 'idle' // 'idle', 'changing_hotel', 'auditing', 'completed'
        };
        
        this.init();
    }
    
    async init() {
        console.log('RoomCloud Auditor: Panel de auditoría masiva inicializado');
        
        // Cargar datos de la URL
        await this.loadDataFromURL();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Actualizar UI inicial
        this.updateUI();
        
                    // Iniciar monitoreo de estado
        this.startStateMonitoring();
        
        this.addLog('Panel de auditoría masiva cargado', 'info');
        
        // Iniciar auditoría automáticamente si hay hoteles cargados
        if (this.hotelIds.length > 0) {
            this.addLog('Iniciando auditoría automáticamente...', 'info');
            setTimeout(() => {
                this.startAudit();
            }, 2000); // Esperar 2 segundos para que todo esté listo
        }
        
        // Limpiar estado anterior si existe
        if (this.auditState.isRunning) {
            this.addLog('Estado anterior detectado, limpiando...', 'info');
            this.auditState.isRunning = false;
            this.auditState.currentHotelIndex = 0;
            this.auditState.completedHotels = 0;
            this.auditState.failedHotels = 0;
            await this.saveState();
        }
        

        
    }
    
    async loadDataFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const hotelIdsParam = urlParams.get('hotelIds');
            const auditStateParam = urlParams.get('auditState');
            
            if (hotelIdsParam) {
                this.hotelIds = JSON.parse(decodeURIComponent(hotelIdsParam));
                this.addLog(`Cargados ${this.hotelIds.length} IDs de hoteles`, 'info');
                
                // Inicializar gestor de tareas
                this.taskManager.hotelIds = [...this.hotelIds];
                this.taskManager.currentIndex = 0;
            }
            
            if (auditStateParam) {
                this.auditState = JSON.parse(decodeURIComponent(auditStateParam));
                this.addLog('Estado de auditoría cargado', 'info');
            }
            
            // Cargar resultados guardados
            const result = await chrome.storage.local.get(['bulkAuditResults']);
            if (result.bulkAuditResults) {
                this.auditResults = result.bulkAuditResults;
                this.addLog(`Cargados ${this.auditResults.length} resultados previos`, 'info');
            }
            
        } catch (error) {
            this.addLog(`Error cargando datos: ${error.message}`, 'error');
        }
    }
    
    // ===== GESTOR DE TAREAS =====
    
    /**
     * Obtiene el próximo ID de hotel a procesar
     */
    getNextHotelId() {
        if (this.taskManager.currentIndex >= this.taskManager.hotelIds.length) {
            return null; // No hay más hoteles
        }
        
        const hotelId = this.taskManager.hotelIds[this.taskManager.currentIndex];
        this.addLog(`🎯 Gestor: Entregando hotel ${this.taskManager.currentIndex + 1}/${this.taskManager.hotelIds.length} (ID: ${hotelId})`, 'info');
        return hotelId;
    }
    
    /**
     * Marca un hotel como completado exitosamente
     */
    markHotelCompleted(hotelId, auditData) {
        this.taskManager.completedHotels.add(hotelId);
        
        // Validar que auditData tenga las propiedades necesarias
        const validatedData = {
            id_hotel: auditData?.id_hotel || hotelId,
            nombre_hotel: auditData?.nombre_hotel || 'N/A',
            estado_auditoria: auditData?.estado_auditoria || 'COMPLETADO',
            fecha_auditoria: auditData?.fecha_auditoria || new Date().toISOString(),
            ...auditData
        };
        
        this.auditResults.push(validatedData);
        this.addLog(`✅ Gestor: Hotel ${hotelId} marcado como completado`, 'success');
        
        // Guardar resultados
        chrome.storage.local.set({ bulkAuditResults: this.auditResults });
        
        // Actualizar UI
        this.updateUI();
    }
    
    /**
     * Marca un hotel como fallido
     */
    markHotelFailed(hotelId, error) {
        this.taskManager.failedHotels.add(hotelId);
        this.auditResults.push({
            id_hotel: hotelId,
            nombre_hotel: 'N/A',
            estado_auditoria: 'ERROR',
            error_mensaje: error,
            fecha_auditoria: new Date().toISOString()
        });
        this.addLog(`❌ Gestor: Hotel ${hotelId} marcado como fallido: ${error}`, 'error');
        
        // Guardar resultados
        chrome.storage.local.set({ bulkAuditResults: this.auditResults });
        
        // Actualizar UI
        this.updateUI();
    }
    
    /**
     * Avanza al siguiente hotel
     */
    advanceToNextHotel() {
        this.taskManager.currentIndex++;
        this.addLog(`🔄 Gestor: Avanzando al hotel ${this.taskManager.currentIndex + 1}/${this.taskManager.hotelIds.length}`, 'info');
        
        if (this.taskManager.currentIndex >= this.taskManager.hotelIds.length) {
            this.addLog(`🎉 Gestor: Todos los hoteles procesados`, 'success');
            this.taskManager.currentStep = 'completed';
            this.completeBulkAudit();
            return false; // No hay más hoteles
        }
        
        return true; // Hay más hoteles
    }
    
    /**
     * Inicia el procesamiento del próximo hotel
     */
    async processNextHotel() {
        this.addLog(`🔍 Gestor: Verificando si hay hotel en procesamiento...`, 'info');
        
        if (this.taskManager.isProcessing) {
            this.addLog(`⚠️ Gestor: Ya hay un hotel en procesamiento`, 'warning');
            return;
        }
        
        this.addLog(`🔍 Gestor: Obteniendo próximo hotel...`, 'info');
        const hotelId = this.getNextHotelId();
        
        if (!hotelId) {
            this.addLog(`🎉 Gestor: No hay más hoteles para procesar`, 'success');
            this.completeBulkAudit();
            return;
        }
        
        this.addLog(`🔍 Gestor: Configurando estado para hotel ${hotelId}...`, 'info');
        this.taskManager.isProcessing = true;
        this.taskManager.currentStep = 'changing_hotel';
        this.currentHotelId = hotelId;
        
        this.addLog(`🚀 Gestor: Iniciando procesamiento del hotel ${hotelId}`, 'info');
        this.addLog(`🔍 Gestor: Llamando a changeHotel(${hotelId})...`, 'info');
        
        // Iniciar cambio de hotel
        await this.changeHotel(hotelId);
    }
    
    /**
     * Completa la auditoría masiva
     */
    completeBulkAudit() {
        this.taskManager.isProcessing = false;
        this.taskManager.currentStep = 'completed';
        this.auditState.isRunning = false;
        
        this.addLog(`🧑‍💻 Auditoría masiva completada`, 'success');
        this.addLog(`📊 Resumen: ${this.taskManager.completedHotels.size} completados, ${this.taskManager.failedHotels.size} fallidos`, 'info');
        
        this.updateUI();
    }
    
    // ===== PROCESO DE CAMBIO DE HOTEL =====
    
    /**
     * Cambia al hotel especificado
     */
    async changeHotel(hotelId) {
        this.addLog(`🔍 changeHotel: INICIO del método para hotel ${hotelId}`, 'info');
        
        try {
            this.addLog(`🔄 Cambiando a hotel ${hotelId}...`, 'info');
            
            // Buscar pestañas de RoomCloud
            const tabs = await chrome.tabs.query({});
            const roomcloudTabs = tabs.filter(tab => tab.url && tab.url.includes('roomcloud.net'));
            
            this.addLog(`Pestañas encontradas: ${roomcloudTabs.length}`, 'info');
            
            if (roomcloudTabs.length === 0) {
                throw new Error('No se encontraron pestañas de RoomCloud');
            }
            
            // Usar la primera pestaña de RoomCloud encontrada
            const mainTab = roomcloudTabs[0];
            this.addLog(`Pestaña principal encontrada: ${mainTab.url}`, 'info');
            
            // Guardar hotel ID en storage para el proceso de búsqueda
            await chrome.storage.local.set({ tempHotelId: hotelId });
            this.addLog(`Datos guardados en storage: hotelId=${hotelId}`, 'info');
            
            // Enviar mensaje al background script para iniciar búsqueda
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'monitorHotelSearch',
                    hotelId: hotelId
                }, (response) => {
                    if (response && response.success) {
                        this.addLog('Búsqueda de hotel iniciada exitosamente', 'info');
                        resolve();
                    } else {
                        reject(new Error('Error iniciando búsqueda de hotel'));
                    }
                });
            });
            
            // Esperar a que se complete el cambio de hotel
            await this.waitForHotelChangeComplete(hotelId);
            
            // Cambiar al paso de auditoría
            this.taskManager.currentStep = 'auditing';
            this.addLog(`✅ Cambio de hotel ${hotelId} completado exitosamente`, 'success');
            
            // Iniciar auditoría
            await this.startHotelAudit(hotelId);
            
        } catch (error) {
            this.addLog(`❌ Error cambiando hotel ${hotelId}: ${error.message}`, 'error');
            this.markHotelFailed(hotelId, error.message);
            this.taskManager.isProcessing = false;
        }
    }
    
    /**
     * Espera a que se complete el cambio de hotel
     */
    async waitForHotelChangeComplete(hotelId) {
        this.addLog(`⏳ Esperando cambio de hotel ${hotelId}...`, 'info');
        
        let attempts = 0;
        const maxAttempts = 30; // 30 segundos máximo
        
        while (attempts < maxAttempts) {
            try {
                // Verificar si el hotel cambió consultando el storage
                const result = await chrome.storage.local.get(['tempHotelId']);
                if (!result.tempHotelId || result.tempHotelId !== hotelId) {
                    this.addLog(`✅ Hotel ${hotelId} cambiado exitosamente`, 'success');
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                
            } catch (error) {
                this.addLog(`Error verificando cambio de hotel: ${error.message}`, 'error');
                attempts++;
            }
        }
        
        throw new Error(`Timeout esperando cambio de hotel ${hotelId}`);
    }
    
    // ===== PROCESO DE AUDITORÍA INDIVIDUAL =====
    
    /**
     * Inicia la auditoría del hotel especificado
     */
    async startHotelAudit(hotelId) {
        try {
            this.addLog(`🔍 Iniciando auditoría para hotel ${hotelId}...`, 'info');
            
            // Esperar un poco para que la página se recargue completamente
            this.addLog('Esperando a que la página se recargue después del cambio de hotel...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Buscar pestaña de RoomCloud principal (no la de búsqueda)
            const tabs = await chrome.tabs.query({});
            this.addLog(`Todas las pestañas encontradas: ${tabs.length}`, 'info');
            
            const roomcloudTabs = tabs.filter(tab => 
                tab.url && 
                tab.url.includes('roomcloud.net') && 
                !tab.url.includes('HotelsList.jsp')
            );
            
            this.addLog(`Pestañas de RoomCloud (excluyendo búsqueda): ${roomcloudTabs.length}`, 'info');
            roomcloudTabs.forEach((tab, index) => {
                this.addLog(`Pestaña ${index + 1}: ${tab.url}`, 'info');
            });
            
            if (roomcloudTabs.length === 0) {
                throw new Error('No se encontró pestaña principal de RoomCloud');
            }
            
            // Usar la primera pestaña de RoomCloud encontrada (que debería ser la principal)
            const roomcloudTab = roomcloudTabs[0];
            
            this.addLog(`Pestaña de RoomCloud encontrada: ${roomcloudTab.url}`, 'info');
            
            // Esperar a que la página esté completamente cargada
            this.addLog('Esperando a que la página principal esté completamente cargada...', 'info');
            await this.waitForPageReady(roomcloudTab.id);
            this.addLog('Página completamente cargada', 'info');
            
            // Reconectar content script después del cambio de hotel
            this.addLog('Reconectando content script después del cambio de hotel...', 'info');
            await this.reconnectContentScript(roomcloudTab.id);
            this.addLog('Content script reconectado exitosamente', 'info');
            
            // Verificar conexión con content script
            this.addLog('Verificando conexión con content script...', 'info');
            await this.verifyContentScriptConnection(roomcloudTab.id);
            this.addLog('Conexión con content script verificada', 'info');
            
            // Ejecutar auditoría directamente con el background script
            this.addLog(`Ejecutando auditoría completa para hotel ${hotelId}...`, 'info');
            const auditData = await this.executeHotelAudit(hotelId);
            
            // Marcar como completado
            this.markHotelCompleted(hotelId, auditData);
            
            // Avanzar al siguiente hotel
            if (this.advanceToNextHotel()) {
                this.taskManager.isProcessing = false;
                await this.processNextHotel();
            }
            
        } catch (error) {
            this.addLog(`❌ Error en auditoría para hotel ${hotelId}: ${error.message}`, 'error');
            this.markHotelFailed(hotelId, error.message);
            this.taskManager.isProcessing = false;
        }
    }
    
    /**
     * Reconecta el content script después del cambio de hotel
     */
    async reconnectContentScript(tabId) {
        try {
            this.addLog('Inyectando content script...', 'info');
            
            // Inyectar el content script
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            this.addLog('Content script inyectado exitosamente', 'info');
            
            // Esperar un poco para que el content script se inicialice
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            this.addLog(`Error inyectando content script: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Verifica la conexión con el content script
     */
    async verifyContentScriptConnection(tabId) {
        try {
            this.addLog('Enviando ping al content script...', 'info');
            
            // Enviar ping al content script
            await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    
                    if (response && response.success) {
                        this.addLog('Ping exitoso al content script', 'info');
                        resolve();
                    } else {
                        reject(new Error('Content script no respondió correctamente'));
                    }
                });
            });
            
        } catch (error) {
            this.addLog(`Error verificando conexión con content script: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Ejecuta la auditoría del hotel
     */
    async executeHotelAudit(hotelId) {
        return new Promise((resolve, reject) => {
            this.addLog(`Enviando solicitud de auditoría completa para hotel ${hotelId}...`, 'info');
            
            // Enviar mensaje al background script para ejecutar auditoría completa
            chrome.runtime.sendMessage({
                action: 'executeCompleteAudit',
                hotelId: hotelId
            }, (response) => {
                this.addLog(`Respuesta recibida del background script para hotel ${hotelId}:`, 'info');
                console.log('Panel: Respuesta recibida:', response);
                
                if (chrome.runtime.lastError) {
                    this.addLog(`❌ Error en respuesta: ${chrome.runtime.lastError.message}`, 'error');
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.success) {
                    this.addLog(`✅ Auditoría completa terminada para hotel ${hotelId}`, 'success');
                    this.addLog(`📊 Datos recibidos: ${Object.keys(response.data).length} páginas auditadas`, 'info');
                    resolve(response.data);
                } else {
                    this.addLog(`❌ Error en auditoría: ${response?.error || 'Error desconocido'}`, 'error');
                    reject(new Error(response?.error || 'Error desconocido en auditoría'));
                }
            });
        });
    }
    
    setupEventListeners() {
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        const downloadButton = document.getElementById('downloadButton');
        
        if (startButton) {
            startButton.addEventListener('click', () => this.startAudit());
        }
        
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopAudit());
        }
        
        if (downloadButton) {
            downloadButton.addEventListener('click', () => this.downloadCSV());
        }
    }
    
    async startAudit() {
        this.addLog(`🔍 startAudit: INICIO del método`, 'info');
        
        if (this.taskManager.isProcessing) {
            this.addLog('Auditoría ya está en ejecución', 'warning');
            return;
        }
        
        if (this.taskManager.hotelIds.length === 0) {
            this.addLog('No hay hoteles cargados para auditar', 'error');
            return;
        }
        
        this.addLog('🚀 Iniciando auditoría masiva...', 'info');
        this.addLog(`Total de hoteles a auditar: ${this.taskManager.hotelIds.length}`, 'info');
        this.addLog(`IDs de hoteles: ${this.taskManager.hotelIds.join(', ')}`, 'info');
        
        // Inicializar estado
        this.addLog(`🔍 startAudit: Configurando estado...`, 'info');
        this.auditState.isRunning = true;
        this.taskManager.currentIndex = 0;
        this.taskManager.completedHotels.clear();
        this.taskManager.failedHotels.clear();
        this.auditResults = [];
        
        // Guardar estado
        this.addLog(`🔍 startAudit: Guardando estado...`, 'info');
        await this.saveState();
        
        // Actualizar UI
        this.addLog(`🔍 startAudit: Actualizando UI...`, 'info');
        this.updateUI();
        
        // Iniciar procesamiento del primer hotel usando el gestor
        this.addLog('Iniciando procesamiento del primer hotel...', 'info');
        this.addLog(`🔍 startAudit: Llamando a processNextHotel()...`, 'info');
        await this.processNextHotel();
        this.addLog(`🔍 startAudit: FIN del método`, 'info');
    }
    
    async stopAudit() {
        this.addLog('⏹️ Deteniendo auditoría masiva...', 'warning');
        
        this.auditState.isRunning = false;
        await this.saveState();
        this.updateUI();
        
        this.addLog('Auditoría detenida', 'info');
    }
    
    // MÉTODO VIEJO ELIMINADO - Usar el nuevo processNextHotel() del gestor de tareas
    
    async changeToHotel(hotelId) {
        this.addLog(`🔄 Cambiando a hotel ${hotelId}...`, 'info');
        this.addLog('Buscando pestañas de RoomCloud...', 'info');
        
        // Buscar pestaña principal de RoomCloud
        const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
        this.addLog(`Pestañas encontradas: ${tabs.length}`, 'info');
        
        let mainTab = null;
        
        for (const tab of tabs) {
            this.addLog(`Pestaña: ${tab.url}`, 'info');
            if (tab.url.includes('secure.roomcloud.net') && !tab.url.includes('HotelsList.jsp')) {
                mainTab = tab;
                break;
            }
        }
        
        if (!mainTab) {
            throw new Error('No se encontró la pestaña principal de RoomCloud');
        }
        
        this.addLog(`Pestaña principal encontrada: ${mainTab.url}`, 'info');
        
        // Activar la pestaña principal
        await chrome.tabs.update(mainTab.id, { active: true });
        
        // Guardar solo el ID temporal
        await chrome.storage.local.set({ 
            tempHotelId: hotelId
        });
        
        this.addLog(`Datos guardados en storage: hotelId=${hotelId}`, 'info');
        
        // Enviar mensaje para abrir búsqueda de hotel
        const response = await chrome.tabs.sendMessage(mainTab.id, { action: 'openHotelSearch' });
        
        if (!response || !response.success) {
            throw new Error('No se pudo abrir la búsqueda de hotel');
        }
        
        this.addLog('Búsqueda de hotel iniciada exitosamente', 'info');
        
        // Activar monitoreo
        this.addLog('Enviando mensaje para activar monitoreo...', 'info');
        await chrome.runtime.sendMessage({ action: 'monitorHotelSearch', hotelId: hotelId });
        
        this.addLog(`Monitoreo activado para hotel ${hotelId}`, 'info');
    }
    
    async waitForHotelChange(hotelId) {
        this.addLog(`⏳ Esperando cambio a hotel ${hotelId}...`, 'info');
        
        let attempts = 0;
        const maxAttempts = 60; // 60 intentos * 2 segundos = 2 minutos máximo
        
        while (attempts < maxAttempts) {
            await this.sleep(2000);
            
            try {
                // Buscar pestaña principal
                const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
                let mainTab = null;
                
                for (const tab of tabs) {
                    if (tab.url.includes('secure.roomcloud.net') && !tab.url.includes('HotelsList.jsp')) {
                        mainTab = tab;
                        break;
                    }
                }
                
                if (mainTab) {
                    // Verificar que el cambio fue exitoso
                    const verifyResponse = await chrome.tabs.sendMessage(mainTab.id, { action: 'getCurrentHotel' });
                    
                    if (verifyResponse && verifyResponse.success) {
                        if (verifyResponse.hotel.id === hotelId.toString()) {
                            this.addLog(`✅ Cambio exitoso a hotel ${hotelId} después de ${attempts + 1} intentos`, 'success');
                            return;
                        }
                    }
                }
            } catch (error) {
                this.addLog(`Error verificando hotel (intento ${attempts + 1}): ${error.message}`, 'warning');
            }
            
            attempts++;
        }
        
        throw new Error(`No se pudo cambiar al hotel ${hotelId} después de ${maxAttempts} intentos`);
    }
    
    async executeHotelAudit(hotelId) {
        this.addLog(`🔍 Ejecutando auditoría para hotel ${hotelId}...`, 'info');
        
        // Buscar pestaña principal
        const tabs = await chrome.tabs.query({ url: '*://secure.roomcloud.net/*' });
        let mainTab = null;
        
        for (const tab of tabs) {
            if (tab.url.includes('secure.roomcloud.net') && !tab.url.includes('HotelsList.jsp')) {
                mainTab = tab;
                break;
            }
        }
        
        if (!mainTab) {
            throw new Error('No se encontró la pestaña principal de RoomCloud');
        }
        
        // Activar la pestaña principal
        await chrome.tabs.update(mainTab.id, { active: true });
        
        // Esperar a que la página esté completamente cargada
        this.addLog('Esperando a que la página principal esté completamente cargada...', 'info');
        await this.waitForPageReady(mainTab.id);
        
        // Esperar a que se cargue el content script
        await this.sleep(3000);
        
        // Verificar conexión con content script y reinyectar si es necesario
        let connectionVerified = false;
        for (let attempt = 0; attempt < 15; attempt++) {
            try {
                const pingResponse = await chrome.tabs.sendMessage(mainTab.id, { action: 'ping' });
                if (pingResponse && pingResponse.success) {
                    connectionVerified = true;
                    this.addLog('Conexión con content script verificada', 'info');
                    break;
                }
            } catch (error) {
                this.addLog(`Intento ${attempt + 1} de verificar conexión: ${error.message}`, 'warning');
                
                // Intentar reinyectar content script si es necesario
                if (attempt >= 5) {
                    this.addLog('Intentando reinyectar content script...', 'info');
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: mainTab.id },
                            files: ['content.js']
                        });
                        this.addLog('Content script reinyectado', 'info');
                        await this.sleep(3000); // Esperar a que se cargue
                    } catch (injectError) {
                        this.addLog(`Error reinyectando content script: ${injectError.message}`, 'warning');
                    }
                }
                
                await this.sleep(2000);
            }
        }
        
        if (!connectionVerified) {
            throw new Error('No se pudo establecer conexión con el content script después de múltiples intentos');
        }
        
        // Ejecutar auditoría
        this.addLog(`Enviando mensaje runCompleteAudit para hotel ${hotelId}...`, 'info');
        
        const auditResult = await chrome.tabs.sendMessage(mainTab.id, { 
            action: 'runCompleteAudit',
            hotelId: hotelId
        });
        
        this.addLog(`Respuesta de auditoría recibida: ${JSON.stringify(auditResult)}`, 'info');
        
        if (auditResult && auditResult.success) {
            this.auditResults.push(auditResult.data);
            this.addLog(`✅ Auditoría completada para hotel ${hotelId}`, 'success');
            this.addLog(`Datos extraídos: ${JSON.stringify(auditResult.data)}`, 'info');
        } else {
            const errorMsg = auditResult?.error || 'Error desconocido en auditoría';
            this.addLog(`❌ Error en auditoría: ${errorMsg}`, 'error');
            throw new Error(errorMsg);
        }
    }
    
    async completeAudit() {
        this.addLog('🎉 Auditoría masiva completada', 'success');
        
        this.auditState.isRunning = false;
        await this.saveState();
        this.updateUI();
        
        // Mostrar botón de descarga
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
            downloadButton.style.display = 'inline-block';
        }
    }
    
    async downloadCSV() {
        try {
            this.addLog('📥 Generando CSV...', 'info');
            
            const csvContent = this.convertToCSV(this.auditResults);
            
            if (!csvContent) {
                this.addLog('Error: No se pudo generar el CSV', 'error');
                return;
            }
            
            // Crear nombre de archivo con fecha
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `roomcloud_bulk_audit_${dateStr}.csv`;
            
            // Crear blob y descargar
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            // Crear enlace temporal y hacer clic
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = filename;
            tempLink.style.display = 'none';
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            
            // Limpiar URL
            URL.revokeObjectURL(url);
            
            this.addLog(`✅ CSV descargado: ${filename}`, 'success');
            
        } catch (error) {
            this.addLog(`❌ Error descargando CSV: ${error.message}`, 'error');
        }
    }
    
    convertToCSV(data) {
        if (!data || data.length === 0) {
            return null;
        }
        
        // Definir el orden exacto de las columnas que necesitas
        const columnOrder = [
            'apertura', 'categoria', 'estrellas', 'habitaciones', 'id_hotel', 'nombre_hotel',
            'cierres_parciales', 'moneda_carga', 'tarifa_mas_baja', 'canales_activos',
            'cantidad_canales_activos', 'cantidad_usuarios', 'usuarios_roomcloud', 'cantidad_pms_activos',
            'integracion_pms', 'pms_provider', 'cantidad_pasarelas_activas', 'pasarelas_pago_activas',
            'cantidad_reglas_revenue', 'reglas_revenue_activas', 'cantidad_hoteles_comparacion',
            'comparador_precios', 'cantidad_metabuscadores_activos', 'metabuscadores'
        ];
        
        const csvRows = [columnOrder.join(',')];
        
        for (const row of data) {
            const values = columnOrder.map(column => {
                const value = row[column] || '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    // Función eliminada - ya no necesitamos calcular páginas
    
    async saveState() {
        await chrome.storage.local.set({
            bulkAuditState: this.auditState,
            bulkAuditResults: this.auditResults
        });
    }
    
    updateUI() {
        // Actualizar contadores
        document.getElementById('totalHotels').textContent = this.hotelIds.length;
        document.getElementById('completedHotels').textContent = this.auditState.completedHotels;
        document.getElementById('pendingHotels').textContent = this.hotelIds.length - this.auditState.completedHotels - this.auditState.failedHotels;
        document.getElementById('failedHotels').textContent = this.auditState.failedHotels;
        
        // Actualizar barra de progreso
        const progress = this.hotelIds.length > 0 ? (this.auditState.completedHotels + this.auditState.failedHotels) / this.hotelIds.length * 100 : 0;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}% completado`;
        
        // Actualizar hotel actual
        const currentHotelSection = document.getElementById('currentHotelSection');
        if (this.currentHotelId && this.auditState.isRunning) {
            currentHotelSection.style.display = 'block';
            document.getElementById('currentHotelId').textContent = `ID: ${this.currentHotelId}`;
            
            // Buscar nombre del hotel en resultados
            const hotelResult = this.auditResults.find(r => r.id_hotel === this.currentHotelId);
            const hotelName = hotelResult ? hotelResult.nombre_hotel : 'Procesando...';
            document.getElementById('currentHotelName').textContent = hotelName;
        } else {
            currentHotelSection.style.display = 'none';
        }
        
        // Actualizar listas de hoteles
        this.updateHotelLists();
        
        // Actualizar botones
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        
        if (this.auditState.isRunning) {
            startButton.style.display = 'none';
            stopButton.style.display = 'inline-block';
        } else {
            startButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
        }
    }
    
    updateHotelLists() {
        const completedList = document.getElementById('completedHotelsList');
        const pendingList = document.getElementById('pendingHotelsList');
        
        // Limpiar listas
        completedList.innerHTML = '';
        pendingList.innerHTML = '';
        
        // Agregar hoteles completados
        for (const result of this.auditResults) {
            if (result && result.id_hotel) {
                const hotelItem = document.createElement('div');
                hotelItem.className = 'hotel-item';
                hotelItem.textContent = `Hotel ${result.id_hotel} - ${result.nombre_hotel || 'N/A'}`;
                completedList.appendChild(hotelItem);
            }
        }
        
        // Agregar hoteles pendientes
        for (let i = this.auditState.currentHotelIndex; i < this.hotelIds.length; i++) {
            const hotelId = this.hotelIds[i];
            const hotelItem = document.createElement('div');
            hotelItem.className = 'hotel-item pending';
            
            if (i === this.auditState.currentHotelIndex && this.auditState.isRunning) {
                hotelItem.className = 'hotel-item current';
                hotelItem.textContent = `Hotel ${hotelId} - En progreso...`;
            } else {
                hotelItem.textContent = `Hotel ${hotelId} - Pendiente`;
            }
            
            pendingList.appendChild(hotelItem);
        }
    }
    
    addLog(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        console.log(`RoomCloud Auditor Panel: ${message}`);
    }
    
    startStateMonitoring() {
        // Monitorear cambios en el storage cada 2 segundos
        setInterval(async () => {
            try {
                const result = await chrome.storage.local.get(['bulkAuditState', 'bulkAuditResults']);
                
                if (result.bulkAuditState) {
                    this.auditState = result.bulkAuditState;
                }
                
                if (result.bulkAuditResults) {
                    this.auditResults = result.bulkAuditResults;
                }
                
                this.updateUI();
            } catch (error) {
                console.error('Error monitoreando estado:', error);
            }
        }, 2000);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async waitForPageReady(tabId) {
        this.addLog('Verificando que la página esté lista...', 'info');
        
        let attempts = 0;
        const maxAttempts = 30; // 30 intentos * 2 segundos = 1 minuto máximo
        
        while (attempts < maxAttempts) {
            try {
                // Verificar que la página esté cargada
                const tab = await chrome.tabs.get(tabId);
                if (tab.status === 'complete') {
                    this.addLog('Página completamente cargada', 'info');
                    return;
                }
            } catch (error) {
                this.addLog(`Error verificando estado de página: ${error.message}`, 'warning');
            }
            
            await this.sleep(2000);
            attempts++;
        }
        
        this.addLog('Tiempo de espera agotado para carga de página', 'warning');
    }
}

// Inicializar panel cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new BulkAuditPanel();
});
