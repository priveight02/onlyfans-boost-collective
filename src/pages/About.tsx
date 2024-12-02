import { Award, Users, TrendingUp, HeartHandshake, CheckCircle } from "lucide-react";
import BackButton from "@/components/BackButton";

const About = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Maximized Revenue",
      description: "We increase your earnings by creating custom content strategies tailored to your brand.",
    },
    {
      icon: Users,
      title: "Brand Development",
      description: "Build your personal brand and connect with your audience through expert guidance.",
    },
    {
      icon: Award,
      title: "Industry Expertise",
      description: "Benefit from our years of experience in digital content creation and marketing.",
    },
    {
      icon: HeartHandshake,
      title: "24/7 Support",
      description: "We're with you every step of the way with dedicated support and ongoing strategies.",
    },
  ];

  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            About Our Agency
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            We help content creators grow their brand, maximize earnings, and succeed in the competitive digital space.
          </p>
        </div>
      </div>

      {/* Mission Statement */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6 font-heading">
              Our Mission
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We're dedicated to empowering content creators with the tools, strategies, and support they need to build successful careers in the digital space. Our comprehensive approach combines industry expertise with personalized attention to help you reach your full potential.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span>Professional Growth</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span>Brand Development</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span>Revenue Optimization</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4 font-heading">
              Why Choose Us?
            </h2>
            <p className="text-lg text-gray-600">
              We provide comprehensive solutions to help you succeed
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-primary-accent" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join our community of successful content creators and take your career to the next level.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-primary-light transition-colors duration-200"
          >
            Get Started Today
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;
