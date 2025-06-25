import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Validation check
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure auth settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Storage options
    storage: window.localStorage,
    // Additional auth options
    flowType: 'pkce', // Recommended for web apps
  },
  // Database options
  db: {
    schema: 'public',
  },
  // Global settings
  global: {
    headers: {
      'X-Client-Info': 'flamingoes-attendance-tracker',
    },
  },
  // Real-time options
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper function to check if user is authenticated
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error.message)
    return null
  }
}

// Helper function to check session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    console.error('Error getting current session:', error.message)
    return null
  }
}

// Helper function for signing out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error.message)
    return { success: false, error: error.message }
  }
}

// Helper function to listen to auth changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Database helper functions
export const dbHelpers = {
  // Generic select function
  async select(table, columns = '*', filters = {}) {
    try {
      let query = supabase.from(table).select(columns)
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
      
      const { data, error } = await query
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error.message)
      return { data: null, error: error.message }
    }
  },

  // Generic insert function
  async insert(table, data) {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
      
      if (error) throw error
      return { data: result, error: null }
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error.message)
      return { data: null, error: error.message }
    }
  },

  // Generic update function
  async update(table, id, updates) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error(`Error updating ${table}:`, error.message)
      return { data: null, error: error.message }
    }
  },

  // Generic delete function
  async delete(table, id) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .select()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error.message)
      return { data: null, error: error.message }
    }
  }
}

// Export default client
export default supabase