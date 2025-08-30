/**
 * AI Microservices Dashboard - Enhanced Professional JavaScript
 * Powered by Flowise + LangChain
 * Version: 2.0.0
 */

// ========================================
// CONFIGURATION & CONSTANTS
// ========================================

const CONFIG = {
    API_BASE_URL: 'http://localhost:8000',
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_DURATION: 5000,
    ANIMATION_DURATION: 300,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FILE_TYPES: ['pdf', 'docx', 'txt', 'md'],
    AUTO_SAVE_DELAY: 2000
};

const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

// ========================================
// STATE MANAGEMENT
// ========================================

class AppState {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || THEMES.LIGHT;
        this.activeTab = 'summarization';
        this.apiStatus = 'unknown';
        this.uploadedFiles = new Map();
        this.requestCache = new Map();
        this.autoSaveTimers = new Map();
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    setActiveTab(tabId) {
        this.activeTab = tabId;
    }

    setApiStatus(status) {
        this.apiStatus = status;
        this.updateApiStatusIndicator();
    }

    updateApiStatusIndicator() {
        const indicator = document.querySelector('.api-status');
        if (indicator) {
            indicator.className = `api-status ${this.apiStatus}`;
            indicator.innerHTML = `
                <i class="fas fa-circle"></i>
                <span>${this.apiStatus === 'healthy' ? 'API Online' : 'API Offline'}</span>
            `;
        }
    }
}

const appState = new AppState();

// ========================================
// UTILITY FUNCTIONS
// ========================================

class Utils {
    static debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    }

    static throttle(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(null, args);
            }
        };
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    static generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    static sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        }
    }

    static formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
}

// ========================================
// PROFESSIONAL UI COMPONENTS
// ========================================

class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Map();
    }

    createContainer() {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        const id = Utils.generateId();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <i class="fas ${this.getIcon(type)}"></i>
            <span class="notification-message">${Utils.sanitizeHTML(message)}</span>
            <button class="notification-close" onclick="notifications.dismiss('${id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Auto-dismiss after duration
        setTimeout(() => this.dismiss(id), duration);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        return id;
    }

    dismiss(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, CONFIG.ANIMATION_DURATION);
        }
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    clear() {
        this.notifications.forEach((_, id) => this.dismiss(id));
    }
}

class ModalDialog {
    constructor() {
        this.activeModal = null;
        this.setupKeyboardHandlers();
    }

    show(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="modal-header">
                    <h3 id="modal-title">${Utils.sanitizeHTML(title)}</h3>
                    <button class="modal-close" onclick="modal.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.showFooter ? `
                <div class="modal-footer">
                    ${options.footerContent || ''}
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;

        // Focus management
        const firstFocusable = modal.querySelector('button, input, select, textarea');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-dialog').style.transform = 'translateY(0) scale(1)';
        });

        return modal;
    }

    close() {
        if (this.activeModal) {
            this.activeModal.style.opacity = '0';
            this.activeModal.querySelector('.modal-dialog').style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => {
                if (this.activeModal && this.activeModal.parentNode) {
                    this.activeModal.parentNode.removeChild(this.activeModal);
                }
                this.activeModal = null;
            }, CONFIG.ANIMATION_DURATION);
        }
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });
    }
}

class LoadingManager {
    constructor() {
        this.overlay = this.createOverlay();
        this.activeLoaders = new Set();
    }

