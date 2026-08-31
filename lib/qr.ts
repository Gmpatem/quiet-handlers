export const QR_SERVICE_PATHS = {
  print: "/services/print",
  borrow: "/services/borrow",
  gcash: "/services/gcash",
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
    instruction: "Scan to print",
    path: QR_SERVICE_PATHS.print,
    icon: "🖨️",
  },
  {
    key: "borrow",
    title: "BORROW HERE",
    instruction: "Scan to borrow",
    path: QR_SERVICE_PATHS.borrow,
    icon: "📦",
  },
  {
    key: "gcash",
    title: "GCASH HERE",
    instruction: "Scan for GCash",
    path: QR_SERVICE_PATHS.gcash,
    icon: "💳",
  },
];
