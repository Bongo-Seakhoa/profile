[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex', 'claude')]
    [string]$Agent,

    [ValidateRange(2, 300)]
    [int]$PollSeconds = 10,

    [ValidateRange(1, 180)]
    [int]$HeartbeatSeconds = 30,

    [ValidateRange(1, 1440)]
    [int]$MaxMinutes = 480,

    [switch]$Once,

    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$peer = if ($Agent -eq 'codex') { 'claude' } else { 'codex' }
$inbox = Join-Path $Root "inbox\$Agent"
$heartbeatScript = Join-Path $PSScriptRoot 'heartbeat.ps1'
$peerHeartbeatPath = Join-Path $Root ".watch-state\heartbeats\$peer.json"
$watchStateDirectory = Join-Path $Root '.watch-state'
$watchStatePath = Join-Path $watchStateDirectory "$Agent.json"

New-Item -ItemType Directory -Path $inbox -Force | Out-Null
New-Item -ItemType Directory -Path $watchStateDirectory -Force | Out-Null

$lastScanUtc = [DateTime]::UtcNow.AddSeconds(-1)
if (Test-Path -LiteralPath $watchStatePath) {
    try {
        $savedState = Get-Content -LiteralPath $watchStatePath -Raw | ConvertFrom-Json
        $lastScanUtc = [DateTime]::Parse(
            $savedState.last_scan_utc,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::AssumeUniversal
        ).ToUniversalTime()
    }
    catch {
        Write-Warning "Ignoring unreadable watcher state: $watchStatePath"
    }
}

$startedUtc = [DateTime]::UtcNow
$nextHeartbeatUtc = $startedUtc

do {
    $nowUtc = [DateTime]::UtcNow

    if ($nowUtc -ge $nextHeartbeatUtc) {
        & $heartbeatScript -Agent $Agent -State active -Message "Watching inbox/$Agent for $peer messages." -Root $Root | Out-Null
        $nextHeartbeatUtc = $nowUtc.AddSeconds($HeartbeatSeconds)
    }

    $newMessages = Get-ChildItem -LiteralPath $inbox -File -Filter '*.md' |
        Where-Object { $_.LastWriteTimeUtc -gt $lastScanUtc } |
        Sort-Object LastWriteTimeUtc

    foreach ($message in $newMessages) {
        Write-Output "NEW MESSAGE: $($message.FullName)"
    }

    if (Test-Path -LiteralPath $peerHeartbeatPath) {
        try {
            $peerHeartbeat = Get-Content -LiteralPath $peerHeartbeatPath -Raw | ConvertFrom-Json
            $peerUpdatedUtc = [DateTime]::Parse(
                $peerHeartbeat.updated_utc,
                [Globalization.CultureInfo]::InvariantCulture,
                [Globalization.DateTimeStyles]::AssumeUniversal
            ).ToUniversalTime()
            $peerAge = $nowUtc - $peerUpdatedUtc
            if ($peerAge.TotalHours -gt 3) {
                Write-Warning "$peer is offline by protocol; heartbeat age is $([math]::Round($peerAge.TotalHours, 2)) hours."
            }
        }
        catch {
            Write-Warning "Peer heartbeat is unreadable: $peerHeartbeatPath"
        }
    }
    else {
        Write-Warning "Peer heartbeat not found: $peerHeartbeatPath"
    }

    $lastScanUtc = $nowUtc
    $watchState = [ordered]@{
        agent = $Agent
        peer = $peer
        last_scan_utc = $lastScanUtc.ToString('yyyy-MM-ddTHH:mm:ssZ')
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText($watchStatePath, $watchState, [System.Text.UTF8Encoding]::new($false))

    if ($Once) {
        break
    }

    if (($nowUtc - $startedUtc).TotalMinutes -ge $MaxMinutes) {
        break
    }

    Start-Sleep -Seconds $PollSeconds
} while ($true)

& $heartbeatScript -Agent $Agent -State idle -Message 'Collaboration watcher stopped.' -Root $Root
