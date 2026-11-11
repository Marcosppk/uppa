// Prepara o projeto do iPhone (Xcode) de um dos apps para ir à App Store.
// Uso: node scripts/preparar-ios.mjs associados|financeiro
// Roda na compilação na nuvem (codemagic.yaml), depois de "npm run build:<app>". Também funciona num Mac.
// A pasta apps/<app>/ios não vai para o git: é recriada aqui a cada compilação, sempre do mesmo jeito.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];
if (!['associados', 'financeiro'].includes(app)) {
  console.error('Uso: node scripts/preparar-ios.mjs associados|financeiro');
  process.exit(1);
}
const pastaApp = path.join(raiz, 'apps', app);
const pastaXcode = path.join(pastaApp, 'ios', 'App');
const rodar = (cmd) => execSync(cmd, { cwd: pastaApp, stdio: 'inherit' });

// 1. Projeto Xcode (Capacitor) e cópia do app já compilado (dist/<app>) para dentro dele.
if (!fs.existsSync(pastaXcode)) rodar('npx cap add ios');
rodar('npx cap sync ios');

// 2. Ícone e tela de abertura com o logo da UPPA.
const assets = path.join(pastaXcode, 'App', 'Assets.xcassets');
fs.copyFileSync(path.join(raiz, 'assets/ios/icone-1024.png'), path.join(assets, 'AppIcon.appiconset/AppIcon-512@2x.png'));
for (const nome of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  fs.copyFileSync(path.join(raiz, 'assets/ios/abertura-2732.png'), path.join(assets, 'Splash.imageset', nome));

// 3. Info.plist: idioma, permissões (o iPhone mostra estes textos ao pedir acesso) e criptografia.
const caminhoPlist = path.join(pastaXcode, 'App', 'Info.plist');
let plist = fs.readFileSync(caminhoPlist, 'utf8');
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const definir = (chave, valorXml) => {
  const existente = new RegExp(`(<key>${chave}</key>\\s*)(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)`);
  plist = existente.test(plist) ? plist.replace(existente, `$1${valorXml}`) : plist.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${chave}</key>\n\t${valorXml}\n</dict>\n</plist>\n`);
};
const texto = (s) => `<string>${xml(s)}</string>`;
definir('CFBundleDevelopmentRegion', texto('pt-BR'));
definir('NSCameraUsageDescription', texto('A câmera é usada para tirar a sua foto do perfil e fotografar laudos e documentos que você envia para a UPPA.'));
definir('NSPhotoLibraryUsageDescription', texto('As fotos são usadas para escolher a sua foto do perfil e imagens de laudos e documentos que você envia para a UPPA.'));
definir('NSPhotoLibraryAddUsageDescription', texto('Para guardar nas suas fotos as imagens que você salvar pelo app, como os desenhos da sala de acolhimento.'));
// O app só usa a criptografia padrão do sistema (HTTPS): dispensa a pergunta de exportação a cada envio.
definir('ITSAppUsesNonExemptEncryption', '<false/>');
definir('UIRequiredDeviceCapabilities', '<array>\n\t\t<string>arm64</string>\n\t</array>');
fs.writeFileSync(caminhoPlist, plist);

// 4. Versão (a mesma do package.json), número da compilação e só iPhone
//    (com iPad, a Apple exige também fotos de tela de iPad; no iPad o app abre no modo de iPhone).
const { version } = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
const compilacao = process.env.BUILD_NUMBER || process.env.PROJECT_BUILD_NUMBER || String(Math.floor(Date.now() / 1000));
const caminhoProjeto = path.join(pastaXcode, 'App.xcodeproj', 'project.pbxproj');
const projeto = fs
  .readFileSync(caminhoProjeto, 'utf8')
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${compilacao};`)
  .replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, 'TARGETED_DEVICE_FAMILY = 1;');
fs.writeFileSync(caminhoProjeto, projeto);

console.log(`iOS pronto: ${app} versão ${version} (compilação ${compilacao})`);
