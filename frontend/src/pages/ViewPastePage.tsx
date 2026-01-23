import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pasteApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Navbar } from '@/components/Navbar';
import { Copy, ArrowLeft } from 'lucide-react';

export function ViewPastePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [paste, setPaste] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (shareId) {
      loadPaste();
    }
  }, [shareId]);

  const loadPaste = async () => {
    try {
      const response = await pasteApi.getByShareId(shareId!);
      setPaste(response.paste);
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
                <div>
                  <CardTitle>{paste.title}</CardTitle>
                  <CardDescription>
                    Created {new Date(paste.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={copyContent}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Content
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{paste.content}</code>
              </pre>
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
