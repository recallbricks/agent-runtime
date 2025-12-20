import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/20 flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold text-white">RecallBricks</h1>
        <p className="text-xl text-zinc-400">AI Memory Infrastructure</p>
        <Link
          href="/demo/system-monitor"
          className="inline-block px-8 py-4 glass rounded-xl hover:bg-purple-600/20 transition-all duration-300 text-purple-400 hover:text-purple-300 font-medium"
        >
          View System Monitor
        </Link>
      </div>
    </main>
  );
}
