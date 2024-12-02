import Navigation from "@/components/Navigation";

const About = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        <p>Welcome to our About page. Here you can learn more about our mission and vision.</p>
        <p>Our agency focuses on providing the best service to our models and clients. We aim to create an empowering environment for everyone involved.</p>
        <h2 className="text-2xl font-semibold mt-4">Our Team</h2>
        <p>Meet our dedicated team of professionals who are here to support you every step of the way.</p>
      </div>
    </div>
  );
};

export default About;
