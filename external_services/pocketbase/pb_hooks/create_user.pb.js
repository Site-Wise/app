// Bot protection for user signup.
//
// Web clients send a Cloudflare Turnstile token (`turnstileToken`); native
// (Tauri) clients — where Turnstile cannot render — send a signed
// app-attestation token (`appToken`) instead. Either a valid Turnstile token
// OR a valid app token is accepted; both are bot-resistant.
onRecordCreateRequest((e) => {
  const utils = require(`${__hooks}/utils.js`)

  const turnstileToken = e.requestInfo().body['turnstileToken']
  const appToken = e.requestInfo().body['appToken']
  const remoteIP = e.requestInfo().headers["X-Real-IP"] || e.requestInfo().headers["X-Forwarded-For"]

  utils.verifyAuthChallenge(turnstileToken, appToken, remoteIP, 'register')

  e.next()
}, "users")
