"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { 
  Tag, Plus, Calendar, Eye, EyeOff, Edit2, Trash2, 
  Package, Clock, Gift, Monitor, Sparkles, Filter,
  ChevronDown, ChevronUp, AlertCircle, TrendingUp,
  Globe, Archive, LayoutGrid, Percent, Zap, Crown,
  X, Check, ChevronRight, RotateCcw
} from "lucide-react";

// Offer types supported
type OfferType = 'combo' | 'threshold' | 'loyalty' | 'service' | 'website_only' | 'scheduled';
type OfferStatus = 'active' | 'paused' | 'scheduled' | 'expired' | 'draft';
type TabId = 'overview' | 'promotions' | 'combos' | 'website' | 'scheduled' | 'archived';

interface Offer {
  id: string;
  name: string;
  type: OfferType;
  status: OfferStatus;
  description: string | null;
  badge_text: string | null;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  priority: number;
  visibility_scope: string;
  is_featured: boolean;
  config: any;
  product_badge_text: string | null;
  product_badge_variant: string | null;
  product_badge_priority: number;
  created_at: string;
  updated_at: string;
}

const OFFER_TYPE_CONFIG: Record<OfferType, { 
  label: string; 
  icon: any; 
  color: string; 
  bgColor: string;
  description: string;
  badge: string;
}> = {
  combo: { 
    label: 'Combo', 
    icon: Package, 
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Bundle products at a fixed price',
    badge: 'COMBO'
  },
  threshold: { 
    label: 'Threshold', 
    icon: Percent, 
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Spend X, get Y reward',
    badge: 'DEAL'
  },
  loyalty: { 
    label: 'Loyalty', 
    icon: Crown, 
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Points-based rewards',
    badge: 'LOYALTY'
  },
  service: { 
    label: 'Service', 
    icon: Sparkles, 
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Linked to service perks',
    badge: 'PERK'
  },
  website_only: { 
    label: 'Web Exclusive', 
    icon: Globe, 
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    description: 'Website-only offers',
    badge: 'WEB ONLY'
  },
  scheduled: { 
    label: 'Scheduled', 
    icon: Calendar, 
    color: 'text-rose-700',
    bgColor: 'bg-rose-100',
    description: 'Time-based like Exam Week',
    badge: 'EVENT'
  },
};

const STATUS_CONFIG: Record<OfferStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: any;
}> = {
  active: { 
    label: 'Active', 
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: Zap 
  },
  paused: { 
    label: 'Paused', 
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: Clock 
  },
  scheduled: { 
    label: 'Scheduled', 
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Calendar 
  },
  expired: { 
    label: 'Expired', 
    color: 'text-stone-600',
    bgColor: 'bg-stone-100',
    icon: Archive 
  },
  draft: { 
    label: 'Draft', 
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Edit2 
  },
};

const TABS: { id: TabId; label: string; icon: any; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, description: 'All offers summary' },
  { id: 'promotions', label: 'Promotions', icon: Percent, description: 'Threshold & savings offers' },
  { id: 'combos', label: 'Combos', icon: Package, description: 'Bundle & combo deals' },
  { id: 'website', label: 'Web Exclusives', icon: Globe, description: 'Website-only offers' },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, description: 'Exam week & seasonal' },
  { id: 'archived', label: 'Archived', icon: Archive, description: 'Expired & inactive' },
];

