import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Rocket, ToggleRight } from "lucide-react";

const workflowSteps = [
  {
    id: "01",
    title: "Take the 5-minute quiz",
    description: "Tell us about your offer, audience, and goals so AI can map the right growth strategy instantly.",
  },
  {
    id: "02",
    title: "Connect your channels",
    description: "Link your ad accounts and social channels in 2 clicks. Uplyze syncs your real-time signals automatically.",
  },
  {
    id: "03",
    title: "Activate and scale",
    description: "Campaigns launch, creatives rotate, and AI optimizes continuously while you monitor results live.",
  },
];

const WorkflowSection = () => {
  return (
    <section id="workflow-section" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground md:text-5xl">From Setup to Sales</h2>
          <motion.span
            initial={{ opacity: 0, y: -6, rotate: -5 }}
            whileInView={{ opacity: 1, y: 0, rotate: -3 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-5 py-2 text-base font-semibold text-primary shadow-[0_10px_24px_hsl(var(--background)/0.5)]"
          >
            <Clock3 className="h-4 w-4" />
            in under 1 hour
          </motion.span>
        </motion.div>

        <div className="space-y-14">
          {workflowSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start"
            >
              <div className="relative pl-14 sm:pl-20">
                {index < workflowSteps.length - 1 && (
                  <span className="absolute left-[0.9rem] top-12 h-[calc(100%+2.3rem)] w-px bg-border/60" aria-hidden="true" />
                )}

                <span className="absolute left-0 top-0 text-4xl font-black tracking-tight text-primary/70">{step.id}</span>
                <h3 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">{step.title}</h3>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{step.description}</p>
              </div>

              {index === 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/65 p-6 shadow-[0_16px_35px_hsl(var(--background)/0.55)] backdrop-blur-md">
                  <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary/90">STEP 1 OF 3</p>
                  <h4 className="mb-5 text-xl font-semibold text-foreground">What is your main advertising goal?</h4>
                  <div className="space-y-3">
                    {["Scale revenue", "Brand awareness", "Lead generation"].map((goal, goalIndex) => (
                      <div
                        key={goal}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                          goalIndex === 0
                            ? "border-primary/70 bg-primary/10 text-foreground"
                            : "border-border/55 bg-background/30 text-muted-foreground"
                        }`}
                      >
                        {goal}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {index === 1 && (
                <div className="rounded-2xl border border-border/50 bg-card/65 p-6 shadow-[0_16px_35px_hsl(var(--background)/0.55)] backdrop-blur-md">
                  <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-primary/90">DATA SOURCES</p>
                  <div className="space-y-3">
                    {["Facebook Ads", "Instagram", "TikTok"].map((source, sourceIndex) => (
                      <div key={source} className="flex items-center justify-between rounded-xl border border-border/55 bg-background/35 px-4 py-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{source}</p>
                          <p className="text-xs text-primary">Connected</p>
                        </div>
                        <ToggleRight className={`h-7 w-7 ${sourceIndex < 2 ? "text-primary" : "text-muted-foreground/40"}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {index === 2 && (
                <div className="rounded-2xl border border-border/50 bg-card/65 p-6 shadow-[0_16px_35px_hsl(var(--background)/0.55)] backdrop-blur-md">
                  <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-primary/90">LAUNCH STATUS</p>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/55 bg-background/35 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Return on Ad Spend</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">4.5x</p>
                      <p className="text-xs font-medium text-primary">+12.5% this week</p>
                    </div>
                    <div className="rounded-xl border border-border/55 bg-background/35 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">$12,450</p>
                      <p className="text-xs font-medium text-primary">+8.2% this week</p>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Campaign active
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-primary">
                    <Rocket className="h-4 w-4" />
                    <span className="text-sm font-medium">AI is scaling your top performers now</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
