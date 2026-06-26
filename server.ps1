# server.ps1 - Pure PowerShell static file web server using .NET HttpListener (with Cache-Control headers)

$port = 3005
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Error "Nem sikerült elindítani a szervert a $port-es porton. Lehet, hogy már fut egy másik folyamat ezen a porton?"
    Exit
}

Write-Host "=============================================================" -ForegroundColor Green
Write-Host " Mester kőműves webalkalmazás elindítva (PowerShell)!" -ForegroundColor Green
Write-Host " Port: $port" -ForegroundColor White
Write-Host " Látogatói Főoldal:   http://localhost:$port/" -ForegroundColor Cyan
Write-Host " Mester Admin Panel:  http://localhost:$port/admin.html" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "Zárd be a terminált a leállításhoz." -ForegroundColor Yellow

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css"
    ".js" = "application/javascript"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif" = "image/gif"
    ".svg" = "image/svg+xml"
    ".ico" = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $url = [uri]::UnescapeDataString($request.Url.LocalPath)
        if ($url -eq "/") { $url = "/index.html" }

        # Normalize relative path to avoid path traversal
        $cleanUrl = $url.Replace("..", "").TrimStart('/')
        $filePath = Join-Path $PSScriptRoot $cleanUrl

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if ($null -eq $contentType) { $contentType = "application/octet-stream" }

            $response.ContentType = $contentType
            $response.StatusCode = 200

            # Disable caching for local development
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")

            # Read file as bytes to safely handle images and binaries
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $response.ContentType = "text/html; charset=utf-8"
            $html = "<h1>404 Hiba: A keresett fájl nem található</h1><p>Útvonal: $url</p>"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    } catch {
        # Handle exceptions gracefully
        Write-Host "Hiba történt a kérés kiszolgálása közben: $_" -ForegroundColor Red
    } finally {
        if ($null -ne $response) {
            $response.Close()
        }
    }
}

$listener.Stop()
