import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ padding: 48, fontFamily: 'system-ui' }}>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
