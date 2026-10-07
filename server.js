const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة بيانات PostgreSQL على Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// إنشاء الجداول تلقائياً في قاعدة البيانات عند التشغيل
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                category VARCHAR(100),
                img TEXT,
                description TEXT,
                search_count INT DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        console.log('✅ تم إنشاء الجداول في قاعدة البيانات بنجاح');
    } catch (err) {
        console.error('❌ خطأ في إعداد الجداول:', err);
    }
}
initDB();

// --- APIs المنتجات ---

// 1. جلب جميع المنتجات
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, price, category, img, description AS desc, search_count AS "searchCount" FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. إضافة منتج جديد
app.post('/api/products', async (req, res) => {
    const { name, price, category, img, desc } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, price, category, img, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, price, category, img, desc]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. حذف منتج
app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: 'تم الحذف بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. زيادة عداد البحث لمنتج
app.patch('/api/products/:id/search', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE products SET search_count = search_count + 1 WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- APIs المستخدمين ---

// 5. تسجيل حساب جديد
app.post('/api/users/register', async (req, res) => {
    const { name, username, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, username, password) VALUES ($1, $2, $3) RETURNING id, name, username',
            [name, username, password]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
    }
});

// 6. تسجيل الدخول
app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, name, username FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length > 0) {
            res.json({ role: 'user', data: result.rows[0] });
        } else {
            res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));