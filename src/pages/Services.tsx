import Navigation from "@/components/Navigation";

const Services = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Our Services</h1>
        <p>
          We offer a wide range of services to cater to your needs. Our team
          is dedicated to providing top-notch service and ensuring your
          satisfaction.
        </p>
        <ul className="list-disc ml-5">
          <li>Service 1: Description of service 1</li>
          <li>Service 2: Description of service 2</li>
          <li>Service 3: Description of service 3</li>
        </ul>
        <p>
          Contact us for more details about our services and how we can assist
          you!
        </p>
      </div>
    </div>
  );
};

export default Services;
