import { QRCodeSVG } from 'qrcode.react';

type LoanItemQrProps = {
  value: string | null | undefined;
  size?: number;
  className?: string;
};

export function LoanItemQr({ value, size = 88, className = '' }: LoanItemQrProps) {
  if (!value?.trim()) return <span className="text-zinc-400">—</span>;
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  );
}
