'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import TranslatedText from '@/components/ui/TranslatedText';

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "BallotIQ transformed my understanding of elections. I feel so much more confident about my vote now!",
    author: "Priya Sharma",
    title: "First-time Voter, Mumbai",
    avatar: "https://ui-avatars.com/api/?name=Priya+Sharma&background=FF9933&color=fff", // Saffron-like
  },
  {
    quote: "The adaptive learning is incredible. It explained complex topics in a way I could easily grasp.",
    author: "Rahul Singh",
    title: "Civics Student, Delhi",
    avatar: "https://ui-avatars.com/api/?name=Rahul+Singh&background=138808&color=fff", // Green-like
  },
  {
    quote: "Finally, a platform that makes election education accessible and engaging. Highly recommended!",
    author: "Ananya Gupta",
    title: "Community Organizer, Bangalore",
    avatar: "https://ui-avatars.com/api/?name=Ananya+Gupta&background=000080&color=fff", // Navy Blue
  },
  {
    quote: "I used to dread election season, but BallotIQ made learning about candidates and issues genuinely interesting.",
    author: "Vikram Reddy",
    title: "Engaged Citizen, Hyderabad",
    avatar: "https://ui-avatars.com/api/?name=Vikram+Reddy&background=800080&color=fff", // Purple
  },
  {
    quote: "The multi-language support is a game-changer. I could learn in my native tongue, which made a huge difference.",
    author: "Fatima Begum",
    title: "Expat Voter, Chennai",
    avatar: "https://ui-avatars.com/api/?name=Fatima+Begum&background=FFD700&color=000", // Gold
  },
  {
    quote: "As a busy professional, the bite-sized lessons and quick quizzes were perfect for staying informed.",
    author: "Siddharth Nair",
    title: "Software Engineer, Pune",
    avatar: "https://ui-avatars.com/api/?name=Siddharth+Nair&background=4682B4&color=fff", // Steel Blue
  },
  {
    quote: "BallotIQ is an essential tool for anyone who wants to truly understand their democratic process.",
    author: "Dr. Kavita Rao",
    title: "Political Science Lecturer, Kolkata",
    avatar: "https://ui-avatars.com/api/?name=Kavita+Rao&background=8B0000&color=fff", // Dark Red
  },
];

/**
 * Infinite horizontal carousel of testimonials.
 */
export default function TestimonialCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    let exactScroll = carouselRef.current ? carouselRef.current.scrollLeft : 0;

    const scroll = (time: number) => {
      if (carouselRef.current) {
        if (!isPaused) {
          const deltaTime = time - lastTime;
          // Adjust speed as needed
          const speed = window.innerWidth < 640 ? 0.04 : 0.03; // Slightly slower than features
          
          exactScroll += speed * deltaTime;
          
          // Loop the carousel
          if (exactScroll >= carouselRef.current.scrollWidth / 2) {
            exactScroll -= carouselRef.current.scrollWidth / 2;
          }
          
          carouselRef.current.scrollLeft = exactScroll;
        } else {
          exactScroll = carouselRef.current.scrollLeft;
        }
      }
      lastTime = time;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <h2 className="text-4xl font-bold text-white leading-tight">
          <TranslatedText text="What people are saying" />
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-4">
          <TranslatedText text="Hear from our users about how BallotIQ is making a difference." />
        </p>
      </div>

      <div
        ref={carouselRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex whitespace-nowrap overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing py-4"
      >
        {[...Array(2)].map((_, i) => ( // Duplicate for infinite scroll effect
          <div key={i} className="flex gap-6 px-3 flex-shrink-0">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="inline-flex flex-col w-[300px] sm:w-[350px] p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300 flex-shrink-0 shadow-lg whitespace-normal">
                <p className="text-gray-300 text-base leading-relaxed mb-5 italic">
                  &ldquo;<TranslatedText text={testimonial.quote} />&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    unoptimized
                    className="rounded-full object-cover w-12 h-12 border-2 border-blue-500/50"
                  />
                  <div>
                    <p className="font-semibold text-white"><TranslatedText text={testimonial.author} /></p>
                    <p className="text-xs text-gray-500"><TranslatedText text={testimonial.title} /></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}