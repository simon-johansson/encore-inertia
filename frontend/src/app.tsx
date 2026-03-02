import { mountInertiaApp } from "@encore/inertia/react";

mountInertiaApp({
  pages: import.meta.glob("./pages/**/*.tsx", { eager: true }),
});
