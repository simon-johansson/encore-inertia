import { api } from "encore.dev/api";
import { inertia } from "./inertia-setup";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    inertia.render(req, res, "Home", { greeting: "Welcome to Encore + Inertia!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    inertia.render(req, res, "About");
  },
);
