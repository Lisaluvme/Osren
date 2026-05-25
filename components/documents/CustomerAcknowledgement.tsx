import React, { useState } from 'react';
import { CheckCircle, XCircle, Save, RotateCcw } from 'lucide-react';
import SignaturePad from '../common/SignaturePad';
import { useWorkflow } from '../../hooks/useWorkflow';

interface CustomerAcknowledgementProps {
  documentId: string;
  documentType: string;
  currentStatus: string;
  onAcknowledgement?: (data: {
    acknowledged: boolean;
    signature?: string;
    comments?: string;
  }) => void;
}

const CustomerAcknowledgement: React.FC<CustomerAcknowledgementProps> = ({
  documentId,
  documentType,
  currentStatus,
  onAcknowledgement
}) => {
  const [signature, setSignature] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const {
    submitAcknowledgement,
    isTransitioning,
    transitionError
  } = useWorkflow({
    documentId,
    documentType,
    initialStatus: currentStatus
  });

  const handleSaveSignature = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleAccept = async () => {
    if (!customerName) {
      alert('Please enter your name');
      return;
    }

    if (!signature) {
      alert('Please provide your signature');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAcknowledgement(true, signature, customerName, customerEmail, comments);
      onAcknowledgement?.({
        acknowledged: true,
        signature,
        comments
      });
    } catch (error) {
      console.error('Acknowledgement failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!customerName) {
      alert('Please enter your name');
      return;
    }

    if (!comments) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAcknowledgement(true, signature, customerName, customerEmail, comments);
      onAcknowledgement?.({
        acknowledged: false,
        comments
      });
    } catch (error) {
      console.error('Acknowledgement failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Customer Acknowledgement</h3>

      <div className="mb-6 space-y-3">
        <p className="text-sm text-slate-600">
          Please review the document details below and provide your acknowledgement.
        </p>

        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-500">
            By signing, you acknowledge that you have reviewed and agree to the terms specified in this document.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Signature *
          </label>
          <SignaturePad
            onSave={handleSaveSignature}
            width={500}
            height={150}
            label="Sign within the box below"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Comments {signature ? '' : '* if rejecting'}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any comments or concerns about the document..."
          />
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={handleAccept}
          disabled={isSubmitting || isTransitioning || !signature || !customerName}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          type="button"
        >
          <CheckCircle className="w-5 h-5" />
          Accept & Sign
        </button>

        <button
          onClick={handleReject}
          disabled={isSubmitting || isTransitioning || !customerName}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          type="button"
        >
          <XCircle className="w-5 h-5" />
          Reject
        </button>
      </div>

      {transitionError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {transitionError}
        </div>
      )}
    </div>
  );
};

export default CustomerAcknowledgement;
