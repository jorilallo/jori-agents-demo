import ngrok from "@ngrok/ngrok";

declare global {
  var ngrokTunnel: ngrok.Listener;
}

export async function startNgrokTunnel(endpoint: string) {
  if (global.ngrokTunnel) {
    return global.ngrokTunnel.url();
  }

  const tunnel = await ngrok.forward({
    addr: endpoint,
    authtoken: process.env.NGROK_AUTH_TOKEN,
    domain: process.env.NGROK_DOMAIN,
  });

  console.log(`Ngrok tunnel started on ${tunnel.url()}`);

  globalThis.ngrokTunnel = tunnel;

  return tunnel.url();
}
