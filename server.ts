import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import cors from "cors";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SALES_FILE = path.join(DATA_DIR, "sales.json");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR);
  }
}

async function readJson(file: string, defaultValue: any) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJson(file: string, data: any) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  await ensureDataDir();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/products", async (req, res) => {
    const products = await readJson(PRODUCTS_FILE, []);
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    await writeJson(PRODUCTS_FILE, req.body);
    res.json({ success: true });
  });

  app.get("/api/sales", async (req, res) => {
    const sales = await readJson(SALES_FILE, []);
    res.json(sales);
  });

  app.post("/api/sales", async (req, res) => {
    await writeJson(SALES_FILE, req.body);
    res.json({ success: true });
  });

  app.get("/api/profile", async (req, res) => {
    const profile = await readJson(PROFILE_FILE, {
      name: 'Maria',
      photo: null,
      passwordHash: 'admin',
    });
    res.json(profile);
  });

  app.post("/api/profile", async (req, res) => {
    await writeJson(PROFILE_FILE, req.body);
    res.json({ success: true });
  });

  app.get("/api/config", async (req, res) => {
    const config = await readJson(CONFIG_FILE, {
      categories: ['Feminino', 'Masculino', 'Infantil', 'Unissex', 'Acessórios'],
      brands: ['Maria Jeans', 'Sawary', 'Pit Bull', 'Consciência', 'Outras']
    });
    res.json(config);
  });

  app.post("/api/config", async (req, res) => {
    await writeJson(CONFIG_FILE, req.body);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
