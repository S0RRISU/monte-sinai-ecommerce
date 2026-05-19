$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Join-Path (Get-Location).Path 'tools') }
$root = (Resolve-Path (Join-Path $scriptRoot '..')).Path
$sourceDir = Join-Path $root 'assets\produtos'
$outDir = Join-Path $sourceDir 'site'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Color([string]$hex, [int]$alpha = 255) {
  $h = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb(
    $alpha,
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16)
  )
}

function New-Brush([string]$hex, [int]$alpha = 255) {
  New-Object System.Drawing.SolidBrush -ArgumentList (New-Color $hex $alpha)
}

function New-Pen([string]$hex, [float]$width, [int]$alpha = 255) {
  $pen = New-Object System.Drawing.Pen -ArgumentList (New-Color $hex $alpha), $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen
}

function Get-Accent([string]$name) {
  if ($name -match 'agua|cloro|candida|alcool|sabonete') { return '#0ea5e9' }
  if ($name -match 'gas') { return '#f59e0b' }
  if ($name -match 'vassoura|rodo|escova|pa|prendedor') { return '#16a34a' }
  if ($name -match 'sabao|detergente|amaciante|desinfetante|limpa') { return '#14b8a6' }
  return '#64748b'
}

function New-Showcase([System.IO.FileInfo]$file) {
  $size = 1000
  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $rect, (New-Color '#f8fafc'), (New-Color '#e7f3f1'), 35
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  $accent = Get-Accent $file.BaseName
  $accentBrush = New-Brush $accent 32
  $g.FillPolygon($accentBrush, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(0, 0)),
    (New-Object System.Drawing.PointF(1000, 0)),
    (New-Object System.Drawing.PointF(1000, 250)),
    (New-Object System.Drawing.PointF(0, 430))
  ))
  $accentBrush.Dispose()

  $linePen = New-Pen $accent 4 70
  for ($i = 0; $i -lt 9; $i++) {
    $y = 132 + ($i * 54)
    $g.DrawLine($linePen, 66, $y, 934, $y - 132)
  }
  $linePen.Dispose()

  $shadow = New-Brush '#0f172a' 34
  $g.FillEllipse($shadow, 190, 752, 620, 88)
  $shadow.Dispose()

  $img = [System.Drawing.Image]::FromFile($file.FullName)
  $maxW = 760
  $maxH = 590
  $scale = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
  $drawW = [Math]::Round($img.Width * $scale)
  $drawH = [Math]::Round($img.Height * $scale)
  $x = [Math]::Round(($size - $drawW) / 2)
  $y = [Math]::Round(190 + (($maxH - $drawH) / 2))
  $g.DrawImage($img, $x, $y, $drawW, $drawH)
  $img.Dispose()

  $borderPen = New-Pen '#ffffff' 18 130
  $g.DrawRectangle($borderPen, 9, 9, 982, 982)
  $borderPen.Dispose()

  $out = Join-Path $outDir $file.Name
  $bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bitmap.Dispose()

  [pscustomobject]@{ Name = $file.Name; Output = $out }
}

Get-ChildItem -Path $sourceDir -Filter '*.png' -File |
  Sort-Object Name |
  ForEach-Object { New-Showcase $_ } |
  Format-Table -AutoSize
