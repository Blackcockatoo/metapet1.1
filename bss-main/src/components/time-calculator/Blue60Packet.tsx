import { BLUE_STRAND_PACKET } from '@/lib/moss60/strandPackets';
import { StrandPacketPanel } from '@/components/StrandPacketPanel';

export function Blue60Packet({ compact = false, sectionId, persistKey }: { compact?: boolean; sectionId?: string; persistKey?: string }) {
  return <StrandPacketPanel packet={BLUE_STRAND_PACKET} compact={compact} sectionId={sectionId} persistKey={persistKey} />;
}
