import Header from "./Header";
import Hero from "./Hero";
import FeatureCards from "./FeatureCards";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <FeatureCards />
      
      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        <div className="container mx-auto px-6 relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready for Complete<br />
            <span className="text-gradient">Financial Visibility?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join 500+ organizations that trust OnYx for their financial governance needs.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-14 px-8 text-lg font-semibold hover:bg-primary/90 transition-colors">
              Launch Dashboard
            </a>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="font-bold text-primary-foreground">O</span>
              </div>
              <span className="text-lg font-bold">OnYx</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 OnYx Financial Governance. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;