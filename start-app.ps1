param(
    [switch]$Install
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

function Resolve-CommandPath {
    param(
        [string[]]$Names,
        [string]$InstallHint
    )

    foreach ($Name in $Names) {
        $Command = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Command) {
            return $Command.Source
        }
    }

    throw "Could not find $($Names -join ' or '). $InstallHint"
}

function Receive-AppJobOutput {
    param(
        [System.Management.Automation.Job[]]$Jobs
    )

    $JobErrors = @()
    Receive-Job -Job $Jobs -ErrorAction SilentlyContinue -ErrorVariable JobErrors |
        ForEach-Object { Write-Host $_ }

    foreach ($JobError in $JobErrors) {
        Write-Host $JobError.ToString()
    }
}

$Python = Resolve-CommandPath @("python", "python3", "py") "Install Python 3.10+ and make it available on PATH."
$Npm = Resolve-CommandPath @("npm.cmd", "npm") "Install Node.js 18+ and make npm available on PATH."

if ($Install) {
    Write-Host "Installing backend dependencies..."
    Push-Location $BackendDir
    & $Python -m pip install -r requirements.txt
    Pop-Location

    Write-Host "Installing frontend dependencies..."
    Push-Location $FrontendDir
    & $Npm install
    Pop-Location
}

Write-Host ""
Write-Host "Starting Catalyst Predictor..."
Write-Host "Backend:  http://localhost:8000"
Write-Host "API docs: http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:5173"
Write-Host ""
Write-Host "Press Ctrl+C to stop both processes."
Write-Host ""

$BackendJob = Start-Job -Name "catalyst-backend" -ScriptBlock {
    param($Python, $BackendDir)
    Set-Location $BackendDir
    & $Python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 2>&1 |
        ForEach-Object { $_.ToString() }
} -ArgumentList $Python, $BackendDir

$FrontendJob = Start-Job -Name "catalyst-frontend" -ScriptBlock {
    param($Npm, $FrontendDir)
    Set-Location $FrontendDir
    & $Npm run dev -- --host 127.0.0.1 --port 5173 2>&1 |
        ForEach-Object { $_.ToString() }
} -ArgumentList $Npm, $FrontendDir

try {
    while ($true) {
        Receive-AppJobOutput @($BackendJob, $FrontendJob)

        $FailedJob = @($BackendJob, $FrontendJob) | Where-Object {
            $_.State -in @("Failed", "Stopped", "Completed")
        } | Select-Object -First 1

        if ($FailedJob) {
            Receive-AppJobOutput @($BackendJob, $FrontendJob)
            throw "$($FailedJob.Name) exited with state $($FailedJob.State)."
        }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping Catalyst Predictor..."
    Stop-Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job $BackendJob, $FrontendJob -Force -ErrorAction SilentlyContinue
}
