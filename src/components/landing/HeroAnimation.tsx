import { useEffect, useState } from "react";
import { FileText, ArrowRight, BookOpen, Check, Sparkles } from "lucide-react";

const HeroAnimation = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow background */}
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse-glow" />
      
      <div className="relative flex items-center justify-center gap-8">
        {/* Cheque Document */}
        <div className={`glass-card rounded-xl p-6 transition-all duration-700 ${
          stage >= 1 ? 'scale-95 opacity-70' : 'scale-100 opacity-100'
        }`}>
          <div className="w-48 h-28 relative">
            <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-lg" />
            <FileText className="w-12 h-12 text-primary mx-auto mt-4" />
            <div className="mt-2 space-y-1">
              <div className="h-2 bg-muted rounded w-3/4 mx-auto" />
              <div className="h-2 bg-muted rounded w-1/2 mx-auto" />
            </div>
            
            {/* Scan line */}
            {stage === 1 && (
              <div className="absolute left-0 right-0 h-1 bg-primary animate-scan-line rounded" />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">Physical Cheque</p>
        </div>

        {/* Arrow with AI processing indicator */}
        <div className={`flex flex-col items-center transition-all duration-500 ${
          stage >= 1 ? 'opacity-100 scale-100' : 'opacity-30 scale-90'
        }`}>
          <div className={`p-3 rounded-full ${stage === 1 ? 'bg-primary animate-pulse' : 'bg-muted'}`}>
            <Sparkles className={`w-5 h-5 ${stage === 1 ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          </div>
          <ArrowRight className="w-8 h-8 text-primary my-2" />
          <span className="text-xs text-muted-foreground">AI Extract</span>
        </div>

        {/* Ledger */}
        <div className={`glass-card rounded-xl p-6 transition-all duration-700 ${
          stage >= 2 ? 'scale-100 opacity-100 glow-blue' : 'scale-95 opacity-50'
        }`}>
          <div className="w-48 h-28 relative">
            <BookOpen className="w-12 h-12 text-primary mx-auto" />
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Debit</span>
                <span className={`transition-all duration-500 ${stage >= 3 ? 'text-success' : 'text-foreground'}`}>
                  $5,420.00
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Credit</span>
                <span className={`transition-all duration-500 ${stage >= 3 ? 'text-success' : 'text-foreground'}`}>
                  $5,420.00
                </span>
              </div>
              {stage >= 3 && (
                <div className="flex items-center justify-center gap-1 text-success text-xs mt-2 animate-fade-up">
                  <Check className="w-3 h-3" />
                  <span>Balanced</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">Digital Ledger</p>
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === stage ? 'w-8 bg-primary' : 'w-1.5 bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroAnimation;