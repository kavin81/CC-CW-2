import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pasteApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Navbar } from '@/components/Navbar';
import { Copy, ArrowLeft, Edit, Save, X } from 'lucide-react';
import { useStore } from '@/lib/store';

export function ViewPastePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [paste, setPaste] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = useStore((state) => state.user);

  useEffect(() => {
    if (shareId) {
      loadPaste();
    }
  }, [shareId]);

  const loadPaste = async () => {
    try {
      const response = await pasteApi.getByShareId(shareId!);
      console.log('Paste response:', response);
      console.log('canEdit:', response.paste.canEdit, 'isOwner:', response.paste.isOwner);

      setPaste(response.paste);
      setEditedContent(response.paste.content);
      setEditedTitle(response.paste.title);

      // Use permission info from the API response
      setCanEdit(response.paste.canEdit || false);
      setIsOwner(response.paste.isOwner || false);

      console.log('State after set - canEdit:', response.paste.canEdit || false, 'isOwner:', response.paste.isOwner || false);

      // If owner, load shared users list
      if (response.paste.isOwner) {
        try {
          const sharedResponse = await pasteApi.getSharedUsers(shareId!);
          setSharedUsers(sharedResponse.sharedUsers);
        } catch (error) {
          // Owner but no shared users or error loading
          setSharedUsers([]);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load paste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await pasteApi.update(shareId!, {
        content: editedContent,
        title: editedTitle,
      });
      toast({
        title: 'Success',
        description: 'Paste updated successfully',
      });
      setPaste({ ...paste, content: editedContent, title: editedTitle });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update paste',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(paste.content);
    setEditedTitle(paste.title);
    setIsEditing(false);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(paste.content);
    toast({
      title: 'Success',
      description: 'Content copied to clipboard',
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Success',
      description: 'Share link copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : paste ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-2xl font-bold mb-2"
                    />
                  ) : (
                    <CardTitle>{paste.title}</CardTitle>
                  )}
                  <CardDescription>
                    Created {new Date(paste.createdAt).toLocaleString()}
                    {!isOwner && canEdit && (
                      <span className="ml-2 text-green-600 font-medium">• Can Edit</span>
                    )}
                  </CardDescription>
                  {isOwner && sharedUsers.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Shared with: {sharedUsers.map(u => u.username).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={copyContent}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Content
                      </Button>
                      <Button variant="outline" size="sm" onClick={copyUrl}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] font-mono"
                />
              ) : (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{paste.content}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Paste not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
