'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Copy, Upload, CheckCircle, ArrowLeft, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  GCASH_CONFIG,
  TransactionType,
  calculateTotalAmount,
  validateAmount,
  formatCurrency,
  formatGCashNumber,
  copyToClipboard,
  getTransactionInstructions,
  getSuccessMessage,
  type GCashCalculation,
} from '@/lib/gcash/calculations';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GCashServiceClient() {
  const router = useRouter();

  // State
  const [transactionType, setTransactionType] = useState<TransactionType>('cash_in');
  const [amount, setAmount] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentContact, setStudentContact] = useState<string>('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [calculation, setCalculation] = useState<GCashCalculation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Calculate fee whenever amount changes
  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      setCalculation(calculateTotalAmount(numAmount));
      setError('');
    } else {
      setCalculation(null);
    }
  }, [amount]);

  // Handle copy GCash number
  const handleCopyNumber = async () => {
    const success = await copyToClipboard(GCASH_CONFIG.GCASH_NUMBER);
    if (success) {
      setCopySuccess(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setPaymentProof(file);
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    const validation = validateAmount(numAmount);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid amount');
      return;
    }

    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!studentContact.trim()) {
      setError('Please enter your GCash number');
      return;
    }

    if (transactionType === 'cash_out' && !paymentProof) {
      setError('Please upload payment proof for cash-out');
      return;
    }

    setIsSubmitting(true);

    try {
      let proofUrl: string | null = null;

      if (transactionType === 'cash_out' && paymentProof) {
        const fileName = `${Date.now()}_${paymentProof.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gcash-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gcash-proofs')
          .getPublicUrl(fileName);

        proofUrl = urlData.publicUrl;
      }

      const calc = calculateTotalAmount(numAmount);
      const { error: insertError } = await supabase
        .from('gcash_transactions')
        .insert({
          transaction_type: transactionType,
          requested_amount: calc.requestedAmount,
          service_fee: calc.serviceFee,
          total_amount: calc.totalAmount,
          student_name: studentName.trim(),
          student_contact: studentContact.trim(),
          payment_proof_url: proofUrl,
        });

      if (insertError) throw insertError;

      setSuccessMessage(getSuccessMessage());
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        setStudentName('');
        setStudentContact('');
        setPaymentProof(null);
        setCalculation(null);
      }, 5000);
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 border border-stone-200">
          <div className="flex justify-center">
            <CheckCircle className="w-24 h-24 text-green-600 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">
            Success! 🎉
          </h1>
          <p className="text-xl text-stone-700 font-medium">
            {successMessage}
          </p>
          <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-6 border-2 border-amber-200">
            <p className="text-6xl font-black text-amber-700 mb-2">
              {GCASH_CONFIG.ROOM_NUMBER}
            </p>
            <p className="text-sm text-stone-600 uppercase tracking-wide font-semibold">
              Room Number
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-white py-4 rounded-2xl font-semibold text-lg hover:from-amber-800 hover:to-amber-950 shadow-lg transition-all active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Main form
  const instructions = calculation
    ? getTransactionInstructions(transactionType, calculation)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-8">
      {/* Header - FDS Style */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-4 py-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">GCash Service</h1>
            <p className="text-sm text-amber-100">Cash in • Cash out • 2% fee</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Transaction Type Toggle - FDS Style */}
        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-2 flex gap-2">
          <button
            onClick={() => setTransactionType('cash_in')}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${
              transactionType === 'cash_in'
                ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            Cash In
          </button>
          <button
            onClick={() => setTransactionType('cash_out')}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${
              transactionType === 'cash_out'
                ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            Cash Out
          </button>
        </div>

        {/* GCash Number Card - FDS Style */}
        {transactionType === 'cash_out' && (
          <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-3xl shadow-xl p-6 text-white border border-amber-800">
            <p className="text-sm font-medium mb-2 text-amber-100">Send money to:</p>
            <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3 border border-white/30">
              <div>
                <p className="text-2xl font-bold tracking-wide">
                  {formatGCashNumber(GCASH_CONFIG.GCASH_NUMBER)}
                </p>
                <p className="text-sm text-amber-100 mt-1">
                  Name: {GCASH_CONFIG.GCASH_NAME}
                </p>
              </div>
              <button
                onClick={handleCopyNumber}
                className="p-3 bg-white/30 hover:bg-white/40 rounded-xl transition-all active:scale-95 border border-white/40"
              >
                {copySuccess ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
            </div>
            {copySuccess && (
              <p className="text-sm text-center text-green-200 font-medium">
                ✓ Number copied!
              </p>
            )}
          </div>
        )}

        {/* Amount Input - FDS Style */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-stone-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Amount you'll receive:
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-stone-400">
                ₱
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min={GCASH_CONFIG.MINIMUM_AMOUNT}
                step="0.01"
                className="w-full pl-14 pr-6 py-5 text-3xl font-bold border-2 border-stone-200 rounded-2xl focus:border-amber-700 focus:ring-4 focus:ring-amber-100 transition-all outline-none"
                required
              />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Minimum: {formatCurrency(GCASH_CONFIG.MINIMUM_AMOUNT)}
            </p>
          </div>

          {/* Fee Breakdown - FDS Style */}
          {calculation && (
            <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-5 space-y-3 border-2 border-amber-200">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Service fee (2%):</span>
                <span className="font-bold text-stone-800">
                  {formatCurrency(calculation.serviceFee)}
                </span>
              </div>
              <div className="h-px bg-amber-300" />
              <div className="flex justify-between">
                <span className="font-bold text-stone-700">
                  You {transactionType === 'cash_in' ? 'pay' : 'send'}:
                </span>
                <span className="text-2xl font-black text-amber-700">
                  {formatCurrency(calculation.totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Student Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Your Name:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-4 text-lg border-2 border-stone-200 rounded-2xl focus:border-amber-700 focus:ring-4 focus:ring-amber-100 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Your GCash Number:
              </label>
              <input
                type="tel"
                value={studentContact}
                onChange={(e) => setStudentContact(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="w-full px-4 py-4 text-lg border-2 border-stone-200 rounded-2xl focus:border-amber-700 focus:ring-4 focus:ring-amber-100 transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Payment Proof Upload */}
          {transactionType === 'cash_out' && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Upload Payment Proof:
              </label>
              <label className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-amber-300 rounded-2xl cursor-pointer hover:border-amber-700 hover:bg-amber-50 transition-all group">
                <Upload className="w-6 h-6 text-amber-700 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-medium text-stone-700">
                  {paymentProof ? paymentProof.name : 'Tap to upload screenshot'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required={transactionType === 'cash_out'}
                />
              </label>
              {paymentProof && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  ✓ {paymentProof.name} selected
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Instructions */}
          {instructions && (
            <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200">
              <h3 className="font-bold text-stone-800 mb-3">{instructions.title}</h3>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-stone-700">
                    <span className="flex-shrink-0 w-6 h-6 bg-amber-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Submit Button - FDS Style */}
          <button
            type="submit"
            disabled={isSubmitting || !calculation}
            className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-white py-5 rounded-2xl font-bold text-xl shadow-lg hover:from-amber-800 hover:to-amber-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request →'}
          </button>
        </form>
      </div>
    </div>
  );
}
