# Invictus Venice

Web app privada para conversar y generar imagenes con la API de Venice AI desde Vercel.

## Variables de entorno

Configura estas variables en Vercel antes de desplegar:

```bash
VENICE_API_KEY=vapi_tu_api_key
VENICE_TEXT_MODEL=venice-uncensored
VENICE_IMAGE_MODEL=venice-sd35
INVICTUS_ACCESS_CODE=tu_codigo_privado
```

`VENICE_API_KEY` nunca se envia al navegador. Las llamadas a Venice se hacen desde rutas API de Next.js.

`INVICTUS_ACCESS_CODE` es opcional, pero recomendado. Cuando existe, la app pide el codigo y guarda una cookie httpOnly para proteger el chat y las rutas API.

## Deploy en Vercel

1. Importa `ApoloSolInvictus/invictus-venice` en Vercel.
2. Agrega las variables de entorno anteriores.
3. Despliega.

## Desarrollo local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000`.

## API usada

- Chat: `POST https://api.venice.ai/api/v1/chat/completions`
- Imagen: `POST https://api.venice.ai/api/v1/image/generate`