function normalizeDateTime(value?: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : new Date(trimmed).toISOString();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function isExpired(endAt: string | null) {
  if (!endAt) return false;
  return new Date(endAt) < new Date();
}

function getDaysRemaining(endAt: string | null): number | null {
  if (!endAt) return null;
  const end = new Date(endAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function OffersAdminPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load offers:', error);
    } else {
      setOffers(data || []);
    }
    setLoading(false);
  }

  async function toggleOfferStatus(offer: Offer) {
    const newStatus = offer.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('offers')
      .update({ status: newStatus, is_active: newStatus === 'active', updated_at: new Date().toISOString() })
      .eq('id', offer.id);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: newStatus, is_active: newStatus === 'active' } : o));
    }
  }

  async function activateExamWeek() {
    // Quick activation for exam week offers
    const examOffers = offers.filter(o => 
      o.type === 'scheduled' && 
      o.name.toLowerCase().includes('exam') &&
      o.status !== 'active'
    );

    if (examOffers.length === 0) {
      alert('No exam week offers found to activate. Create one first!');
      return;
    }

    for (const offer of examOffers) {
      await supabase
        .from('offers')
        .update({ status: 'active', is_active: true, updated_at: new Date().toISOString() })
        .eq('id', offer.id);
    }
    
    loadOffers();
    alert(`Activated ${examOffers.length} exam week offer(s)!`);
  }

  async function deleteOffer(id: string) {
    if (!confirm('Delete this offer? This cannot be undone.')) return;
    
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setOffers(prev => prev.filter(o => o.id !== id));
    }
  }

  // Filter offers based on active tab
  const filteredOffers = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return offers.filter(o => o.status !== 'expired');
      case 'promotions':
        return offers.filter(o => ['threshold', 'loyalty'].includes(o.type) && o.status !== 'expired');
      case 'combos':
        return offers.filter(o => o.type === 'combo' && o.status !== 'expired');
      case 'website':
        return offers.filter(o => o.type === 'website_only' || o.visibility_scope === 'website_only');
      case 'scheduled':
        return offers.filter(o => o.type === 'scheduled' || o.status === 'scheduled');
      case 'archived':
        return offers.filter(o => o.status === 'expired' || isExpired(o.end_at));
      default:
        return offers;
    }
  }, [offers, activeTab]);

  // Stats
  const stats = {
    total: offers.length,
    active: offers.filter(o => o.status === 'active').length,
    scheduled: offers.filter(o => o.status === 'scheduled').length,
    featured: offers.filter(o => o.is_featured).length,
    webOnly: offers.filter(o => o.visibility_scope === 'website_only').length,
    expired: offers.filter(o => o.status === 'expired' || isExpired(o.end_at)).length,
    examWeek: offers.filter(o => o.type === 'scheduled' && o.name.toLowerCase().includes('exam')).length,
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const TabIcon = currentTab.icon;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Promotions & Offers</h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage deals, combos, and special promotions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'scheduled' && (
            <button
              onClick={activateExamWeek}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-rose-700 hover:to-rose-800 transition"
            >
              <Zap className="h-4 w-4" />
              Activate Exam Week
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-amber-800 hover:to-amber-950 transition"
          >
            <Plus className="h-4 w-4" />
            Create Offer
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={stats.total} color="stone" />
        <StatCard label="Active" value={stats.active} color="emerald" />
        <StatCard label="Featured" value={stats.featured} color="amber" />
        <StatCard label="Scheduled" value={stats.scheduled} color="blue" />
        <StatCard label="Web Only" value={stats.webOnly} color="pink" />
        <StatCard label="Exam Week" value={stats.examWeek} color="rose" />
        <StatCard label="Archived" value={stats.expired} color="gray" />
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-stone-200">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2',
                  isActive
                    ? 'border-amber-700 text-amber-900 bg-amber-50/50'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && <span className="sm:hidden">{tab.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <TabIcon className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">{currentTab.label}</h2>
            <p className="text-xs text-stone-500">{currentTab.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">{filteredOffers.length} offers</span>
          <div className="flex rounded-lg border border-stone-200 bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={[
                'px-3 py-1.5 text-sm transition',
                viewMode === 'list' ? 'bg-stone-100 font-medium' : 'hover:bg-stone-50'
              ].join(' ')}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={[
                'px-3 py-1.5 text-sm transition',
                viewMode === 'grid' ? 'bg-stone-100 font-medium' : 'hover:bg-stone-50'
              ].join(' ')}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Offers Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <EmptyState activeTab={activeTab} onCreate={() => setShowCreateModal(true)} />
      ) : viewMode === 'grid' ? (
        <GridView 
          offers={filteredOffers} 
          onToggleStatus={toggleOfferStatus}
          onEdit={setEditingOffer}
          onDelete={deleteOffer}
        />
      ) : (
        <ListView 
          offers={filteredOffers} 
          onToggleStatus={toggleOfferStatus}
          onEdit={setEditingOffer}
          onDelete={deleteOffer}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <OfferModal 
          mode="create"
          onClose={() => setShowCreateModal(false)} 
          onSaved={loadOffers}
          defaultType={activeTab === 'combos' ? 'combo' : activeTab === 'website' ? 'website_only' : activeTab === 'scheduled' ? 'scheduled' : 'threshold'}
        />
      )}
      
      {editingOffer && (
        <OfferModal 
          mode="edit"
          offer={editingOffer}
          onClose={() => setEditingOffer(null)} 
          onSaved={loadOffers}
        />
      )}
    </div>
  );
}

