import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema, ProfilePageSchema } from '@/components/ui/schema';
import { RichContent } from '@/components/ui/markdown';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, ArrowLeft, Linkedin, Twitter, Github, Instagram, Globe, Edit3, Share2, Check,
} from 'lucide-react';
import { api, type TeamMember, type Credit } from '@/lib/api';
import { Brackets, MetaChip, type Accent } from '@/components/tesseract';

interface TeamMemberProfile extends TeamMember {
  userId?: string;
  slug?: string;
  bio?: string;
  vision?: string;
  story?: string;
  expertise?: string;
  achievements?: string;
  website?: string;
  user?: { id: string; name: string; email: string; avatar?: string; bio?: string };
}

const VALID_USERNAME = /^[a-zA-Z0-9._-]+$/;
function buildUrl(value: string, base: string): string | null {
  if (value.startsWith('http')) return value;
  if (VALID_USERNAME.test(value)) return `${base}/${value}`;
  return null;
}

export default function TeamMemberProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [member, setMember] = useState<TeamMemberProfile | null>(null);
  const [memberCredits, setMemberCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = user && ['ADMIN', 'PRESIDENT'].includes(user.role);
  const isProfileOwner = user && member?.userId === user.id;
  const canEdit = isAdmin || isProfileOwner;

  useEffect(() => {
    if (!slug) return;
    const fetchMember = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const result = await api.getTeamMemberBySlug(slug);
        const data = result as TeamMemberProfile;
        if (data.slug && slug !== data.slug) {
          navigate(`/team/${data.slug}`, { replace: true });
        }
        setMember(data);
        try {
          const credits = await api.getCredits(data.id);
          setMemberCredits(credits);
        } catch {
          // non-critical
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchMember();
  }, [slug, navigate]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${member?.name} · Tesseract`, text: `${member?.name}'s profile`, url });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const socialLinks = useMemo(() => {
    if (!member) return [];
    const out: Array<{ icon: typeof Linkedin; label: string; href: string }> = [];
    if (member.github) {
      const href = buildUrl(member.github, 'https://github.com');
      if (href) out.push({ icon: Github, label: 'github', href });
    }
    if (member.linkedin) {
      const href = buildUrl(member.linkedin, 'https://linkedin.com/in');
      if (href) out.push({ icon: Linkedin, label: 'linkedin', href });
    }
    if (member.twitter) {
      const href = buildUrl(member.twitter, 'https://twitter.com');
      if (href) out.push({ icon: Twitter, label: 'twitter', href });
    }
    if (member.instagram) {
      const href = buildUrl(member.instagram, 'https://instagram.com');
      if (href) out.push({ icon: Instagram, label: 'instagram', href });
    }
    if (member.website) out.push({ icon: Globe, label: 'website', href: member.website });
    return out;
  }, [member]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
        </div>
      </Layout>
    );
  }

  if (notFound || !member) {
    return (
      <Layout>
        <SEO title="Member Not Found" url={slug ? `/team/${slug}` : '/team'} noIndex={true} />
        <section className="lb-section flex justify-center">
          <Brackets tag="404" accent="red" className="max-w-md w-full">
            <div className="text-center py-4">
              <div className="font-display uppercase text-2xl mb-2" style={{ color: 'var(--c-red)', letterSpacing: '0.04em' }}>
                MEMBER NOT FOUND.
              </div>
              <p className="lb-mono text-xs mb-4" style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}>
                Profile does not exist or has been removed.
              </p>
              <Link to="/team" className="lb-btn-ghost">
                <ArrowLeft className="h-4 w-4" /> BACK TO MEMBERS
              </Link>
            </div>
          </Brackets>
        </section>
      </Layout>
    );
  }

  const profilePath = `/team/${member.slug || member.id}`;
  const profileLink = typeof window === 'undefined'
    ? `https://tesseract.iitm.ac.in${profilePath}`
    : `${window.location.origin}${profilePath}`;

  const initial = member.name?.charAt(0)?.toUpperCase() || '?';

  const allSections: Array<{ tag: string; title: string; accent: Accent; content?: string }> = [
    { tag: '01 · vision', title: 'VISION', accent: 'blue', content: member.vision },
    { tag: '02 · story', title: 'STORY', accent: 'purple', content: member.story || member.bio },
    { tag: '03 · expertise', title: 'EXPERTISE', accent: 'green', content: member.expertise },
    { tag: '04 · achievements', title: 'ACHIEVEMENTS', accent: 'yellow', content: member.achievements },
  ];
  const sections = allSections.filter((s) => s.content?.trim());

  return (
    <Layout>
      <SEO
        title={`${member.name} · ${member.role} · Tesseract`}
        description={member.bio || `${member.name} contributes as ${member.role} on the ${member.team} team at Tesseract.`}
        url={profilePath}
      />
      <ProfilePageSchema
        profileUrl={profileLink}
        personName={member.name}
        description={member.bio || `${member.name} contributes as ${member.role} at Tesseract.`}
        image={member.imageUrl || undefined}
        jobTitle={member.role}
        affiliation="Tesseract"
        sameAs={socialLinks.map((s) => s.href)}
        breadcrumbName={`${member.name} · Team`}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
        { name: 'Members', url: 'https://tesseract.iitm.ac.in/team' },
        { name: member.name, url: profileLink },
      ]} />

      {/* Hero */}
      <section className="lb-hero">
        <div className="lb-hero-left">
          <Link to="/team" className="lb-mono text-xs mb-4 inline-flex items-center gap-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
            <ArrowLeft className="h-3 w-3" /> // back_to_crew
          </Link>
          <div className="lb-kicker">// member.profile</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">{member.name.toUpperCase()}</span>
          </h1>
          <p className="lb-sub">
            {member.role} · {member.team} · Tesseract crew.
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            <MetaChip label="ROLE" value={member.role} accent="yellow" />
            <MetaChip label="TEAM" value={member.team} accent="blue" />
            {memberCredits.length > 0 && <MetaChip label="CREDITS" value={memberCredits.length} accent="purple" />}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="lb-pill t-yellow inline-flex items-center gap-2"
                aria-label={s.label}
              >
                <s.icon className="h-3 w-3" />
                <span>{s.label}</span>
              </a>
            ))}
            <button onClick={() => void handleShare()} className="lb-pill t-green inline-flex items-center gap-2">
              {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
              {copied ? 'copied' : 'share'}
            </button>
            {canEdit && (
              <Link to={`/dashboard/team/${member.id}/edit`} className="lb-pill t-orange inline-flex items-center gap-2">
                <Edit3 className="h-3 w-3" /> edit
              </Link>
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="lb-hero-right">
          <div
            className="lb-hatch lb-c-yellow"
            style={{ width: 320, height: 320, position: 'relative' }}
          >
            {member.imageUrl ? (
              <img
                src={member.imageUrl}
                alt={member.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="lb-hatch-glyph" style={{ fontSize: 140 }}>{initial}</div>
            )}
          </div>
        </div>
      </section>

      {/* Content sections */}
      {sections.length > 0 && (
        <section className="lb-modules">
          <div className="lb-sect-head">
            <div>
              <div className="lb-kicker">// dossier</div>
              <h2 className="lb-section-title">PROFILE DETAILS</h2>
            </div>
            <div className="lb-kicker-right">{sections.length} of {sections.length}</div>
          </div>
          <div className="lb-module-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {sections.map((s) => (
              <div key={s.tag} className={`lb-module-wrap lb-c-${s.accent}`}>
                <Brackets tag={s.tag} accent={s.accent}>
                  <div className="lb-module" style={{ minHeight: 'auto' }}>
                    <h3 className="lb-module-title">{s.title}</h3>
                    <div className="lb-module-desc" style={{ color: 'var(--fg-dim)' }}>
                      <RichContent>{s.content!}</RichContent>
                    </div>
                  </div>
                </Brackets>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Credits */}
      {memberCredits.length > 0 && (
        <section className="lb-board-section">
          <Brackets tag="credits.contribution" accent="orange">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lb-mono text-xs">
              {memberCredits.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 p-3"
                  style={{ borderLeft: '2px solid var(--c-orange)', background: 'rgba(255,154,59,0.06)' }}
                >
                  <span style={{ color: 'var(--c-orange)' }}>#{c.category.toLowerCase().replace(/\s+/g, '_')}</span>
                  <div>
                    <div style={{ color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.title}</div>
                    {c.description && (
                      <div className="text-[11px] mt-1" style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}>
                        {c.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Brackets>
        </section>
      )}
    </Layout>
  );
}
