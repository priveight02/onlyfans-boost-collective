import Navigation from "@/components/Navigation";

const Contact = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <p className="mb-4">Feel free to reach out to us via the form below:</p>
        <form>
          <div className="mb-4">
            <label className="block mb-2" htmlFor="name">Name</label>
            <input className="border p-2 w-full" type="text" id="name" />
          </div>
          <div className="mb-4">
            <label className="block mb-2" htmlFor="email">Email</label>
            <input className="border p-2 w-full" type="email" id="email" />
          </div>
          <div className="mb-4">
            <label className="block mb-2" htmlFor="message">Message</label>
            <textarea className="border p-2 w-full" id="message" rows="4"></textarea>
          </div>
          <button className="bg-primary text-white px-4 py-2" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
