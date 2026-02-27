import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.url === '/') {
    console.log("Root request received");
  }
  if (!req.url.startsWith('/@vite') && !req.url.startsWith('/src')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

const PORT = Number(process.env.PORT) || 3000;

console.log("Starting server with NODE_ENV:", process.env.NODE_ENV);

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nekogold',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 
});

// Initialize database tables
async function initDb() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        carat INT NOT NULL,
        type VARCHAR(255) NOT NULL,
        supplier VARCHAR(255) NOT NULL,
        brilliant TEXT,
        weight DOUBLE NOT NULL,
        supplierPrice DOUBLE NOT NULL,
        price DOUBLE NOT NULL,
        stockCount INT NOT NULL,
        imageUrl LONGTEXT,
        purchaseDate VARCHAR(255) NOT NULL,
        logs JSON
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(255) PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        address TEXT,
        cashDebt DOUBLE DEFAULT 0,
        goldDebt DOUBLE DEFAULT 0
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(255) PRIMARY KEY,
        productId VARCHAR(255),
        productName VARCHAR(255),
        productCode VARCHAR(255),
        type VARCHAR(255),
        customerName VARCHAR(255),
        price DOUBLE,
        discount DOUBLE,
        total DOUBLE,
        date VARCHAR(255),
        status VARCHAR(50),
        returnNote TEXT,
        weight DOUBLE,
        carat INT,
        supplier VARCHAR(255),
        brilliant TEXT,
        imageUrl LONGTEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS scraps (
        id VARCHAR(255) PRIMARY KEY,
        customerName VARCHAR(255),
        idCardFin VARCHAR(255),
        phones JSON,
        items JSON,
        pricePerGram DOUBLE,
        totalPrice DOUBLE,
        personImage LONGTEXT,
        idCardImage LONGTEXT,
        isMelted BOOLEAN,
        date VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1,
        config JSON NOT NULL
      )
    `);

    connection.release();
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("!!! DATABASE CONNECTION ERROR !!!");
    console.error("Details:", err.message);
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, time: new Date().toISOString() });
});

// --- API Routes (Products, Sales, Customers, Scraps, Settings hissələri dəyişməz qaldı) ---
// (Qısalıq üçün bu hissələri burada təkrar yazmıram, amma sənin orijinal kodundakı kimidir)

// DÜZƏLİŞ 1: API Catch-all (Ulduz xətası burada həll olundu)
app.all("/api/(.*)", (req, res) => {
  console.log(`404 API: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Vite middleware and server startup
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    console.log("Production mode: Serving static files...");
    const publicPath = path.join(__dirname, "..", "public");
    app.use(express.static(publicPath));
    
    // DÜZƏLİŞ 2: SPA fallback (Ulduz xətası burada həll olundu)
    app.get(/^(?!\/api).+/, (req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });

  } else {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.join(__dirname, "../frontend")
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  initDb().catch(err => console.error("Critical DB error:", err));
}

startServer();
