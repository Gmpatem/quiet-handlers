"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Tag, Clock, Sparkles, ChevronRight, X } from "lucide-react";

interface Offer {
  id: string;
  name: string;
  type: string;
  badge_text: string | null;
  description: string | null;
  is_featured: boolean;
  config: any;
}

const OFFER_COLORS: Record<string, string> = {
  combo: "from-emerald-500 to-emerald-600",
  threshold: "from-amber-500 to-amber-600",
  loyalty: "from-purple-500 to-purple-600",
  service: "from-blue-500 to-blue-600",
  website_only: "from-pink-500 to-pink-600",
  scheduled: "from-rose-500 to-rose-600",
};

export default function OffersStrip() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadOffers();
    // Load dismissed offers from localStorage
    try {
      const saved = localStorage.getItem('fds_dismissed_offers');
      if (saved) setDismissed(JSON.parse(saved));
    } catch {}
  }, []);

  async function loadOffers() {
    const supabase = supabaseBrowser();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('offers')
      .select('id, name, type, badge_text, description, is_featured, config')
      .eq('is_active', true)
      .eq('status', 'active')
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('is_featured', { ascending: false })
      .order('priority', { ascending: false })
      .limit(5);

    if (!error && data) {
      setOffers(data);
    }
    setLoading(false);
  }

  function dismissOffer(id: string) {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    try {
      localStorage.setItem('fds_dismissed_offers', JSON.stringify(newDismissed));
    } catch {}
  }

  const visibleOffers = offers.filter(o => !dismissed.includes(o.id));

  if (loading || visibleOffers.length === 0) return null;

  // Show featured offer first, then rotate
  const featuredOffer = visibleOffers.find(o => o.is_featured);
  const regularOffers = visibleOffers.filter(o => !o.is_featured);
  const displayOffers = featuredOffer ? [featuredOffer, ...regularOffers] : visibleOffers;
  const currentOffer = displayOffers[currentIndex % displayOffers.length];

  return (
    <div className="relative overflow-hidden">
      {/* Main Offer Strip */}
      <div 
        className={`bg-gradient-to-r ${OFFER_COLORS[currentOffer.type] || 'from-stone-500 to-stone-600'} text-white`}
      >
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Offer Content */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {currentOffer.badge_text && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                      {currentOffer.badge_text}
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">
                    {currentOffer.name}
                  </span>
                </div>
                {currentOffer.description && (
                  <p className="text-xs text-white/80 truncate hidden sm:block">
                    {currentOffer.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {displayOffers.length > 1 && (
                <button
                  onClick={() => setCurrentIndex(i => i + 1)}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30 transition"
                >
                  <span>More</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => dismissOffer(currentOffer.id)}
                className="p-1 rounded-full hover:bg-white/20 transition"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
