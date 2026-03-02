import { createInertiaAdapter } from "@encore/inertia";

export const inertia = createInertiaAdapter({
  viteEntry: "frontend/src/app.tsx",
  title: "Encore + Inertia",
});
