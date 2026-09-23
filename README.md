# Mente Clara

Sitio web educativo de psicología con navegación por lecciones, preguntas y autoconocimiento.

## Publicación en GitHub Pages

Este proyecto está preparado para publicarse como sitio estático en GitHub Pages.

### Requisitos

- Un repositorio público en GitHub
- La rama principal llamada `main`
- Activar GitHub Pages desde la configuración del repositorio

### Pasos

1. Sube este proyecto a GitHub como repositorio público.
2. Ve a `Settings > Pages`.
3. En `Build and deployment`, selecciona:
   - Source: `GitHub Actions`
4. Confirma y guarda.
5. El despliegue se hará automáticamente al hacer `push` a `main`.

### Nota importante

La integración con Gemini requiere un backend para proteger la clave API. La versión pública de GitHub Pages sirve la web estática, mientras que la IA puede quedar en un servicio separado (por ejemplo Vercel o Render) con variables de entorno protegidas.

La página ya incluye un fallback local para que siga funcionando aunque la API no esté disponible.

## Archivos principales

- `index.html`: home y navegación
- `cuestionario.html`: preguntas educativas y fallback público
- `preguntas-basicas.html`: cuestionario de psicología
- `autoconocimiento.html`: test de autoconocimiento
- `lecciones.html`: contenido didáctico
- `sobre.html`: información del curso

## Ejecutar localmente

```bash
npm start
```

Luego abre:

```text
http://localhost:3000/index.html
```
