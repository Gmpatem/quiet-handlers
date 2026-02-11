'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Truck, Eye, X, Search, MapPin, Phone, ShoppingBag } from 'lucide-react';

type DeliveryRequest = {
  id: string;
  created_at: string;
  student_name: string;
  student_contact: string;
  item_description: string;
  store_location?: string;
  payment_method: 'prepaid' | 'cod';
  delivery_fee: number;
  payment_proof_url?: string;
  payment_status: 'paid' | 'unpaid';
  status: 'pending' | 'processing' | 'out_for_delivery' | 'completed' | 'cancelled';
  rider_name?: string;
  admin_notes?: string;
};

type Stats = {
  pending: number;
  processing: number;
  out_for_delivery: number;
  completed: number;
  total_today: number;
  total_revenue: number;
};

export default function DeliveryAdminClient() {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DeliveryRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    out_for_delivery: 0,
    completed: 0,
    total_today: 0,
    total_revenue: 0
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riderName, setRiderName] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = supabaseBrowser();

  // Fetch requests
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
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
  const calculateStats = (data: DeliveryRequest[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      pending: data.filter(r => r.status === 'pending').length,
      processing: data.filter(r => r.status === 'processing').length,
      out_for_delivery: data.filter(r => r.status === 'out_for_delivery').length,
      completed: data.filter(r => r.status === 'completed').length,
      total_today: data.filter(r => r.created_at.startsWith(today)).length,
      total_revenue: data
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.delivery_fee), 0)
    };

    setStats(stats);
  };

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
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.item_description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, selectedStatus, searchQuery]);

  // Update request
  const updateRequest = async (id: string, updates: Partial<DeliveryRequest>) => {
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      fetchRequests();
      setSelectedRequest(null);
      setRiderName('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request');
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('delivery-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'delivery_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800 border-purple-200';
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
            <Truck className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Delivery Admin</h1>
              <p className="text-white/90 text-sm">Manage off-campus delivery requests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
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
            <p className="text-stone-600 text-xs font-medium mb-1">Out for Delivery</p>
            <p className="text-2xl font-bold text-purple-600">{stats.out_for_delivery}</p>
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
            <p className="text-2xl font-bold text-emerald-600">₱{stats.total_revenue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border-2 border-stone-200 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, contact, item or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-stone-200 rounded-lg focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['all', 'pending', 'processing', 'out_for_delivery', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    selectedStatus === status
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {status === 'out_for_delivery' ? 'Out for Delivery' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl border-2 border-stone-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-100 border-b-2 border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Rider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(request => (
                    <tr key={request.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {new Date(request.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{request.student_name}</p>
                        <p className="text-xs text-stone-500">{request.student_contact}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-stone-700 max-w-xs truncate">{request.item_description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-stone-600">{request.store_location || 'Not specified'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-amber-700">₱{request.delivery_fee}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          request.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.payment_method === 'prepaid' ? '💳' : '💵'} {request.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-stone-600">{request.rider_name || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setRiderName(request.rider_name || '');
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

      {/* View Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-br from-amber-700 to-amber-900 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Delivery Details</h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRiderName('');
                    setAdminNotes('');
                  }}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Student Information</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p><span className="font-semibold">Name:</span> {selectedRequest.student_name}</p>
                  <p><span className="font-semibold">Contact:</span> {selectedRequest.student_contact}</p>
                  <p><span className="font-semibold">Request ID:</span> {selectedRequest.id}</p>
                  <p><span className="font-semibold">Time:</span> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Delivery Details */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Delivery Details</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p><span className="font-semibold">Item:</span> {selectedRequest.item_description}</p>
                  {selectedRequest.store_location && (
                    <p><span className="font-semibold">Store:</span> {selectedRequest.store_location}</p>
                  )}
                  <p><span className="font-semibold">Delivery Fee:</span> ₱{selectedRequest.delivery_fee}</p>
                  <p><span className="font-semibold">Payment:</span> {selectedRequest.payment_method.toUpperCase()}</p>
                  <p><span className="font-semibold">Payment Status:</span> {selectedRequest.payment_status.toUpperCase()}</p>
                </div>
              </div>

              {/* Payment Proof */}
              {selectedRequest.payment_proof_url && (
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Payment Proof</h3>
                  <a
                    href={selectedRequest.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedRequest.payment_proof_url}
                      alt="Payment proof"
                      className="w-full rounded-xl border-2 border-stone-200 hover:border-amber-700 transition-colors"
                    />
                  </a>
                </div>
              )}

              {/* Rider Assignment */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Assign Rider</h3>
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Enter rider name..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-700 focus:outline-none"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Admin Notes</h3>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this delivery..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-700 focus:outline-none resize-none"
                />
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Update Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['pending', 'processing', 'out_for_delivery', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateRequest(selectedRequest.id, {
                        status: status as any,
                        rider_name: riderName || undefined,
                        admin_notes: adminNotes || undefined
                      })}
                      disabled={selectedRequest.status === status}
                      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                        selectedRequest.status === status
                          ? 'bg-amber-700 text-white cursor-not-allowed'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {status === 'out_for_delivery' ? 'Out' : status.charAt(0).toUpperCase() + status.slice(1)}
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
