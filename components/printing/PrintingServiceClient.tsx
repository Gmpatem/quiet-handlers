'use client';

import { useState, useEffect } from 'react';

export default function PrintingServiceClient() {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<'print' | 'photocopy' | 'scan'>('print');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [colorType, setColorType] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [sided, setSided] = useState<'single' | 'double'>('single');
  const [binding, setBinding] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cash'>('cash');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem('fds_user_name');
    if (savedName) setName(savedName);
  }, []);

  const PRICING = {
    print: { bw: 3, color: 15 },
    photocopy: { bw: 2, color: 10 },
    scan: { bw: 5, color: 10 },
  };

  const calculateTotal = () => {
    let basePrice = PRICING[serviceType][colorType];
    let total = basePrice * pages * copies;
    
    if (sided === 'double') total *= 0.75;
    if (binding) total += 20;
    
    return total;
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        console.log('PDF uploaded:', file.name);
      } else {
        alert('Please upload a PDF file');
        e.target.value = '';
      }
    }
  };

  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPaymentProof(file);
        console.log('Payment proof uploaded:', file.name);
      } else {
        alert('Please upload an image file');
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    if (serviceType === 'print' && !pdfFile) {
      alert('Please upload a PDF file for printing');
      return;
    }

    if (paymentMethod === 'gcash' && !paymentProof) {
      alert('Please upload payment proof for GCash payment');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save name to localStorage
      localStorage.setItem('fds_user_name', name);

      // Create FormData
      const formData = new FormData();
      formData.append('studentName', name);
      formData.append('serviceType', serviceType);
      formData.append('colorType', colorType);
      formData.append('paperSize', paperSize);
      formData.append('pages', pages.toString());
      formData.append('copies', copies.toString());
      formData.append('sided', sided);
      formData.append('binding', binding.toString());
      formData.append('specialInstructions', specialInstructions);
      formData.append('paymentMethod', paymentMethod);
      formData.append('totalAmount', calculateTotal().toString());
      
      if (pdfFile) {
        formData.append('pdfFile', pdfFile);
      }
      
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }

      // Fixed import path - use @/ alias or correct relative path
      const { submitCompletePrintingRequest } = await import('@/app/services/printing/actions');
      const result = await submitCompletePrintingRequest(formData);

      if (result.success) {
        alert('✅ Request submitted successfully!\n\nYou will be notified when ready for pickup at Room 411.');
        
        // Reset form
        setPdfFile(null);
        setPages(1);
        setCopies(1);
        setSpecialInstructions('');
        setPaymentProof(null);
        setPaymentMethod('cash');
        setBinding(false);
        
        // Reset file inputs
        const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
        fileInputs.forEach(input => input.value = '');
      } else {
        alert(`❌ Failed to submit: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('❌ Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-32 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto pt-4 sm:pt-6 lg:pt-8 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-2xl sm:text-3xl">🖨️</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">FDS Printing Services</h1>
              <p className="text-amber-100 text-xs sm:text-sm mt-0.5">Print • Photocopy • Scan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Selector */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(['print', 'photocopy', 'scan'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setServiceType(type)}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                serviceType === type
                  ? 'border-amber-700 bg-amber-50 shadow-md'
                  : 'border-stone-200 bg-white hover:border-amber-300'
              }`}
            >
              <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">
                {type === 'print' && '🖨️'}
                {type === 'photocopy' && '📄'}
                {type === 'scan' && '📷'}
              </div>
              <div className={`font-semibold text-xs sm:text-sm capitalize ${
                serviceType === type ? 'text-amber-900' : 'text-stone-700'
              }`}>
                {type}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Student Name */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                required
              />
            </div>

            {/* PDF Upload (only for print) */}
            {serviceType === 'print' && (
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Upload PDF <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-900 file:font-semibold hover:file:bg-amber-200 file:cursor-pointer cursor-pointer"
                  />
                </div>
                {pdfFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <span>✓</span>
                    <span className="font-medium">{pdfFile.name}</span>
                    <span className="text-stone-500">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Color Type */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Color Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['bw', 'color'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setColorType(type)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      colorType === type
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="font-semibold capitalize">
                      {type === 'bw' ? 'Black & White' : 'Color'}
                    </span>
                    <span className="ml-2 text-sm text-stone-600">
                      (₱{PRICING[serviceType][type]}/page)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Paper Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['a4', 'letter', 'legal'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paperSize === size
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="font-semibold uppercase text-sm">
                      {size}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pages & Copies */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Number of Pages
                </label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Number of Copies
                </label>
                <input
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            {/* Sided */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Sided
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['single', 'double'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSided(type)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      sided === type
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="font-semibold capitalize">
                      {type === 'single' ? 'Single Sided' : 'Double Sided'}
                    </span>
                    {type === 'double' && (
                      <span className="ml-2 text-sm text-green-600">(25% off)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Binding */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-stone-200 hover:bg-stone-50 transition-all">
                <input
                  type="checkbox"
                  checked={binding}
                  onChange={(e) => setBinding(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-900">
                  Add Binding (+₱20)
                </span>
              </label>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['gcash', 'cash'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === method
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="font-semibold capitalize">
                      {method === 'gcash' ? 'GCash' : 'Cash on Pickup'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Proof (GCash only) */}
            {paymentMethod === 'gcash' && (
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Upload Payment Proof <span className="text-red-500">*</span>
                </label>
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-900 font-medium">
                    💳 Send payment to: <strong className="text-amber-700">09XX XXX XXXX</strong>
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentProofUpload}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-900 file:font-semibold hover:file:bg-amber-200 file:cursor-pointer cursor-pointer"
                />
                {paymentProof && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <span>✓</span>
                    <span className="font-medium">{paymentProof.name}</span>
                    <span className="text-stone-500">({(paymentProof.size / 1024).toFixed(0)} KB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Total & Submit */}
            <div className="border-t-2 border-stone-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-stone-900">Total:</span>
                <span className="text-3xl font-bold text-amber-900">₱{total.toFixed(2)}</span>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
              </button>
              
              <p className="text-center text-sm text-stone-600 mt-4">
                📍 Pickup at Room 411 • Campus convenience, handled quietly
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
