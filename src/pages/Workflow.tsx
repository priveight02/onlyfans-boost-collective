import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import WorkflowSection from "@/components/WorkflowSection";

const Workflow = () => {
  return (
    <div className="dark min-h-screen bg-background">
      <PageSEO
        title="Workflow - Setup to Sales in Under 1 Hour"
        description="See the Uplyze workflow: connect channels, launch campaigns, and scale with AI automation in under one hour."
      />
      <div className="pt-16">
        <WorkflowSection />
      </div>
      <Footer />
    </div>
  );
};

export default Workflow;
