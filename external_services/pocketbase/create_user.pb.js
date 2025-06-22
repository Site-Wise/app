onRecordCreateExecute((e) => {
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY
  const turnstileToken = e.requestInfo().query['turnstileToken'] // Assuming the token is sent in the 'turnstile' field
  const remoteIP = e.requestInfo().headers["X-Real-IP"] || e.requestInfo().headers["X-Forwarded-For"]

  if (!turnstileToken) {
    throw new Error("Turnstile token is missing.")
  }

  if (!turnstileSecretKey) {
    throw new Error("TURNSTILE_SECRET_KEY environment variable is not set.")
  }

  const formData = new FormData()
  formData.append("secret", turnstileSecretKey)
  formData.append("response", turnstileToken)
  formData.append("remoteip", remoteIP)

  const resp = $http.send({
    url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    method: "POST",
    body: formData,
    headers: { "content-type": "application/json" },
  })

  if (resp.statusCode != 200) {
    throw new Error("Turnstile verification failed: " + resp.statusCode)
  }

  const data = resp.json

  if (!data.success) {
    throw new Error("Invalid Turnstile token: " + JSON.stringify(data["error-codes"]))
  }

  // Token is valid, allow user creation to proceed
  e.next()
}, "users")