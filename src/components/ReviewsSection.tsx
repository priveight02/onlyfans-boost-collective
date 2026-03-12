import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronDown, BadgeCheck } from "lucide-react";

const reviews = [
  {
    name: "Samuel B.",
    avatar: "https://i.pravatar.cc/80?img=11",
    verified: true,
    text: "Honestly didn't think this would be that useful. Then I connected my account and it just started finding winners I would've never scaled manually. The AI automation is all just there. Hard to go back to doing it manually.",
    date: "Feb 2026",
    rating: 5,
  },
  {
    name: "Mike R.",
    avatar: "https://i.pravatar.cc/80?img=12",
    verified: true,
    text: "Getting started was easy, way easier than any other tool. Took about 10 min to connect my accounts and my first campaign was live. The DM automation alone paid for itself in the first week.",
    date: "Jan 2026",
    rating: 5,
  },
  {
    name: "Ruta P.",
    avatar: "https://i.pravatar.cc/80?img=16",
    verified: false,
    text: "Tried a few AI tools before but none of them actually understood what I was selling. Uplyze generated content that genuinely matched our brand. Went from struggling to break even to scaling profitably within a month.",
    date: "Dec 2025",
    rating: 5,
  },
  // Expansion reviews
  {
    name: "Marcus T.",
    avatar: "https://i.pravatar.cc/80?img=14",
    verified: true,
    text: "My whole thing is testing a ton of creatives fast. Uplyze lets me do that on autopilot. The AI learns what works and doubles down. Saved me at least 20 hours a week.",
    date: "Jan 2026",
    rating: 5,
  },
  {
    name: "Elena V.",
    avatar: "https://i.pravatar.cc/80?img=20",
    verified: true,
    text: "As an agency managing 15+ creators, Uplyze is a game changer. The multi-account management and AI responses keep our clients happy without burning out the team.",
    date: "Feb 2026",
    rating: 5,
  },
  {
    name: "Jordan K.",
    avatar: "https://i.pravatar.cc/80?img=33",
    verified: false,
    text: "The comment automation and smart DMs have tripled our engagement rate. I was skeptical at first but the results speak for themselves. Best investment we've made this year.",
    date: "Mar 2026",
    rating: 4,
  },
];

const ReviewCard = ({ review, index }: { review: typeof reviews[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="rounded-2xl p-6 flex flex-col gap-4 h-full"
    style={{
      background: "hsla(0, 0%, 100%, 0.03)",
      border: "1px solid hsla(0, 0%, 100%, 0.06)",
    }}
  >
    <div className="flex items-center gap-3">
      <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full object-cover" style={{ border: "2px solid hsla(0, 0%, 100%, 0.1)" }} />
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold" style={{ color: "hsla(0, 0%, 100%, 0.9)" }}>{review.name}</span>
          {review.verified && <BadgeCheck className="h-4 w-4" style={{ color: "hsl(217, 91%, 65%)" }} />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {Array.from({ length: review.rating }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-current" style={{ color: "hsl(45, 93%, 58%)" }} />
          ))}
        </div>
      </div>
    </div>
    <p className="text-sm leading-relaxed flex-1" style={{ color: "hsla(215, 25%, 70%, 0.9)" }}>
      {review.text}
    </p>
    <span className="text-xs" style={{ color: "hsla(215, 25%, 60%, 0.5)" }}>{review.date}</span>
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
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4" style={{ color: "hsla(0, 0%, 100%, 0.95)" }}>
            Trusted by those who move fast.
          </h2>
          <p className="text-base md:text-lg" style={{ color: "hsla(215, 25%, 65%, 0.7)" }}>
            Creators & agencies scaling with Uplyze
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {initialReviews.map((review, i) => (
            <ReviewCard key={review.name} review={review} index={i} />
          ))}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 overflow-hidden"
            >
              {expandedReviews.map((review, i) => (
                <ReviewCard key={review.name} review={review} index={i} />
              ))}
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