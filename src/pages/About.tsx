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
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjE4N0wxNzIuOCA0NjEuOCAwIDIyN3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXR5PSIuNCIvPjwvc3ZnPg==')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
          {/* Decorative shapes with smooth transitions */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/15 rounded-full blur-3xl transform rotate-45 transition-transform duration-1000 ease-in-out hover:rotate-90" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-white/15 rounded-full blur-3xl transform -rotate-12 transition-transform duration-1000 ease-in-out hover:-rotate-45" />
          <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-white/15 rounded-full blur-3xl transform rotate-180 transition-transform duration-1000 ease-in-out hover:rotate-225" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-white/20 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading animate-fade-in">
            About Our Agency
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto animate-fade-in">
            We help content creators grow their brand, maximize earnings, and succeed in the competitive digital space.
          </p>
        </div>
      </div>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading relative">
              <span className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] via-[#D6BCFA] to-[#9b87f5] bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
                Our Mission
              </span>
              <span className="invisible">Our Mission</span>
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
    </div>
  );
};

export default About;
