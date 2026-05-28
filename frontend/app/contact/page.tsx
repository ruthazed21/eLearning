'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Mail, Phone, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) setAccessibilityMode(saved);
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    else if (formData.message.trim().length < 10)
      newErrors.message = 'Message must be at least 10 characters';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    // Simulate a short network delay — replace with a real API call when ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the field error as the user types
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';
  const inputClass = `${textSize} text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3`;

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${bgColor} text-white flex flex-col`}>
      <PublicHeader />

      <main id="main-content" className="flex-1 py-16 px-6 lg:px-12">
        <div className="container mx-auto max-w-7xl">

          {/* Page heading */}
          <div className="text-center mb-14">
            <h1 className={`font-bold mb-4 ${accessibilityMode === 'blind' ? 'text-5xl' : 'text-4xl'}`}>
              Contact Us
            </h1>
            <p className={`text-white/70 max-w-2xl mx-auto ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-xl'}`}>
              Have a question or need support? Fill out the form and our team will get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── Support info sidebar ── */}
            <aside className="space-y-6" aria-label="Support information">

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                <h2 className={`font-bold text-white ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-xl'}`}>
                  Support Info
                </h2>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-slate-950" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={`font-semibold text-white ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Email Support
                    </p>
                    <a
                      href="mailto:support@eduaccess.edu.et"
                      className={`text-yellow-400 hover:text-yellow-300 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}
                    >
                      hamimesfin@gmail.com
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-slate-950" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={`font-semibold text-white ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Phone
                    </p>
                    <a
                      href="tel:+251582205000"
                      className={`text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}
                    >
                      +251 58 220 5000
                    </a>
                  </div>
                </div>

                {/* Business hours */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-slate-950" aria-hidden="true" />
                  </div>
                  <div>
                    <p className={`font-semibold text-white ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Business Hours
                    </p>
                    <p className={`text-white/70 ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Mon – Fri: 8:00 AM – 5:00 PM
                    </p>
                    <p className={`text-white/70 ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Sat: 9:00 AM – 1:00 PM
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                <h2 className={`font-bold text-white ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-xl'}`}>
                  Quick Links
                </h2>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/accessibility"
                      className={`text-yellow-400 hover:text-yellow-300 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}
                    >
                      Accessibility Guide
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/signup"
                      className={`text-yellow-400 hover:text-yellow-300 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}
                    >
                      Create an Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/forgot-password"
                      className={`text-yellow-400 hover:text-yellow-300 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}
                    >
                      Reset Password
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>

            {/* ── Contact form ── */}
            <section className="lg:col-span-2" aria-labelledby="contact-form-heading">
              <div className="bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
                <div className="p-8 lg:p-10">

                  {/* Icon + heading */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
                      <GraduationCap className="h-8 w-8 text-slate-950" aria-hidden="true" />
                    </div>
                    <div>
                      <h2
                        id="contact-form-heading"
                        className={`font-bold text-slate-950 ${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'}`}
                      >
                        Send a Message
                      </h2>
                      <p className={`text-slate-500 ${textSize}`}>
                        We typically respond within one business day.
                      </p>
                    </div>
                  </div>

                  {/* Success state */}
                  {submitted ? (
                    <div
                      className="flex flex-col items-center text-center py-12 space-y-4"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
                      </div>
                      <h3 className={`font-bold text-slate-950 ${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'}`}>
                        Message Sent!
                      </h3>
                      <p className={`text-slate-600 max-w-sm ${textSize}`}>
                        Thank you for reaching out. We'll get back to you at{' '}
                        <span className="font-semibold text-slate-900">{formData.email}</span> as soon as possible.
                      </p>
                      <Button
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ name: '', email: '', subject: '', message: '' });
                        }}
                        className={`mt-4 bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold rounded-lg ${textSize}`}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">

                      {/* Global submit error */}
                      {submitError && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4" role="alert">
                          <p className={`text-red-800 flex items-start gap-2 ${textSize}`}>
                            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{submitError}</span>
                          </p>
                        </div>
                      )}

                      {/* Name + Email row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="name" className={`font-semibold text-slate-950 ${textSize}`}>
                            Full Name <span aria-hidden="true">*</span>
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            autoComplete="name"
                            aria-required="true"
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            className={inputClass}
                          />
                          {errors.name && (
                            <p id="name-error" role="alert" className={`text-red-600 flex items-center gap-1 ${textSize}`}>
                              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className={`font-semibold text-slate-950 ${textSize}`}>
                            Email Address <span aria-hidden="true">*</span>
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            autoComplete="email"
                            aria-required="true"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            className={inputClass}
                          />
                          {errors.email && (
                            <p id="email-error" role="alert" className={`text-red-600 flex items-center gap-1 ${textSize}`}>
                              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <Label htmlFor="subject" className={`font-semibold text-slate-950 ${textSize}`}>
                          Subject <span aria-hidden="true">*</span>
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          type="text"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="What is your message about?"
                          aria-required="true"
                          aria-invalid={!!errors.subject}
                          aria-describedby={errors.subject ? 'subject-error' : undefined}
                          className={inputClass}
                        />
                        {errors.subject && (
                          <p id="subject-error" role="alert" className={`text-red-600 flex items-center gap-1 ${textSize}`}>
                            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {errors.subject}
                          </p>
                        )}
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <Label htmlFor="message" className={`font-semibold text-slate-950 ${textSize}`}>
                          Message <span aria-hidden="true">*</span>
                        </Label>
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Describe your question or issue in detail…"
                          aria-required="true"
                          aria-invalid={!!errors.message}
                          aria-describedby={errors.message ? 'message-error' : undefined}
                          className={`w-full resize-none ${inputClass}`}
                        />
                        {errors.message && (
                          <p id="message-error" role="alert" className={`text-red-600 flex items-center gap-1 ${textSize}`}>
                            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {errors.message}
                          </p>
                        )}
                      </div>

                      {/* Submit */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        aria-label={isSubmitting ? 'Sending message, please wait' : 'Send message'}
                        className={`w-full bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${textSize} ${
                          isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" aria-hidden="true" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
