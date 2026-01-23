import { Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { FileText, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, clearAuth, isAuthenticated } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <span className="font-bold text-xl">Pastebin</span>
        </Link>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {user?.username}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
