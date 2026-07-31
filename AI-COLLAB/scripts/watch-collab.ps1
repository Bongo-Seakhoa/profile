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

    [string]$Root = (Split-Path -Parent $PSScriptRoot),

    [string[]]$AdditionalRoots = @()
)

$ErrorActionPreference = 'Stop'

$peer = if ($Agent -eq 'codex') { 'claude' } else { 'codex' }
$resolvedRoots = [System.Collections.Generic.List[string]]::new()

foreach ($candidateRoot in @($Root) + $AdditionalRoots) {
    if ([string]::IsNullOrWhiteSpace($candidateRoot)) {
        continue
    }

    $resolvedRoot = [System.IO.Path]::GetFullPath($candidateRoot)
    if (-not $resolvedRoots.Contains($resolvedRoot)) {
        $resolvedRoots.Add($resolvedRoot)
    }
}

if ($resolvedRoots.Count -eq 0) {
    throw 'At least one collaboration root is required.'
}

$primaryRoot = $resolvedRoots[0]
$watchStateDirectory = Join-Path $primaryRoot '.watch-state'
$watchStatePath = Join-Path $watchStateDirectory "$Agent.json"
New-Item -ItemType Directory -Path $watchStateDirectory -Force | Out-Null

foreach ($collaborationRoot in $resolvedRoots) {
    New-Item -ItemType Directory -Path (Join-Path $collaborationRoot "inbox\$Agent") -Force | Out-Null
}

function Write-AgentHeartbeat {
    param(
        [Parameter(Mandatory = $true)]
        [string]$State,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $payload = [ordered]@{
        agent = $Agent
        state = $State
        updated_utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
        message = $Message
        pid = $PID
        machine = $env:COMPUTERNAME
    } | ConvertTo-Json

    foreach ($collaborationRoot in $resolvedRoots) {
        $heartbeatDirectories = @(
            (Join-Path $collaborationRoot '.watch-state\heartbeats'),
            (Join-Path $collaborationRoot 'heartbeats')
        )

        foreach ($heartbeatDirectory in $heartbeatDirectories) {
            New-Item -ItemType Directory -Path $heartbeatDirectory -Force | Out-Null
            $heartbeatPath = Join-Path $heartbeatDirectory "$Agent.json"
            $temporaryPath = "$heartbeatPath.$PID.tmp"
            [System.IO.File]::WriteAllText(
                $temporaryPath,
                $payload,
                [System.Text.UTF8Encoding]::new($false)
            )
            Move-Item -LiteralPath $temporaryPath -Destination $heartbeatPath -Force
        }
    }
}

function Read-NewestPeerHeartbeat {
    $newest = $null

    foreach ($collaborationRoot in $resolvedRoots) {
        $candidatePaths = @(
            (Join-Path $collaborationRoot ".watch-state\heartbeats\$peer.json"),
            (Join-Path $collaborationRoot "heartbeats\$peer.json")
        )

        foreach ($candidatePath in $candidatePaths) {
            if (-not (Test-Path -LiteralPath $candidatePath)) {
                continue
            }

            try {
                $payload = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
                $updatedUtc = [DateTime]::Parse(
                    $payload.updated_utc,
                    [Globalization.CultureInfo]::InvariantCulture,
                    [Globalization.DateTimeStyles]::AssumeUniversal
                ).ToUniversalTime()

                if ($null -eq $newest -or $updatedUtc -gt $newest.updatedUtc) {
                    $newest = [pscustomobject]@{
                        path = $candidatePath
                        payload = $payload
                        updatedUtc = $updatedUtc
                    }
                }
            }
            catch {
                Write-Warning "Peer heartbeat is unreadable: $candidatePath"
            }
        }
    }

    return $newest
}

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
        Write-AgentHeartbeat `
            -State active `
            -Message "Watching $($resolvedRoots.Count) inbox root(s) for $peer messages."
        $nextHeartbeatUtc = $nowUtc.AddSeconds($HeartbeatSeconds)
    }

    foreach ($collaborationRoot in $resolvedRoots) {
        $inbox = Join-Path $collaborationRoot "inbox\$Agent"
        $newMessages = Get-ChildItem -LiteralPath $inbox -File -Filter '*.md' |
            Where-Object { $_.LastWriteTimeUtc -gt $lastScanUtc } |
            Sort-Object LastWriteTimeUtc

        foreach ($message in $newMessages) {
            Write-Output "NEW MESSAGE [$collaborationRoot]: $($message.FullName)"
        }
    }

    $peerHeartbeat = Read-NewestPeerHeartbeat
    if ($null -eq $peerHeartbeat) {
        Write-Warning "No $peer heartbeat found across $($resolvedRoots.Count) collaboration root(s)."
    }
    else {
        $peerAge = $nowUtc - $peerHeartbeat.updatedUtc
        if ($peerAge.TotalHours -gt 3) {
            Write-Warning "$peer is offline by protocol; heartbeat age is $([math]::Round($peerAge.TotalHours, 2)) hours."
        }
    }

    $lastScanUtc = $nowUtc
    $watchState = [ordered]@{
        agent = $Agent
        peer = $peer
        roots = @($resolvedRoots)
        last_scan_utc = $lastScanUtc.ToString('yyyy-MM-ddTHH:mm:ssZ')
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText(
        $watchStatePath,
        $watchState,
        [System.Text.UTF8Encoding]::new($false)
    )

    if ($Once) {
        break
    }

    if (($nowUtc - $startedUtc).TotalMinutes -ge $MaxMinutes) {
        break
    }

    Start-Sleep -Seconds $PollSeconds
} while ($true)

Write-AgentHeartbeat -State idle -Message 'Collaboration watcher stopped.'
