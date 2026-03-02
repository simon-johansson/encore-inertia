import { api } from "encore.dev/api";
import { render } from "./inertia";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    render(req, res, "Home", { greeting: "Welcome to Encore + Inertia!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    render(req, res, "About");
  },
);
