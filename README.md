# Agora de Acuario

Web app privada para el canal Agora de Acuario. Usa Venice AI desde rutas API de Next.js desplegadas en Vercel y guarda documentos/sitios HTML en Firebase Storage mediante Firebase Admin.

## Capacidades

- Chat privado con Venice AI.
- Generacion de imagenes con Venice AI.
- Selector de miembros autorizados del Agora.
- Upload de documentos a Firebase Storage con metadatos en Firestore.
- Guardado de codigo HTML como `index.html` privado en Firebase Storage.
- Acceso protegido por `INVICTUS_ACCESS_CODE` y cookie `httpOnly`.

## Variables de entorno para Vercel

Configura estas variables en Vercel, en Project Settings > Environment Variables:

```bash
VENICE_API_KEY=vapi_tu_api_key
VENICE_TEXT_MODEL=zai-org-glm-5
VENICE_IMAGE_MODEL=grok-imagine-image
INVICTUS_ACCESS_CODE=tu_codigo_privado
INVICTUS_SYSTEM_PROMPT=Eres el companero privado del Agora de Acuario...
AGORA_DEFAULT_MEMBER=ApolloSol
FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
```

Para Firebase Admin usa una de estas dos opciones:

```bash
# Opcion A: JSON completo en una variable.
FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"}

# Opcion B: campos separados.
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n
```

`VENICE_API_KEY` y las credenciales Firebase nunca se envian al navegador. Las llamadas se hacen desde rutas API de Next.js. Despues de cambiar variables en Vercel, crea un nuevo deployment para que tomen efecto.

## Firebase

1. Crea un proyecto en Firebase.
2. Activa Cloud Storage for Firebase y Cloud Firestore.
3. En Project Settings > Service accounts, genera una private key para Firebase Admin.
4. Copia el JSON completo en `FIREBASE_SERVICE_ACCOUNT_JSON`, o usa los campos separados.
5. En `FIREBASE_STORAGE_BUCKET`, usa el bucket sin `gs://`, por ejemplo `tu-proyecto.firebasestorage.app`.

Los documentos se guardan en:

```text
agora/documents/{memberId}/...
```

Los sitios HTML se guardan en:

```text
agora/sites/{memberId}/.../index.html
```

La app devuelve URLs firmadas temporales para abrir o descargar artefactos. No hace los archivos publicos.

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Agrega las variables de entorno anteriores.
3. Despliega.

## Desarrollo local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Rutas API

- `POST /api/auth`: valida el codigo privado.
- `DELETE /api/auth`: cierra la sesion.
- `GET /api/members`: devuelve canal y miembros autorizados.
- `POST /api/chat`: envia mensajes a Venice AI.
- `POST /api/image`: genera imagenes con Venice AI.
- `GET /api/documents`: lista documentos guardados.
- `POST /api/documents`: sube un documento a Firebase Storage.
- `GET /api/sites`: lista sitios HTML guardados.
- `POST /api/sites`: guarda codigo HTML como sitio.

## Modelos Venice

Los modelos por defecto son configurables. Venice usa una API compatible con OpenAI para chat y un endpoint propio para imagenes:

- Chat: `POST https://api.venice.ai/api/v1/chat/completions`
- Imagen: `POST https://api.venice.ai/api/v1/image/generate`
