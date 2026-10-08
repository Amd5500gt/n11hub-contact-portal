import React, { useState, ChangeEvent, FormEvent } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  User,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  _website: string; // Honeypot field for spam prevention
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const QUICK_SUBJECTS = [
  'General Inquiry',
  'Technical Support',
  'Zenin OS Support',
  'Feedback & Suggestions',
];

export default function App() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
    _website: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateField = (field: keyof FormState, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Please enter at least 2 characters';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        return undefined;
      case 'subject':
        if (!value.trim()) return 'Subject is required';
        if (value.trim().length < 2) return 'Subject must be at least 2 characters';
        return undefined;
      case 'message':
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 10) return 'Please write at least 10 characters';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name as keyof FormState, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }

    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSelectQuickSubject = (subj: string) => {
    setFormData((prev) => ({ ...prev, subject: subj }));
    setTouched((prev) => ({ ...prev, subject: true }));
    setErrors((prev) => ({ ...prev, subject: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Check all fields
    const nameErr = validateField('name', formData.name);
    const emailErr = validateField('email', formData.email);
    const subjectErr = validateField('subject', formData.subject);
    const messageErr = validateField('message', formData.message);

    const validationErrors: FormErrors = {
      name: nameErr,
      email: emailErr,
      subject: subjectErr,
      message: messageErr,
    };

    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
    });
    setErrors(validationErrors);

    if (nameErr || emailErr || subjectErr || messageErr) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          _website: formData._website, // honeypot
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(data?.message || 'Unable to send your message right now. Please try again.');
      }
    } catch (err) {
      setErrorMessage('Unable to send your message right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      _website: '',
    });
    setErrors({});
    setTouched({});
    setErrorMessage(null);
    setIsSuccess(false);
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-x-hidden bg-slate-50">
      {/* Decorative colorful ambient background orbs */}
      <div
        className="pointer-events-none absolute -top-24 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-pink-300/20 blur-3xl animate-orb-1"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-gradient-to-bl from-cyan-300/40 via-blue-300/30 to-indigo-300/20 blur-3xl animate-orb-2"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/4 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-pink-300/30 via-rose-300/25 to-amber-200/25 blur-3xl animate-orb-3"
        aria-hidden="true"
      />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-4">
        {/* Brand & Heading section */}
        <div className="text-center mb-8 sm:mb-10">
          {/* Brand Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-indigo-100 shadow-sm shadow-indigo-100 mb-5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wider text-indigo-950 uppercase">
              N11HUB
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-indigo-600 font-medium">Support Desk</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            How can we help?
          </h1>

          <p className="mt-3.5 text-base sm:text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
            Have a question, issue, or feedback? Send us a message and our support team will get
            back to you.
          </p>
        </div>

        {/* Contact Form Card / Success View */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 p-6 sm:p-10 transition-all duration-300">
          {isSuccess ? (
            /* Success State */
            <div
              className="py-6 sm:py-8 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300"
              role="status"
              aria-live="polite"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-6 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                Message sent successfully.
              </h2>

              <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto leading-relaxed mb-8">
                We'll get back to you as soon as possible.
              </p>

              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 cursor-pointer"
              >
                Send another message
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Contact Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Error Notification Banner */}
              {errorMessage && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium animate-in fade-in duration-200"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Anti-spam Honeypot (Hidden) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="_website">Website URL (Leave blank)</label>
                <input
                  type="text"
                  id="_website"
                  name="_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData._website}
                  onChange={handleChange}
                />
              </div>

              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="name"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Name</span>
                    <span className="text-rose-500" title="Required">
                      *
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={() => handleBlur('name')}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-50/80 border text-slate-900 placeholder:text-slate-400 text-sm sm:text-base input-focus-ring ${
                        errors.name
                          ? 'border-rose-400 bg-rose-50/20'
                          : touched.name && !errors.name
                          ? 'border-emerald-400/80 bg-white'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p id="name-error" className="text-xs text-rose-600 font-medium pl-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* 2. Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Email</span>
                    <span className="text-rose-500" title="Required">
                      *
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur('email')}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-50/80 border text-slate-900 placeholder:text-slate-400 text-sm sm:text-base input-focus-ring ${
                        errors.email
                          ? 'border-rose-400 bg-rose-50/20'
                          : touched.email && !errors.email
                          ? 'border-emerald-400/80 bg-white'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className="text-xs text-rose-600 font-medium pl-1">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Subject */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="subject"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Subject</span>
                    <span className="text-rose-500" title="Required">
                      *
                    </span>
                  </label>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Choose or type your topic
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="e.g. Question about Zenin OS or technical assistance"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={() => handleBlur('subject')}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? 'subject-error' : undefined}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50/80 border text-slate-900 placeholder:text-slate-400 text-sm sm:text-base input-focus-ring ${
                      errors.subject
                        ? 'border-rose-400 bg-rose-50/20'
                        : touched.subject && !errors.subject
                        ? 'border-emerald-400/80 bg-white'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>

                {/* Quick topic pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Popular:
                  </span>
                  {QUICK_SUBJECTS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleSelectQuickSubject(topic)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
                        formData.subject === topic
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium shadow-xs'
                          : 'bg-slate-100/70 hover:bg-slate-100 text-slate-600 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                {errors.subject && (
                  <p id="subject-error" className="text-xs text-rose-600 font-medium pl-1">
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* 4. Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="message"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Message</span>
                    <span className="text-rose-500" title="Required">
                      *
                    </span>
                  </label>
                  <span className="text-xs text-slate-400">
                    {formData.message.length} / 3000
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    placeholder="Please describe your question, issue, or feedback in detail..."
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={() => handleBlur('message')}
                    maxLength={3000}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50/80 border text-slate-900 placeholder:text-slate-400 text-sm sm:text-base input-focus-ring resize-y min-h-[120px] max-h-[360px] ${
                      errors.message
                        ? 'border-rose-400 bg-rose-50/20'
                        : touched.message && !errors.message
                        ? 'border-emerald-400/80 bg-white'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>

                {errors.message && (
                  <p id="message-error" className="text-xs text-rose-600 font-medium pl-1">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-white font-semibold text-base sm:text-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Direct support email note */}
              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Prefer direct email? Reach our team at{' '}
                  <a
                    href="mailto:support@n11hub.in"
                    className="font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
                  >
                    support@n11hub.in
                  </a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
