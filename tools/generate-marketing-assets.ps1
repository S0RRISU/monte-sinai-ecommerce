$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Join-Path (Get-Location).Path 'tools') }
$root = (Resolve-Path (Join-Path $scriptRoot '..')).Path
$brandDir = Join-Path $root 'assets\brand'
$promoDir = Join-Path $root 'assets\divulgacao'
$prodDir = Join-Path $root 'assets\produtos'
$heroDir = Join-Path $root 'assets\hero'

New-Item -ItemType Directory -Force -Path $brandDir, $promoDir | Out-Null

$referenceOne = 'c:\Users\marce\OneDrive\Desktop\pati\imagens e baners\ChatGPT Image 14 de mai. de 2026, 20_54_47.png'
$referenceTwo = 'c:\Users\marce\OneDrive\Desktop\pati\imagens e baners\imagem dos produtos da pati oficial.png'
if (Test-Path -LiteralPath $referenceOne) {
  Copy-Item -LiteralPath $referenceOne -Destination (Join-Path $brandDir 'referencia-entrega-rapida.png') -Force
}
if (Test-Path -LiteralPath $referenceTwo) {
  Copy-Item -LiteralPath $referenceTwo -Destination (Join-Path $brandDir 'referencia-catalogo-oficial.png') -Force
}

function Color-Hex([string]$hex, [int]$alpha = 255) {
  $h = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb(
    $alpha,
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16)
  )
}

function New-Brush([string]$hex, [int]$alpha = 255) {
  New-Object System.Drawing.SolidBrush -ArgumentList (Color-Hex $hex $alpha)
}

function New-PenSafe([string]$hex, [float]$width, [int]$alpha = 255) {
  $pen = New-Object System.Drawing.Pen -ArgumentList (Color-Hex $hex $alpha), $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen
}

function New-FontSafe([string]$name, [float]$size, [System.Drawing.FontStyle]$style = [System.Drawing.FontStyle]::Bold) {
  New-Object System.Drawing.Font -ArgumentList $name, $size, $style, ([System.Drawing.GraphicsUnit]::Pixel)
}

function New-RoundPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $path
}

function Fill-Round($g, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-RoundPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Round($g, $pen, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-RoundPath $x $y $w $h $r
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

function Draw-Centered($g, [string]$text, [float]$x, [float]$y, [float]$w, [float]$h, [float]$size, [string]$color, [string]$fontName = 'Arial Black') {
  $font = New-FontSafe $fontName $size
  $brush = New-Brush $color
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($text, $font, $brush, (New-Object System.Drawing.RectangleF($x, $y, $w, $h)), $format)
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

function Draw-Text3D($g, [string]$text, [float]$x, [float]$y, [float]$size, [string]$front, [string]$fontName = 'Arial Black') {
  $font = New-FontSafe $fontName $size
  for ($i = 10; $i -ge 1; $i--) {
    $brush = New-Brush '#001044' 210
    $g.DrawString($text, $font, $brush, $x + $i * 2, $y + $i * 2)
    $brush.Dispose()
  }
  $glow = New-Brush '#008cff' 70
  $g.DrawString($text, $font, $glow, $x - 3, $y - 3)
  $g.DrawString($text, $font, $glow, $x + 3, $y + 3)
  $glow.Dispose()
  $brushFront = New-Brush $front
  $g.DrawString($text, $font, $brushFront, $x, $y)
  $brushFront.Dispose()
  $font.Dispose()
}

function Draw-Background($g, [int]$w, [int]$h) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $rect, (Color-Hex '#00061f'), (Color-Hex '#064fc5'), 35
  $g.FillRectangle($gradient, $rect)
  $gradient.Dispose()

  $orb = New-Brush '#00164f' 190
  $g.FillEllipse($orb, -260, -160, 740, 540)
  $g.FillEllipse($orb, [int]($w * .54), -100, 680, 520)
  $orb.Dispose()

  for ($i = 0; $i -lt 18; $i++) {
    $pen = New-PenSafe '#00b7ff' 2 90
    $g.DrawLine($pen, $w - 520, 90 + $i * 54, $w - 90, 52 + $i * 54)
    $pen.Dispose()
  }

  $yellow = New-PenSafe '#ffd400' 4 170
  $g.DrawArc($yellow, -120, $h - 260, 580, 210, 205, 95)
  $g.DrawArc($yellow, $w - 500, $h - 220, 620, 180, 205, 95)
  $yellow.Dispose()
}

function Draw-Logo($g, [float]$x, [float]$y, [float]$scale = 1) {
  $state = $g.Save()
  $g.TranslateTransform($x, $y)
  $g.ScaleTransform($scale, $scale)

  $yellowBrush = New-Brush '#ffd400'
  $blueBrush = New-Brush '#052c90'
  $yellowPen = New-PenSafe '#ffd400' 10
  $bluePen = New-PenSafe '#008cff' 4

  $g.DrawLines($yellowPen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(28, 74)),
    (New-Object System.Drawing.PointF(335, 6)),
    (New-Object System.Drawing.PointF(670, 74))
  ))
  Fill-Round $g $blueBrush 8 76 690 112 14
  Draw-Round $g $bluePen 8 76 690 112 14
  Draw-Text3D $g 'MONTE SINAI' 34 88 64 '#ffffff'
  Fill-Round $g $yellowBrush 104 196 505 44 8
  Draw-Centered $g 'ÁGUA • GÁS • PRODUTOS DE LIMPEZA' 116 201 480 32 19 '#001a55'

  $yellowBrush.Dispose()
  $blueBrush.Dispose()
  $yellowPen.Dispose()
  $bluePen.Dispose()
  $g.Restore($state)
}

