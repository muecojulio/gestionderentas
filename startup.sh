#!/bin/sh
set -eu
cd /workspace
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# En este sandbox el tráfico HTTPS pasa por un proxy con CA propia (E2B Proxy
# CA). curl usa el almacén del sistema, pero Node (undici) no: sin esto, las
# consultas a las APIs públicas (GitHub/Banxico, Nager.Date, Frankfurter)
# fallarían la verificación TLS. En despliegues normales no hay intercepción
# y la variable simplemente no se define.
if [ -z "${NODE_EXTRA_CA_CERTS:-}" ] && [ -f /etc/ssl/certs/ca-certificates.crt ]; then
  export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
