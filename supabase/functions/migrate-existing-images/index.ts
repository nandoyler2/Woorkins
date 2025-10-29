import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 20 } = await req.json();

    console.log('Starting image migration...');

    // Buscar profiles com imagens sem thumbnails
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url, logo_url, avatar_thumbnail_url, cover_thumbnail_url, logo_thumbnail_url')
      .or('and(avatar_url.not.is.null,avatar_thumbnail_url.is.null),and(cover_url.not.is.null,cover_thumbnail_url.is.null),and(logo_url.not.is.null,logo_thumbnail_url.is.null)')
      .limit(batchSize);

    if (fetchError) throw fetchError;

    console.log(`Found ${profiles?.length || 0} profiles to migrate`);

    const results = {
      total: profiles?.length || 0,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No images to migrate', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar cada profile
    for (const profile of profiles) {
      try {
        const updates: any = {};

        // Migrar avatar
        if (profile.avatar_url && !profile.avatar_thumbnail_url) {
          console.log(`Migrating avatar for profile ${profile.id}`);
          const { data, error } = await supabase.functions.invoke('upload-optimized-image', {
            body: {
              imageUrl: profile.avatar_url,
              imageType: 'avatar',
              bucket: 'avatars',
              path: `${profile.id}/avatar.jpg`,
            },
          });

          if (!error && data?.thumbnail_url) {
            updates.avatar_thumbnail_url = data.thumbnail_url;
            if (data.full_url) updates.avatar_url = data.full_url;
          }
        }

        // Migrar cover
        if (profile.cover_url && !profile.cover_thumbnail_url) {
          console.log(`Migrating cover for profile ${profile.id}`);
          const { data, error } = await supabase.functions.invoke('upload-optimized-image', {
            body: {
              imageUrl: profile.cover_url,
              imageType: 'cover',
              bucket: 'covers',
              path: `${profile.id}/cover.jpg`,
            },
          });

          if (!error && data?.thumbnail_url) {
            updates.cover_thumbnail_url = data.thumbnail_url;
            if (data.full_url) updates.cover_url = data.full_url;
          }
        }

        // Migrar logo
        if (profile.logo_url && !profile.logo_thumbnail_url) {
          console.log(`Migrating logo for profile ${profile.id}`);
          const { data, error } = await supabase.functions.invoke('upload-optimized-image', {
            body: {
              imageUrl: profile.logo_url,
              imageType: 'logo',
              bucket: 'logos',
              path: `${profile.id}/logo.jpg`,
            },
          });

          if (!error && data?.thumbnail_url) {
            updates.logo_thumbnail_url = data.thumbnail_url;
            if (data.full_url) updates.logo_url = data.full_url;
          }
        }

        // Atualizar profile se houver mudanças
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id);

          if (updateError) throw updateError;
          
          results.success++;
          console.log(`Successfully migrated profile ${profile.id}`);
        }
      } catch (error) {
        console.error(`Error migrating profile ${profile.id}:`, error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({ profileId: profile.id, error: errorMessage });
      }
    }

    console.log('Migration completed', results);

    return new Response(
      JSON.stringify({ message: 'Migration completed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in migration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