    createOverlay() {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay hidden';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <h3 class="loading-title">Processing Request</h3>
                    <p class="loading-subtitle">Please wait while we process your request...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    show(message = 'Processing Request', subtitle = 'Please wait while we process your request...') {
        const loaderId = Utils.generateId();
        this.activeLoaders.add(loaderId);
        
        this.overlay.querySelector('.loading-title').textContent = message;
        this.overlay.querySelector('.loading-subtitle').textContent = subtitle;
        this.overlay.classList.remove('hidden');
        
        return loaderId;
    }

    hide(loaderId) {
        if (loaderId) {
            this.activeLoaders.delete(loaderId);
        }
        
        if (this.activeLoaders.size === 0) {
            this.overlay.classList.add('hidden');
        }
    }

    hideAll() {
        this.activeLoaders.clear();
        this.overlay.classList.add('hidden');
    }
}

class ProgressIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.progressBar = null;
    }

    create(title = 'Processing...') {
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'progress-wrapper';
        progressWrapper.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">${Utils.sanitizeHTML(title)}</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        
        this.container.appendChild(progressWrapper);
        this.progressBar = progressWrapper;
        return this;
    }

    update(percentage, title) {
        if (this.progressBar) {
            const fill = this.progressBar.querySelector('.progress-fill');
            const percentageSpan = this.progressBar.querySelector('.progress-percentage');
            const titleSpan = this.progressBar.querySelector('.progress-title');
            
            fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            percentageSpan.textContent = `${Math.round(percentage)}%`;
            
            if (title) {
                titleSpan.textContent = title;
            }
        }
        return this;
    }

    complete(message = 'Complete!') {
        this.update(100, message);
        setTimeout(() => this.remove(), 2000);
        return this;
    }

    remove() {
        if (this.progressBar && this.progressBar.parentNode) {
            this.progressBar.style.opacity = '0';
            setTimeout(() => {
                if (this.progressBar && this.progressBar.parentNode) {
                    this.progressBar.parentNode.removeChild(this.progressBar);
                }
            }, CONFIG.ANIMATION_DURATION);
        }
        return this;
    }
}

