export const CANONICAL_PRODUCTION_DOMAIN = "https://quiet-handlers.vercel.app";

export const QR_SERVICE_PATHS = {
  print: "/services/print",
  gcash: "/services/gcash",
  credit: "/services/credit",
  store: "/",
} as const;

export type QRServiceKey = keyof typeof QR_SERVICE_PATHS;

export type QRServiceInfo = {
  key: QRServiceKey;
  title: string;
  instruction: string;
  path: string;
  icon: string;
};

export const QR_SERVICES: QRServiceInfo[] = [
  {
    key: "print",
    title: "PRINT HERE",
    instruction: "Scan • Submit • Done",
    path: QR_SERVICE_PATHS.print,
    icon: "🖨️",
  },
  {
    key: "gcash",
    title: "GCASH HERE",
    instruction: "Cash In • Cash Out",
    path: QR_SERVICE_PATHS.gcash,
    icon: "💳",
  },
  {
    key: "credit",
    title: "TAKE ON CREDIT",
    instruction: "Pick Items • Enter Name • Done",
    path: QR_SERVICE_PATHS.credit,
    icon: "📝",
  },
  {
    key: "store",
    title: "SHOP HERE",
    instruction: "Browse • Order • Done",
    path: QR_SERVICE_PATHS.store,
    icon: "🛒",
  },
];
