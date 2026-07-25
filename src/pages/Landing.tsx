import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pill, Shield, Stethoscope, User, Building2, CheckCircle2, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Stethoscope,
    title: "For doctors",
    description: "Create prescriptions with clear instructions, built-in tracking, and a safer handoff to the next step.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: User,
    title: "For patients",
    description: "See every prescription in one place, with simple history and secure access for family support.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Building2,
    title: "For pharmacies",
    description: "Verify dispensing with confidence using barcode-backed records and a trusted confirmation flow.",
    color: "bg-success/10 text-success",
  },
];

const steps = [
  "A doctor prepares a prescription with clear treatment details.",
  "The patient receives a secure record they can review anytime.",
  "The pharmacy confirms the prescription before dispensing.",
  "Everyone stays aligned with a safer, more transparent process.",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Pill className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold tracking-tight text-foreground">MedLync</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/signup"><Button className="gradient-primary text-primary-foreground">Get started</Button></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-3xl animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              <Shield className="h-4 w-4" />
              A calmer way to manage prescriptions
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Digital care coordination for <span className="gradient-text">modern healthcare</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              MedLync helps clinics, patients, and pharmacies stay connected with secure prescription records that are easier to follow and safer to trust.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/signup"><Button size="lg" className="gradient-primary text-primary-foreground px-8">Create account</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline" className="px-8">Sign in</Button></Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <div key={feature.title} className="glass-card rounded-xl p-6" style={{ animationDelay: `${index * 100 + 120}ms` }}>
                <div className={`mb-4 inline-flex rounded-xl p-3 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-3xl font-semibold text-foreground">How the journey works</h2>
              <p className="mx-auto mb-10 max-w-2xl text-muted-foreground">
                The experience is straightforward: one secure workflow that supports clinicians, patients, and pharmacies from start to finish.
              </p>
              <div className="grid gap-4 text-left md:grid-cols-2">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto flex flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">MedLync</span>
          </div>
          <p>Secure prescription management for modern care teams.</p>
        </div>
      </footer>
    </div>
  );
}
