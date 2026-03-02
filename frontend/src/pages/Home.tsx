import { Link } from "@inertiajs/react";

interface HomeProps {
  greeting: string;
}

export default function Home({ greeting }: HomeProps) {
  return (
    <div>
      <h1>{greeting}</h1>
      <p>This page is rendered with Inertia.js + Encore.ts</p>
      <Link href="/about">Go to About</Link>
    </div>
  );
}
