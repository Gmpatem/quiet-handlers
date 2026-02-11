import { Metadata } from 'next';
import GCashServiceClient from '@/components/gcash/GCashServiceClient';

export const metadata: Metadata = {
  title: 'GCash Service | FDS',
  description: 'Cash-in and cash-out service with 2% fee',
};

export default function GCashServicePage() {
  return <GCashServiceClient />;
}
