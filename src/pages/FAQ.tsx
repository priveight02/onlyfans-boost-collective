import Navigation from "@/components/Navigation";

const FAQ = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">FAQ</h1>
        <p className="mb-4">Here you can find answers to the most frequently asked questions.</p>
        <h2 className="text-2xl font-semibold mb-3">What is your service about?</h2>
        <p className="mb-4">We provide a platform for users to connect and interact with their favorite models.</p>
        <h2 className="text-2xl font-semibold mb-3">How can I join?</h2>
        <p className="mb-4">You can join by clicking the 'Join' button on our homepage and filling out the required information.</p>
        <h2 className="text-2xl font-semibold mb-3">Is there a subscription fee?</h2>
        <p className="mb-4">Yes, we have various subscription plans which you can view on our services page.</p>
        <h2 className="text-2xl font-semibold mb-3">How do I contact support?</h2>
        <p>If you need assistance, please reach out via our contact page.</p>
      </div>
    </div>
  );
};

export default FAQ;
