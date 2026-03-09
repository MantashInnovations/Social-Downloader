/**
 * Snag API Server – Real Social Media Video Downloader
 * Uses yt-dlp under the hood (supports 1000+ sites)
 *
 * Supports: YouTube, TikTok, Instagram, Facebook, X/Twitter,
 *           Snapchat, Pinterest, LinkedIn, Reddit and more.
 *
 * Run: node server/index.cjs
 */

"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");
const fs = require("fs");

// yt-dlp-wrap auto-downloads the yt-dlp binary if needed
const YTDlpWrap = require("yt-dlp-wrap").default;

const PORT = 3001;
const BIN_DIR = path.join(__dirname, "bin");

// ─── Init ──────────────────────────────────────────────────────────

if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

const YT_DLP_BIN = path.join(
    BIN_DIR,
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
);

let ytDlp;

async function initYtDlp() {
    if (!fs.existsSync(YT_DLP_BIN)) {
        console.log("⏳ Downloading yt-dlp binary (first run only, ~10 MB)...");
        await YTDlpWrap.downloadFromGithub(YT_DLP_BIN);
        console.log("✅ yt-dlp downloaded:", YT_DLP_BIN);
    } else {
        console.log("✅ yt-dlp binary found:", YT_DLP_BIN);
    }
    ytDlp = new YTDlpWrap(YT_DLP_BIN);
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Returns common arguments for all yt-dlp calls to ensure 
 * reliability and avoid bot detection.
 */
function getCommonArgs() {
    const args = [
        "--no-playlist",
        "--no-warnings",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "--add-header", "Accept-Language:en-US,en;q=0.9",
        "--add-header", "Sec-Fetch-Mode:navigate",
    ];

    // Check if cookies.txt exists in the server folder
    const cookiesPath = path.join(__dirname, "cookies.txt");
    if (fs.existsSync(cookiesPath)) {
        console.log("🍪 Using cookies.txt for authentication");
        args.push("--cookies", cookiesPath);
    }

    return args;
}

function formatDuration(seconds) {
    if (!seconds) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "Unknown";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function sanitizeFilename(name) {
    return (name || "video")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 120)
        .trim() || "video";
}

/**
 * Process raw yt-dlp format list into clean quality tiers for the UI.
 */
function processFormats(formats, info) {
    const result = [];

    if (!formats || formats.length === 0) {
        // Fallback – let yt-dlp pick the best
        return [
            {
                format_id: "bestvideo+bestaudio/best",
                label: "Best Quality",
                resolution: "Auto",
                size: "Unknown",
                ext: "mp4",
                recommended: true,
            },
        ];
    }

    // ── 1. "Best Quality" option (yt-dlp will pick highest) ──────────
    result.push({
        format_id: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
        label: "Best Quality",
        resolution: "Highest Available",
        size: "Unknown",
        ext: "mp4",
        recommended: true,
    });

    // ── 2. Concrete pre-merged video+audio MP4 formats by height ─────
    const targetHeights = [2160, 1440, 1080, 720, 480, 360];
    const seen = new Set();

    // Get all formats that have both video and audio (pre-muxed)
    const muxed = formats
        .filter(
            (f) =>
                f.vcodec !== "none" &&
                f.vcodec !== null &&
                f.acodec !== "none" &&
                f.acodec !== null &&
                f.height
        )
        .sort((a, b) => (b.height || 0) - (a.height || 0));

    // Get video-only formats to pair with audio (for sites like YouTube)
    const videoOnly = formats
        .filter(
            (f) =>
                (f.vcodec !== "none" && f.vcodec !== null) &&
                (f.acodec === "none" || f.acodec === null) &&
                f.height
        )
        .sort((a, b) => (b.height || 0) - (a.height || 0));

    for (const height of targetHeights) {
        const key = String(height);
        if (seen.has(key)) continue;

        // Find a pre-muxed format at this height
        const muxedMatch = muxed.find(
            (f) => f.height && f.height <= height && f.height >= height * 0.85
        );

        // Find video-only format at this height (for sites like YouTube that split streams)
        const videoMatch = videoOnly.find(
            (f) => f.height && f.height <= height && f.height >= height * 0.85
        );

        if (!muxedMatch && !videoMatch) continue;

        seen.add(key);

        let label;
        if (height >= 2160) label = "4K Ultra HD";
        else if (height >= 1440) label = "2K QHD";
        else if (height >= 1080) label = "Full HD";
        else if (height >= 720) label = "HD";
        else if (height >= 480) label = "SD";
        else label = "Low Quality";

        if (muxedMatch) {
            // Pre-muxed – can stream directly without ffmpeg
            result.push({
                format_id: muxedMatch.format_id,
                label,
                resolution: `${muxedMatch.height}p`,
                size: formatBytes(muxedMatch.filesize || muxedMatch.filesize_approx),
                ext: muxedMatch.ext || "mp4",
            });
        } else if (videoMatch) {
            // Needs merging – pick best audio to go with it
            const bestAudio = formats
                .filter(
                    (f) =>
                        (f.acodec !== "none" && f.acodec !== null) &&
                        (f.vcodec === "none" || f.vcodec === null)
                )
                .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

            const formatId = bestAudio
                ? `${videoMatch.format_id}+${bestAudio.format_id}`
                : videoMatch.format_id;

            result.push({
                format_id: formatId,
                label,
                resolution: `${videoMatch.height}p`,
                size: "Unknown", // can't know merged size easily
                ext: "mp4",
                needsMerge: true,
            });
        }
    }

    // ── 3. Audio Only ─────────────────────────────────────────────────
    const audioFormats = formats
        .filter(
            (f) =>
                (f.acodec !== "none" && f.acodec !== null) &&
                (f.vcodec === "none" || f.vcodec === null)
        )
        .sort((a, b) => (b.abr || 0) - (a.abr || 0));

    if (audioFormats.length > 0) {
        const best = audioFormats[0];
        result.push({
            format_id: best.format_id,
            label: "Audio Only",
            resolution: `${best.abr ? Math.round(best.abr) : "128"}kbps`,
            size: formatBytes(best.filesize || best.filesize_approx),
            ext: "mp3",
        });
    }

    // Remove duplicates / keep only unique resolutions
    const unique = [];
    const resolutionsSeen = new Set();
    for (const f of result) {
        const key = f.resolution + f.ext;
        if (!resolutionsSeen.has(key)) {
            resolutionsSeen.add(key);
            unique.push(f);
        }
    }

    return unique;
}

// ─── Express App ───────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", ytDlp: !!ytDlp });
});

