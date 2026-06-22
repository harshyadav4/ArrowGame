import { ArrowExitGame } from "@/components/ArrowExitGame";

export default function Home() {
  return (
    <main style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at 50% 50%, #151233 0%, #070514 100%)',
      color: '#f8fafc',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <ArrowExitGame />
    </main>
  );
}

