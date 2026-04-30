# Script de prueba para verificar la conexión MCP y diagnosticar problemas
# Uso: .\test-mcp-connection.ps1

$API_URL = "https://ai-shop-agent.mcp-osvaldo.workers.dev"

Write-Host "🧪 Testing AI Shop MCP Server Connection" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    if ($health.success) {
        Write-Host "✅ Health check passed" -ForegroundColor Green
        Write-Host "   Service: $($health.service)" -ForegroundColor Gray
        Write-Host "   Status: $($health.status)" -ForegroundColor Gray
        Write-Host "   SSE Keep-alive: $($health.config.sse_keepalive_interval)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 2: Diagnostics
Write-Host "2️⃣  Testing Diagnostics Endpoint..." -ForegroundColor Yellow
try {
    $diagnostics = Invoke-RestMethod -Uri "$API_URL/diagnostics" -Method Get
    if ($diagnostics.success) {
        Write-Host "✅ Diagnostics passed" -ForegroundColor Green
        Write-Host "   Database: $($diagnostics.tests.database)" -ForegroundColor Gray
        Write-Host "   Products in DB: $($diagnostics.tests.products_count)" -ForegroundColor Gray
        Write-Host "   SSE Endpoint: $($diagnostics.tests.sse_endpoint)" -ForegroundColor Gray
        Write-Host "   REST Endpoint: $($diagnostics.tests.rest_endpoint)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Diagnostics failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: List Products (REST API)
Write-Host "3️⃣  Testing REST API - List Products..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri "$API_URL/products?search=pantalon" -Method Get
    if ($products.success) {
        Write-Host "✅ Products API working" -ForegroundColor Green
        Write-Host "   Found $($products.data.Count) products`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Products API failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 4: MCP Tools Call (Stateless REST)
Write-Host "4️⃣  Testing MCP REST Endpoint (Stateless)..." -ForegroundColor Yellow
try {
    $body = @{
        tool = "list_products"
        args = @{
            search = "pantalon"
            limit = 5
        }
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    # Note: For local testing, replace URL with http://localhost:3000/api/tools/call
    $localUrl = "http://localhost:3000/api/tools/call"
    
    Write-Host "   Testing LOCAL server: $localUrl" -ForegroundColor Gray
    Write-Host "   (Make sure MCP HTTP server is running: npm run dev:mcp)`n" -ForegroundColor Gray
    
    try {
        $result = Invoke-RestMethod -Uri $localUrl -Method Post -Body $body -Headers $headers -TimeoutSec 5
        if ($result.success) {
            Write-Host "✅ MCP REST endpoint working (LOCAL)" -ForegroundColor Green
            Write-Host "   Found $($result.data.products.Count) products" -ForegroundColor Gray
            Write-Host "   First product: $($result.data.products[0].name)`n" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Local server not running or not responding" -ForegroundColor Yellow
        Write-Host "   Run: npm run dev:mcp to start the local MCP server`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ MCP REST endpoint failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 5: SSE Connection (monitor for 15 seconds)
Write-Host "5️⃣  Testing SSE Connection (Keep-alive)..." -ForegroundColor Yellow
Write-Host "   Opening SSE stream for 15 seconds to monitor pings..." -ForegroundColor Gray
Write-Host "   Expected: Ping events every 10 seconds`n" -ForegroundColor Gray

try {
    $job = Start-Job -ScriptBlock {
        param($url)
        $request = [System.Net.WebRequest]::Create("$url/sse")
        $request.Method = "GET"
        $response = $request.GetResponse()
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        
        $startTime = Get-Date
        while (((Get-Date) - $startTime).TotalSeconds -lt 15) {
            $line = $reader.ReadLine()
            if ($line) {
                Write-Output $line
            }
        }
        
        $reader.Close()
        $stream.Close()
        $response.Close()
    } -ArgumentList $API_URL

    Start-Sleep -Seconds 16
    $output = Receive-Job -Job $job
    Stop-Job -Job $job
    Remove-Job -Job $job

    if ($output -match "ping") {
        Write-Host "✅ SSE Keep-alive working (ping events detected)" -ForegroundColor Green
        $pingCount = ($output | Select-String -Pattern "ping" -AllMatches).Matches.Count
        Write-Host "   Received $pingCount ping events in 15 seconds`n" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  No ping events detected" -ForegroundColor Yellow
        Write-Host "   This might indicate SSE connection issues`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ SSE test failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Recommendations for Chatwoot/WhatsApp Integration:" -ForegroundColor Green
Write-Host "   1. Use REST endpoint instead of SSE:" -ForegroundColor White
Write-Host "      $API_URL/api/tools/call`n" -ForegroundColor Gray

Write-Host "   2. Configure in your Dashboard:" -ForegroundColor White
Write-Host "      - MCP URL: Use the REST endpoint above" -ForegroundColor Gray
Write-Host "      - Method: POST" -ForegroundColor Gray
Write-Host "      - Body format: { tool: 'tool_name', args: {...} }`n" -ForegroundColor Gray

Write-Host "   3. Verify user has organizationId:" -ForegroundColor White
Write-Host "      - Check in your database" -ForegroundColor Gray
Write-Host "      - User ID from error: cmkn0zpsl0ti9oxqcmr0g5p1u`n" -ForegroundColor Gray

Write-Host "   4. Monitor Cloudflare Workers logs:" -ForegroundColor White
Write-Host "      wrangler tail --format pretty`n" -ForegroundColor Gray

Write-Host "`n🆘 If issues persist, see:" -ForegroundColor Yellow
Write-Host "   docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md`n" -ForegroundColor Gray
