import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-xl">O</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">
              On<span className="text-primary">Yx</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Features
            </a>
            <a href="#security" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Security
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Pricing
            </a>
          </nav>

          <Button variant="secure" size="lg" className="gap-2" onClick={() => setShowAuthModal(true)}>
            <Lock className="w-4 h-4" />
            Secure Login
          </Button>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default Header;