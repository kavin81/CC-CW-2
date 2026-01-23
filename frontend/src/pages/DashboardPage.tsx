import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pasteApi, Paste } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Navbar } from '@/components/Navbar';
import { Plus, Copy, Trash2, ExternalLink } from 'lucide-react';

export function DashboardPage() {
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPastes();
  }, []);

  const loadPastes = async () => {
    try {
      const response = await pasteApi.getMyPastes();
      setPastes(response.pastes);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load pastes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shareId: string) => {
    try {
      await pasteApi.delete(shareId);
      toast({
        title: 'Success',
        description: 'Paste deleted successfully',
      });
      loadPastes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete paste',
        variant: 'destructive',
      });
    }
  };

  const copyShareUrl = (shareId: string) => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Success',
      description: 'Share link copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Pastes</h1>
            <p className="text-muted-foreground mt-2">
              Manage your pastes and share links
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => navigate('/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Paste
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              Settings
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : pastes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No pastes yet</p>
              <Button onClick={() => navigate('/new')}>
                Create your first paste
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pastes.map((paste) => (
              <Card key={paste.shareId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{paste.title}</CardTitle>
                      <CardDescription>
                        Created {new Date(paste.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/share/${paste.shareId}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareUrl(paste.shareId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(paste.shareId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
