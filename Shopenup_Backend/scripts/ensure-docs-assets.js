const fs = require('fs');
const path = require('path');

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDirectory(dest);
    for (const entry of fs.readdirSync(src)) {
      const srcEntry = path.join(src, entry);
      const destEntry = path.join(dest, entry);
      copyRecursiveSync(srcEntry, destEntry);
    }
  } else {
    ensureDirectory(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function main() {
  try {
    const appRoot = process.cwd();
    const pluginName = '@shopenup/shopenup-plugin-documents';
    const pluginRoot = path.join(appRoot, 'node_modules', pluginName);

    // Source assets inside plugin
    const srcAssets = path.join(pluginRoot, 'src', 'modules', 'documents', 'assets');
    const srcFonts = path.join(srcAssets, 'fonts');
    const srcImages = path.join(srcAssets, 'images');
    const srcI18n = path.join(srcAssets, 'i18n');

    // Target expected assets path inside plugin's .shopenup build output
    const targetAssetsRoot = path.join(pluginRoot, '.shopenup', 'server', 'src', 'modules', 'documents', 'assets');
    const targetFonts = path.join(targetAssetsRoot, 'fonts');
    const targetImages = path.join(targetAssetsRoot, 'images');
    const targetI18n = path.join(targetAssetsRoot, 'i18n');

    // Copy assets if present
    copyRecursiveSync(srcFonts, targetFonts);
    copyRecursiveSync(srcImages, targetImages);
    copyRecursiveSync(srcI18n, targetI18n);
  } catch (_e) {
    // silent: this script is best-effort
  }
}

if (require.main === module) {
  main();
}


