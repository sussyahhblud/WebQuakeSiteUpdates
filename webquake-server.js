const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const AdmZip = require('adm-zip');
const os = require('os');

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.pak': 'application/octet-stream',
    '.bsp': 'application/octet-stream',
    '.mdl': 'application/octet-stream',
    '.spr': 'application/octet-stream',
    '.wav': 'audio/wav'
};

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

// Download and extract Quake data
async function handleDownloadQuake(req, res) {
    // Primary and fallback URLs for Quake data
    const zipUrls = [
        'https://dl.dropboxusercontent.com/scl/fi/qq3i5r2am7d8c9hwdxd09/id1.zip?rlkey=0uh9hy2fignyk114lc8d6lbta&st=xzgizi6l&dl=0'
    ];
    const id1Dir = path.join(__dirname, 'Client', 'id1');
    const tempDir = os.tmpdir();
    const tempZipPath = path.join(tempDir, 'id1.zip');

    try {
        // Check if id1 directory already exists with game files
        if (fs.existsSync(id1Dir)) {
            const files = fs.readdirSync(id1Dir);
            if (files.length > 0) {
                res.writeHead(409, { 'Content-Type': 'text/plain' });
                res.end('Quake data already exists');
                return;
            }
        }

        console.log('Starting download of Quake data...');
        
        // Try each URL until one succeeds
        let downloadSuccess = false;
        let lastError = null;
        
        for (const zipUrl of zipUrls) {
            try {
                console.log(`Attempting download from: ${zipUrl.substring(0, 50)}...`);
                await downloadFile(zipUrl, tempZipPath);
                downloadSuccess = true;
                console.log('Download successful');
                break;
            } catch (error) {
                console.error(`Download failed from ${zipUrl.substring(0, 50)}: ${error.message}`);
                lastError = error;
                // Clean up failed download
                if (fs.existsSync(tempZipPath)) {
                    try { fs.unlinkSync(tempZipPath); } catch (e) {}
                }
            }
        }
        
        if (!downloadSuccess) {
            throw lastError || new Error('All download URLs failed');
        }
        
        console.log('Download complete, extracting...');
        
        // Create id1 directory if it doesn't exist
        if (!fs.existsSync(id1Dir)) {
            fs.mkdirSync(id1Dir, { recursive: true });
        }
        
        // Extract the zip file with security checks
        const zip = new AdmZip(tempZipPath);
        const entries = zip.getEntries();
        
        for (const entry of entries) {
            const entryPath = entry.entryName;
            
            // Security check: prevent zip-slip attacks
            if (entryPath.includes('..') || path.isAbsolute(entryPath)) {
                console.warn(`Skipping dangerous path: ${entryPath}`);
                continue;
            }
            
            // Remove any "id1/" prefix from the path since we're already extracting to id1Dir
            const cleanPath = entryPath.replace(/^id1[\/\\]/, '');
            const outputPath = path.join(id1Dir, cleanPath);
            
            // Ensure the output path is within id1Dir
            if (!outputPath.startsWith(id1Dir)) {
                console.warn(`Skipping path outside target directory: ${entryPath}`);
                continue;
            }
            
            if (!entry.isDirectory) {
                // Ensure directory exists
                const dir = path.dirname(outputPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Extract file
                fs.writeFileSync(outputPath, entry.getData());
            }
        }
        
        // Clean up temporary file
        fs.unlinkSync(tempZipPath);
        
        console.log('Quake data extraction complete');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Download and extraction complete');
        
    } catch (error) {
        console.error('Error downloading Quake data:', error);
        
        // Clean up temp file if it exists
        if (fs.existsSync(tempZipPath)) {
            try { fs.unlinkSync(tempZipPath); } catch (e) {}
        }
        
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to download Quake data: ' + error.message);
    }
}

// Download file helper function with redirect support
function downloadFile(url, outputPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        
        const doDownload = (currentUrl, redirectCount) => {
            const protocol = currentUrl.startsWith('https') ? https : http;
            
            const request = protocol.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
                    if (redirectCount >= maxRedirects) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    const redirectUrl = response.headers.location;
                    console.log(`Following redirect to: ${redirectUrl}`);
                    doDownload(redirectUrl, redirectCount + 1);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                
                file.on('error', (err) => {
                    fs.unlink(outputPath, () => {}); // Delete the file on error
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Delete the file on error
                reject(err);
            });
            
            request.setTimeout(60000, () => {
                request.destroy();
                reject(new Error('Download timeout'));
            });
        };
        
        doDownload(url, 0);
    });
}

