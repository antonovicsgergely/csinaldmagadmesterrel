// server.js - Simple, dependency-free static web server for local testing

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3005;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    // Decode URI to handle spaces in folder/file names
    const decodedUrl = decodeURIComponent(req.url);
    
    // Resolve clean path
    let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
    
    // Extract file extension
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine MIME type
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Read file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found, serve index.html for SPA-like routes or return 404
                fs.readFile(path.join(__dirname, '404.html'), (err, fallbackContent) => {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    if (fallbackContent) {
                        res.end(fallbackContent, 'utf-8');
                    } else {
                        res.end('<h1>404 Hiba: A keresett oldal nem található</h1>', 'utf-8');
                    }
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Belső szerver hiba: ${error.code} ..\n`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(` Mester kőműves webalkalmazás elindítva!`);
    console.log(` Port: ${PORT}`);
    console.log(` Látogatói Főoldal:   http://localhost:${PORT}`);
    console.log(` Mester Admin Panel:  http://localhost:${PORT}/admin.html`);
    console.log(`=============================================================`);
    console.log(`Nyomj Ctrl+C billentyűkombinációt a szerver leállításához.`);
});
