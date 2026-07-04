import { AppSettings, defaultSettings } from '../types/settings';

const SETTINGS_STORAGE_KEY = 'app_settings';
const SETTINGS_API_ENDPOINT = '/api/settings';

class SettingsService {
  private settings: AppSettings | null = null;
  private listeners: Array<(settings: AppSettings) => void> = [];

  /**
   * Initialize settings by loading from localStorage or backend
   */
  async initialize(): Promise<AppSettings> {
    try {
      // Try to load from backend first
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}${SETTINGS_API_ENDPOINT}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.settings = data.data;
          this.saveToLocalStorage(this.settings);
          console.log('✅ Settings loaded from backend');
          return this.settings;
        }
      }
    } catch (error) {
      console.log('ℹ️ Could not load settings from backend, using localStorage');
    }

    // Fallback to localStorage
    const localSettings = this.loadFromLocalStorage();
    if (localSettings) {
      this.settings = localSettings;
      console.log('✅ Settings loaded from localStorage');
      return this.settings;
    }

    // Use defaults
    this.settings = defaultSettings;
    this.saveToLocalStorage(this.settings);
    console.log('✅ Using default settings');
    return this.settings;
  }

  /**
   * Get current settings
   */
  getSettings(): AppSettings {
    if (!this.settings) {
      this.settings = this.loadFromLocalStorage() || defaultSettings;
    }
    return this.settings;
  }

  /**
   * Get company settings
   */
  getCompanySettings() {
    const settings = this.getSettings();
    return settings.company;
  }

  /**
   * Get invoice settings
   */
  getInvoiceSettings() {
    const settings = this.getSettings();
    return settings.invoice;
  }

  /**
   * Get delivery order settings
   */
  getDeliveryOrderSettings() {
    const settings = this.getSettings();
    return settings.deliveryOrder;
  }

  /**
   * Get receipt settings
   */
  getReceiptSettings() {
    const settings = this.getSettings();
    return settings.receipt;
  }

  /**
   * Get PDF style settings
   */
  getPDFStyleSettings() {
    const settings = this.getSettings();
    return settings.pdfStyles;
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    const currentSettings = this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      lastUpdated: new Date().toISOString()
    };

    this.settings = updatedSettings;
    this.saveToLocalStorage(updatedSettings);

    // Try to save to backend
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}${SETTINGS_API_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });

      if (response.ok) {
        console.log('✅ Settings saved to backend');
      }
    } catch (error) {
      console.log('ℹ️ Could not save settings to backend');
    }

    // Notify listeners
    this.notifyListeners(updatedSettings);

    return updatedSettings;
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<AppSettings> {
    this.settings = defaultSettings;
    this.saveToLocalStorage(defaultSettings);
    this.notifyListeners(defaultSettings);
    return defaultSettings;
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(settings: AppSettings) {
    this.listeners.forEach(listener => listener(settings));
  }

  private saveToLocalStorage(settings: AppSettings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): AppSettings | null {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return null;
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    const settings = this.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonString: string): AppSettings {
    try {
      const imported = JSON.parse(jsonString);
      // Validate basic structure
      if (!imported.company || !imported.pdfStyles) {
        throw new Error('Invalid settings format');
      }
      this.settings = imported;
      this.saveToLocalStorage(imported);
      this.notifyListeners(imported);
      return imported;
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings file');
    }
  }
}

// Export singleton instance
export default new SettingsService();