class TooltipManager {
    constructor() {
        this.tooltip = this.createTooltip();
        this.setupEventListeners();
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);
        return tooltip;
    }

    setupEventListeners() {
        document.addEventListener('mouseover', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.show(e.target, e.target.getAttribute('data-tooltip'));
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.hide();
            }
        });
    }

    show(element, text) {
        this.tooltip.textContent = text;
        this.tooltip.style.opacity = '1';
        this.tooltip.style.visibility = 'visible';
        
        const rect = element.getBoundingClientRect();
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - this.tooltip.offsetHeight - 10}px`;
    }

    hide() {
        this.tooltip.style.opacity = '0';
        this.tooltip.style.visibility = 'hidden';
    }
}

// ========================================
// ENHANCED TAB MANAGEMENT
// ========================================

class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTab = null;
        this.setupTabs();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            const tabId = button.getAttribute('data-tab');
            const content = document.getElementById(tabId);
            
            this.tabs.set(tabId, {
                button,
                content,
                initialized: false
            });

            button.addEventListener('click', () => this.switchTab(tabId));
        });

        // Initialize first tab
        if (this.tabs.size > 0) {
            this.switchTab(this.tabs.keys().next().value);
        }
    }

    switchTab(tabId) {
        if (this.activeTab === tabId) return;

        // Hide current tab
        if (this.activeTab) {
            const currentTab = this.tabs.get(this.activeTab);
            currentTab.button.classList.remove('active');
            currentTab.content.classList.remove('active');
        }

        // Show new tab
        const newTab = this.tabs.get(tabId);
        if (newTab) {
            newTab.button.classList.add('active');
            newTab.content.classList.add('active');
            this.activeTab = tabId;
            appState.setActiveTab(tabId);

            // Initialize tab if needed
            if (!newTab.initialized) {
                this.initializeTab(tabId);
                newTab.initialized = true;
            }

            // Analytics
            this.trackTabSwitch(tabId);
        }
    }

    initializeTab(tabId) {
        switch (tabId) {
            case 'summarization':
                this.initializeSummarizationTab();
                break;
            case 'document-qa':
                this.initializeDocumentQATab();
                break;
            case 'learning-path':
                this.initializeLearningPathTab();
                break;
        }
    }

    initializeSummarizationTab() {
        const textarea = document.getElementById('summarize-text');
        if (textarea) {
            textarea.addEventListener('input', Utils.debounce(() => {
                this.updateCharacterCount(textarea);
                this.autoSave('summarization', textarea.value);
            }, CONFIG.DEBOUNCE_DELAY));
        }
    }

    initializeDocumentQATab() {
        this.setupFileUpload();
    }

    initializeLearningPathTab() {
        const inputs = document.querySelectorAll('#learning-path input, #learning-path select');
        inputs.forEach(input => {
            input.addEventListener('change', Utils.debounce(() => {
                this.autoSave('learning-path', this.getLearningPathFormData());
            }, CONFIG.AUTO_SAVE_DELAY));
        });
    }

    updateCharacterCount(textarea) {
        const maxLength = 10000;
        const currentLength = textarea.value.length;
        let counter = textarea.parentNode.querySelector('.char-counter');
        
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter';
            textarea.parentNode.appendChild(counter);
        }
        
        counter.textContent = `${currentLength}/${maxLength}`;
        counter.style.color = currentLength > maxLength * 0.9 ? 'var(--error-color)' : 'var(--text-light)';
    }

    autoSave(section, data) {
        localStorage.setItem(`autosave_${section}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    }

    loadAutoSave(section) {
        const saved = localStorage.getItem(`autosave_${section}`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                localStorage.removeItem(`autosave_${section}`);
            }
        }
        return null;
    }

    getLearningPathFormData() {
        return {
            goal: document.getElementById('learning-goal')?.value || '',
            skills: document.getElementById('current-skills')?.value || '',
            experience: document.getElementById('experience-level')?.value || '',
            time: document.getElementById('time-commitment')?.value || '',
            style: document.getElementById('learning-style')?.value || '',
            interests: document.getElementById('interests')?.value || ''
        };
    }

    trackTabSwitch(tabId) {
        // Analytics placeholder - can be connected to analytics service
        console.log(`Tab switched to: ${tabId} at ${new Date().toISOString()}`);
    }

    setupFileUpload() {
        const fileInput = document.getElementById('document-file');
        const uploadZone = document.querySelector('.upload-zone');
        
        if (uploadZone && fileInput) {
            // Drag and drop functionality
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });

            uploadZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelection(e.target.files[0]);
                }
            });
        }
    }

    handleFileSelection(file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Validate file type
        if (!CONFIG.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            notifications.show(
                `Unsupported file type: .${fileExtension}. Supported types: ${CONFIG.SUPPORTED_FILE_TYPES.join(', ')}`,
                'error'
            );
            return false;
        }

        // Validate file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            notifications.show(
                `File size too large: ${Utils.formatFileSize(file.size)}. Maximum size: ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}`,
                'error'
            );
            return false;
        }

        // Show file info
        const fileInfo = document.querySelector('.file-info') || this.createFileInfo();
        fileInfo.innerHTML = `
            <div class="file-item">
                <i class="fas fa-file-${this.getFileIcon(fileExtension)}"></i>
                <div class="file-details">
                    <div class="file-name">${Utils.sanitizeHTML(file.name)}</div>
                    <div class="file-meta">${Utils.formatFileSize(file.size)} • ${fileExtension.toUpperCase()}</div>
                </div>
                <button class="btn-remove-file" onclick="tabManager.removeFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        fileInfo.style.display = 'block';

        return true;
    }

    createFileInfo() {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.style.display = 'none';
        
        const uploadSection = document.querySelector('#document-qa .panel-body');
        if (uploadSection) {
            uploadSection.insertBefore(fileInfo, uploadSection.firstChild);
        }
        
        return fileInfo;
    }

    removeFile() {
        const fileInput = document.getElementById('document-file');
        const fileInfo = document.querySelector('.file-info');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
    }

    getFileIcon(extension) {
        const icons = {
            pdf: 'pdf',
            docx: 'word',
            doc: 'word',
            txt: 'alt',
            md: 'markdown'
        };
        return icons[extension] || 'alt';
    }
}

// ========================================
// ENHANCED API LAYER
// ========================================

class APIClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.cache = new Map();
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        // Check cache for GET requests
        if (options.method !== 'POST' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache successful GET requests
            if (options.method !== 'POST') {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            const data = await this.request('/health');
            appState.setApiStatus('healthy');
            return data;
        } catch (error) {
            appState.setApiStatus('error');
            throw error;
        }
    }

    async summarize(text, options = {}) {
        return this.request('/api/summarize', {
            method: 'POST',
            body: JSON.stringify({ text, options })
        });
    }

    async uploadDocument(file, collectionName = 'default') {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('collectionName', collectionName);

        return this.request('/api/documents/upload', {
            method: 'POST',
            headers: {}, // Remove content-type for FormData
            body: formData
        });
    }

    async askQuestion(question, collectionName = 'default', options = {}) {
        return this.request('/api/documents/ask', {
            method: 'POST',
            body: JSON.stringify({ question, collectionName, options })
        });
    }

    async generateLearningPath(userProfile) {
        return this.request('/api/learning-path/generate', {
            method: 'POST',
            body: JSON.stringify(userProfile)
        });
    }

    async getPopularPaths() {
        return this.request('/api/learning-path/popular');
    }
}

// ========================================
// FORM VALIDATION & ENHANCEMENT
// ========================================

class FormValidator {
    constructor() {
        this.rules = new Map();
        this.setupValidation();
    }

    addRule(fieldId, validator, message) {
        if (!this.rules.has(fieldId)) {
            this.rules.set(fieldId, []);
        }
        this.rules.get(fieldId).push({ validator, message });
    }

    setupValidation() {
        // Text summarization validation
        this.addRule('summarize-text', 
            (value) => value.trim().length > 0, 
            'Text is required for summarization'
        );
        this.addRule('summarize-text', 
            (value) => value.trim().length >= 50, 
            'Text should be at least 50 characters for meaningful summarization'
        );
        this.addRule('summarize-text', 
            (value) => value.trim().length <= 10000, 
            'Text should not exceed 10,000 characters'
        );

        // Learning path validation
        this.addRule('learning-goal', 
            (value) => value.trim().length > 0, 
            'Learning goal is required'
        );
        this.addRule('learning-goal', 
            (value) => value.trim().length >= 10, 
            'Please provide a more detailed learning goal (at least 10 characters)'
        );

        // Question validation
        this.addRule('question-text', 
            (value) => value.trim().length > 0, 
            'Question is required'
        );
    }

    validate(fieldId) {
        const field = document.getElementById(fieldId);
        const rules = this.rules.get(fieldId) || [];
        const errors = [];

        for (const rule of rules) {
            if (!rule.validator(field.value)) {
                errors.push(rule.message);
            }
        }

        this.displayFieldErrors(field, errors);
        return errors.length === 0;
    }

    validateForm(fieldIds) {
        let isValid = true;
        for (const fieldId of fieldIds) {
            if (!this.validate(fieldId)) {
                isValid = false;
            }
        }
        return isValid;
    }

    displayFieldErrors(field, errors) {
        // Remove existing error display
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error styling
        if (errors.length > 0) {
            field.classList.add('field-invalid');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errors[0]}`;
            field.parentNode.appendChild(errorDiv);
        } else {
            field.classList.remove('field-invalid');
        }
    }
}

// ========================================
// GLOBAL INSTANCES
// ========================================

const notifications = new NotificationSystem();
const modal = new ModalDialog();
const loading = new LoadingManager();
const tooltips = new TooltipManager();
const tabManager = new TabManager();
const apiClient = new APIClient();
const validator = new FormValidator();

// ========================================
// ENHANCED CORE FUNCTIONS
// ========================================

// Enhanced Text Summarization with validation and progress
async function summarizeText() {
    // Validate input
    if (!validator.validateForm(['summarize-text'])) {
        return;
    }

    const text = document.getElementById('summarize-text').value.trim();
    const style = document.getElementById('summary-style').value;
    const maxLength = parseInt(document.getElementById('summary-length').value);

    const loaderId = loading.show('Analyzing Text', 'Processing your text for summarization...');
    
    try {
        const data = await apiClient.summarize(text, {
            maxLength,
            style,
            language: 'english'
        });

        if (data.success) {
            const result = data.data;
            displaySummarizationResult(result);
            notifications.show('Text summarized successfully!', 'success');
        } else {
            throw new Error(data.error || 'Summarization failed');
        }
    } catch (error) {
        console.error('Summarization error:', error);
        notifications.show('Failed to summarize text. Please try again.', 'error');
        displayError('summarization-result', error.message);
    } finally {
        loading.hide(loaderId);
    }
}

