import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  FileText,
  Truck,
  Receipt,
  Palette,
  Save,
  RotateCcw,
  Download,
  Upload,
  X,
  Check,
  Eye
} from 'lucide-react';
import settingsService from '../services/settingsService';
import { AppSettings, CompanySettings } from '../types/settings';

const SettingsModule: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'invoice' | 'delivery' | 'receipt' | 'styles'>('company');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await settingsService.initialize();
    setSettings(loadedSettings);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const resetSettings = await settingsService.resetToDefaults();
    setSettings(resetSettings);
    setShowResetConfirm(false);
  };

  const handleExport = () => {
    const json = settingsService.exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = settingsService.importSettings(content);
        setSettings(imported);
      } catch (error) {
        alert('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const updateCompany = (field: keyof CompanySettings, value: any) => {
    setSettings({
      ...settings,
      company: { ...settings.company, [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Settings & Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Customize your PDF documents and company information
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <label className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { id: 'company', label: 'Company Info', icon: Building },
            { id: 'invoice', label: 'Invoice', icon: FileText },
            { id: 'delivery', label: 'Delivery Order', icon: Truck },
            { id: 'receipt', label: 'Receipt', icon: Receipt },
            { id: 'styles', label: 'PDF Styles', icon: Palette }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Company Information Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Company Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={settings.company.name}
                    onChange={(e) => updateCompany('name', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={settings.company.phone}
                    onChange={(e) => updateCompany('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    value={settings.company.address}
                    onChange={(e) => updateCompany('address', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => updateCompany('email', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                  <input
                    type="text"
                    value={settings.company.website || ''}
                    onChange={(e) => updateCompany('website', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={settings.company.registrationNumber || ''}
                    onChange={(e) => updateCompany('registrationNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax ID</label>
                  <input
                    type="text"
                    value={settings.company.taxId || ''}
                    onChange={(e) => updateCompany('taxId', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Footer Text</label>
                  <input
                    type="text"
                    value={settings.company.footer}
                    onChange={(e) => updateCompany('footer', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Invoice Settings Tab */}
          {activeTab === 'invoice' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoice.prefix}
                    onChange={(e) => setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, prefix: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Starting Number</label>
                  <input
                    type="number"
                    value={settings.invoice.startingNumber}
                    onChange={(e) => setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, startingNumber: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                  <textarea
                    value={settings.invoice.paymentTerms}
                    onChange={(e) => setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, paymentTerms: e.target.value }
                    })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Default Notes</label>
                  <textarea
                    value={settings.invoice.notes}
                    onChange={(e) => setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, notes: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Order Settings Tab */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Delivery Order Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">DO Prefix</label>
                  <input
                    type="text"
                    value={settings.deliveryOrder.prefix}
                    onChange={(e) => setSettings({
                      ...settings,
                      deliveryOrder: { ...settings.deliveryOrder, prefix: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.deliveryOrder.requireSignature}
                      onChange={(e) => setSettings({
                        ...settings,
                        deliveryOrder: { ...settings.deliveryOrder, requireSignature: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Require Signature</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.deliveryOrder.showContactInfo}
                      onChange={(e) => setSettings({
                        ...settings,
                        deliveryOrder: { ...settings.deliveryOrder, showContactInfo: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Contact Information</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Instructions</label>
                  <textarea
                    value={settings.deliveryOrder.deliveryInstructions}
                    onChange={(e) => setSettings({
                      ...settings,
                      deliveryOrder: { ...settings.deliveryOrder, deliveryInstructions: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Receipt Settings Tab */}
          {activeTab === 'receipt' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Receipt Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Prefix</label>
                  <input
                    type="text"
                    value={settings.receipt.prefix}
                    onChange={(e) => setSettings({
                      ...settings,
                      receipt: { ...settings.receipt, prefix: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.receipt.showPaymentMethod}
                      onChange={(e) => setSettings({
                        ...settings,
                        receipt: { ...settings.receipt, showPaymentMethod: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Payment Method</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.receipt.showTransactionId}
                      onChange={(e) => setSettings({
                      ...settings,
                        receipt: { ...settings.receipt, showTransactionId: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Transaction ID</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thank You Message</label>
                  <textarea
                    value={settings.receipt.thankYouMessage}
                    onChange={(e) => setSettings({
                      ...settings,
                      receipt: { ...settings.receipt, thankYouMessage: e.target.value }
                    })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PDF Styles Tab */}
          {activeTab === 'styles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">PDF Styling</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.pdfStyles.primaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, primaryColor: e.target.value }
                      })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.pdfStyles.primaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, primaryColor: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.pdfStyles.secondaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, secondaryColor: e.target.value }
                      })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.pdfStyles.secondaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, secondaryColor: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.pdfStyles.accentColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, accentColor: e.target.value }
                      })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.pdfStyles.accentColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, accentColor: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Font Size</label>
                  <input
                    type="number"
                    value={settings.pdfStyles.fontSize}
                    onChange={(e) => setSettings({
                      ...settings,
                      pdfStyles: { ...settings.pdfStyles, fontSize: parseInt(e.target.value) }
                    })}
                    min={8}
                    max={16}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Font Family</label>
                  <select
                    value={settings.pdfStyles.fontFamily}
                    onChange={(e) => setSettings({
                      ...settings,
                      pdfStyles: { ...settings.pdfStyles, fontFamily: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Arial">Arial</option>
                    <option value="Times">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pdfStyles.showLogo}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, showLogo: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Logo</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pdfStyles.showSignature}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, showSignature: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Signature</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pdfStyles.showWatermark}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, showWatermark: e.target.checked }
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-700">Show Watermark</span>
                  </label>
                </div>

                {settings.pdfStyles.showWatermark && (
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Watermark Text</label>
                    <input
                      type="text"
                      value={settings.pdfStyles.watermarkText || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        pdfStyles: { ...settings.pdfStyles, watermarkText: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reset Settings?</h3>
            <p className="text-slate-600 mb-6">
              This will reset all settings to default values. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModule;
