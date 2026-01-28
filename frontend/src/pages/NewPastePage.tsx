import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pasteApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Plus, X, UserPlus } from 'lucide-react';

interface SharedUser {
  username: string;
  canEdit: boolean;
}

export function NewPastePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addSharedUser = () => {
    if (!newUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a username',
        variant: 'destructive',
      });
      return;
    }

    if (sharedUsers.some((u) => u.username === newUsername.trim())) {
      toast({
        title: 'Error',
        description: 'User already added',
        variant: 'destructive',
      });
      return;
    }

    setSharedUsers([...sharedUsers, { username: newUsername.trim(), canEdit }]);
    setNewUsername('');
    setCanEdit(false);
  };

  const removeSharedUser = (username: string) => {
    setSharedUsers(sharedUsers.filter((u) => u.username !== username));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Content cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await pasteApi.create({
        title: title.trim() || 'Untitled',
        content,
        sharedWith: sharedUsers.length > 0 ? sharedUsers : undefined,
      });
      toast({
        title: 'Success',
        description: 'Paste created successfully',
      });
      navigate(`/share/${response.paste.shareId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create paste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
          Back to Dashboard
        </Button>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Create New Paste</CardTitle>
            <CardDescription>
              Share your code, text, or notes with others
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter a title for your paste"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Paste your content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px] font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Share with Users (optional)
                </Label>
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSharedUser())}
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={canEdit}
                        onChange={(e) => setCanEdit(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Can Edit</span>
                    </label>
                    <Button type="button" size="sm" onClick={addSharedUser}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {sharedUsers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Shared with:</div>
                      {sharedUsers.map((user) => (
                        <div
                          key={user.username}
                          className="flex items-center justify-between p-2 bg-background border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">
                              ({user.canEdit ? 'Can Edit' : 'View Only'})
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSharedUser(user.username)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Paste'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
