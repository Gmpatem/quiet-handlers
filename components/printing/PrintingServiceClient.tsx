'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Printer, Copy, Scan, Camera, User } from 'lucide-react';

export default function PrintingServiceClient() {
  const [mounted, setMounted] = useState(false);
  const [serviceType, setServiceType] = useState<'print' | 'photocopy' | 'scan'>('print');
  const [name, setName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [colorType, setColorType] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState(1);
  const [sided, setSided] = useState<'single' | 'double'>('single');
  const [binding, setBinding] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cash'>('cash');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem('fds_user_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const calculateTotal = () => {
    let basePrice = 0;

    if (serviceType === 'print') {
      basePrice = colorType === 'bw' ? 3 : 5;
      return basePrice * pages * copies;
    } else if (serviceType === 'photocopy') {
      return 2 * pages * copies;
    } else if (serviceType === 'scan') {
      return 3 * pages;
    }

    return 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'payment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'pdf') {
      if (file.size > 100 * 1024 * 1024) {
        alert('File size must be less than 100MB');
        return;
      }
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      setPdfFile(file);
    } else {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      setPaymentProof(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    if (serviceType === 'print' && !pdfFile) {
      alert('Please upload a PDF file');
      return;
    }

    if (paymentMethod === 'gcash' && !paymentProof) {
      alert('Please upload payment proof');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save name to localStorage for future use
      localStorage.setItem('fds_user_name', name);

      // TODO: Implement actual submission logic
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('Request submitted successfully! You will be notified when ready for pickup at Room 411.');

      // Reset form
      setPdfFile(null);
      setPages(1);
      setCopies(1);
      setSpecialInstructions('');
      setPaymentProof(null);
      setPaymentMethod('cash');

    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Printing Service</h1>
              <p className="text-white/90 text-xs sm:text-sm lg:text-base">Fast, affordable campus printing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Main Form (2/3 on desktop) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Service Type Selector */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg">
              <label className="block text-stone-900 font-bold text-base sm:text-xl mb-3 sm:mb-4">Service Type</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { value: 'print', label: 'Print', icon: Printer },
                  { value: 'photocopy', label: 'Photocopy', icon: Copy },
                  { value: 'scan', label: 'Scan', icon: Scan }
                ].map((service) => {
                  const Icon = service.icon;
                  return (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() => setServiceType(service.value as any)}
                      className={`min-h-[70px] sm:min-h-[80px] lg:min-h-[90px] rounded-xl border-3 transition-all active:scale-95 ${
                        serviceType === service.value
                          ? 'bg-amber-50 border-amber-700 shadow-lg'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mx-auto mb-1 ${serviceType === service.value ? 'text-amber-700' : 'text-stone-400'}`} />
                      <span className={`font-medium text-xs sm:text-sm lg:text-base ${serviceType === service.value ? 'text-amber-900' : 'text-stone-600'}`}>{service.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name Input */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg">
              <label className="flex items-center gap-2 text-stone-900 font-bold text-sm sm:text-base mb-3">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100 text-base sm:text-lg"
                style={{ fontSize: '16px' }}
                required
              />
            </div>

            {/* PDF Upload - Only for Print */}
            {serviceType === 'print' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg">
                <label className="flex items-center gap-2 text-stone-900 font-bold text-sm sm:text-base mb-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                  Upload PDF
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileUpload(e, 'pdf')}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="flex items-center justify-center gap-3 w-full min-h-[100px] sm:min-h-[120px] rounded-xl border-3 border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 cursor-pointer transition-all active:scale-95"
                  >
                    {pdfFile ? (
                      <div className="text-center p-4">
                        <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-amber-700 mx-auto mb-2" />
                        <p className="text-stone-900 font-medium text-sm sm:text-base break-all px-2">{pdfFile.name}</p>
                        <p className="text-stone-600 text-xs sm:text-sm mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-stone-400 mx-auto mb-2" />
                        <p className="text-stone-900 font-medium text-sm sm:text-base">Tap to upload PDF</p>
                        <p className="text-stone-600 text-xs sm:text-sm">Max 100MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Specifications */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg space-y-4 sm:space-y-5">
              <h3 className="text-stone-900 font-bold text-base sm:text-xl">Specifications</h3>

              {/* Color Type - Only for Print and Photocopy */}
              {serviceType !== 'scan' && (
                <div>
                  <label className="block text-stone-700 font-semibold text-sm sm:text-base mb-2 sm:mb-3">Color</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setColorType('bw')}
                      className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm lg:text-base active:scale-95 ${
                        colorType === 'bw'
                          ? 'bg-amber-50 border-amber-700 text-amber-900'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      Black & White <span className="hidden sm:inline">(₱{serviceType === 'print' ? '3' : '2'}/page)</span>
                      <span className="sm:hidden block text-[10px]">₱{serviceType === 'print' ? '3' : '2'}/pg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorType('color')}
                      className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm lg:text-base active:scale-95 ${
                        colorType === 'color'
                          ? 'bg-amber-50 border-amber-700 text-amber-900'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      Color <span className="hidden sm:inline">(₱{serviceType === 'print' ? '5' : '-'}/page)</span>
                      <span className="sm:hidden block text-[10px]">₱{serviceType === 'print' ? '5' : '-'}/pg</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Paper Size - Only for Print */}
              {serviceType === 'print' && (
                <div>
                  <label className="block text-stone-700 font-semibold text-sm sm:text-base mb-2 sm:mb-3">Paper Size</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {['a4', 'letter', 'legal'].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPaperSize(size as any)}
                        className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm lg:text-base active:scale-95 ${
                          paperSize === size
                            ? 'bg-amber-50 border-amber-700 text-amber-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Number of Pages and Copies - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number of Pages */}
                <div>
                  <label className="block text-stone-700 font-semibold text-sm sm:text-base mb-2">
                    {serviceType === 'print' ? 'Pages in Document' : 'Number of Pages'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pages}
                    onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100 text-base sm:text-lg"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Number of Copies - Only for Print and Photocopy */}
                {serviceType !== 'scan' && (
                  <div>
                    <label className="block text-stone-700 font-semibold text-sm sm:text-base mb-2">Number of Copies</label>
                    <input
                      type="number"
                      min="1"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100 text-base sm:text-lg"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                )}
              </div>

              {/* Single/Double Sided - Only for Print and Photocopy */}
              {serviceType !== 'scan' && (
                <div>
                  <label className="block text-stone-700 font-semibold text-sm sm:text-base mb-2 sm:mb-3">Printing</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setSided('single')}
                      className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm lg:text-base active:scale-95 ${
                        sided === 'single'
                          ? 'bg-amber-50 border-amber-700 text-amber-900'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      Single-Sided
                    </button>
                    <button
                      type="button"
                      onClick={() => setSided('double')}
                      className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm lg:text-base active:scale-95 ${
                        sided === 'double'
                          ? 'bg-amber-50 border-amber-700 text-amber-900'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      Double-Sided
                    </button>
                  </div>
                </div>
              )}

              {/* Binding - Only for Print */}
              {serviceType === 'print' && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={binding}
                      onChange={(e) => setBinding(e.target.checked)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded border-stone-300 text-amber-700 focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-stone-900 font-medium text-sm sm:text-base">Binding Required</span>
                  </label>
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg">
              <label className="block text-stone-900 font-bold text-sm sm:text-base mb-3">Special Instructions (Optional)</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100 resize-none text-sm sm:text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Right Column - Payment & Summary (1/3 on desktop) */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Total Price - Sticky on Desktop */}
            <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-4 sm:p-6 border-2 border-amber-800 shadow-xl lg:sticky lg:top-6">
              <div className="text-center lg:text-left">
                <p className="text-white/80 text-xs sm:text-sm mb-1">Total Amount</p>
                <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">₱{total}</p>
                <div className="text-white/90 text-xs sm:text-sm space-y-1 bg-white/10 rounded-lg p-3">
                  <p className="flex justify-between">
                    <span>Pages:</span>
                    <span className="font-bold">{pages}</span>
                  </p>
                  {serviceType !== 'scan' && (
                    <p className="flex justify-between">
                      <span>Copies:</span>
                      <span className="font-bold">{copies}</span>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-bold">
                      {serviceType === 'print' ? (colorType === 'bw' ? 'B&W' : 'Color') :
                       serviceType === 'photocopy' ? 'Photocopy' : 'Scan'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-stone-200 shadow-lg">
              <label className="block text-stone-900 font-bold text-base sm:text-xl mb-3 sm:mb-4">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm active:scale-95 ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="hidden sm:inline">Cash on Pickup</span>
                  <span className="sm:hidden">Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('gcash')}
                  className={`py-3 sm:py-4 rounded-xl border-3 transition-all font-medium text-xs sm:text-sm active:scale-95 ${
                    paymentMethod === 'gcash'
                      ? 'bg-blue-50 border-blue-600 text-blue-900'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  GCash
                </button>
              </div>

              {paymentMethod === 'gcash' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4">
                    <p className="text-amber-900 font-bold text-sm sm:text-base mb-1">Send ₱{total} to:</p>
                    <p className="text-amber-900 text-base sm:text-lg font-bold">0912 345 6789</p>
                    <p className="text-amber-700 text-xs sm:text-sm">Name: FDS Printing</p>
                  </div>

                  {/* Payment Proof Upload */}
                  <div>
                    <label className="block text-stone-900 font-semibold text-xs sm:text-sm mb-2">Upload Payment Screenshot</label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'payment')}
                        className="hidden"
                        id="payment-upload"
                      />
                      <label
                        htmlFor="payment-upload"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 border-2 border-stone-200 hover:bg-stone-200 cursor-pointer transition-all active:scale-95"
                      >
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
                        <span className="text-stone-900 font-medium text-xs sm:text-sm">
                          {paymentProof ? 'Change' : 'Upload'}
                        </span>
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                        id="camera-capture"
                      />
                      <label
                        htmlFor="camera-capture"
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-800 hover:shadow-lg cursor-pointer transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        <span className="text-white font-medium text-xs sm:text-sm">Camera</span>
                      </label>
                    </div>
                    {paymentProof && (
                      <p className="text-emerald-600 text-xs sm:text-sm mt-2 font-medium">✓ {paymentProof.name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pickup Info */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-stone-200 shadow-lg">
              <p className="text-stone-600 text-center text-xs sm:text-sm">
                📍 Pickup at <span className="font-bold text-amber-900">Room 411</span>
              </p>
              <p className="text-stone-500 text-center text-[10px] sm:text-xs mt-1">
                You'll be notified when ready
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Submit Button - Fixed Bottom on Mobile, Regular on Desktop */}
      <div className="fixed lg:static bottom-0 left-0 right-0 z-20 bg-white/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-t-2 lg:border-0 border-stone-200 p-4 sm:p-6 lg:p-0 lg:mt-6">
        <div className="max-w-5xl mx-auto">
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-4 sm:py-5 rounded-xl lg:rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>

      {/* Footer Tagline */}
      <p className="text-center text-stone-500 text-xs sm:text-sm mt-8 lg:mt-12 italic">
        Campus convenience, handled quietly.
      </p>
    </div>
  );
}
