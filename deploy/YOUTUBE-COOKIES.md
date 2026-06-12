# YouTube Cookies Setup

YouTube often blocks datacenter IPs with a bot check. VidGrab passes browser cookies to `yt-dlp` so downloads and metadata fetches can succeed.

## 1. Export cookies from Chrome

1. Log into YouTube in Chrome with the account you want to use for downloads.
2. Export cookies in **Netscape** format (`cookies.txt`):
   - Use a browser extension such as "Get cookies.txt LOCALLY", or
   - Follow the [yt-dlp FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp) for manual export.

## 2. Upload to the VPS

```bash
scp cookies.txt deploy@YOUR_VPS:/home/deploy/download-manager/api/cookies.txt
```

On the server, restrict permissions:

```bash
chmod 600 /home/deploy/download-manager/api/cookies.txt
```

## 3. Configure the API

Edit `deploy/env/api.env`:

```env
YTDLP_COOKIES_FILE=/home/deploy/download-manager/api/cookies.txt
```

Apply env and restart services:

```bash
cd /home/deploy/download-manager
cp deploy/env/api.env api/.env.development
pm2 restart dm-api dm-api-worker
```

## 4. Verify

```bash
cd /home/deploy/download-manager/api
source .env.development
yt-dlp --cookies "$YTDLP_COOKIES_FILE" -J "YOUTUBE_URL"
```

Or via the API:

```bash
curl -X POST https://downloadvideos.work.gd/api/v1/downloads/metadata \
  -H "Content-Type: application/json" \
  -d '{"url":"YOUTUBE_URL"}'
```

## 5. Refresh cookies

Cookies expire or stop working when YouTube changes detection. If bot errors return, export fresh cookies and replace `cookies.txt`, then restart `dm-api` and `dm-api-worker`.

Typical refresh interval: every **2–4 weeks**.

## Security

- **Never commit** `cookies.txt` to git (it is listed in `api/.gitignore`).
- Treat cookies like passwords — they grant access to your Google/YouTube session.
- Use a dedicated Google account if possible, not your personal one.
