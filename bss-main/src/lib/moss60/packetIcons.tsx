import { Flame, MoonStar, Orbit, type LucideProps } from 'lucide-react';

export type PacketIconKey = 'red' | 'blue' | 'black';

export function PacketIcon({ packet, className, ...props }: { packet: PacketIconKey; className?: string } & LucideProps) {
  if (packet === 'red') {
    return <Flame className={className} {...props} />;
  }

  if (packet === 'blue') {
    return <Orbit className={className} {...props} />;
  }

  return <MoonStar className={className} {...props} />;
}

export function getPacketIconColorClass(packet: PacketIconKey) {
  if (packet === 'red') return 'text-red-300';
  if (packet === 'blue') return 'text-sky-300';
  return 'text-slate-300';
}

export function getPacketHashParam(packet: PacketIconKey) {
  return `${packet}-chamber`;
}
