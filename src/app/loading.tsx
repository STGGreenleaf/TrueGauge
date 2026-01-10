import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Ambient background - signature shiny surface */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>
      
      {/* TrueGauge Icon - centered */}
      <div className="relative z-10">
        <Image
          src="/truegauge_icon.png"
          alt="TrueGauge"
          width={120}
          height={120}
          priority
        />
      </div>
    </div>
  );
}