// Sub-components
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    stone: 'bg-stone-100 text-stone-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className={`rounded-xl ${colorMap[color]} p-3 text-center`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ activeTab, onCreate }: { activeTab: TabId; onCreate: () => void }) {
  const messages: Record<TabId, { title: string; description: string }> = {
    overview: { title: 'No offers yet', description: 'Create your first promotion to get started' },
    promotions: { title: 'No promotions', description: 'Create threshold or loyalty offers' },
    combos: { title: 'No combos', description: 'Create bundle deals for customers' },
    website: { title: 'No web exclusives', description: 'Create website-only special offers' },
    scheduled: { title: 'No scheduled offers', description: 'Create exam week or seasonal promotions' },
    archived: { title: 'No archived offers', description: 'Expired offers will appear here' },
  };

  const msg = messages[activeTab];

  return (
    <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <Tag className="mx-auto h-12 w-12 text-stone-400" />
      <h3 className="mt-4 font-semibold text-stone-900">{msg.title}</h3>
      <p className="mt-2 text-sm text-stone-600">{msg.description}</p>
      {activeTab !== 'archived' && (
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          <Plus className="h-4 w-4" />
          Create Offer
        </button>
      )}
    </div>
  );
}

function ListView({ 
  offers, 
  onToggleStatus, 
  onEdit, 
  onDelete 
}: { 
  offers: Offer[]; 
  onToggleStatus: (o: Offer) => void;
  onEdit: (o: Offer) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const typeCfg = OFFER_TYPE_CONFIG[offer.type];
        const statusCfg = STATUS_CONFIG[offer.status];
        const TypeIcon = typeCfg.icon;
        const StatusIcon = statusCfg.icon;
        const daysLeft = getDaysRemaining(offer.end_at);

        return (
          <div
            key={offer.id}
            className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-4">
              {/* Type Icon */}
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${typeCfg.bgColor}`}>
                <TypeIcon className={`h-6 w-6 ${typeCfg.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-stone-900">{offer.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.bgColor} ${typeCfg.color}`}>
                    {typeCfg.badge}
                  </span>
                  {offer.is_featured && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      ★ Featured
                    </span>
                  )}
                  {offer.visibility_scope === 'website_only' && (
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
                      Web Only
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600 line-clamp-1">{offer.description || 'No description'}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                  <span>Priority: {offer.priority}</span>
                  {offer.start_at && (
                    <span>Start: {formatDateShort(offer.start_at)}</span>
                  )}
                  {offer.end_at && (
                    <span className={daysLeft !== null && daysLeft < 3 ? 'text-rose-600 font-medium' : ''}>
                      End: {formatDateShort(offer.end_at)}
                      {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d left)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => onToggleStatus(offer)}
                  className={`p-2 rounded-lg transition ${
                    offer.status === 'active' 
                      ? 'text-amber-600 hover:bg-amber-50' 
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={offer.status === 'active' ? 'Pause' : 'Activate'}
                >
                  {offer.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onEdit(offer)}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(offer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridView({ 
  offers, 
  onToggleStatus, 
  onEdit, 
  onDelete 
}: { 
  offers: Offer[]; 
  onToggleStatus: (o: Offer) => void;
  onEdit: (o: Offer) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => {
        const typeCfg = OFFER_TYPE_CONFIG[offer.type];
        const statusCfg = STATUS_CONFIG[offer.status];
        const TypeIcon = typeCfg.icon;
        const daysLeft = getDaysRemaining(offer.end_at);

        return (
          <div
            key={offer.id}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {/* Header */}
            <div className={`${typeCfg.bgColor} p-4`}>
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/80`}>
                  <TypeIcon className={`h-5 w-5 ${typeCfg.color}`} />
                </div>
                <div className="flex gap-1">
                  {offer.is_featured && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      ★
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-stone-900">{offer.name}</h3>
              <p className="text-xs text-stone-600 line-clamp-2">{offer.description || 'No description'}</p>
            </div>

            {/* Body */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Type</span>
                <span className={`font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
              </div>
              {offer.badge_text && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Badge</span>
                  <span className="font-medium">{offer.badge_text}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Priority</span>
                <span className="font-medium">{offer.priority}</span>
              </div>
              {offer.end_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Ends</span>
                  <span className={daysLeft !== null && daysLeft < 3 ? 'text-rose-600 font-medium' : 'font-medium'}>
                    {formatDateShort(offer.end_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-stone-100 p-3 flex gap-2">
              <button
                onClick={() => onToggleStatus(offer)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  offer.status === 'active'
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {offer.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <button
                onClick={() => onEdit(offer)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200"
              >
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Create/Edit Modal
function OfferModal({ 
  mode, 
  offer, 
  onClose, 
  onSaved,
  defaultType = 'threshold'
}: { 
  mode: 'create' | 'edit';
  offer?: Offer;
  onClose: () => void;
  onSaved: () => void;
  defaultType?: OfferType;
}) {
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'scheduling' | 'advanced'>('basic');
  
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    type: (offer?.type || defaultType) as OfferType,
    description: offer?.description || '',
    badge_text: offer?.badge_text || '',
    status: (offer?.status || 'draft') as OfferStatus,
    priority: offer?.priority ?? 10,
    visibility_scope: offer?.visibility_scope || 'public',
    is_featured: offer?.is_featured || false,
    start_at: offer?.start_at ? new Date(offer.start_at).toISOString().slice(0, 16) : '',
    end_at: offer?.end_at ? new Date(offer.end_at).toISOString().slice(0, 16) : '',
    config: offer?.config || {},
    product_badge_text: offer?.product_badge_text || '',
    product_badge_variant: offer?.product_badge_variant || 'amber',
    product_badge_priority: offer?.product_badge_priority ?? 0,
  });

  const supabase = useMemo(() => supabaseBrowser(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Validate dates: end_at must be >= start_at if both exist
    const normalizedStart = normalizeDateTime(formData.start_at);
    const normalizedEnd = normalizeDateTime(formData.end_at);
    
    if (normalizedStart && normalizedEnd) {
      if (new Date(normalizedEnd) < new Date(normalizedStart)) {
        alert('End date must be on or after the start date.');
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description || null,
      badge_text: formData.badge_text || null,
      status: formData.status,
      priority: formData.priority,
      visibility_scope: formData.visibility_scope,
      is_featured: formData.is_featured,
      is_active: formData.status === 'active',
      start_at: normalizedStart,
      end_at: normalizedEnd,
      config: formData.config,
      product_badge_text: formData.product_badge_text.trim() || null,
      product_badge_variant: formData.product_badge_text.trim() ? formData.product_badge_variant : null,
      product_badge_priority: formData.product_badge_priority,
    };

    if (mode === 'create') {
      const { error } = await supabase.from('offers').insert(payload);
      if (error) {
        alert('Failed to create: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('offers').update(payload).eq('id', offer!.id);
      if (error) {
        alert('Failed to update: ' + error.message);
        setSaving(false);
        return;
      }
    }

    onSaved();
    onClose();
    setSaving(false);
  }

  const typeCfg = OFFER_TYPE_CONFIG[formData.type];
  const TypeIcon = typeCfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeCfg.bgColor}`}>
              <TypeIcon className={`h-5 w-5 ${typeCfg.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                {mode === 'create' ? 'Create New Offer' : 'Edit Offer'}
              </h2>
              <p className="text-xs text-stone-500">{typeCfg.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="border-b border-stone-200 px-6">
          <div className="flex gap-4">
            {(['basic', 'scheduling', 'advanced'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={[
                  'py-3 text-sm font-medium capitalize border-b-2 transition',
                  activeSection === section
                    ? 'border-amber-700 text-amber-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                ].join(' ')}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Section */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Offer Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
                  placeholder="e.g., Exam Week Special Bundle"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as OfferType })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  >
                    {Object.entries(OFFER_TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as OfferStatus })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  rows={2}
                  placeholder="Describe the offer for customers..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Badge Text</label>
                <input
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  placeholder="e.g., EXAM WEEK SPECIAL"
                />
                <p className="mt-1 text-xs text-stone-500">Shown on storefront</p>
              </div>
            </div>
          )}

          {/* Scheduling Section */}
          {activeSection === 'scheduling' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <h4 className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <Clock className="h-4 w-4" />
                  Scheduling Tips
                </h4>
                <ul className="mt-2 text-xs text-blue-700 space-y-1">
                  <li>• Set dates for Exam Week or seasonal promotions</li>
                  <li>• Leave empty for ongoing offers</li>
                  <li>• Use Scheduled status to prepare in advance</li>
                </ul>
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Priority (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-stone-500">Higher = shown first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Visibility</label>
                  <select
                    value={formData.visibility_scope}
                    onChange={(e) => setFormData({ ...formData, visibility_scope: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="website_only">Website Only</option>
                    <option value="in_store_only">In-Store Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${formData.is_featured ? 'bg-amber-600' : 'bg-stone-200'}`}>
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="sr-only"
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.is_featured ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-stone-700">Featured Offer</span>
                </label>

                {formData.type === 'scheduled' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.config?.exam_week || false}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        config: { ...formData.config, exam_week: e.target.checked }
                      })}
                      className="h-4 w-4 rounded border-stone-300 text-rose-600"
                    />
                    <span className="text-sm text-stone-700">Exam Week Special</span>
                  </label>
                )}
              </div>

              {/* Product Badge Section */}
              <div className="border-t border-stone-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-stone-900 mb-3">Product Badge (Optional)</h4>
                <p className="text-xs text-stone-500 mb-3">Display a badge on linked products while this offer is active. Offer badges override manual product badges.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Badge Text</label>
                    <input
                      value={formData.product_badge_text}
                      onChange={(e) => setFormData({ ...formData, product_badge_text: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                      placeholder="e.g., SALE, 20% OFF"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Variant</label>
                    <select
                      value={formData.product_badge_variant}
                      onChange={(e) => setFormData({ ...formData, product_badge_variant: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                    >
                      <option value="amber">Amber (Default)</option>
                      <option value="emerald">Emerald</option>
                      <option value="rose">Rose</option>
                      <option value="blue">Blue</option>
                      <option value="purple">Purple</option>
                      <option value="slate">Slate</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-stone-700">Badge Priority</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.product_badge_priority}
                    onChange={(e) => setFormData({ ...formData, product_badge_priority: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-stone-500">Higher priority wins when multiple offers apply to the same product</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="flex-1 rounded-lg bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2.5 text-sm font-medium text-white hover:from-amber-800 hover:to-amber-950 disabled:opacity-50"
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Offer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
