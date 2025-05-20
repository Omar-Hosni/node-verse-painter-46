
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user ID from the request
    const { user_id } = await req.json();
    
    // Get the user's profile data
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, avatar_url, email')
      .eq('id', user_id)
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        data: {
          first_name: '',
          last_name: '',
          avatar_url: '',
          email: ''
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Return 200 even with error so we can use default values
      })
    }

    // Return the profile data
    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      data: {
        first_name: '',
        last_name: '',
        avatar_url: '',
        email: ''
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // Return 200 with default values
    })
  }
})
