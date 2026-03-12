import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Plus, Minus } from "lucide-react";
import reviewPhoto1 from "@/assets/review-photo-1.jpg";
import reviewPhoto2 from "@/assets/review-photo-2.jpg";
import reviewPhoto3 from "@/assets/review-photo-3.jpg";
import reviewPhoto4 from "@/assets/review-photo-4.jpg";
import reviewPhoto5 from "@/assets/review-photo-5.jpg";
import reviewPhoto6 from "@/assets/review-photo-6.jpg";

const reviews = [
  // === INITIAL 3 (collapsed - no photos, uniform) ===
  {
    name: "Samuel Brunner",
    avatar: "https://i.pravatar.cc/80?img=11",
    verified: false,
    text: "Honestly didn't think this would be that useful. Then I connected my account and it just started finding winners I would've never scaled manually. The testing, the optimization, it's all just there. Hard to go back to doing it manually.",
    photo: null as string | null,
    location: "CH",
    date: "Dec 2025",
  },
  {
    name: "Mike Ross",
    avatar: "https://i.pravatar.cc/80?img=12",
    verified: true,
    text: "Getting started was easy, way easier than any other tool. Took about 10 min to connect my ad account and my first campaign was live.",
    photo: null as string | null,
    location: "US",
    date: "Jan 15, 2026",
  },
  {
    name: "Ruta Pukene",
    avatar: "https://i.pravatar.cc/80?img=16",
    verified: false,
    text: "Tried a few AI tools before but none of them actually understood what I was selling. Uplyze generated creatives that genuinely matched our brand. Went from struggling to break even to scaling profitably within a month.",
    photo: null as string | null,
    location: "LT",
    date: "Jan 18, 2026",
  },
  // === PEEK ROW (visible behind fog) ===
  {
    name: "Chris O'Donnell",
    avatar: "https://i.pravatar.cc/80?img=53",
    verified: true,
    text: "Was worried it would just be another 'ChatGPT wrapper' but this actually runs the automations. The AI DM feature saved me from wasting hours on manual outreach. Great tool for busy founders.",
    photo: reviewPhoto3,
    location: "IE",
    date: "Feb 8, 2026",
  },
  {
    name: "Philip Jenkins",
    avatar: "https://i.pravatar.cc/80?img=33",
    verified: false,
    text: "I run everything solo and Uplyze basically replaced my media buyer lol. Ad copy, visuals, and the actual launching is done without me babysitting the dashboard. 10/10.",
    photo: null as string | null,
    location: "CA",
    date: "Feb 2, 2026",
  },
  {
    name: "Marcus Thompson",
    avatar: "https://i.pravatar.cc/80?img=14",
    verified: false,
    text: "My whole thing is testing a ton of creatives fast and killing what doesn't work. Uplyze does that automatically now so I'm not sitting in Ads Manager all day.",
    photo: reviewPhoto4,
    location: "US",
    date: "Feb 2026",
  },
  // === REST (only when expanded) ===
  {
    name: "Jessica Li",
    avatar: "https://i.pravatar.cc/80?img=45",
    verified: true,
    text: "I had low expectations bc every other AI ad tool I tried made ugly images. Uplyze was different. It actually understood the product. No long onboarding either. Literally getting clicks the same day.",
    photo: null as string | null,
    location: "UK",
    date: "Jan 22, 2026",
  },
  {
    name: "Elena Vasquez",
    avatar: "https://i.pravatar.cc/80?img=20",
    verified: true,
    text: "As an agency managing 15+ creators, Uplyze is a game changer. The multi-account management and AI responses keep our clients happy without burning out the team. The content scheduling alone is worth it.",
    photo: reviewPhoto6,
    location: "ES",
    date: "Mar 2026",
  },
  {
    name: "Elena Kowalski",
    avatar: "https://i.pravatar.cc/80?img=29",
    verified: false,
    text: "Fast, reliable, and exactly as described. Process was clear, delivery was prompt, and the result met expectations.",
    photo: null as string | null,
    location: "DE",
    date: "Feb 12, 2026",
  },
  {
    name: "Sofia Ricci",
    avatar: "https://i.pravatar.cc/80?img=23",
    verified: true,
    text: "I run a small shop, and Uplyze basically made my ads look like a pro agency did them.",
    photo: null as string | null,
    location: "IT",
    date: "Jan 8, 2026",
  },
  {
    name: "Daniela Kim",
    avatar: "https://i.pravatar.cc/80?img=41",
    verified: false,
    text: "Been using Uplyze for about 3 months now. Launches are faster, CPA is down, and I'm not stuck spending $2k/mo on an agency anymore. It's not perfect but 90% of the heavy lifting is done for you.",
    photo: reviewPhoto5,
    location: "US",
    date: "Feb 2026",
  },
  {
    name: "David Park",
    avatar: "https://i.pravatar.cc/80?img=52",
    verified: true,
    text: "The dashboard growth charts don't lie. Went from $800/mo to $4.2k/mo in 6 weeks. The AI knows what converts better than I do at this point.",
    photo: reviewPhoto1,
    location: "US",
    date: "Mar 2026",
  },
  {
    name: "Liam Carter",
    avatar: "https://i.pravatar.cc/80?img=57",
    verified: false,
    text: "Replaced 3 different tools with just Uplyze. Scheduling, DMs, and ad creative all in one place. My workflow is actually clean now.",
    photo: null as string | null,
    location: "AU",
    date: "Feb 2026",
  },
  {
    name: "Nina Alvarez",
    avatar: "https://i.pravatar.cc/80?img=32",
    verified: true,
    text: "Our team onboarded in under an hour. The AI suggestions for ad copy were surprisingly on-brand from day one. Saved us weeks of testing.",
    photo: reviewPhoto2,
    location: "MX",
    date: "Mar 2026",
  },
];

