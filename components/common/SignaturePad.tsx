import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  label?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  width = 500,
  height = 150,
  label = 'Sign here'
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    if (sigCanvas.current) {
      sigCanvas.current.addEventListener('end', () => {
        setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
      });
    }
  }, []);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setSavedSignature(null);
  };

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const dataURL = sigCanvas.current.toDataURL();
      setSavedSignature(dataURL);
      onSave(dataURL);
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width,
            height,
            className: 'w-full'
          }}
          penColor="black"
          backgroundColor="transparent"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>

          {!savedSignature && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isEmpty}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Signature
            </button>
          )}
        </div>

        {savedSignature && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Signature captured
          </div>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>

      {savedSignature && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-2">Preview:</p>
          <img
            src={savedSignature}
            alt="Saved signature"
            className="border border-slate-200 rounded-lg max-w-xs"
          />
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
