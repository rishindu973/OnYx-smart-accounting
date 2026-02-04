import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import HeroAnimation from "./HeroAnimation";

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center pt-20 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">SOC 2 Type II Certified</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Financial<br />
              Governance<br />
              <span className="text-gradient">Without Gaps</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              Transform paper chaos into digital clarity. OnYx uses agentic AI to extract, validate, and balance every transaction with an immutable audit trail.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl" className="gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">99.7%</div>
                <div className="text-sm text-muted-foreground">Extraction Accuracy</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">$2.4B</div>
                <div className="text-sm text-muted-foreground">Transactions Processed</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Enterprise Clients</div>
              </div>
            </div>
          </div>
          
          <div className="lg:pl-8">
            <HeroAnimation />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;