const server = http.createServer((req, res) => {
    // Enable CORS and prevent caching for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // CORS proxy endpoint for downloading external files (RESTRICTED)
    if (pathname === '/api/proxy' && parsedUrl.query.url) {
        const externalUrl = parsedUrl.query.url;
        
        // Security: Only allow http/https protocols
        if (!externalUrl.startsWith('http://') && !externalUrl.startsWith('https://')) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid URL protocol');
            return;
        }
        
        // Security: Whitelist allowed domains to prevent SSRF attacks
        const allowedDomains = [
            'dropbox.com',
            'dropboxusercontent.com',
            'archive.org',
            'github.com',
            'githubusercontent.com',
            'cdn.cloudflare.net',
            'cloudinary.com'
        ];
        
        try {
            const urlObj = new URL(externalUrl);
            const hostname = urlObj.hostname.toLowerCase();
            
            // Block private/internal IP ranges and localhost
            const privateIpPatterns = [
                /^localhost$/i,
                /^127\./,
                /^10\./,
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
                /^192\.168\./,
                /^169\.254\./,
                /^::1$/,
                /^fc00:/,
                /^fe80:/
            ];
            
            if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Access to internal/private addresses is forbidden');
                return;
            }
            
            // Check if domain is in whitelist
            const isAllowed = allowedDomains.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            );
            
            if (!isAllowed) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Domain not whitelisted for proxy access');
                return;
            }
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid URL');
            return;
        }
        
        console.log(`Proxying request to: ${externalUrl}`);
        
        const protocol = externalUrl.startsWith('https') ? https : http;
        const proxyRequest = protocol.get(externalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (proxyRes) => {
            // Reject redirects to prevent bypassing domain whitelist
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Redirects not allowed in proxy mode');
                return;
            }
            
            // Limit response size to 100MB
            const maxSize = 100 * 1024 * 1024;
            let receivedBytes = 0;
            
            // Forward headers
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
                'Content-Length': proxyRes.headers['content-length'],
                'Access-Control-Allow-Origin': '*'
            });
            
            proxyRes.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (receivedBytes > maxSize) {
                    proxyRes.destroy();
                    if (!res.headersSent) {
                        res.writeHead(413, { 'Content-Type': 'text/plain' });
                    }
                    res.end('Response size exceeds 100MB limit');
                }
            });
            
            proxyRes.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Proxy error: ' + err.message);
            }
        });
        
        // Set timeout for proxy request
        proxyRequest.setTimeout(30000, () => {
            proxyRequest.destroy();
            if (!res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'text/plain' });
                res.end('Proxy timeout');
            }
        });
        
        return;
    }

    // Handle download Quake data endpoint
    if (req.method === 'POST' && pathname === '/api/download-quake') {
        handleDownloadQuake(req, res).catch(err => {
            console.error('Unhandled error in download handler:', err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
            }
        });
        return;
    }

    
    // Default to index.htm if accessing root
    if (pathname === '/') {
        pathname = '/index.htm';
    }

    // Serve files from the Client directory
    const filePath = path.join(__dirname, 'Client', pathname);
    
    // Security check - ensure we're only serving files from Client directory
    const normalizedPath = path.normalize(filePath);
    const clientDir = path.join(__dirname, 'Client');
    if (!normalizedPath.startsWith(clientDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err) {
            res.writeHead(404);
            res.end(`File not found: ${pathname}`);
            return;
        }

        if (stats.isFile()) {
            const contentType = getContentType(filePath);
            
            // Handle range requests for better compatibility
            if (req.headers.range) {
                const range = req.headers.range;
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
                const chunksize = (end - start) + 1;
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType
                });
                
                const stream = fs.createReadStream(filePath, { start, end });
                stream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stats.size,
                    'Accept-Ranges': 'bytes'
                });
                
                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
            }
        } else {
            res.writeHead(404);
            res.end(`Not a file: ${pathname}`);
        }
    });
});

const PORT = 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`WebQuake HTTP Server running on http://${HOST}:${PORT}`);
    console.log('Serving WebQuake client from Client/ directory');
    console.log('Access WebQuake at: http://localhost:5000');
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('Shutting down WebQuake server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});