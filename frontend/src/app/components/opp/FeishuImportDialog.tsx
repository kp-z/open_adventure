import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { GlassCard } from '../ui-shared';

interface FeishuImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeishuImportDialog({ isOpen, onClose }: FeishuImportDialogProps) {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    if (!url.trim()) {
      alert('Please enter a Feishu document URL');
      return;
    }

    setIsImporting(true);
    // Simulate import process
    setTimeout(() => {
      setIsImporting(false);
      alert('Import feature is not implemented in this demo version');
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg"
            >
              <GlassCard className="relative">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>

                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Upload size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Import from Feishu</h2>
                      <p className="text-sm text-white/60">Import OKRs from Feishu documents</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Info Banner */}
                  <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium mb-1">Demo Version</p>
                      <p className="text-blue-400/80">
                        This is a simplified demo. The actual import functionality is not implemented.
                      </p>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Feishu Document URL</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://feishu.cn/docs/..."
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <p className="text-xs text-white/60 mt-2">
                      Enter the URL of your Feishu document containing OKR data
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">How to import:</h3>
                    <ol className="text-sm text-white/60 space-y-1 list-decimal list-inside">
                      <li>Open your Feishu document with OKR data</li>
                      <li>Copy the document URL from your browser</li>
                      <li>Paste the URL in the field above</li>
                      <li>Click "Import" to start the process</li>
                    </ol>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !url.trim()}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isImporting ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
