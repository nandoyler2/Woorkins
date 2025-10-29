import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup of expired stories...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Buscar stories expirados
    const { data: expiredStories, error: fetchError } = await supabase
      .from('profile_stories')
      .select('id, media_url')
      .lte('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Error fetching expired stories:', fetchError);
      throw fetchError;
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('✅ No expired stories to clean up');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired stories',
          deleted: 0 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`📋 Found ${expiredStories.length} expired stories to delete`);

    let filesDeleted = 0;
    let filesFailed = 0;

    // Deletar arquivos do storage
    for (const story of expiredStories) {
      if (story.media_url) {
        try {
          // Extrair o nome do arquivo do URL
          const urlParts = story.media_url.split('/stories/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1];
            
            const { error: deleteError } = await supabase.storage
              .from('stories')
              .remove([fileName]);

            if (deleteError) {
              console.error(`❌ Failed to delete file ${fileName}:`, deleteError);
              filesFailed++;
            } else {
              console.log(`✅ Deleted file: ${fileName}`);
              filesDeleted++;
            }
          }
        } catch (error) {
          console.error(`❌ Error processing file deletion:`, error);
          filesFailed++;
        }
      }
    }

    // Deletar registros do banco (CASCADE deleta views também)
    const storyIds = expiredStories.map(s => s.id);
    const { error: deleteError } = await supabase
      .from('profile_stories')
      .delete()
      .in('id', storyIds);

    if (deleteError) {
      console.error('❌ Error deleting story records:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Cleanup completed successfully!`);
    console.log(`   - Stories deleted: ${expiredStories.length}`);
    console.log(`   - Files deleted: ${filesDeleted}`);
    console.log(`   - Files failed: ${filesFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        deleted: expiredStories.length,
        filesDeleted,
        filesFailed,
        message: `Cleaned up ${expiredStories.length} expired stories`
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
