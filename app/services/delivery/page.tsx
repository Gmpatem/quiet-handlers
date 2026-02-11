import { Metadata } from 'next';
import DeliveryRequestClient from '@/components/delivery/DeliveryRequestClient';

export const metadata: Metadata = {
  title: 'Off-Campus Delivery | FDS',
  description: 'Order items from off-campus and we\'ll deliver them to you',
};

export default function DeliveryServicePage() {
  return <DeliveryRequestClient />;
}
