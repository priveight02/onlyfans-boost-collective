import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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

type Review = (typeof reviews)[number];

const COLLAPSED_COUNT = 6;
const collapsedCardTextStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 5,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

const ReviewCard = ({
  review,
  expanded,
  index,
  animateIn,
}: {
  review: Review;
  expanded: boolean;
  index: number;
  animateIn: boolean;
}) => (
  <motion.article
    initial={animateIn ? { opacity: 0, y: 14, filter: "blur(5px)" } : false}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.4, ease: "easeOut", delay: animateIn ? Math.min(index * 0.045, 0.25) : 0 }}
    className="mb-4 break-inside-avoid rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
  >
    <div className="mb-3 flex items-center gap-3">
      <img
        src={review.avatar}
        alt={review.name}
        className="h-9 w-9 rounded-full object-cover"
        loading="lazy"
      />
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-white">{review.name}</span>
        {review.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
      </div>
    </div>

    <p className="text-sm leading-relaxed text-white/85" style={!expanded ? collapsedCardTextStyle : undefined}>
      {review.text}
    </p>

    {expanded && review.photo && (
      <img
        src={review.photo}
        alt={`${review.name} using Uplyze`}
        className="mt-4 h-48 w-full rounded-xl object-cover"
        loading="lazy"
      />
    )}

    <span className="mt-4 block text-xs text-white/60">
      {review.location} – {review.date}
    </span>
  </motion.article>
);

const pillAvatars = [
  "https://i.pravatar.cc/40?img=11",
  "https://i.pravatar.cc/40?img=12",
  "https://i.pravatar.cc/40?img=20",
  "https://i.pravatar.cc/40?img=53",
];

const ReviewsSection = () => {
  const [expanded, setExpanded] = useState(false);
  const peekReviews = reviews.slice(0, COLLAPSED_COUNT);
  const extraReviews = reviews.slice(COLLAPSED_COUNT);

  return (
    <section id="reviews-section" className="relative -mt-8 pb-24 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            <span className="uplyze-highlight">Trusted</span> by teams who <span className="uplyze-highlight">move fast</span>.
          </h2>
          <p className="mx-auto max-w-2xl text-base text-white/75 md:text-lg">
            Real reviews from creators and agencies closing more deals with Uplyze every single week.
          </p>
          <motion.span
            initial={{ opacity: 0, y: -6, rotate: -4 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_hsl(var(--background)/0.5)] backdrop-blur-md"
          >
            <BadgeCheck className="h-4 w-4 text-primary" />
            9,400+ teams scaling weekly
          </motion.span>
        </motion.div>

        <div className="columns-1 [column-gap:1rem] md:columns-2 lg:columns-3">
          {peekReviews.map((review, i) => (
            <ReviewCard key={review.name} review={review} expanded={expanded} index={i} animateIn={false} />
          ))}
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 columns-1 [column-gap:1rem] md:columns-2 lg:columns-3">
                {extraReviews.map((review, i) => (
                  <ReviewCard key={review.name} review={review} expanded index={i} animateIn />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-3 rounded-full bg-card/60 px-5 py-2.5 text-white",
              "transition-all duration-300 hover:scale-[1.015] hover:bg-card/75 active:scale-[0.985]"
            )}
          >
            <div className="flex -space-x-2">
              {pillAvatars.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-background object-cover"
                  loading="lazy"
                />
              ))}
            </div>

            <span className="text-sm font-medium text-white/90">9,400+ founders love Uplyze</span>
            <span className="h-5 w-px bg-border/60" aria-hidden="true" />

            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              {expanded ? "View less" : "View more"}
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
                {expanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
