const SUPABASE_URL = "https://edhtzvgfuejcfniyqygn.supabase.co"
const SUPABASE_KEY = "sb_publishable_wB6KHsy5IemEod00mKHjPQ_Tg7vWPU1"
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
console.log('Supabase client ready:', client)