// ── GET /api/meta?url=<url> ────────────────────────────────────────
app.get("/api/meta", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url is required" });

    console.log(`[meta] ${url}`);

    try {
        const args = [
            url,
            "--dump-json",
            ...getCommonArgs()
        ];

        const info = await ytDlp.getVideoInfo(args);

        const formats = processFormats(info.formats, info);

        return res.json({
            title: info.title || "Untitled Video",
            thumbnail:
                info.thumbnail ||
                (Array.isArray(info.thumbnails) && info.thumbnails.length > 0
                    ? info.thumbnails[info.thumbnails.length - 1].url
                    : ""),
            duration: formatDuration(info.duration),
            author:
                info.uploader ||
                info.channel ||
                info.creator ||
                info.artist ||
                "Unknown",
            platform: info.extractor_key || "Unknown",
            formats,
        });
    } catch (err) {
        console.error("[meta] error:", err.message);
        return res
            .status(500)
            .json({ error: err.message || "Failed to fetch video info" });
    }
});

// ── GET /api/download?url=&format_id=&ext=&title= ─────────────────
app.get("/api/download", async (req, res) => {
    const { url, format_id, ext, title } = req.query;
    if (!url) return res.status(400).json({ error: "url is required" });

    const safeTitle = sanitizeFilename(title);
    const outputExt = ext || "mp4";
    const isAudio = ["mp3", "m4a", "opus", "wav", "flac"].includes(outputExt);
    const tmpFile = path.join(os.tmpdir(), `snag_${Date.now()}.${outputExt}`);

    console.log(`[download] format=${format_id} ext=${outputExt} url=${url}`);

    const args = [
        url,
        "-f",
        format_id || "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        isAudio ? "mp3" : "mp4",
        // TikTok watermark-free
        "--extractor-args",
        "tiktok:api_hostname=api22-normal-c-alisg.tiktokv.com",
        "-o",
        tmpFile,
        ...getCommonArgs()
    ];

    try {
        console.log(`[download] starting: ${args.join(" ")}`);

        // Download to temp file with detailed logging
        const ytDlpProcess = ytDlp.exec(args);

        ytDlpProcess.on("progress", (progress) => {
            // Optional: log progress to server console
        });

        ytDlpProcess.on("error", (err) => {
            console.error("[download] yt-dlp error:", err.message);
        });

        ytDlpProcess.on("close", (code) => {
            console.log(`[download] yt-dlp process closed with code ${code}`);
        });

        // Wait for download to complete
        await ytDlp.execPromise(args);

        if (!fs.existsSync(tmpFile)) {
            console.error(`[download] failed: file not found at ${tmpFile}`);
            return res.status(500).json({ error: "Download failed: file not created. This can happen if ffmpeg is missing for merging, or the site blocked the request." });
        }

        const stat = fs.statSync(tmpFile);
        const contentType = isAudio ? "audio/mpeg" : "video/mp4";

        console.log(`[download] streaming ${stat.size} bytes: ${tmpFile}`);

        res.setHeader("Content-Type", contentType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeTitle}.${outputExt}"`
        );
        res.setHeader("Content-Length", String(stat.size));
        res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Disposition");

        const fileStream = fs.createReadStream(tmpFile);

        fileStream.on("end", () => {
            console.log(`[download] finished streaming: ${tmpFile}`);
            fs.unlink(tmpFile, (err) => {
                if (err) console.error(`[download] clean-up error:`, err.message);
            });
        });

        fileStream.on("error", (err) => {
            console.error("[download] stream error:", err.message);
            fs.unlink(tmpFile, () => { });
            if (!res.headersSent) res.status(500).json({ error: "Failed to stream file to client." });
        });

        req.on("close", () => {
            fileStream.destroy();
            fs.unlink(tmpFile, () => { });
        });

        fileStream.pipe(res);
    } catch (err) {
        console.error("[download] fatal error:", err.message);
        if (fs.existsSync(tmpFile)) fs.unlink(tmpFile, () => { });
        if (!res.headersSent) {
            let msg = err.message;
            if (msg.includes("ffmpeg")) msg = "FFmpeg is required to merge video and audio high-quality streams. Please ensure it is installed.";
            res.status(500).json({ error: msg || "Download failed" });
        }
    }
});

// ─── Start ─────────────────────────────────────────────────────────

initYtDlp()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n🚀 Snag API running on http://localhost:${PORT}`);
            console.log(`   Supports: YouTube, TikTok, Instagram, Facebook,`);
            console.log(`             X/Twitter, Pinterest, LinkedIn, Reddit + 1000 more\n`);
        });
    })
    .catch((err) => {
        console.error("❌ Failed to initialize yt-dlp:", err.message);
        process.exit(1);
    });
