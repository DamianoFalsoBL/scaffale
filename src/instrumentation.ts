/**
 * Runs once when the server starts.
 *
 * DNS_IPV4_FIRST=true makes server-side fetch try IPv4 before IPv6. Needed on networks
 * where IPv6 to some CDNs (e.g. CloudFront, used by TMDB) is broken: the TLS handshake
 * is reset and Node does not fall back to IPv4 on its own.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DNS_IPV4_FIRST === 'true') {
    const dns = await import('node:dns');
    dns.setDefaultResultOrder('ipv4first');
  }
}
