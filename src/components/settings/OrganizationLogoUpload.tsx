import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function OrganizationLogoUpload() {
  const { organization, isOrgAdmin, isSuperadmin, refreshOrganization } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageLogo = isOrgAdmin || isSuperadmin;

  if (!organization || !canManageLogo) {
    return null;
  }

  // Whitelist allowed extensions and MIME types
  const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type with whitelist
    const fileExt = ALLOWED_MIME_TYPES[file.type];
    if (!fileExt) {
      toast.error('Ungültiger Dateityp. Erlaubt: JPG, PNG, GIF, WebP, SVG');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 2MB gross sein');
      return;
    }

    setIsUploading(true);

    try {
      const safeOrgId = organization.id.replace(/[^a-zA-Z0-9-]/g, '');
      const filePath = `${safeOrgId}/logo.${fileExt}`;

      // Remove any other existing logo files for this org (different extension)
      const { data: existing } = await supabase.storage.from('org-logos').list(safeOrgId);
      const stale = (existing ?? [])
        .filter(o => o.name.startsWith('logo.') && o.name !== `logo.${fileExt}`)
        .map(o => `${safeOrgId}/${o.name}`);
      if (stale.length > 0) {
        await supabase.storage.from('org-logos').remove(stale);
      }

      // Upload new logo to private bucket
      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Persist STORAGE PATH (not a URL); AuthContext will sign it on read
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: filePath })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      // Sign for immediate local preview
      const { data: signed } = await supabase.storage
        .from('org-logos')
        .createSignedUrl(filePath, 60 * 60);

      setLogoUrl(signed?.signedUrl ?? null);
      await refreshOrganization();
      toast.success('Logo erfolgreich hochgeladen');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      const message = error?.message || 'Unbekannter Fehler';
      toast.error(`Fehler beim Hochladen: ${message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;

    setIsDeleting(true);

    try {
      const safeOrgId = organization.id.replace(/[^a-zA-Z0-9-]/g, '');
      const { data: existing } = await supabase.storage.from('org-logos').list(safeOrgId);
      const paths = (existing ?? [])
        .filter(o => o.name.startsWith('logo.'))
        .map(o => `${safeOrgId}/${o.name}`);

      if (paths.length > 0) {
        const { error: deleteError } = await supabase.storage.from('org-logos').remove(paths);
        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setLogoUrl(null);
      await refreshOrganization();
      toast.success('Logo erfolgreich gelöscht');
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      const message = error?.message || 'Unbekannter Fehler';
      toast.error(`Fehler beim Löschen: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisations-Logo</CardTitle>
        <CardDescription>
          Laden Sie das Logo Ihrer Organisation hoch. Es wird in der Seitenleiste angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={logoUrl || undefined} alt={organization.name} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {organization.code?.[0] || organization.name?.[0] || 'O'}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Hochladen...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {logoUrl ? 'Logo ändern' : 'Logo hochladen'}
              </>
            )}
          </Button>

          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteLogo}
              disabled={isUploading || isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Logo entfernen
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            JPG, PNG oder SVG, max. 2MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}