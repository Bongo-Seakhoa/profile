[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex', 'claude')]
    [string]$Recipient,

    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [string]$Root = '',

    [string[]]$AdditionalRoots = @()
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Root)) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $Root = Split-Path -Parent $scriptDirectory
}

$resolvedSource = [System.IO.Path]::GetFullPath($SourcePath)
if (-not (Test-Path -LiteralPath $resolvedSource -PathType Leaf)) {
    throw "Message source does not exist: $resolvedSource"
}
if ([System.IO.Path]::GetExtension($resolvedSource) -ne '.md') {
    throw 'Collaboration messages must be Markdown files.'
}

function Get-Sha256Hex {
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$Bytes
    )

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString(
            $sha256.ComputeHash($Bytes)
        ).Replace('-', '')
    }
    finally {
        $sha256.Dispose()
    }
}

$messageBytes = [System.IO.File]::ReadAllBytes($resolvedSource)
$sourceHash = Get-Sha256Hex -Bytes $messageBytes
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

foreach ($collaborationRoot in $resolvedRoots) {
    $inbox = Join-Path $collaborationRoot "inbox\$Recipient"
    [System.IO.Directory]::CreateDirectory($inbox) | Out-Null
    $destination = Join-Path $inbox (
        [System.IO.Path]::GetFileName($resolvedSource)
    )

    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $existingBytes = [System.IO.File]::ReadAllBytes($destination)
        $existingHash = Get-Sha256Hex -Bytes $existingBytes
        if ($existingHash -ne $sourceHash) {
            throw "Refusing to overwrite a different message: $destination"
        }

        Write-Output "UNCHANGED $destination"
        continue
    }

    $temporary = "$destination.$PID.tmp"
    [System.IO.File]::WriteAllBytes($temporary, $messageBytes)
    Move-Item -LiteralPath $temporary -Destination $destination
    Write-Output "PUBLISHED $destination"
}