function Draw-Product($g, [string]$file, [float]$x, [float]$y, [float]$w, [float]$h, [float]$angle = 0) {
  $path = Join-Path $prodDir $file
  $img = [System.Drawing.Image]::FromFile($path)
  $shadow = New-Brush '#000000' 120
  $g.FillEllipse($shadow, $x + $w * .1, $y + $h - 34, $w * .8, 42)
  $shadow.Dispose()
  $state = $g.Save()
  $g.TranslateTransform($x + $w / 2, $y + $h / 2)
  $g.RotateTransform($angle)
  $g.DrawImage($img, -$w / 2, -$h / 2, $w, $h)
  $g.Restore($state)
  $img.Dispose()
}

function Draw-WhatsappBox($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$phoneSize = 42) {
  $yellow = New-Brush '#ffd400'
  Fill-Round $g $yellow $x $y $w $h 34
  $green = New-Brush '#25d366'
  $g.FillEllipse($green, $x + 20, $y + 20, 106, 106)
  Draw-Centered $g '☎' ($x + 34) ($y + 34) 78 78 54 '#ffffff' 'Segoe UI Symbol'
  Draw-Centered $g 'PEÇA JÁ O SEU!' ($x + 140) ($y + 12) ($w - 160) 38 34 '#001a55'
  Draw-Centered $g '(11) 96092-8234' ($x + 140) ($y + 52) ($w - 160) 44 $phoneSize '#001a55'
  Draw-Centered $g '(11) 98269-0871' ($x + 140) ($y + 94) ($w - 160) 44 $phoneSize '#001a55'
  $yellow.Dispose()
  $green.Dispose()
}

function Draw-NeonPanel($g, [float]$x, [float]$y, [float]$w, [float]$h) {
  $brush = New-Brush '#031f66' 230
  Fill-Round $g $brush $x $y $w $h 28
  $pen = New-PenSafe '#00b7ff' 4 220
  Draw-Round $g $pen $x $y $w $h 28
  $brush.Dispose()
  $pen.Dispose()
}

function New-Canvas([int]$w, [int]$h, [bool]$transparent = $false) {
  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $w, $h
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  if ($transparent) {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }
  [pscustomobject]@{ Bitmap = $bitmap; Graphics = $graphics }
}

