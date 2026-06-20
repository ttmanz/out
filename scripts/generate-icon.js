const sharp = require('sharp');
const path = require('path');

// Icon SVG at 1024x1024 — dark luxury, gold pin, two people silhouettes, FM monogram
const iconSvg = (size) => {
  const s = size;
  const cx = s / 2;
  const scale = s / 1024;

  // Pin geometry (centred, pin tip points down)
  const pinW = 340 * scale;
  const pinH = 400 * scale;
  const pinTopY = 145 * scale;
  const pinCX = cx;
  const pinTopCY = pinTopY + 160 * scale; // centre of pin circle
  const pinR = 170 * scale;               // radius of round part
  const pinTipY = pinTopY + pinH;         // tip point

  // Inner circle (cut-out) for silhouettes
  const innerR = 118 * scale;
  const innerCX = pinCX;
  const innerCY = pinTopCY;

  // People silhouettes — two minimalist figures side by side inside the pin circle
  // Left figure
  const lx = pinCX - 38 * scale;
  const rx = pinCX + 38 * scale;
  const figY = pinTopCY - 14 * scale;
  const headR = 18 * scale;
  const bodyW = 28 * scale;
  const bodyH = 44 * scale;
  const bodyRx = 10 * scale;

  // FM text baseline
  const fmY = pinTipY + 76 * scale;
  const fmSize = 110 * scale;

  // Subtle glow ring behind pin
  const glowR = pinR + 24 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#1a1200"/>
      <stop offset="100%" stop-color="#0d0a03"/>
    </radialGradient>
    <radialGradient id="pinGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#c8800a" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#c8800a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pinSheen" cx="36%" cy="32%" r="60%">
      <stop offset="0%" stop-color="#e8a030"/>
      <stop offset="60%" stop-color="#c8800a"/>
      <stop offset="100%" stop-color="#9a5c05"/>
    </radialGradient>
    <clipPath id="roundedCanvas">
      <rect width="${s}" height="${s}" rx="${220 * scale}" ry="${220 * scale}"/>
    </clipPath>
  </defs>

  <!-- Canvas with rounded corners -->
  <g clip-path="url(#roundedCanvas)">

    <!-- Background -->
    <rect width="${s}" height="${s}" fill="url(#bg)"/>

    <!-- Subtle ambient glow behind pin -->
    <ellipse cx="${pinCX}" cy="${pinTopCY}" rx="${glowR * 1.6}" ry="${glowR * 1.3}" fill="url(#pinGlow)"/>

    <!-- Pin shadow (depth) -->
    <path d="
      M ${pinCX - pinR * 0.92} ${pinTopCY}
      A ${pinR} ${pinR} 0 0 1 ${pinCX + pinR * 0.92} ${pinTopCY}
      L ${pinCX} ${pinTipY + 8 * scale}
      Z"
      fill="#080500" opacity="0.35"
      transform="translate(${6 * scale}, ${10 * scale})"
    />

    <!-- Pin body — teardrop shape -->
    <path d="
      M ${pinCX} ${pinTipY}
      C ${pinCX - pinR * 0.55} ${pinTipY - pinR * 0.55}
        ${pinCX - pinR} ${pinTopCY + pinR * 0.35}
        ${pinCX - pinR} ${pinTopCY}
      A ${pinR} ${pinR} 0 1 1 ${pinCX + pinR} ${pinTopCY}
      C ${pinCX + pinR} ${pinTopCY + pinR * 0.35}
        ${pinCX + pinR * 0.55} ${pinTipY - pinR * 0.55}
        ${pinCX} ${pinTipY}
      Z"
      fill="url(#pinSheen)"
    />

    <!-- Inner circle cut-out — dark -->
    <circle cx="${innerCX}" cy="${innerCY}" r="${innerR}" fill="#0d0a03"/>

    <!-- Left person silhouette -->
    <!-- Head -->
    <circle cx="${lx}" cy="${figY - bodyH * 0.5 - headR * 0.6}" r="${headR}" fill="#ffffff" opacity="0.92"/>
    <!-- Body -->
    <rect x="${lx - bodyW * 0.5}" y="${figY - bodyH * 0.5}" width="${bodyW}" height="${bodyH}"
          rx="${bodyRx}" ry="${bodyRx}" fill="#ffffff" opacity="0.92"/>

    <!-- Right person silhouette -->
    <circle cx="${rx}" cy="${figY - bodyH * 0.5 - headR * 0.6}" r="${headR}" fill="#ffffff" opacity="0.92"/>
    <rect x="${rx - bodyW * 0.5}" y="${figY - bodyH * 0.5}" width="${bodyW}" height="${bodyH}"
          rx="${bodyRx}" ry="${bodyRx}" fill="#ffffff" opacity="0.92"/>

    <!-- Pin tip accent dot -->
    <circle cx="${pinCX}" cy="${pinTipY - 3 * scale}" r="${7 * scale}" fill="#9a5c05" opacity="0.6"/>

    <!-- Decorative ring around pin circle (thin) -->
    <circle cx="${pinCX}" cy="${pinTopCY}" r="${pinR + 6 * scale}"
            fill="none" stroke="#e8a030" stroke-width="${2.5 * scale}" opacity="0.3"/>

    <!-- FM monogram -->
    <text
      x="${cx}"
      y="${fmY}"
      font-family="'Arial Black', 'Arial', sans-serif"
      font-size="${fmSize}"
      font-weight="900"
      fill="#c8800a"
      text-anchor="middle"
      letter-spacing="${-4 * scale}"
      opacity="0.95"
    >FM</text>

    <!-- Subtle dot accent under FM -->
    <circle cx="${cx - 8 * scale}" cy="${fmY + 22 * scale}" r="${4 * scale}" fill="#c8800a" opacity="0.4"/>
    <circle cx="${cx + 8 * scale}" cy="${fmY + 22 * scale}" r="${4 * scale}" fill="#c8800a" opacity="0.4"/>

  </g>
</svg>`;
};

async function generate() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  // 1024×1024
  await sharp(Buffer.from(iconSvg(1024)))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024×1024)');

  // 512×512 (Google Play store listing)
  await sharp(Buffer.from(iconSvg(512)))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(assetsDir, 'icon-512.png'));
  console.log('✓ icon-512.png (512×512)');

  // Android foreground (1024×1024, no background — just pin + FM on transparent)
  const fgSvg = (size) => {
    const s = size;
    const cx = s / 2;
    const scale = s / 1024;
    const pinR = 170 * scale;
    const pinTopY = 100 * scale;
    const pinTopCY = pinTopY + 160 * scale;
    const pinCX = cx;
    const pinTipY = pinTopY + 400 * scale;
    const innerR = 118 * scale;
    const lx = pinCX - 38 * scale;
    const rx = pinCX + 38 * scale;
    const figY = pinTopCY - 14 * scale;
    const headR = 18 * scale;
    const bodyW = 28 * scale;
    const bodyH = 44 * scale;
    const bodyRx = 10 * scale;
    const fmY = pinTipY + 76 * scale;
    const fmSize = 110 * scale;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="pinSheen2" cx="36%" cy="32%" r="60%">
      <stop offset="0%" stop-color="#e8a030"/>
      <stop offset="60%" stop-color="#c8800a"/>
      <stop offset="100%" stop-color="#9a5c05"/>
    </radialGradient>
  </defs>
  <path d="
    M ${pinCX} ${pinTipY}
    C ${pinCX - pinR * 0.55} ${pinTipY - pinR * 0.55}
      ${pinCX - pinR} ${pinTopCY + pinR * 0.35}
      ${pinCX - pinR} ${pinTopCY}
    A ${pinR} ${pinR} 0 1 1 ${pinCX + pinR} ${pinTopCY}
    C ${pinCX + pinR} ${pinTopCY + pinR * 0.35}
      ${pinCX + pinR * 0.55} ${pinTipY - pinR * 0.55}
      ${pinCX} ${pinTipY}
    Z"
    fill="url(#pinSheen2)"
  />
  <circle cx="${pinCX}" cy="${pinTopCY}" r="${innerR}" fill="#0d0a03"/>
  <circle cx="${lx}" cy="${figY - bodyH * 0.5 - headR * 0.6}" r="${headR}" fill="#ffffff" opacity="0.92"/>
  <rect x="${lx - bodyW * 0.5}" y="${figY - bodyH * 0.5}" width="${bodyW}" height="${bodyH}" rx="${bodyRx}" fill="#ffffff" opacity="0.92"/>
  <circle cx="${rx}" cy="${figY - bodyH * 0.5 - headR * 0.6}" r="${headR}" fill="#ffffff" opacity="0.92"/>
  <rect x="${rx - bodyW * 0.5}" y="${figY - bodyH * 0.5}" width="${bodyW}" height="${bodyH}" rx="${bodyRx}" fill="#ffffff" opacity="0.92"/>
  <text x="${cx}" y="${fmY}" font-family="'Arial Black','Arial',sans-serif" font-size="${fmSize}" font-weight="900" fill="#c8800a" text-anchor="middle" letter-spacing="${-4 * scale}">FM</text>
</svg>`;
  };

  await sharp(Buffer.from(fgSvg(1024)))
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png (1024×1024)');

  // Favicon 48×48
  await sharp(Buffer.from(iconSvg(256)))
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (48×48)');

  console.log('\nAll icons generated successfully.');
}

generate().catch(console.error);
