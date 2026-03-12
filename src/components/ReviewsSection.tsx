import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, BadgeCheck } from "lucide-react";
import reviewPhoto1 from "@/assets/review-photo-1.jpg";
import reviewPhoto2 from "@/assets/review-photo-2.jpg";
import reviewPhoto3 from "@/assets/review-photo-3.jpg";
import reviewPhoto4 from "@/assets/review-photo-4.jpg";
import reviewPhoto5 from "@/assets/review-photo-5.jpg";
import reviewPhoto6 from "@/assets/review-photo-6.jpg";

const reviews = [
  // ── INITIAL 3 (always visible, same-size, all have photos) ──
  {
    name: "Samuel Brunner",
    avatar: "https://i.pravatar.cc/80?img=11",
    verified: false,
    text: "Honestly didn't think this would be that useful. Then I connected my account and it just started finding winners I would've never scaled manually. The testing, the optimization, it's all just there. Hard to go back to doing it manually.",
    photo: reviewPhoto1,
    location: "CH",
    date: "Dec 2025",
  },
  {
    name: "Mike Ross",
    avatar: "https://i.pravatar.cc/80?img=12",
    verified: true,
    text: "Getting started was easy, way easier than any other tool. Took about 10 min to connect my ad account and my first campaign was live.",
    photo: reviewPhoto2,
    location: "US",
    date: "Jan 15, 2026",
  },
  {
    name: "Ruta Pukene",
    avatar: "https://i.pravatar.cc/80?img=16",
    verified: false,
    text: "Tried a few AI tools before but none of them actually understood what I was selling. Uplyze generated creatives that genuinely matched our brand. Went from struggling to break even to scaling profitably within a month. Can't imagine going back.",
    photo: reviewPhoto3,
    location: "LT",
    date: "Jan 18, 2026",
  },
  // ── EXPANDED (mixed sizes – some with photos, some without) ──
  {
    name: "Chris O'Donnell",
    avatar: "https://i.pravatar.cc/80?img=53",
    verified: true,
    text: "Was worried it would just be another 'ChatGPT wrapper' but this actually runs the automations. The 'Kill Switch' feature saved me from wasting budget overnight. Great tool for busy founders.",
    photo: null,
    location: "IE",
    date: "Feb 8, 2026",
  },
  {
    name: "Philip Jenkins",
    avatar: "https://i.pravatar.cc/80?img=33",
    verified: false,
    text: "I run everything solo and Uplyze basically replaced my media buyer lol. Ad copy, visuals, and the actual launching is done without me babysitting the dashboard. 10/10.",
    photo: null,
    location: "CA",
    date: "Feb 2, 2026",
  },
  {
    name: "Marcus Thompson",
    avatar: "https://i.pravatar.cc/80?img=14",
    verified: false,
    text: "My whole thing is testing a ton of creatives fast and killing what doesn't work. Uplyze does that automatically now so I'm not sitting in Ads Manager all day. Makes it almost too easy honestly.",
    photo: reviewPhoto4,
    location: "US",
    date: "Feb 2026",
  },
  {
    name: "Jessica Li",
    avatar: "https://i.pravatar.cc/80?img=45",
    verified: true,
    text: "I had low expectations bc every other AI ad tool I tried made ugly images. Uplyze was different. It actually understood the product. No long onboarding either. Literally getting clicks the same day. If you're a small brand you need this.",
    photo: null,
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
    photo: null,
    location: "DE",
    date: "Feb 12, 2026",
  },
  {
    name: "Sofia Ricci",
    avatar: "https://i.pravatar.cc/80?img=23",
    verified: true,
    text: "I run a small shop, and Uplyze basically made my ads look like a pro agency did them.",
    photo: null,
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
];

const ReviewCard = ({ review }: { review: (typeof reviews)[0] }) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-3 break-inside-avoid mb-4"
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
    <div className="flex items-center">
      <span className="text-xs" style={{ color: "hsla(215, 20%, 55%, 0.5)" }}>
        {review.location} – {review.date}
      </span>
    </div>
  </div>
);

const avatarPics = [
  "https://i.pravatar.cc/40?img=11",
  "https://i.pravatar.cc/40?img=12",
  "https://i.pravatar.cc/40?img=53",
  "https://i.pravatar.cc/40?img=20",
];

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

        {/* ── Initial 3 cards – equal height row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialReviews.map((review) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex"
            >
              <div
                className="rounded-2xl p-5 flex flex-col gap-3 w-full"
                style={{
                  background: "hsla(0, 0%, 100%, 0.04)",
                  border: "1px solid hsla(0, 0%, 100%, 0.07)",
                }}
              >
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
                <p className="text-sm leading-relaxed flex-1" style={{ color: "hsla(215, 20%, 70%, 0.9)" }}>
                  {review.text}
                </p>
                {review.photo && (
                  <img
                    src={review.photo}
                    alt={`${review.name} using Uplyze`}
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: "280px" }}
                    loading="lazy"
                  />
                )}
                <div className="flex items-center">
                  <span className="text-xs" style={{ color: "hsla(215, 20%, 55%, 0.5)" }}>
                    {review.location} – {review.date}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Fog peek area (visible when collapsed) ── */}
        {!expanded && (
          <div className="relative mt-4 h-48 overflow-hidden">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
              {expandedReviews.slice(0, 3).map((review) => (
                <ReviewCard key={review.name} review={review} />
              ))}
            </div>
            {/* Soft dark fade overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, hsl(224 70% 6% / 0) 0%, hsl(224 70% 6% / 0.03) 32%, hsl(224 70% 6% / 0.12) 50%, hsl(224 70% 6% / 0.28) 66%, hsl(224 70% 6% / 0.52) 80%, hsl(224 70% 6% / 0.78) 91%, hsl(224 70% 6% / 0.94) 100%)",
              }}
            />
          </div>
        )}

        {/* ── Expanded cards (masonry, mixed sizes) ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden mt-4"
            >
              <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                {expandedReviews.map((review) => (
                  <ReviewCard key={review.name} review={review} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pill button (avatar stack + count + toggle) ── */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full transition-all duration-300 hover:scale-[1.03]"
            style={{
              background: "hsla(0, 0%, 100%, 0.06)",
              border: "1px solid hsla(0, 0%, 100%, 0.10)",
            }}
          >
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {avatarPics.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-background"
                />
              ))}
            </div>

            <span className="text-sm font-medium" style={{ color: "hsla(0, 0%, 100%, 0.85)" }}>
              2,400+ users love Uplyze
            </span>

            {/* Divider */}
            <div className="w-px h-5" style={{ background: "hsla(0, 0%, 100%, 0.15)" }} />

            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "hsla(0, 0%, 100%, 0.9)" }}>
              {expanded ? "View less" : "View more"}
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: "hsla(0, 0%, 100%, 0.12)" }}
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
