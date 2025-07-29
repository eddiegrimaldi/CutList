# FTP server details
$ftpUrl = "ftp://www.kettlebread.com/cutlist/"
$user = "Administrator:@aJ8231997"

# Get all files in the current directory and subdirectories, excluding .git folder and the script itself
$filesToUpload = Get-ChildItem -Path (Get-Location) -Recurse -File -Exclude ".git*", "upload.ps1", "node_modules"

foreach ($file in $filesToUpload) {
    # Get the relative path of the file
    $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
    # Replace backslashes with forward slashes for the URL
    $remotePath = $relativePath.Replace('\', '/')
    $remoteUrl = "$($ftpUrl)$($remotePath)"

    # Upload the file
    Write-Host "Uploading $($file.FullName) to $($remoteUrl)..."
    curl.exe -T "$($file.FullName)" --ftp-create-dirs "$($remoteUrl)" --user "$($user)"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to upload $($file.FullName)"
    }
}

Write-Host "Upload complete."
