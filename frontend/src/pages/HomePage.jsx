import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';

const features = [
  {
    icon: BedDouble,
    title: 'Your room, at a glance',
    description: 'Check your own room assignment and accommodation details from one private dashboard.',
  },
  {
    icon: Utensils,
    title: 'Dining made simple',
    description: 'See the latest menu, your meal history, and your active food subscription.',
  },
  {
    icon: ShieldCheck,
    title: 'A portal that is yours',
    description: 'Sign in with your student ID and password to view only your personal records.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf8] text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="HostelHub home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-extrabold tracking-tight">HostelHub</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Student living, simplified</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 sm:inline-flex">
            Staff sign in
          </Link>
          <Link to="/student-login" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800">
            Student sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14 lg:pb-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Your campus life, all in one place
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Feel at home.
            <span className="mt-1 block text-emerald-700">Stay in the know.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Your personal hostel companion for room details, dining, fees, and campus requests — with your student account and your information in one secure place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/student-login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800">
              Open my student portal <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800">
              Explore the portal
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Personal student sign-in</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Live portal updates</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/70 via-teal-100/60 to-sky-100/70 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-2 shadow-2xl shadow-slate-900/15">
            <div className="relative min-h-[360px] overflow-hidden rounded-[1.55rem] bg-slate-900 sm:min-h-[470px]">
              <img src="/images/campus/campus-hero.jpg" alt="Campus residence surrounded by greenery" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-slate-900/5" />
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md sm:left-7 sm:top-7">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                A better way to hostel
              </div>
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-slate-950/45 p-5 text-white backdrop-blur-lg sm:inset-x-7 sm:bottom-7 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Your resident dashboard</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Everything you need. Just for you.</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-200">Your accommodation, dining, fees, and requests — easy to find, easy to manage.</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 rounded-2xl border border-white bg-white/95 p-4 shadow-xl sm:-left-7 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
              <span><span className="block text-xs font-bold text-slate-900">Your account. Your details.</span><span className="mt-0.5 block text-[11px] text-slate-500">Private student access</span></span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-200/70 bg-white/75 px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Made for resident students</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Campus essentials, without the hassle.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">Spend less time looking for information and more time making the most of campus life.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl bg-slate-900 px-6 py-7 text-white sm:flex-row sm:px-9">
            <div>
              <h3 className="text-xl font-bold">Ready to check in?</h3>
              <p className="mt-1 text-sm text-slate-300">Use your student ID and password to open your personal portal.</p>
            </div>
            <Link to="/student-login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
              Sign in to your portal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} HostelHub · Student Resident Portal</span>
        <Link to="/login" className="font-semibold text-slate-600 transition hover:text-emerald-700">Staff portal</Link>
      </footer>
    </main>
  );
}
