# Checklist: Activar modo proxy/CDN en Cloudflare para musicdibs.com

## Antes de empezar
- [ ] Tienes acceso a **Project Settings → Domains** en Lovable.
- [ ] Tienes acceso al panel de DNS de Cloudflare para **musicdibs.com**.
- [ ] Estás en horario de bajo tráfico (el cambio puede causar breve indisponibilidad).
- [ ] Has hecho copia de los registros DNS actuales de Cloudflare (por precaución).

---

## Paso 1: Eliminar el dominio actual de Lovable
1. Ve a **Project → Settings → Domains**.
2. Localiza **musicdibs.com**.
3. Abre el menú de 3 puntos (⋯) y selecciona **Remove**.
4. Confirma la eliminación.

---

## Paso 2: Refrescar el navegador
1. Haz un **refresh completo** del navegador (Ctrl+F5 / Cmd+Shift+R).
2. Vuelve a entrar en **Project → Settings → Domains**.

---

## Paso 3: Reconectar musicdibs.com en modo proxy
1. Haz clic en **Connect domain**.
2. Escribe exactamente: `musicdibs.com`
3. Expande la sección **Advanced**.
4. Activa la opción **"Domain uses Cloudflare or a similar proxy"**.
5. Completa el flujo de conexión.

> El CNAME target que Lovable asignará será `musicdibs-pre.lovable.app`.
> Confírmalo en **Project → Settings → Domains** tras reconectar.

---

## Paso 4: Configurar registros DNS en Cloudflare

Elimina o desactiva cualquier registro A/AAAA previo para `musicdibs.com` y `www.musicdibs.com` que apunte a `185.158.133.1` u otra IP.

Añade o actualiza estos registros CNAME con la nube naranja (proxied) activa:

| Tipo  | Nombre | Target                     | Proxy (nube naranja) |
| ----- | ------ | -------------------------- | -------------------- |
| CNAME | `@`    | `musicdibs-pre.lovable.app` | Sí                   |
| CNAME | `www`  | `musicdibs-pre.lovable.app` | Sí                   |

> El CNAME flattening de Cloudflare permite usar CNAME en el apex (`@`).
> No se requiere registro TXT de verificación en modo proxy.

---

## Paso 5: Verificar en Lovable
1. Vuelve a **Project → Settings → Domains**.
2. Confirma que **musicdibs.com** aparece como conectado.
3. Verifica que el dominio sigue marcado como **Primary** si lo necesitas.

---

## Paso 6: Verificar en Cloudflare
1. En DNS → Records, confirma que los dos CNAME apuntan a `musicdibs-pre.lovable.app`.
2. Confirma que la nube naranja está activa en ambos registros.
3. Espera a la propagación DNS (puede tardar hasta 72 h, aunque normalmente es mucho menos).

---

## Paso 7: Comprobar que todo funciona
- [ ] `https://musicdibs.com` carga correctamente.
- [ ] `https://www.musicdibs.com` redirige o carga correctamente (según configuración deseada).
- [ ] El certificado SSL es válido.
- [ ] Las Response Header Transform Rules de Cloudflare se aplican.
- [ ] Las reglas de cache de Cloudflare funcionan como esperas.

---

## Notas importantes
- No actives **Bot Fight Mode** si usas webhooks o integraciones automatizadas, ya que podría bloquear tráfico legítimo.
- Si usas Page Rules o Redirect Rules en Cloudflare, revísalos tras el cambio para asegurarte de que siguen funcionando.
- Si algo falla, puedes revertir eliminando el dominio de Lovable y volviendo a conectarlo sin modo proxy (usando el A record `185.158.133.1`).

---

## Datos clave
- **Dominio:** musicdibs.com
- **Subdominio:** www.musicdibs.com
- **CNAME target:** `musicdibs-pre.lovable.app`
- **Modo:** Cloudflare proxy (nube naranja)
- **No se requiere TXT de verificación**
