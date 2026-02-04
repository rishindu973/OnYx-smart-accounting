import { Brain, Shield, Lock, Sparkles, AlertTriangle, Database } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Agentic AI Extraction",
    description: "Our AI agents analyze documents with confidence heatmaps, highlighting uncertain data for human review.",
    badge: "AI-Powered",
    highlight: "confidence heatmaps",
  },
  {
    icon: Shield,
    title: "Hard Daily Limit Guardrails",
    description: "Set immutable spending limits that cannot be overridden. Real-time blocking ensures compliance.",
    badge: "Governance",
    highlight: "cannot be overridden",
  },
  {
    icon: Database,
    title: "No-Delete Audit Trail",
    description: "Every transaction is permanent. Mistakes are corrected through reversals, never deletions.",
    badge: "Immutable",
    highlight: "never deletions",
  },
];

const FeatureCards = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">Features</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Financial Governance,<br />
            <span className="text-gradient">Reimagined</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for organizations that demand transparency, compliance, and absolute control over their financial operations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-8 group hover:border-primary/50 transition-all duration-500 hover:glow-blue"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {feature.badge}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description.split(feature.highlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-primary font-medium">{feature.highlight}</span>
                    )}
                  </span>
                ))}
              </p>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Enterprise-grade security</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;