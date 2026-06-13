# Image Format Support (Sharp)

Raster image conversion for **image-api** and **converter-api** using Sharp. HEIC input and export require system **libheif**.

## Supported formats

| Role | Formats |
|------|---------|
| **Input** | PNG, JPG, WebP, AVIF, HEIC/HEIF, GIF, TIFF, BMP (BMP decode depends on libvips) |
| **Output** | JPG, PNG, WebP, AVIF, HEIC, GIF, TIFF |

**Not supported:** PSD, RAW (CR2/NEF/…), SVG.

## Limitations

- **Animated GIF** → only the first frame is converted
- **Animated GIF** → only the first frame is converted
- **Multi-page TIFF** → only the first page is converted
- **BMP** → input only on most Sharp builds (no BMP encoder in Sharp 0.33)
- **HEIC** input and export require libheif (see below)

## System packages

### VPS (Debian/Ubuntu)

Installed automatically by `deploy/setup-vps.sh`:

```bash
apt install -y libheif1 libde265-0
```

### macOS (local dev)

```bash
brew install libheif
```

## Rebuild Sharp

After installing libheif:

```bash
cd image-api && pnpm rebuild sharp
cd converter-api && pnpm rebuild sharp
```

Restart:

```bash
pm2 restart image-api image-worker converter-api converter-worker
```

## Verify HEIC

```bash
node -e "require('sharp')('sample.heic').metadata().then(m => console.log(m)).catch(console.error)"
```

Expected: width, height, format `heif`. On failure, install libheif and rebuild Sharp.

## Services

| Service | Operations |
|---------|------------|
| image-api | Convert, Resize, Remove background |
| converter-api | Any supported raster → any other raster (except same format) |

Document conversions (PDF, DOCX, etc.) are unchanged.
