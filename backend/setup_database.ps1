# Check if PostgreSQL is installed
$pgInstalled = $false
try {
    $pgVersion = (& pg_config --version) 2>$null
    if ($pgVersion) {
        Write-Host "PostgreSQL is installed: $pgVersion" -ForegroundColor Green
        $pgInstalled = $true
    }
} catch {
    Write-Host "PostgreSQL does not appear to be installed or not in PATH" -ForegroundColor Yellow
}

if (-not $pgInstalled) {
    Write-Host "You need to install PostgreSQL to continue. Please visit https://www.postgresql.org/download/" -ForegroundColor Yellow
    Write-Host "After installation, make sure to add PostgreSQL bin directory to your PATH." -ForegroundColor Yellow
    Write-Host "Default password set in .env is 'root'. Make sure to use this during PostgreSQL installation or update the .env file." -ForegroundColor Yellow
    exit
}

# Check if PostgreSQL service is running
try {
    $pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
    if ($pgService.Status -ne 'Running') {
        Write-Host "PostgreSQL service is not running. Attempting to start it..." -ForegroundColor Yellow
        Start-Service -Name $pgService.Name
        Write-Host "PostgreSQL service started" -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL service is running" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not check or start PostgreSQL service. It might not be installed as a Windows service." -ForegroundColor Yellow
    Write-Host "Please make sure PostgreSQL server is running before continuing." -ForegroundColor Yellow
}

# Install required Node.js modules if not already installed
if (-not (Test-Path -Path "node_modules/pg")) {
    Write-Host "Installing required Node.js modules..." -ForegroundColor Yellow
    npm install pg dotenv
}

# Run the database initialization script
Write-Host "Initializing database..." -ForegroundColor Yellow
node sql/initialize_database.js

# Check if the script ran successfully
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database initialization completed successfully" -ForegroundColor Green
    Write-Host "You can now start the server with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "Database initialization failed with exit code $LASTEXITCODE" -ForegroundColor Red
} 