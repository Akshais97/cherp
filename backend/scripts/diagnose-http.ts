import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'

function readDotEnv(file: string) {
  if (!fs.existsSync(file)) return {}
  const values: any = {}
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    values[key] = rest.join('=').replace(/^"|"$/g, '')
  }
  return values
}

const e2eEnv = readDotEnv(path.join(__dirname, '..', '..', 'selenium-e2e', '.env'))
const frontendEnv = readDotEnv(path.join(__dirname, '..', '..', 'frontend', '.env'))
const backendEnv = readDotEnv(path.join(__dirname, '..', '..', 'backend', '.env'))

const supabaseUrl = process.env.VITE_SUPABASE_URL || frontendEnv.VITE_SUPABASE_URL || backendEnv.SUPABASE_URL || e2eEnv.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || frontendEnv.VITE_SUPABASE_ANON_KEY || e2eEnv.VITE_SUPABASE_ANON_KEY

const pmEmail = 'akshaiindia97@gmail.com'
const password = 'SakhaaOnTop123'

async function diagnose() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: pmEmail,
    password: password
  })

  if (error || !data.session) {
    console.error('Sign in failed:', error)
    return
  }

  const token = data.session.access_token
  console.log('Sending HTTP GET /api/tasks/analytics request...')

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/analytics',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }

  const req = http.request(options, (res) => {
    console.log('HTTP Status:', res.statusCode)
    let body = ''
    res.on('data', (chunk) => body += chunk)
    res.on('end', () => {
      console.log('Response body:', body)
    })
  })

  req.on('error', (err) => {
    console.error('HTTP Request failed:', err)
  })

  req.end()
}

diagnose().catch(console.error)