$canvas = New-Canvas 1160 430 $true
Draw-Logo $canvas.Graphics 60 30 1.45
$canvas.Bitmap.Save((Join-Path $brandDir 'monte-sinai-logo-marketing.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

$canvas = New-Canvas 1600 900
Draw-Background $canvas.Graphics 1600 900
Draw-Logo $canvas.Graphics 78 54 .9
Draw-Text3D $canvas.Graphics 'TUDO QUE' 94 320 74 '#ffffff'
Draw-Text3D $canvas.Graphics 'VOCÊ PRECISA,' 88 410 74 '#ffd400'
Draw-Text3D $canvas.Graphics 'EM UM SÓ' 102 500 72 '#ffffff'
Draw-Text3D $canvas.Graphics 'LUGAR!' 90 580 122 '#ffd400'
Draw-NeonPanel $canvas.Graphics 1010 78 430 160
Draw-Centered $canvas.Graphics 'ENTREGA' 1060 100 310 42 42 '#ffffff'
Draw-Centered $canvas.Graphics 'RÁPIDA' 1032 144 350 68 66 '#ffd400'
Draw-Centered $canvas.Graphics 'E SEGURA!' 1090 214 240 34 31 '#ffffff'
Draw-Product $canvas.Graphics 'agua-mineral-20l.png' 760 170 360 286 -2
Draw-Product $canvas.Graphics 'gas-p13.png' 930 430 310 230 1
Draw-Product $canvas.Graphics 'desinfetante-2l.png' 1160 405 230 178 -4
Draw-Product $canvas.Graphics 'detergente-2l.png' 1290 455 200 158 5
Draw-Product $canvas.Graphics 'vassoura.png' 1310 608 185 125 -12
Draw-WhatsappBox $canvas.Graphics 80 730 720 150 42
Draw-Centered $canvas.Graphics 'MONTE SINAI CUIDA DE VOCÊ' 880 745 610 48 42 '#ffffff'
Draw-Centered $canvas.Graphics 'E DA SUA CASA!' 930 792 500 48 42 '#ffd400'
Draw-Centered $canvas.Graphics 'ATENDIMENTO DE CONFIANÇA' 920 842 520 34 28 '#ffffff'
$canvas.Bitmap.Save((Join-Path $heroDir 'hero-monte-sinai-3d.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

$canvas = New-Canvas 1600 900
Draw-Background $canvas.Graphics 1600 900
Draw-Logo $canvas.Graphics 820 70 .92
Draw-NeonPanel $canvas.Graphics 1030 270 430 160
Draw-Centered $canvas.Graphics 'ENTREGA' 1080 292 310 42 42 '#ffffff'
Draw-Centered $canvas.Graphics 'RÁPIDA' 1052 336 350 68 66 '#ffd400'
Draw-Centered $canvas.Graphics 'E SEGURA!' 1110 406 240 34 31 '#ffffff'
Draw-Product $canvas.Graphics 'agua-mineral-20l.png' 760 300 360 286 -2
Draw-Product $canvas.Graphics 'gas-p13.png' 1015 520 310 230 1
Draw-Product $canvas.Graphics 'desinfetante-2l.png' 1240 505 230 178 -4
Draw-Product $canvas.Graphics 'detergente-2l.png' 1350 575 200 158 5
Draw-Product $canvas.Graphics 'vassoura.png' 1180 655 220 145 -12
Draw-Centered $canvas.Graphics 'ÁGUA • GÁS • PRODUTOS DE LIMPEZA' 830 792 650 46 34 '#ffd400'
$canvas.Bitmap.Save((Join-Path $heroDir 'hero-site-3d.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

$canvas = New-Canvas 1080 1080
Draw-Background $canvas.Graphics 1080 1080
Draw-Logo $canvas.Graphics 68 42 .72
Draw-NeonPanel $canvas.Graphics 646 80 350 154
Draw-Centered $canvas.Graphics 'ENTREGA' 690 100 250 42 38 '#ffffff'
Draw-Centered $canvas.Graphics 'RÁPIDA' 665 146 280 58 58 '#ffd400'
Draw-Centered $canvas.Graphics 'E SEGURA!' 715 202 180 30 26 '#ffffff'
Draw-Text3D $canvas.Graphics 'TUDO QUE' 74 300 56 '#ffffff'
Draw-Text3D $canvas.Graphics 'VOCÊ PRECISA' 64 370 58 '#ffd400'
Draw-Text3D $canvas.Graphics 'EM UM SÓ' 74 442 56 '#ffffff'
Draw-Text3D $canvas.Graphics 'LUGAR!' 74 506 76 '#ffd400'
Draw-Product $canvas.Graphics 'agua-mineral-20l.png' 590 288 280 220 -2
Draw-Product $canvas.Graphics 'gas-p13.png' 390 586 265 198 0
Draw-Product $canvas.Graphics 'detergente-2l.png' 700 594 190 150 4
Draw-Product $canvas.Graphics 'desinfetante-2l.png' 815 590 185 145 -3
Draw-NeonPanel $canvas.Graphics 70 762 940 128
Draw-Centered $canvas.Graphics 'ÁGUA' 108 787 215 38 34 '#ffffff'
Draw-Centered $canvas.Graphics 'GÁS' 410 787 215 38 34 '#ffffff'
Draw-Centered $canvas.Graphics 'LIMPEZA' 700 787 245 38 34 '#ffffff'
Draw-Centered $canvas.Graphics 'Qualidade' 88 835 270 32 24 '#ffd400' 'Arial'
Draw-Centered $canvas.Graphics 'Segurança' 365 835 300 32 24 '#ffd400' 'Arial'
Draw-Centered $canvas.Graphics 'Seu dia fácil' 680 835 300 32 24 '#ffd400' 'Arial'
Draw-WhatsappBox $canvas.Graphics 70 910 940 150 44
$canvas.Bitmap.Save((Join-Path $promoDir 'whatsapp-entrega-rapida-1080.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

$canvas = New-Canvas 1080 1920
Draw-Background $canvas.Graphics 1080 1920
Draw-Logo $canvas.Graphics 130 70 .86
Draw-Text3D $canvas.Graphics 'TUDO QUE' 82 320 76 '#ffffff'
Draw-Text3D $canvas.Graphics 'VOCÊ PRECISA' 72 420 82 '#ffd400'
Draw-Text3D $canvas.Graphics 'EM UM SÓ' 86 522 74 '#ffffff'
Draw-Text3D $canvas.Graphics 'LUGAR!' 72 610 120 '#009bff'
Draw-Product $canvas.Graphics 'agua-mineral-20l.png' 500 680 390 305 -1
Draw-Product $canvas.Graphics 'gas-p13.png' 230 890 340 255 1
Draw-Product $canvas.Graphics 'alcool-perfumado.png' 650 930 230 185 -5
Draw-Product $canvas.Graphics 'vassoura.png' 680 1115 250 172 -14
Draw-NeonPanel $canvas.Graphics 72 1232 936 258
$items = @('Água mineral 20L', 'Gás de cozinha P13', 'Produtos de limpeza', 'Utensílios e acessórios')
for ($i = 0; $i -lt $items.Count; $i++) {
  $yy = 1264 + $i * 54
  $dot = New-Brush '#008cff'
  $canvas.Graphics.FillEllipse($dot, 106, $yy, 38, 38)
  $dot.Dispose()
  Draw-Centered $canvas.Graphics '✓' 106 $yy 38 38 26 '#ffffff' 'Segoe UI Symbol'
  Draw-Centered $canvas.Graphics $items[$i] 160 ($yy - 3) 470 42 30 '#ffffff'
}
Draw-Centered $canvas.Graphics 'ENTREGA RÁPIDA' 580 1270 370 58 44 '#ffd400'
Draw-Centered $canvas.Graphics 'E SEGURA!' 600 1325 330 58 44 '#ffffff'
Draw-Centered $canvas.Graphics 'Atendimento de confiança do jeito que você merece.' 568 1392 390 72 27 '#ffffff' 'Arial'
Draw-WhatsappBox $canvas.Graphics 72 1550 936 170 48
Draw-Centered $canvas.Graphics 'MONTE SINAI CUIDA DE VOCÊ E DA SUA CASA!' 100 1745 880 90 42 '#ffffff'
Draw-Centered $canvas.Graphics 'Compartilhe no status e peça agora.' 130 1830 820 42 30 '#ffd400' 'Arial'
$canvas.Bitmap.Save((Join-Path $promoDir 'whatsapp-status-1080x1920.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

$canvas = New-Canvas 1080 1350
Draw-Background $canvas.Graphics 1080 1350
Draw-Logo $canvas.Graphics 230 38 .66
Draw-Centered $canvas.Graphics 'QUALIDADE QUE FACILITA O SEU DIA A DIA!' 130 232 820 54 36 '#ffffff'
Draw-NeonPanel $canvas.Graphics 56 320 470 700
Draw-NeonPanel $canvas.Graphics 554 320 470 700
$yellow = New-Brush '#ffd400'
Fill-Round $canvas.Graphics $yellow 56 320 470 70 24
Fill-Round $canvas.Graphics $yellow 554 320 470 70 24
$yellow.Dispose()
Draw-Centered $canvas.Graphics 'LÍQUIDOS E QUÍMICOS' 86 330 410 46 31 '#001a55'
Draw-Centered $canvas.Graphics 'UTENSÍLIOS E ACESSÓRIOS' 570 330 438 46 27 '#001a55'
$leftItems = @('Álcool perfumado', 'Amaciante 2L', 'Cândida 2L', 'Cloro 1L e 2L', 'Detergente 2L', 'Desinfetante 2L', 'Limpa alumínio', 'Limpa pedra', 'Sabão de coco', 'Sabonete líquido')
$rightItems = @('Escova de roupa', 'Escova de vaso', 'Esponja de aço', 'Esponja de louça', 'Bombril', 'Pá', 'Prendedor', 'Rodo grande', 'Rodinho de pia', 'Vassoura')
for ($i = 0; $i -lt $leftItems.Count; $i++) {
  $yy = 420 + $i * 56
  $dot = New-Brush '#008cff'
  $canvas.Graphics.FillEllipse($dot, 86, $yy, 34, 34)
  $dot.Dispose()
  Draw-Centered $canvas.Graphics '✓' 86 $yy 34 34 23 '#ffffff' 'Segoe UI Symbol'
  Draw-Centered $canvas.Graphics $leftItems[$i] 135 ($yy - 5) 330 44 24 '#ffffff' 'Arial Black'
}
for ($i = 0; $i -lt $rightItems.Count; $i++) {
  $yy = 420 + $i * 56
  $dot = New-Brush '#008cff'
  $canvas.Graphics.FillEllipse($dot, 584, $yy, 34, 34)
  $dot.Dispose()
  Draw-Centered $canvas.Graphics '✓' 584 $yy 34 34 23 '#ffffff' 'Segoe UI Symbol'
  Draw-Centered $canvas.Graphics $rightItems[$i] 633 ($yy - 5) 330 44 24 '#ffffff' 'Arial Black'
}
Draw-NeonPanel $canvas.Graphics 56 1052 968 94
Draw-Centered $canvas.Graphics 'TEM MUITO MAIS PARA FACILITAR SEU DIA!' 100 1070 880 48 36 '#ffd400'
Draw-WhatsappBox $canvas.Graphics 56 1172 968 150 44
$canvas.Bitmap.Save((Join-Path $promoDir 'whatsapp-catalogo-1080x1350.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Graphics.Dispose()
$canvas.Bitmap.Dispose()

Get-ChildItem $brandDir, $promoDir, $heroDir -Filter *.png |
  Where-Object { $_.Name -match '3d|whatsapp|referencia|logo' } |
  Select-Object Name, Length, FullName |
  Sort-Object Name
