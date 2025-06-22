/**
 * Cloudflare Worker for Razorpay Integration
 * 
 * This worker handles Razorpay API calls for the SiteWise subscription system.
 * Deploy this to Cloudflare Workers and set up the routes accordingly.
 * 
 * Required Environment Variables:
 * - RAZORPAY_KEY_ID: Your Razorpay Key ID
 * - RAZORPAY_KEY_SECRET: Your Razorpay Key Secret
 * - POCKETBASE_URL: Your PocketBase URL
 * - POCKETBASE_ADMIN_EMAIL: PocketBase admin email
 * - POCKETBASE_ADMIN_PASSWORD: PocketBase admin password
 */

// Import crypto-js for signature verification
// Note: You'll need to bundle this or use native Web Crypto API

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let response

    switch (path) {
      case '/api/razorpay/create-order':
        response = await handleCreateOrder(request)
        break
      case '/api/razorpay/verify-payment':
        response = await handleVerifyPayment(request)
        break
      case '/api/razorpay/cancel-subscription':
        response = await handleCancelSubscription(request)
        break
      default:
        response = new Response('Not Found', { status: 404 })
    }

    // Add CORS headers to response
    Object.keys(corsHeaders).forEach(key => {
      response.headers.set(key, corsHeaders[key])
    })

    return response
  } catch (error) {
    console.error('Worker error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleCreateOrder(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await request.json()
  const { amount, currency, receipt, notes } = body

  const orderData = {
    amount,
    currency: currency || 'INR',
    receipt,
    notes
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Razorpay API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const order = await response.json()
  return new Response(JSON.stringify(order), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleVerifyPayment(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await request.json()
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

  // Verify signature
  const expectedSignature = await generateSignature(
    razorpay_order_id + '|' + razorpay_payment_id,
    RAZORPAY_KEY_SECRET
  )

  if (expectedSignature !== razorpay_signature) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Fetch payment details from Razorpay
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
    headers: {
      'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    }
  })

  if (!paymentResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const payment = await paymentResponse.json()
  
  return new Response(JSON.stringify({ 
    verified: true,
    payment 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleCancelSubscription(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await request.json()
  const { subscription_id } = body

  const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cancel_at_cycle_end: 1 })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Razorpay subscription cancel error:', error)
    return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function generateSignature(data, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Environment variables (set these in Cloudflare Workers dashboard)
const RAZORPAY_KEY_ID = typeof RAZORPAY_KEY_ID !== 'undefined' ? RAZORPAY_KEY_ID : ''
const RAZORPAY_KEY_SECRET = typeof RAZORPAY_KEY_SECRET !== 'undefined' ? RAZORPAY_KEY_SECRET : ''