function displaySummarizationResult(result) {
    const container = document.getElementById('summarization-result');
    const compressionRate = ((1 - result.summaryLength / result.originalLength) * 100).toFixed(1);
    
    container.innerHTML = `
        <div class="result-container show">
            <div class="result-header">
                <i class="fas fa-compress-alt"></i>
                <span>Summarization Complete</span>
                <div class="result-actions">
                    <button class="btn-copy" onclick="copyResultToClipboard('${result.summary}')" data-tooltip="Copy to clipboard">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-export" onclick="exportSummary('${result.summary}', '${result.style}')" data-tooltip="Export as file">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            
            <div class="result-stats">
                <div class="stat-badge">
                    <i class="fas fa-font"></i> ${result.originalLength} → ${result.summaryLength} chars
                </div>
                <div class="stat-badge">
                    <i class="fas fa-compress"></i> ${compressionRate}% reduction
                </div>
                <div class="stat-badge">
                    <i class="fas fa-clock"></i> ${result.processingTime || '< 1'}s
                </div>
            </div>
            
            <div class="result-content">
                ${Utils.sanitizeHTML(result.summary)}
            </div>
        </div>
    `;
}

// Enhanced Document Upload with progress tracking
async function uploadDocument() {
    const fileInput = document.getElementById('document-file');
    const collectionName = document.getElementById('collection-name').value.trim() || 'default';

    if (!fileInput.files[0]) {
        notifications.show('Please select a file to upload.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const loaderId = loading.show('Uploading Document', `Processing ${file.name}...`);
    
    try {
        const data = await apiClient.uploadDocument(file, collectionName);
        
        if (data.success) {
            const result = data.data;
            displayUploadSuccess(result);
            notifications.show(`Document "${result.fileName}" uploaded successfully!`, 'success');
            
            // Enable Q&A section
            document.querySelector('.qa-fieldset').style.opacity = '1';
            document.querySelector('.qa-fieldset').style.pointerEvents = 'auto';
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        notifications.show('Failed to upload document. Please try again.', 'error');
        displayError('document-qa-result', error.message);
    } finally {
        loading.hide(loaderId);
    }
}

function displayUploadSuccess(result) {
    const container = document.getElementById('document-qa-result');
    container.innerHTML = `
        <div class="result-container show">
            <div class="result-header">
                <i class="fas fa-check-circle"></i>
                <span>Upload Successful</span>
            </div>
            <div class="upload-summary">
                <div class="info-card">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="fas fa-file-${tabManager.getFileIcon(result.fileName.split('.').pop())}"></i>
                        </div>
                        <div class="card-title">${Utils.sanitizeHTML(result.fileName)}</div>
                    </div>
                    <div class="card-content">
                        <p><strong>Collection:</strong> ${Utils.sanitizeHTML(result.collectionName)}</p>
                        <p><strong>Chunks Created:</strong> ${result.chunksCreated}</p>
                        <p><strong>Processing Time:</strong> ${result.processingTime || '< 1'}s</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Enhanced Q&A with improved result display
async function askQuestion() {
    // Validate input
    if (!validator.validateForm(['question-text'])) {
        return;
    }

    const question = document.getElementById('question-text').value.trim();
    const collectionName = document.getElementById('qa-collection').value.trim() || 'default';

    const loaderId = loading.show('Searching Documents', 'Finding relevant information to answer your question...');
    
    try {
        const data = await apiClient.askQuestion(question, collectionName, {
            topK: 4,
            includeMetadata: true
        });
        
        if (data.success) {
            const result = data.data;
            displayQAResult(result);
            notifications.show('Question answered successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to get answer');
        }
    } catch (error) {
        console.error('Q&A error:', error);
        notifications.show('Failed to get answer. Please try again.', 'error');
        displayError('document-qa-result', error.message);
    } finally {
        loading.hide(loaderId);
    }
}

function displayQAResult(result) {
    const container = document.getElementById('document-qa-result');
    const confidenceColor = result.confidence > 0.8 ? 'var(--success-color)' : 
                           result.confidence > 0.6 ? 'var(--warning-color)' : 'var(--error-color)';
    
    let sourcesHtml = '';
    if (result.sources && result.sources.length > 0) {
        sourcesHtml = `
            <div class="qa-sources">
                <h4><i class="fas fa-book-open"></i> Reference Sources</h4>
                ${result.sources.map((source, index) => `
                    <div class="source-item">
                        <div class="source-header">
                            <div class="source-icon">
                                <i class="fas fa-file-text"></i>
                            </div>
                            <div class="source-meta">
                                <div class="source-title">Source ${index + 1}: ${Utils.sanitizeHTML(source.metadata.fileName)}</div>
                                <div class="source-location">Chunk ${source.metadata.chunkIndex} • Relevance: ${(source.score * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="source-content">${Utils.sanitizeHTML(source.content)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="result-container show">
            <div class="result-header">
                <i class="fas fa-question-circle"></i>
                <span>Question Answered</span>
                <div class="result-actions">
                    <button class="btn-copy" onclick="copyResultToClipboard('${result.answer}')" data-tooltip="Copy answer">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-share" onclick="shareQAResult('${result.question}', '${result.answer}')" data-tooltip="Share result">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
            
            <div class="qa-summary">
                <div class="question-card">
                    <div class="question-header">
                        <i class="fas fa-question"></i>
                        <span>Question</span>
                    </div>
                    <div class="question-text">${Utils.sanitizeHTML(result.question)}</div>
                </div>
                
                <div class="answer-card">
                    <div class="answer-header">
                        <i class="fas fa-lightbulb"></i>
                        <span>Answer</span>
                        <div class="confidence-badge" style="background-color: ${confidenceColor}">
                            ${(result.confidence * 100).toFixed(1)}% confidence
                        </div>
                    </div>
                    <div class="answer-text">${Utils.sanitizeHTML(result.answer)}</div>
                </div>
            </div>
            
            ${sourcesHtml}
        </div>
    `;
}

// Document Q&A Functions
async function uploadDocument() {
    const fileInput = document.getElementById('document-file');
    const collectionName = document.getElementById('collection-name').value.trim() || 'default';

    if (!fileInput.files[0]) {
        showError('document-qa-result', 'Please select a file to upload.');
        return;
    }

    showLoading();

    try {
        const formData = new FormData();
        formData.append('document', fileInput.files[0]);
        formData.append('collectionName', collectionName);

        const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const result = data.data;
            showSuccess('document-qa-result', 
                `Document "${result.fileName}" uploaded successfully! Created ${result.chunksCreated} text chunks in collection "${result.collectionName}".`
            );
        } else {
            showError('document-qa-result', data.error);
        }
    } catch (error) {
        showError('document-qa-result', 'Failed to upload document. Please ensure the server is running.');
    } finally {
        hideLoading();
    }
}

async function askQuestion() {
    const question = document.getElementById('question-text').value.trim();
    const collectionName = document.getElementById('qa-collection').value.trim() || 'default';

    if (!question) {
        showError('document-qa-result', 'Please enter a question.');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/api/documents/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: question,
                collectionName: collectionName,
                options: {
                    topK: 4,
                    includeMetadata: true
                }
            })
        });

        const data = await response.json();

        if (data.success) {
            const result = data.data;
            let content = `
                <h3><i class="fas fa-comments"></i> Q&A Result</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>Question:</strong> ${result.question}<br><br>
                    <strong>Answer:</strong><br>
                    ${result.answer}
                </div>
            `;

            if (result.sources && result.sources.length > 0) {
                content += `
                    <div class="qa-sources">
                        <h4><i class="fas fa-book"></i> Sources (Confidence: ${result.confidence})</h4>
                `;
                
                result.sources.forEach((source, index) => {
                    content += `
                        <div class="source-item">
                            <div class="source-metadata">
                                Source ${index + 1}: ${source.metadata.fileName} (Chunk ${source.metadata.chunkIndex})
                            </div>
                            <div class="source-content">${source.content}</div>
                        </div>
                    `;
                });
                
                content += '</div>';
            }

            showResult('document-qa-result', content);
        } else {
            showError('document-qa-result', data.error);
        }
    } catch (error) {
        showError('document-qa-result', 'Failed to get answer. Please ensure the server is running.');
    } finally {
        hideLoading();
    }
}

