/// <reference path="../pb_data/types.d.ts" />

// Lightweight, unauthenticated liveness/readiness endpoint.
//
// PocketBase already exposes `GET /api/health`. This adds a plain-text
// `GET /up` route that returns `200 OK`, matching the convention expected by
// container orchestrators and self-hosting platforms — notably the ONCE app
// server, which probes `/up` to decide when the app is ready to serve traffic.
routerAdd("GET", "/up", (e) => {
  return e.string(200, "OK")
})
