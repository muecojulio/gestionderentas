/**
 * Inicio de sesión eliminado: el popup OAuth ya no se necesita. Esta función
 * devuelve siempre un error 404 por si el plugin de Vite llegara a invocarla.
 */

export async function handleAuthPopupRequest(_request: Request): Promise<Response> {
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
