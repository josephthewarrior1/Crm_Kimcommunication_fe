# Rename to zip
Rename-Item -Path "public\Database_Template.xlsx" -NewName "Database_Template.zip" -Force

# Extract
Expand-Archive -Path "public\Database_Template.zip" -DestinationPath "public\temp_excel" -Force
Remove-Item -Path "public\Database_Template.zip" -Force

# Replace spelling in all xml files recursively
Get-ChildItem -Path "public\temp_excel" -Recurse -File | ForEach-Object {
    $filePath = $_.FullName
    $content = [System.IO.File]::ReadAllText($filePath)
    if ($content.Contains("telecomunication") -or $content.Contains("Telecomunication")) {
        $content = $content.Replace("telecomunication", "telecommunication")
        $content = $content.Replace("Telecomunication", "Telecommunication")
        [System.IO.File]::WriteAllText($filePath, $content)
    }
}

# Compress back to zip
Compress-Archive -Path "public\temp_excel\*" -DestinationPath "public\Database_Template.zip" -Force

# Rename back to xlsx
Rename-Item -Path "public\Database_Template.zip" -NewName "Database_Template.xlsx" -Force

# Cleanup temp folder
Remove-Item -Path "public\temp_excel" -Recurse -Force

Write-Host "Successfully updated Database_Template.xlsx spelling!"
