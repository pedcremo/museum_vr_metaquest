# VR Gallery (WebXR)

Pequeña galería VR en WebXR con navegación en Quest y escritorio, iluminación por obra y carga de texturas por LOD.

**Propósito**
- Demostrar una sala de museo con obras en tamaño real.
- Permitir acercamiento extremo para ver detalle de los trazos.
- Mantener rendimiento aceptable en Quest mediante LOD de texturas.

**Tecnologías**
- WebXR + WebGL (Three.js)
- JavaScript/HTML (single-file `index.html`)
- Playwright para tests funcionales en navegador

**Ejecución local**
```bash
npx serve .
```
Abre el navegador y carga `index.html`.

Esto sirve para escritorio local en el mismo PC. Para Quest, no basta con abrir `http://IP_DEL_PC:PUERTO`: WebXR y `service worker` requieren contexto seguro.

**Desarrollo en Quest por LAN (varias gafas)**
- Objetivo: ejecutar el proyecto en el PC de desarrollo y abrir la misma URL desde varias Quest conectadas a la misma red Wi‑Fi.
- Regla importante: desde las Quest no uses `http://IP:4000`. Usa `https://IP:4000` con un certificado de confianza.

1. Averigua la IP LAN del PC:
```bash
hostname -I
```

2. Instala `mkcert` una vez en el PC:
```bash
sudo apt install libnss3-tools

curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

3. Instala la CA local de `mkcert` y genera un certificado para la IP del PC:
```bash
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 192.168.1.23 localhost 127.0.0.1
```
Sustituye `192.168.1.23` por la IP real del PC.

4. Arranca el servidor HTTPS escuchando en toda la LAN:
```bash
npx http-server . -S -C cert.pem -K key.pem -p 4000 -a 0.0.0.0
```

5. Localiza la CA raíz de `mkcert`:
```bash
mkcert -CAROOT
```
Dentro de esa carpeta estará `rootCA.pem`.

6. Importa esa CA raíz en cada Quest y márcala como de confianza.
Hasta que cada gafa confíe esa CA, `https://IP:4000` no contará como contexto seguro y no aparecerán `navigator.xr` ni `service worker`.

7. Abre desde cada Quest:
```txt
https://192.168.1.23:4000
```

Notas:
- `localhost` en Quest apunta a la propia gafa, no al PC.
- Un único PC puede servir la misma URL a varias Quest a la vez si están en la misma red.
- La UI de esta app mostrará `HTTPS requerido` si la página no está en contexto seguro.

**Despliegue automático en GitHub Pages**
- Sube tu proyecto a un repositorio público en GitHub.
- Crea la carpeta `.github/workflows/` y agrega un archivo `deploy.yml` con el siguiente contenido para automatizar el despliegue:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

- En el repo de GitHub, ve a **Settings > Pages**, selecciona la rama `gh-pages` y carpeta raíz.
- Cada push a `main` desplegará automáticamente en `https://<tu-usuario>.github.io/<tu-repo>/` con HTTPS gratis.

**PWA**
- Incluye `manifest.webmanifest` y `sw.js`.
- En contexto seguro (`https` o `localhost`) puede instalarse como app web.
- En Quest, `localhost` no apunta a tu PC. Si abres la app desde las gafas contra `http://IP:PUERTO`, no habrá `service worker` ni `navigator.xr`; usa `https`.
- Al abrirse como app instalada intenta entrar automáticamente en `immersive-vr`, pero el navegador puede exigir interacción explícita del usuario antes de conceder la sesión XR.
- En Quest Browser no debe asumirse soporte para instalar la PWA localmente desde la propia web. Para distribuirla como app instalada en Quest conviene empaquetarla como APK/PWA para Quest y desplegarla por Store o sideload.

**Tests**
Requiere Node 18+.

- Unit tests rápidos:
```bash
npm test
```

- Tests E2E (Playwright):
```bash
npm install
npx playwright install
npm run test:e2e
```

Para generar/actualizar snapshots visuales:
```bash
npm run test:e2e -- --update-snapshots
```

**Controles**
- Escritorio: clic para capturar ratón, WASD mover, ratón mirar, `F` activa/desactiva vuelo, `Espacio/E` subir, `Ctrl/Q` bajar, `Esc` salir.
- VR (Quest): stick izquierdo caminar, stick derecho giro a saltos, `grip` teletransporte, anillos dorados en el suelo para colocarse delante de cada obra, botón `Acercarme` bajo cada cartela.

**Notas**
- LOD de texturas: baja resolución a distancia, alta resolución al acercarse.
- Iluminación por obra: haz más amplio en cuadros grandes para bañar mejor el ancho.
