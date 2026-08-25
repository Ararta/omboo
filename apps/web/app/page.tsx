// middleware.ts redirects every request to "/" toward the signed-in user's role home (or
// /login) before this ever renders — this file only exists so the route is statically valid.
export default function RootPage() {
  return null;
}
