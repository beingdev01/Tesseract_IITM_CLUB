import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Loader2, Users, Clock, ExternalLink } from 'lucide-react';
import { formatTime, getWeekdayShort, getMonthShort, getDayOfMonth } from '@/lib/dateUtils';
import { processImageUrl } from '@/lib/imageUtils';
import { useMotionConfig } from '@/hooks/useMotionConfig';
import { useAuth } from '@/context/AuthContext';
import { getUpcomingSaavanEvents, type SaavanEvent } from '@/data/saavanEvents';

const EMPTY_REGISTERED_IDS = new Set<string>();

function getRegistrationStatus(event: SaavanEvent): {
  status: 'not_started' | 'open' | 'closed' | 'full' | 'past';
  message: string;
  canRegister: boolean;
} {
  // Registration is ON for every Saavan'26 event. Dates are informational
  // only and never block registration.
  if (event.status === 'PAST') {
    return { status: 'past', message: 'Event ended', canRegister: false };
  }

  if (event.capacity && event.capacity <= 0) {
    return { status: 'full', message: 'Sold out', canRegister: false };
  }

  return { status: 'open', message: 'Register now', canRegister: true };
}

export function UpcomingEvents() {
  const events = getUpcomingSaavanEvents();
  const { isMobile, shouldReduceMotion } = useMotionConfig();
  const { token } = useAuth();
  const [registeredEventIds] = useState<Set<string>>(EMPTY_REGISTERED_IDS);
  const visibleRegisteredEventIds = token ? registeredEventIds : EMPTY_REGISTERED_IDS;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Animation configs based on device
  const animationDuration = shouldReduceMotion ? 0.3 : 0.6;
  const animationY = shouldReduceMotion ? 15 : 30;
  const staggerDelay = shouldReduceMotion ? 0.05 : 0.15;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/50 to-white py-24 dark:from-[#09090c] dark:to-[#111116]">
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100 opacity-50 blur-3xl dark:bg-rose-500/12" />
      
      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: animationY }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: animationDuration }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6"
          >
          <div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:mb-3 sm:text-4xl md:text-5xl dark:text-zinc-100">
              Upcoming{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent dark:from-rose-400 dark:to-orange-400">
                Events
              </span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 sm:text-lg">Saavan'26 — Escape Room, Back2Bachpan, BGMI & Free Fire</p>
          </div>
          
          <Link to="/events" className="hidden sm:block">
            <Button variant="outline" size="lg" className="group border-gray-300 dark:border-zinc-700 hover:border-amber-500 hover:bg-amber-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-rose-400 dark:hover:bg-zinc-900">
              View All Events
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600 dark:text-rose-300" />
          </div>
        ) : events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-zinc-900">
              <Calendar className="h-10 w-10 text-amber-500 dark:text-rose-300" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-zinc-100">No upcoming events</h3>
            <p className="text-gray-500 dark:text-zinc-400">Check back soon for exciting new events!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {events.map((event, index) => {
              const regStatus = getRegistrationStatus(event);
              const isRegistered = visibleRegisteredEventIds.has(event.id);
              const isExternalReg = event.registrationUrl && event.status !== 'PAST' && regStatus.canRegister;
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: animationY }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: animationDuration, delay: index * staggerDelay }}
                  viewport={{ once: true, margin: '-50px' }}
                  whileHover={!isMobile ? { y: -8 } : undefined}
                  className="group"
                >
                  <Link to={`/events/${event.slug}`} className="block h-full">
                    <div className="h-full overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-surface-1 shadow-sm transition-all duration-500 hover:shadow-xl dark:border-zinc-800 dark:bg-[#0f0f14] dark:hover:shadow-black/30">
                      {/* Image Container - 16:9 aspect ratio for wide posters */}
                      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        {event.imageUrl ? (
                          <img
                            src={processImageUrl(event.imageUrl, 'card')}
                            alt={event.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 dark:from-rose-500 dark:via-red-500 dark:to-orange-500">
                            <Calendar className="h-20 w-20 text-white/30" />
                          </div>
                        )}
                      
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        {event.eventType && (
                          <Badge className="bg-white dark:bg-surface-1/90 text-gray-800 dark:text-zinc-200 backdrop-blur-sm shadow-sm">
                            {event.eventType}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Registration Status */}
                      <div className="absolute top-4 right-4">
                        <Badge 
                          className={`backdrop-blur-sm shadow-sm ${
                            isRegistered ? 'bg-green-600 text-white' :
                            regStatus.status === 'open' ? 'bg-green-500 text-white' :
                            regStatus.status === 'not_started' ? 'bg-blue-500 text-white' :
                            'bg-gray-500 text-white'
                          }`}
                        >
                          {isRegistered ? 'Registered' : regStatus.message}
                        </Badge>
                      </div>
                      
                      {/* Date Badge */}
                        <div className="absolute bottom-4 left-4">
                        <div className="rounded-xl bg-white dark:bg-surface-1 px-4 py-2 shadow-lg dark:bg-zinc-900">
                          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                            {getWeekdayShort(event.startDate)}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                            {getDayOfMonth(event.startDate)}
                          </p>
                          <p className="text-xs font-medium text-amber-600 dark:text-rose-300">
                            {getMonthShort(event.startDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 className="mb-2 line-clamp-1 text-xl font-bold text-gray-900 dark:text-zinc-100 transition-colors group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-rose-300">
                        {event.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-zinc-400">
                        {event.shortDescription || event.description}
                      </p>
                      
                      {/* Meta Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                          <Clock className="h-4 w-4 text-amber-500 dark:text-rose-300" />
                          <span>{formatTime(event.startDate)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                            <MapPin className="h-4 w-4 text-amber-500 dark:text-rose-300" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                        {event.capacity && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                            <Users className="h-4 w-4 text-amber-500 dark:text-rose-300" />
                            <span>{event.capacity} spots</span>
                          </div>
                        )}
                      </div>
                      
                      {/* CTA */}
                      {isRegistered ? (
                        <Button 
                          className="w-full border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                        >
                          Registered - View Details
                        </Button>
                      ) : isExternalReg ? (
                        <a
                          href={event.registrationUrl}
                          target="_self"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Register on Saavan
                        </a>
                      ) : (
                        <Button 
                          className={`w-full ${
                            regStatus.canRegister 
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 dark:from-rose-500 dark:to-orange-400 dark:hover:from-rose-400 dark:hover:to-orange-300'
                              : 'bg-gray-100 dark:bg-surface-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {regStatus.canRegister ? 'View & Register' : 'View Details'}
                        </Button>
                      )}
                    </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}