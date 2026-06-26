// Bot protection for password login.
//
// Web clients send a Cloudflare Turnstile token (`turnstileToken`); native
// (Tauri) clients — where Turnstile cannot render — send a signed
// app-attestation token (`appToken`) instead. Either a valid Turnstile token
// OR a valid app token is accepted; both are bot-resistant.
onRecordAuthWithPasswordRequest((e) => {
  const utils = require(`${__hooks}/utils.js`)

  const turnstileToken = e.requestInfo().query['turnstileToken']
  const appToken = e.requestInfo().query['appToken']
  const remoteIP = e.requestInfo().headers["X-Real-IP"] || e.requestInfo().headers["X-Forwarded-For"]

  utils.verifyAuthChallenge(turnstileToken, appToken, remoteIP, 'login')

  e.next()
}, "users")
