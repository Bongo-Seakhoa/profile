[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex', 'claude')]
    [string]$Agent,

    [ValidateSet('active', 'idle', 'waiting', 'offline', 'blocked')]
    [string]$State = 'active',

    [string]$Message = '',

    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$heartbeatDirectory = Join-Path $Root '.watch-state\heartbeats'
$heartbeatPath = Join-Path $heartbeatDirectory "$Agent.json"
$temporaryPath = "$heartbeatPath.tmp"

New-Item -ItemType Directory -Path $heartbeatDirectory -Force | Out-Null

$payload = [ordered]@{
    agent = $Agent
    state = $State
    updated_utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    message = $Message
    pid = $PID
    machine = $env:COMPUTERNAME
}

$json = $payload | ConvertTo-Json
[System.IO.File]::WriteAllText($temporaryPath, $json, [System.Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $temporaryPath -Destination $heartbeatPath -Force

Write-Output "$Agent heartbeat: $State at $($payload.updated_utc)"
