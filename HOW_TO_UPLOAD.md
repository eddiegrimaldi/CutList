# File Upload Instructions

## Working Upload Command

Use this exact format for uploading files to the server:

```bash
curl -T "/path/to/file" --user "Administrator:@aJ8231997" "ftp://www.kettlebread.com/cutlist/path/to/destination"
```

## Examples

### Upload a single module file:
```bash
curl -T "/home/edgrimaldi/cutlist/modules/DrillPressSystem.js" --user "Administrator:@aJ8231997" "ftp://www.kettlebread.com/cutlist/modules/DrillPressSystem.js"
```

### Upload main application file:
```bash
curl -T "/home/edgrimaldi/cutlist/drawing-world.js" --user "Administrator:@aJ8231997" "ftp://www.kettlebread.com/cutlist/drawing-world.js"
```

### Upload workspace file:
```bash
curl -T "/home/edgrimaldi/cutlist/workspace.php" --user "Administrator:@aJ8231997" "ftp://www.kettlebread.com/cutlist/workspace.php"
```

## Important Notes

- **Do NOT use PowerShell** - Use direct curl command
- **Do NOT embed credentials in URL** - Use separate --user flag
- **Always specify full destination path** including filename
- **Check upload success** by verifying byte count in output
- Server credentials: `Administrator:@aJ8231997`
- Server: `www.kettlebread.com`
- Base path: `/cutlist/`

## What NOT to Do

❌ `powershell.exe -Command "curl.exe ..."`
❌ `ftp://Administrator:@aJ8231997@www.kettlebread.com...`
❌ `--ftp-create-dirs` with directory only (no filename)

✅ `curl -T "source" --user "Administrator:@aJ8231997" "ftp://www.kettlebread.com/cutlist/destination"`