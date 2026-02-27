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
const PORT = Number(process.env.PORT) || 3000;
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
async function initDb() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`CREATE TABLE IF NOT EXISTS settings (id INT PRIMARY KEY DEFAULT 1, config JSON NOT NULL)`);
        // Digər cədvəllər buradadır...
        connection.release();
    }
    catch (err) {
        console.error("DB Error:", err.message);
    }
}
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
// --- Bütün API-lərin (products, sales və s.) burada olduğunu fərz edirik ---
// (Qısalıq üçün bura yazmıram, amma sənin orijinal kodundakılar qalsın)
// ⚠️ XƏTANI HƏLL EDƏN HİSSƏ:
// Adlandırılmış parametr istifadə edirik (:path*)
app.all("/api/:path*", (req, res) => {
    res.status(404).json({ error: "API not found" });
});
async function startServer() {
    if (process.env.NODE_ENV === "production") {
        const publicPath = path.join(__dirname, "..", "public");
        app.use(express.static(publicPath));
        // ⚠️ XƏTANI HƏLL EDƏN HİSSƏ:
        // Regex yerinə ulduz və daxili yoxlama
        app.get("*", (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.join(publicPath, "index.html"));
            }
        });
    }
    else {
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
    initDb();
}
startServer();
