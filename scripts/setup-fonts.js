/**
 * Script para baixar as fontes necessárias (Inter + JetBrains Mono)
 * Execute: node scripts/setup-fonts.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

const fonts = [
  {
    name: 'Inter-Regular.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf',
  },
  {
    name: 'Inter-Medium.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.ttf',
  },
  {
    name: 'Inter-SemiBold.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.ttf',
  },
  {
    name: 'Inter-Bold.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf',
  },
  {
    name: 'JetBrainsMono-Regular.ttf',
    url: 'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf',
  },
  {
    name: 'JetBrainsMono-Medium.ttf',
    url: 'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Medium.ttf',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    function get(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    }
    get(url);
  });
}

(async () => {
  console.log('📥 Baixando fontes...\n');
  for (const font of fonts) {
    const dest = path.join(fontsDir, font.name);
    if (fs.existsSync(dest)) {
      console.log(`✓ ${font.name} (já existe)`);
      continue;
    }
    process.stdout.write(`  ${font.name}... `);
    try {
      await download(font.url, dest);
      console.log('✓');
    } catch (e) {
      console.log(`✗ Falhou: ${e.message}`);
    }
  }
  console.log('\n✅ Fontes prontas em assets/fonts/');
})();