type Review = typeof reviews[0];

const ReviewCard = ({ review, index }: { review: Review; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="rounded-2xl p-5 flex flex-col gap-3 break-inside-avoid mb-4"
    style={{
      background: "hsla(0, 0%, 100%, 0.04)",
      border: "1px solid hsla(0, 0%, 100%, 0.07)",
    }}
  >
    <div className="flex items-center gap-3">
      <img
        src={review.avatar}
        alt={review.name}
        className="w-9 h-9 rounded-full object-cover"
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

    <p className="text-sm leading-relaxed" style={{ color: "hsla(215, 20%, 70%, 0.9)" }}>
      {review.text}
    </p>

    {review.photo && (
      <img
        src={review.photo}
        alt={`${review.name} using Uplyze`}
        className="w-full rounded-xl object-cover"
        style={{ maxHeight: "260px" }}
        loading="lazy"
      />
    )}

    <span className="text-xs mt-1" style={{ color: "hsla(215, 20%, 55%, 0.5)" }}>
      {review.location} – {review.date}
    </span>
  </motion.div>
);

const pillAvatars = [
  "https://i.pravatar.cc/40?img=11",
  "https://i.pravatar.cc/40?img=12",
  "https://i.pravatar.cc/40?img=20",
  "https://i.pravatar.cc/40?img=53",
];

const ReviewsSection = () => {
  const [expanded, setExpanded] = useState(false);

  const collapsedReviews = reviews.slice(0, 3);
  const peekReviews = reviews.slice(3, 6);
  const restReviews = reviews.slice(6);

  return (
    <section id="reviews-section" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Always-visible initial cards (uniform, no photos) */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {collapsedReviews.map((review, i) => (
            <ReviewCard key={review.name} review={review} index={i} />
          ))}
        </div>

        {/* Peek row + fog overlay when collapsed */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {!expanded ? (
              <motion.div
                key="peek"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 max-h-[220px] overflow-hidden">
                  {peekReviews.map((review, i) => (
                    <ReviewCard key={review.name} review={review} index={i} />
                  ))}
                </div>
                {/* Fog gradient overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 85%)",
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                  {[...peekReviews, ...restReviews].map((review, i) => (
                    <ReviewCard key={review.name} review={review} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pill toggle button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "hsla(0, 0%, 100%, 0.06)",
              border: "1px solid hsla(0, 0%, 100%, 0.12)",
            }}
          >
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {pillAvatars.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-2"
                  style={{ ringColor: "hsl(var(--background))" }}
                />
              ))}
            </div>

            <span className="text-sm font-medium" style={{ color: "hsla(0, 0%, 100%, 0.85)" }}>
              9,400+ founders love Uplyze
            </span>

            <div
              className="h-5 w-px"
              style={{ background: "hsla(0, 0%, 100%, 0.15)" }}
            />

            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "hsla(0, 0%, 100%, 0.9)" }}
            >
              {expanded ? "View less" : "View more"}
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full"
                style={{
                  background: "hsla(0, 0%, 100%, 0.12)",
                }}
              >
                {expanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
