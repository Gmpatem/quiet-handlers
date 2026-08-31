'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Eye, X, Search, TrendingUp, DollarSign, Clock, Settings, Plus, Trash2, Save, Upload, Download, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { parseFeeRules, calculateGCashFee, formatPeso, type GCashFeeRule } from '@/lib/gcash/fees';

type GCashRequest = {
  id: string;
  created_at: string;
  student_name: string;
  student_contact: string;
  transaction_type: 'cash_in' | 'cash_out';
  amount: number;
  service_fee: number;
  total_amount: number;
  payment_proof_url: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  admin_notes?: string;
  reference_notes?: string;
};

type Stats = {
  pending: number;
  processing: number;
  completed: number;
  total_today: number;
  total_revenue: number;
  total_fees: number;
};

export default function GCashAdminClient() {
  const [requests, setRequests] = useState<GCashRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<GCashRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    completed: 0,
    total_today: 0,
    total_revenue: 0,
    total_fees: 0
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<GCashRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'settings'>('transactions');
  const [showSettings, setShowSettings] = useState(false);
  const [feeRules, setFeeRules] = useState<GCashFeeRule[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Fetch requests
  const fetchRequests = async () => {
    const supabase = supabaseBrowser();
    try {
      const { data, error } = await supabase
        .from('gcash_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const calculateStats = (data: GCashRequest[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      pending: data.filter(r => r.status === 'pending').length,
      processing: data.filter(r => r.status === 'processing').length,
      completed: data.filter(r => r.status === 'completed').length,
      total_today: data.filter(r => r.created_at.startsWith(today)).length,
      total_revenue: data
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.total_amount), 0),
      total_fees: data
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.service_fee), 0)
    };

    setStats(stats);
  };

  const fetchSettings = async () => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'gcash_fee_rules',
        'gcash_account_name',
        'gcash_account_number',
        'gcash_qr_url',
      ]);
    if (error) return;
    const map = new Map<string, unknown>();
    for (const row of data ?? []) map.set(row.key, row.value);
    setFeeRules(parseFeeRules(map.get('gcash_fee_rules')));
    setAccountName(String(map.get('gcash_account_name') ?? ''));
    setAccountNumber(String(map.get('gcash_account_number') ?? ''));
    setQrUrl(String(map.get('gcash_qr_url') ?? ''));
  };

  // Realtime subscription & initial load
  useEffect(() => {
    fetchRequests();
    fetchSettings();

    // Subscribe to realtime changes
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel('gcash-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'gcash_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student_contact.includes(searchQuery) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, selectedStatus, searchQuery]);

  // Update status
  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    const supabase = supabaseBrowser();
    try {
      const updateData: any = { status: newStatus };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('gcash_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      fetchRequests();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getTransactionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      cash_in: '💵',
      cash_out: '💸'
    };
    return icons[type] || '💳';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">GCash Service Admin</h1>
              <p className="text-white/90 text-sm">Manage transactions and configure owner receiving account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Two Obvious Tabs: Transactions and Settings */}
        <div className="flex gap-2 border-b-2 border-stone-200 pb-1">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 rounded-t-xl px-5 py-3 text-sm font-bold transition ${
              activeTab === 'transactions'
                ? 'border-b-2 border-amber-700 text-amber-800 bg-white shadow-sm -mb-[2px]'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            TRANSACTIONS
            <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700 font-bold">
              {requests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-t-xl px-5 py-3 text-sm font-bold transition ${
              activeTab === 'settings'
                ? 'border-b-2 border-amber-700 text-amber-800 bg-white shadow-sm -mb-[2px]'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            SETTINGS
          </button>
        </div>

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-lg p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-700" />
                MY GCASH ACCOUNT
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Single source of truth. Customers performing Cash Out will see this Account Name, Mobile Number, and Receiving QR.
              </p>
            </div>

            {settingsSaved && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                GCash settings saved and updated system-wide!
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  ACCOUNT NAME
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. TENPESORUN DORM STORE"
                  className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-sm focus:border-amber-700 focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  GCASH NUMBER (09...)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-sm font-mono font-bold tracking-wider focus:border-amber-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Owner GCash QR Section */}
            <div className="rounded-2xl border-2 border-stone-200 bg-stone-50 p-6">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                MY GCASH RECEIVING QR
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {qrPreview || qrUrl ? (
                  <div className="relative">
                    <img
                      src={qrPreview || qrUrl}
                      alt="Owner GCash QR"
                      className="h-36 w-36 rounded-xl border-2 border-stone-200 bg-white p-1.5 object-contain shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="h-36 w-36 rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 flex flex-col items-center justify-center text-stone-400">
                    <QrCode className="h-10 w-10 mb-1" />
                    <span className="text-xs font-semibold">No QR Uploaded</span>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="file"
                    ref={qrInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setQrFile(file);
                      setQrPreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-900 shadow-sm transition"
                    >
                      <Upload className="h-4 w-4" /> {qrUrl || qrPreview ? 'REPLACE QR' : 'UPLOAD QR'}
                    </button>
                    {(qrUrl || qrPreview) && (
                      <button
                        type="button"
                        onClick={() => {
                          setQrFile(null);
                          setQrPreview('');
                          setQrUrl('');
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-300 transition"
                      >
                        <Trash2 className="h-4 w-4" /> REMOVE QR
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    This QR image is displayed to customers for scanning during Cash Out transactions.
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Rules Schedule */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">Fee Rules Schedule</label>
                  <p className="text-xs text-stone-500">Default: 3% under ₱1,000, 2% for ₱1,000 and above</p>
                </div>
                <button
                  onClick={() =>
                    setFeeRules((prev) => [
                      ...prev,
                      { min_amount: 0, max_amount: null, flat_fee: 0, percentage: 2, min_fee: 0, max_fee: 0 },
                    ])
                  }
                  className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200"
                >
                  <Plus className="h-3 w-3" /> Add Rule
                </button>
              </div>
              <div className="space-y-2">
                {feeRules.map((rule, idx) => (
                  <div key={idx} className="grid gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-6 items-center border border-stone-200">
                    <div>
                      <span className="text-[10px] text-stone-400 block sm:hidden">Min Amount</span>
                      <input
                        type="number"
                        placeholder="Min"
                        value={rule.min_amount}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, min_amount: Number(e.target.value) } : r))
                          )
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block sm:hidden">Max Amount</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={rule.max_amount ?? ''}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, max_amount: e.target.value === '' ? null : Number(e.target.value) }
                                : r
                            )
                          )
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block sm:hidden">Flat Fee</span>
                      <input
                        type="number"
                        placeholder="Flat"
                        value={rule.flat_fee}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, flat_fee: Number(e.target.value) } : r))
                          )
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block sm:hidden">Percentage (%)</span>
                      <input
                        type="number"
                        placeholder="%"
                        value={rule.percentage}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, percentage: Number(e.target.value) } : r))
                          )
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block sm:hidden">Min Fee</span>
                      <input
                        type="number"
                        placeholder="Min fee"
                        value={rule.min_fee}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, min_fee: Number(e.target.value) } : r))
                          )
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Max fee"
                        value={rule.max_fee}
                        onChange={(e) =>
                          setFeeRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, max_fee: Number(e.target.value) } : r))
                          )
                        }
                        className="flex-1 rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => setFeeRules((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg bg-red-100 p-1.5 text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-stone-500">
                Live Preview: ₱500 → fee {formatPeso(calculateGCashFee(feeRules, 500).serviceFee)}, ₱1,000 → fee{' '}
                {formatPeso(calculateGCashFee(feeRules, 1000).serviceFee)}
              </div>
            </div>

            <button
              onClick={async () => {
                setSettingsLoading(true);
                setSettingsSaved(false);
                try {
                  let finalQrUrl = qrUrl;
                  if (qrFile) {
                    const formData = new FormData();
                    formData.append('qrFile', qrFile);
                    const { uploadOwnerGCashQR } = await import('@/app/services/gcash/actions');
                    const uploadRes = await uploadOwnerGCashQR(formData);
                    if (uploadRes.success && uploadRes.data?.url) {
                      finalQrUrl = uploadRes.data.url;
                      setQrUrl(finalQrUrl);
                    }
                  }

                  const { saveOwnerGCashSettings } = await import('@/app/services/gcash/actions');
                  const res = await saveOwnerGCashSettings(accountName, accountNumber, finalQrUrl, feeRules);
                  if (res.success) {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 5000);
                  } else {
                    alert(res.error || 'Failed to save settings');
                  }
                } catch (err: any) {
                  alert(err?.message || 'Failed to save settings');
                } finally {
                  setSettingsLoading(false);
                }
              }}
              disabled={settingsLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {settingsLoading ? 'Saving Settings...' : 'SAVE SETTINGS'}
            </button>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Today</p>
                <p className="text-2xl font-bold text-amber-700">{stats.total_today}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">₱{stats.total_revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
                <p className="text-stone-600 text-xs font-medium mb-1">Fees Earned</p>
                <p className="text-2xl font-bold text-purple-600">₱{stats.total_fees.toFixed(2)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, contact or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-stone-200 rounded-lg focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['all', 'pending', 'processing', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    selectedStatus === status
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl border-2 border-stone-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-100 border-b-2 border-stone-200 text-stone-700 text-xs font-semibold uppercase">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(request => (
                    <tr key={request.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-900">{request.student_name}</p>
                        <p className="text-stone-500 text-xs">{request.student_contact}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-medium text-xs">
                          {getTransactionIcon(request.transaction_type)}
                          {request.transaction_type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">₱{Number(request.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-stone-600">₱{Number(request.service_fee).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-amber-700">₱{Number(request.total_amount).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes(request.admin_notes || '');
                          }}
                          className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </div>

      {/* View Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-br from-amber-700 to-amber-900 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">GCash Transaction Details</h2>
                  <p className="text-white/80 text-xs mt-0.5">ID: {selectedRequest.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Customer Information</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <p><span className="font-semibold text-stone-700">Name:</span> {selectedRequest.student_name}</p>
                  <p><span className="font-semibold text-stone-700">Contact:</span> {selectedRequest.student_contact}</p>
                  <p><span className="font-semibold text-stone-700">Time:</span> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Transaction Details</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700">Type:</span>
                    <span className="font-bold text-amber-900">
                      {selectedRequest.transaction_type === 'cash_in' ? '💵 Cash In' : '💸 Cash Out'}
                    </span>
                  </div>

                  {selectedRequest.transaction_type === 'cash_in' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">GCash to Send to Customer:</span>
                        <span className="font-bold text-stone-900">₱{Number(selectedRequest.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">Service Fee:</span>
                        <span className="font-semibold text-amber-800">+₱{Number(selectedRequest.service_fee).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                        <span className="font-bold text-stone-900">Physical Cash Customer Pays:</span>
                        <span className="text-xl font-bold text-amber-800">₱{Number(selectedRequest.total_amount).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">Physical Cash Customer Receives:</span>
                        <span className="font-bold text-stone-900">₱{Number(selectedRequest.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">Service Fee:</span>
                        <span className="font-semibold text-amber-800">+₱{Number(selectedRequest.service_fee).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                        <span className="font-bold text-stone-900">GCash Customer Sent to Owner:</span>
                        <span className="text-xl font-bold text-amber-800">₱{Number(selectedRequest.total_amount).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {selectedRequest.reference_notes && (
                    <div className="pt-2 text-xs text-stone-600 border-t border-stone-200">
                      <span className="font-semibold">Reference Notes:</span> {selectedRequest.reference_notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient / Proof Display */}
              {selectedRequest.transaction_type === 'cash_in' ? (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Customer Recipient Destination
                  </h3>
                  {selectedRequest.payment_proof_url ? (
                    <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <p className="text-xs font-semibold text-stone-700 mb-2">Customer Uploaded GCash QR</p>
                      <a
                        href={selectedRequest.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={selectedRequest.payment_proof_url}
                          alt="Customer GCash QR"
                          className="h-48 w-48 mx-auto rounded-xl border-2 border-stone-200 p-1 bg-white object-contain hover:border-amber-700 transition"
                        />
                      </a>
                      <a
                        href={selectedRequest.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
                      </a>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-amber-800 block">Send GCash to Number:</span>
                        <span className="text-base font-mono font-bold text-amber-950">
                          {selectedRequest.student_contact}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selectedRequest.student_contact)}
                        className="flex items-center gap-1 rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-300 transition"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Cash Out Proof / Reference
                  </h3>
                  {selectedRequest.payment_proof_url ? (
                    <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <a
                        href={selectedRequest.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={selectedRequest.payment_proof_url}
                          alt="Payment proof"
                          className="max-h-60 mx-auto rounded-xl border-2 border-stone-200 object-contain hover:border-amber-700 transition"
                        />
                      </a>
                      <a
                        href={selectedRequest.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Full Proof Screenshot
                      </a>
                    </div>
                  ) : (
                    <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600">
                      No screenshot uploaded. Reference: {selectedRequest.reference_notes || 'N/A'}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Admin Notes</h3>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-200 focus:border-amber-700 focus:outline-none resize-none text-sm"
                />
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Update Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['pending', 'processing', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedRequest.id, status, adminNotes)}
                      disabled={selectedRequest.status === status}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        selectedRequest.status === status
                          ? 'bg-amber-800 text-white cursor-not-allowed'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