// Enhanced Learning Path Functions with validation and progress
async function generateLearningPath() {
    // Validate input
    if (!validator.validateForm(['learning-goal'])) {
        return;
    }

    const goal = document.getElementById('learning-goal').value.trim();
    const currentSkills = document.getElementById('current-skills').value.trim();
    const experience = document.getElementById('experience-level').value;
    const timeCommitment = document.getElementById('time-commitment').value;
    const learningStyle = document.getElementById('learning-style').value;
    const interests = document.getElementById('interests').value.trim();

    const loaderId = loading.show('Generating Path', 'Creating your personalized learning journey...');
    
    try {
        const userProfile = {
            goal,
            currentSkills: currentSkills ? currentSkills.split(',').map(s => s.trim()) : [],
            experience,
            timeCommitment,
            learningStyle,
            interests: interests ? interests.split(',').map(s => s.trim()) : []
        };

        const data = await apiClient.generateLearningPath(userProfile);
        
        if (data.success) {
            const result = data.data;
            displayLearningPathResult(result);
            notifications.show('Learning path generated successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to generate learning path');
        }
    } catch (error) {
        console.error('Learning path error:', error);
        notifications.show('Failed to generate learning path. Please try again.', 'error');
        displayError('learning-path-result', error.message);
    } finally {
        loading.hide(loaderId);
    }
}

