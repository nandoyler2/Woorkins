import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🧹 Starting cleanup of orphaned identity documents...');
    
    // Buscar todas as verificações aprovadas
    const { data: verifications, error: verError } = await supabase
      .from('document_verifications')
      .select('profile_id, document_front_url, document_back_url, verification_status')
      .eq('verification_status', 'approved');
    
    if (verError) throw verError;
    
    console.log(`Found ${verifications?.length || 0} approved verifications`);
    
    // Criar set com arquivos válidos (aprovados)
    const validFiles = new Set<string>();
    const profilesWithApproved = new Set<string>();
    
    verifications?.forEach(v => {
      profilesWithApproved.add(v.profile_id);
      if (v.document_front_url) {
        const path = v.document_front_url.split('identity-documents/')[1]?.split('?')[0];
        if (path) validFiles.add(path);
      }
      if (v.document_back_url) {
        const path = v.document_back_url.split('identity-documents/')[1]?.split('?')[0];
        if (path) validFiles.add(path);
      }
    });
    
    console.log(`Valid files to keep: ${validFiles.size}`);
    console.log(`Profiles with approved verification: ${profilesWithApproved.size}`);
    
    // Listar todas as pastas (profiles) no storage
    const { data: folders, error: listError } = await supabase.storage
      .from('identity-documents')
      .list();
    
    if (listError) throw listError;
    
    let totalDeleted = 0;
    let totalSizeMB = 0;
    
    for (const folder of folders || []) {
      const profileId = folder.name;
      
      // Listar arquivos do profile
      const { data: files, error: filesError } = await supabase.storage
        .from('identity-documents')
        .list(profileId);
      
      if (filesError || !files) continue;
      
      const filesToDelete: string[] = [];
      
      // Se profile NÃO tem verificação aprovada, deletar TODOS os arquivos
      if (!profilesWithApproved.has(profileId)) {
        for (const file of files) {
          const fullPath = `${profileId}/${file.name}`;
          filesToDelete.push(fullPath);
          totalSizeMB += (file.metadata?.size || 0) / (1024 * 1024);
        }
      } else {
        // Se tem aprovado, deletar apenas arquivos não referenciados
        for (const file of files) {
          const fullPath = `${profileId}/${file.name}`;
          if (!validFiles.has(fullPath)) {
            filesToDelete.push(fullPath);
            totalSizeMB += (file.metadata?.size || 0) / (1024 * 1024);
          }
        }
      }
      
      // Deletar arquivos órfãos
      if (filesToDelete.length > 0) {
        console.log(`Deleting ${filesToDelete.length} files from profile ${profileId}...`);
        
        const { error: deleteError } = await supabase.storage
          .from('identity-documents')
          .remove(filesToDelete);
        
        if (!deleteError) {
          totalDeleted += filesToDelete.length;
          console.log(`✅ Deleted ${filesToDelete.length} files`);
        } else {
          console.error(`❌ Error deleting from ${profileId}:`, deleteError);
        }
      }
    }
    
    // Deletar verificações pendentes/rejeitadas antigas (>7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: oldVerifications, error: oldVerError } = await supabase
      .from('document_verifications')
      .select('id, profile_id')
      .in('verification_status', ['pending', 'rejected'])
      .lt('created_at', sevenDaysAgo.toISOString());
    
    if (!oldVerError && oldVerifications && oldVerifications.length > 0) {
      console.log(`Deleting ${oldVerifications.length} old pending/rejected verifications...`);
      
      const { error: deleteVerError } = await supabase
        .from('document_verifications')
        .delete()
        .in('id', oldVerifications.map(v => v.id));
      
      if (!deleteVerError) {
        console.log(`✅ Deleted ${oldVerifications.length} old verifications`);
      }
    }
    
    console.log('✅ Cleanup completed!');
    console.log(`📁 Files deleted: ${totalDeleted}`);
    console.log(`💾 Space freed: ${totalSizeMB.toFixed(2)} MB`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        filesDeleted: totalDeleted,
        spaceMB: parseFloat(totalSizeMB.toFixed(2)),
        validFilesKept: validFiles.size,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
