Write-Host "Fixing corrupted .git/index..." -ForegroundColor Yellow
Remove-Item -Force .git\index
git reset HEAD
Write-Host "Done! Git is healthy." -ForegroundColor Green
git status
