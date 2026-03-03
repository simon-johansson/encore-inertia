import { api } from "encore.dev/api";
import { inertia } from "./inertia-setup";
import Home from "./src/pages/Home";
import About from "./src/pages/About";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    // Shared data is merged into every page response for this request
    inertia.share(req, { appName: "My Encore App" });

    inertia.render(req, res, Home, { greeting: "Welcome to Encore + Inertia!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    inertia.render(req, res, About);
  },
);
