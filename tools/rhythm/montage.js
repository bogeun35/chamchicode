// node montage.js out.png cols img1 img2 ...  (labels = file basenames)
const fs = require('fs'), path = require('path');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
(async () => {
  const [out, cols, ...imgs] = process.argv.slice(2);
  const b = await puppeteer.connect({ browserURL: 'http://localhost:9224', defaultViewport: null });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
  const cells = imgs.map(f => `<div style="display:inline-block;margin:3px;vertical-align:top"><div style="font:14px sans-serif">${path.basename(f)}</div><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${Math.floor(1560 / cols)}px"></div>`).join('');
  await p.setContent(`<body style="margin:0;background:#fff">${cells}</body>`);
  await new Promise(r => setTimeout(r, 300));
  await p.screenshot({ path: out, fullPage: true }); await p.close(); b.disconnect();
})();
