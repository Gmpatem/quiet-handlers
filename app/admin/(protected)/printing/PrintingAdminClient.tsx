'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Printer, Copy, Scan, FileText, Eye, Check, X, Clock, Package, Search, Filter } from 'lucide-react';

type PrintRequest = {
  id: string;
  created_at: string;
  student_name: string;
  service_type: 'print' | 'photocopy' | 'scan';
  pdf_url?: string;
  color_type?: 'bw' | 'color';
  paper_size?: string;
  pages: number;
  copies: number;
  sided?: 'single' | 'double';
  binding: boolean;
  special_instructions?: string;
  payment_method: 'gcash' | 'cash';
  payment_proof_url?: string;
  total_amount: number;
  payment_status: 'paid' | 'unpaid';
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
};

type Stats = {
  pending: number;
  processing: number;
  ready: number;
  completed: number;
  total_today: number;
  total_revenue: number;
};

export default function PrintingAdminClient() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PrintRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    ready: 0,
    completed: 0,
    total_today: 0,
    total_revenue: 0
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = supabaseBrowser();

  // Fetch requests
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('printing_requests')
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
  const calculateStats = (data: PrintRequest[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      pending: data.filter(r => r.status === 'pending').length,
      processing: data.filter(r => r.status === 'processing').length,
      ready: data.filter(r => r.status === 'ready').length,
      completed: data.filter(r => r.status === 'completed').length,
      total_today: data.filter(r => r.created_at.startsWith(today)).length,
      total_revenue: data
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.total_amount), 0)
    };

    setStats(stats);
  };

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, selectedStatus, searchQuery]);

  // Update status
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('printing_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('printing-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'printing_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'print': return <Printer className="w-4 h-4" />;
      case 'photocopy': return <Copy className="w-4 h-4" />;
      case 'scan': return <Scan className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-200';
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
            <Printer className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Printing Admin</h1>
              <p className="text-white/90 text-sm">Manage print, photocopy & scan requests</p>
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
            <p className="text-stone-600 text-xs font-medium mb-1">Ready</p>
            <p className="text-2xl font-bold text-purple-600">{stats.ready}</p>
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
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-stone-200 rounded-lg focus:border-amber-700 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['all', 'pending', 'processing', 'ready', 'completed', 'cancelled'].map(status => (
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
            <table className="w-full">
              <thead className="bg-stone-100 border-b-2 border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
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
                        <p className="text-xs text-stone-500">ID: {request.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getServiceIcon(request.service_type)}
                          <span className="text-sm font-medium text-stone-700 capitalize">
                            {request.service_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        <p>{request.pages} page{request.pages > 1 ? 's' : ''}</p>
                        {request.service_type !== 'scan' && (
                          <p className="text-xs text-stone-500">{request.copies} cop{request.copies > 1 ? 'ies' : 'y'}</p>
                        )}
                        {request.color_type && (
                          <p className="text-xs text-stone-500">{request.color_type === 'bw' ? 'B&W' : 'Color'}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-amber-700">₱{request.total_amount}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          request.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.payment_method === 'gcash' ? '💳' : '💵'} {request.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRequest(request)}
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
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-br from-amber-700 to-amber-900 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Student Information</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p><span className="font-semibold">Name:</span> {selectedRequest.student_name}</p>
                  <p><span className="font-semibold">Request ID:</span> {selectedRequest.id}</p>
                  <p><span className="font-semibold">Time:</span> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Service Details</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p><span className="font-semibold">Service:</span> {selectedRequest.service_type.charAt(0).toUpperCase() + selectedRequest.service_type.slice(1)}</p>
                  <p><span className="font-semibold">Pages:</span> {selectedRequest.pages}</p>
                  {selectedRequest.service_type !== 'scan' && (
                    <p><span className="font-semibold">Copies:</span> {selectedRequest.copies}</p>
                  )}
                  {selectedRequest.color_type && (
                    <p><span className="font-semibold">Color:</span> {selectedRequest.color_type === 'bw' ? 'Black & White' : 'Color'}</p>
                  )}
                  {selectedRequest.paper_size && (
                    <p><span className="font-semibold">Paper:</span> {selectedRequest.paper_size.toUpperCase()}</p>
                  )}
                  {selectedRequest.sided && (
                    <p><span className="font-semibold">Sided:</span> {selectedRequest.sided === 'single' ? 'Single-Sided' : 'Double-Sided'}</p>
                  )}
                  {selectedRequest.binding && (
                    <p><span className="font-semibold">Binding:</span> Yes</p>
                  )}
                  {selectedRequest.special_instructions && (
                    <div>
                      <span className="font-semibold">Instructions:</span>
                      <p className="mt-1 text-stone-600">{selectedRequest.special_instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Files */}
              {(selectedRequest.pdf_url || selectedRequest.payment_proof_url) && (
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Files</h3>
                  <div className="space-y-2">
                    {selectedRequest.pdf_url && (
                      <a
                        href={selectedRequest.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">View PDF Document</span>
                      </a>
                    )}
                    {selectedRequest.payment_proof_url && (
                      <a
                        href={selectedRequest.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">View Payment Proof</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Payment</h3>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p><span className="font-semibold">Method:</span> {selectedRequest.payment_method.toUpperCase()}</p>
                  <p><span className="font-semibold">Status:</span> {selectedRequest.payment_status.toUpperCase()}</p>
                  <p className="text-2xl font-bold text-amber-700">₱{selectedRequest.total_amount}</p>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase mb-3">Update Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['pending', 'processing', 'ready', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedRequest.id, status)}
                      disabled={selectedRequest.status === status}
                      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                        selectedRequest.status === status
                          ? 'bg-amber-700 text-white cursor-not-allowed'
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
