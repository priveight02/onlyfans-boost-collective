import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronDown, BadgeCheck } from "lucide-react";
import reviewPhoto1 from "@/assets/review-photo-1.jpg";
import reviewPhoto2 from "@/assets/review-photo-2.jpg";
import reviewPhoto3 from "@/assets/review-photo-3.jpg";
import reviewPhoto4 from "@/assets/review-photo-4.jpg";
import reviewPhoto5 from "@/assets/review-photo-5.jpg";
import reviewPhoto6 from "@/assets/review-photo-6.jpg";

const reviews = [
  {
    name: "Samuel Brunner",
    avatar: "https://i.pravatar.cc/80?img=11",
    verified: false,
    text: "Honestly didn't think this would be that useful. Then I connected my account and it just started finding winners I would've never scaled manually. The testing, the optimization, it's all just there. Hard to go back to doing it manually.",
    photo: reviewPhoto1,
    location: "CH",
    date: "Dec 2025",
    rating: 5,
  },
  {
    name: "Mike Ross",
    avatar: "https://i.pravatar.cc/80?img=12",
    verified: true,
    text: "Getting started was easy, way easier than any other tool. Took about 10 min to connect my ad account and my first campaign was live.",
    photo: reviewPhoto3,
    location: "US",
    date: "Jan 15, 2026",
    rating: 5,
  },
  {
    name: "Ruta Pukene",
    avatar: "https://i.pravatar.cc/80?img=16",
    verified: false,
    text: "Tried a few AI tools before but none of them actually understood what I was selling. Uplyze generated creatives that genuinely matched our brand. Went from struggling to break even to scaling profitably within a month. Can't imagine going back.",
    photo: reviewPhoto4,
    location: "LT",
    date: "Jan 18, 2026",
    rating: 5,
  },
  // Expansion reviews
  {
    name: "Chris O'Donnell",
    avatar: "https://i.pravatar.cc/80?img=53",
    verified: true,
    text: "Was worried it would just be another 'ChatGPT wrapper' but this actually runs the automations. The AI DM feature saved me from wasting hours on manual outreach. Great tool for busy founders.",
    photo: reviewPhoto5,
    location: "IE",
    date: "Feb 2026",
    rating: 5,
  },
  {
    name: "Marcus Thompson",
    avatar: "https://i.pravatar.cc/80?img=14",
    verified: false,
    text: "My whole thing is testing a ton of creatives fast and killing what doesn't work. Uplyze does that automatically now so I'm not sitting in Ads Manager all day. Makes it almost too easy honestly.",
    photo: reviewPhoto2,
    location: "US",
    date: "Feb 2026",
    rating: 5,
  },
  {
    name: "Elena Vasquez",
    avatar: "https://i.pravatar.cc/80?img=20",
    verified: true,
    text: "As an agency managing 15+ creators, Uplyze is a game changer. The multi-account management and AI responses keep our clients happy without burning out the team. The content scheduling alone is worth it.",
    photo: reviewPhoto6,
    location: "ES",
    date: "Mar 2026",
    rating: 5,
  },
];

const ReviewCard = ({ review }: { review: typeof reviews[0] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="rounded-2xl p-5 flex flex-col gap-4 break-inside-avoid mb-6"
    style={{
      background: "hsla(0, 0%, 100%, 0.04)",
      border: "1px solid hsla(0, 0%, 100%, 0.07)",
    }}
  >
    {/* Header */}
    <div className="flex items-center gap-3">
      <img
        src={review.avatar}
        alt={review.name}
        className="w-10 h-10 rounded-full object-cover"
        style={{ border: "2px solid hsla(0, 0%, 100%, 0.1)" }}
      />
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold" style={{ color: "hsla(0, 0%, 100%, 0.92)" }}>
          {review.name}
        </span>
        {review.verified && (
          <BadgeCheck className="h-4 w-4" style={{ color: "hsl(217, 91%, 65%)" }} />
        )}
      </div>
    </div>

    {/* Text */}
    <p className="text-sm leading-relaxed" style={{ color: "hsla(215, 20%, 70%, 0.9)" }}>
      {review.text}
    </p>

    {/* Photo */}
    {review.photo && (
      <img
        src={review.photo}
        alt={`${review.name} using Uplyze`}
        className="w-full rounded-xl object-cover"
        style={{ maxHeight: "280px" }}
        loading="lazy"
      />
    )}

    {/* Footer */}
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "hsla(215, 20%, 55%, 0.5)" }}>
        {review.location} – {review.date}
      </span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-current" style={{ color: "hsl(45, 93%, 58%)" }} />
        ))}
      </div>
    </div>
  </motion.div>
);

const ReviewsSection = () => {
  const [expanded, setExpanded] = useState(false);
  const initialReviews = reviews.slice(0, 3);
  const expandedReviews = reviews.slice(3);

  return (
    <section id="reviews-section" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-5xl font-bold font-heading mb-4"
            style={{ color: "hsla(0, 0%, 100%, 0.95)" }}
          >
            Trusted by those who move fast.
          </h2>
          <p className="text-base md:text-lg" style={{ color: "hsla(215, 25%, 65%, 0.7)" }}>
            Creators & agencies scaling with Uplyze
          </p>
        </motion.div>

        {/* Masonry columns */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          {initialReviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                {expandedReviews.map((review) => (
                  <ReviewCard key={review.name} review={review} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex justify-center mt-10"
          >
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.03]"
              style={{
                background: "hsla(0, 0%, 100%, 0.05)",
                border: "1px solid hsla(0, 0%, 100%, 0.1)",
                color: "hsla(0, 0%, 100%, 0.8)",
              }}
            >
              View More
              <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;