function displayLearningPathResult(result) {
    const container = document.getElementById('learning-path-result');
    
    let phasesHtml = '';
    if (result.learningPath.phases && result.learningPath.phases.length > 0) {
        phasesHtml = `
            <div class="learning-phases">
                ${result.learningPath.phases.map((phase, index) => `
                    <div class="learning-phase">
                        <div class="phase-header">
                            <div class="phase-number">${index + 1}</div>
                            <div class="phase-info">
                                <h4 class="phase-title">${Utils.sanitizeHTML(phase.title)}</h4>
                                <div class="phase-duration">${phase.estimatedWeeks || '2-3'} weeks</div>
                            </div>
                        </div>
                        <div class="phase-content">
                            <div class="phase-description">${Utils.sanitizeHTML(phase.description || '')}</div>
                            <ul class="phase-topics">
                                ${phase.topics.map(topic => `<li>${Utils.sanitizeHTML(topic)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    let recommendationsHtml = '';
    if (result.recommendations && result.recommendations.length > 0) {
        recommendationsHtml = `
            <div class="recommendations-section">
                <h4><i class="fas fa-lightbulb"></i> AI Recommendations</h4>
                <div class="recommendations-grid">
                    ${result.recommendations.map(rec => `
                        <div class="recommendation-card">
                            <i class="fas fa-star"></i>
                            <span>${Utils.sanitizeHTML(rec)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="result-container show">
            <div class="result-header">
                <i class="fas fa-route"></i>
                <span>Learning Path Generated</span>
                <div class="result-actions">
                    <button class="btn-copy" onclick="copyLearningPath('${JSON.stringify(result).replace(/'/g, "\\'")}')") data-tooltip="Copy learning path">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-export" onclick="exportLearningPath('${JSON.stringify(result).replace(/'/g, "\\'")}')") data-tooltip="Export as PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
            
            <div class="learning-summary">
                <div class="summary-card">
                    <h3 class="path-title">${Utils.sanitizeHTML(result.learningPath.title)}</h3>
                    <p class="path-description">${Utils.sanitizeHTML(result.learningPath.description)}</p>
                    
                    <div class="path-stats">
                        <div class="stat-badge">
                            <i class="fas fa-calendar"></i> ${result.estimatedCompletionTime.estimatedWeeks} weeks
                        </div>
                        <div class="stat-badge">
                            <i class="fas fa-clock"></i> ${result.estimatedCompletionTime.totalHours} hours total
                        </div>
                        <div class="stat-badge">
                            <i class="fas fa-graduation-cap"></i> ${result.learningPath.phases?.length || 0} phases
                        </div>
                    </div>
                </div>
            </div>
            
            ${phasesHtml}
            ${recommendationsHtml}
        </div>
    `;
}

// Enhanced Popular Paths with better UI
async function getPopularPaths() {
    const loaderId = loading.show('Loading Paths', 'Fetching popular learning paths...');
    
    try {
        const data = await apiClient.getPopularPaths();
        
        if (data.success) {
            const paths = data.data.popularPaths;
            displayPopularPaths(paths);
            notifications.show('Popular paths loaded successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to fetch popular paths');
        }
    } catch (error) {
        console.error('Popular paths error:', error);
        notifications.show('Failed to load popular paths. Please try again.', 'error');
        displayError('learning-path-result', error.message);
    } finally {
        loading.hide(loaderId);
    }
}

function displayPopularPaths(paths) {
    const container = document.getElementById('learning-path-result');
    
    container.innerHTML = `
        <div class="result-container show">
            <div class="result-header">
                <i class="fas fa-star"></i>
                <span>Popular Learning Paths</span>
                <div class="result-actions">
                    <button class="btn-refresh" onclick="getPopularPaths()" data-tooltip="Refresh paths">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="popular-paths-grid">
                ${paths.map(path => `
                    <div class="path-card enhanced">
                        <div class="path-header">
                            <h4 class="path-title">${Utils.sanitizeHTML(path.title)}</h4>
                            <div class="difficulty-badge ${path.difficulty}">
                                ${Utils.sanitizeHTML(path.difficulty)}
                            </div>
                        </div>
                        <p class="path-description">${Utils.sanitizeHTML(path.description)}</p>
                        <div class="path-stats">
                            <div class="stat-item">
                                <i class="fas fa-clock"></i>
                                <span>${Utils.sanitizeHTML(path.estimatedTime)}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-users"></i>
                                <span>${path.popularity}% popularity</span>
                            </div>
                        </div>
                        <button class="btn-select-path" onclick="selectPopularPath('${JSON.stringify(path).replace(/'/g, "\\'")}')") >
                            <i class="fas fa-plus"></i> Use This Path
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// API Health Check on Load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            console.log('✅ API is healthy and ready');
        }
    } catch (error) {
        console.warn('⚠️ Could not connect to API. Make sure the server is running on port 8000.');
        
        // Show a notification to the user
        const notification = document.createElement('div');
        notification.className = 'error-message';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '400px';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> 
            API server not reachable. Please start the server with <code>python main.py</code>.
        `;
        document.body.appendChild(notification);
        
        // Auto-remove notification after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }
});

// Sample Data Population
function populateSampleData() {
    // Sample text for summarization
    document.getElementById('summarize-text').value = `
Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century, fundamentally reshaping industries, society, and our daily lives. At its core, AI refers to the development of computer systems capable of performing tasks that typically require human intelligence, such as learning, reasoning, problem-solving, perception, and language understanding.

The field of AI encompasses various subdomains, including machine learning, natural language processing, computer vision, robotics, and expert systems. Machine learning, in particular, has gained significant traction due to its ability to enable computers to learn and improve from experience without being explicitly programmed for every task.

Recent advances in deep learning, a subset of machine learning inspired by the structure and function of the human brain, have led to breakthrough achievements in areas such as image recognition, speech processing, and game playing. Notable examples include AI systems that can diagnose medical conditions with accuracy comparable to specialists, autonomous vehicles that can navigate complex traffic scenarios, and language models that can generate human-like text and engage in sophisticated conversations.

The applications of AI span across numerous sectors. In healthcare, AI assists in drug discovery, medical imaging analysis, and personalized treatment recommendations. In finance, it powers algorithmic trading, fraud detection, and risk assessment. In education, AI enables personalized learning experiences and intelligent tutoring systems. Meanwhile, in entertainment and media, AI contributes to content recommendation systems, automated content creation, and immersive gaming experiences.

However, the rapid advancement of AI also raises important ethical and societal considerations. Issues such as algorithmic bias, privacy concerns, job displacement, and the need for transparency in AI decision-making processes have become central to discussions about responsible AI development. As AI systems become more powerful and ubiquitous, ensuring their alignment with human values and maintaining human oversight becomes increasingly crucial.

Looking toward the future, AI is expected to continue evolving, with potential developments including artificial general intelligence (AGI), quantum-enhanced AI systems, and more sophisticated human-AI collaboration frameworks. The ongoing research and development in AI promise to unlock new possibilities while simultaneously challenging us to navigate the complex landscape of technological progress responsibly.
    `.trim();

    // Sample learning goal
    document.getElementById('learning-goal').value = 'Learn full-stack web development';
    document.getElementById('current-skills').value = 'HTML, CSS, basic JavaScript';
    document.getElementById('interests').value = 'web design, user experience, modern frameworks';
}

// Auto-populate sample data for demo purposes
setTimeout(populateSampleData, 1000);
