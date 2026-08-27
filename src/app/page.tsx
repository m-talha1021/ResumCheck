 "use client";

import { useState } from "react";
import ContactForm from "@/components/ContactForm";
import UploadAnalyzer from "@/components/UploadAnalyzer";

const features = [
  ["blue", "fa-solid fa-brain", "AI Analysis", "Intelligent resume review using Google Gemini AI and smart parsing rules."],
  ["green", "fa-solid fa-chart-simple", "ATS Score", "Understand how ATS systems evaluate and grade your resume formatting and content."],
  ["amber", "fa-solid fa-lightbulb", "Suggestions", "Improve your resume with step-by-step actionable recommendations and rewrites."],
  ["purple", "fa-solid fa-list-check", "Skills Detection", "Discover missing technical and soft skills crucial for your target role."],
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = () => setMobileOpen(false);

  return (
    <div id="app">
      <nav className="navbar">
        <div className="nav-inner">
          <a href="#home" className="brand" onClick={close}>
            <i className="fa-solid fa-file-waveform" /><span>ResumCheck</span>
          </a>
          <ul className="desktop-nav">
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About ATS</a></li>
            <li><a href="#upload">Upload Resume</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
          <a href="#upload" className="nav-cta">Analyze Resume</a>
          <button
            className="hamburger"
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(v => !v)}
          >
            <i className={mobileOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
          </button>
        </div>
        <div className={`mobile-nav${mobileOpen ? " open" : ""}`}>
          <a href="#home" onClick={close}>Home</a>
          <a href="#features" onClick={close}>Features</a>
          <a href="#about" onClick={close}>About ATS</a>
          <a href="#upload" onClick={close}>Upload Resume</a>
          <a href="#contact" onClick={close}>Contact Us</a>
        </div>
      </nav>

      <section id="home" className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><i className="fa-solid fa-sparkles" /> AI-Powered Resume ATS Checker</div>
            <h1>AI-Powered Resume Analysis<br /><span>For ATS Success</span></h1>
            <p>
              Receive an AI-powered resume review, ATS compatibility score, strengths, weaknesses,
              missing skills, and practical suggestions to increase your chances of getting hired.
            </p>
            <div className="hero-actions">
              <a href="#upload" className="btn primary"><i className="fa-solid fa-cloud-arrow-up" /> Analyze Resume Now</a>
              <a href="#features" className="btn outline">Learn More</a>
            </div>
            <div className="stats">
              <div><strong>98%</strong><small>ATS Match Accuracy</small></div>
              <div><strong>50,000+</strong><small>Resumes Analyzed</small></div>
              <div><strong>3.5x</strong><small>More Interview Calls</small></div>
            </div>
          </div>

          <div className="hero-preview floating">
            <div className="preview-top">
              <div className="file-title">
                <div className="preview-icon"><i className="fa-solid fa-file-invoice" /></div>
                <div><b>John_Doe_Software_Engineer.pdf</b><small>Scanned 2 mins ago</small></div>
              </div>
              <span className="score-pill">ATS Score: 88%</span>
            </div>
            <div className="preview-score">
              <div className="sample-ring"><b>88%</b><small>Excellent</small></div>
              <div className="mini-bars">
                <div><span>Keywords Match <b>92%</b></span><i><em style={{width:"92%"}} /></i></div>
                <div><span>Formatting &amp; Structure <b>85%</b></span><i><em style={{width:"85%"}} /></i></div>
              </div>
            </div>
            <div className="preview-note good"><i className="fa-solid fa-circle-check" /> Includes 8+ high-impact technical keywords (React, Node, SQL, Docker)</div>
            <div className="preview-note warn"><i className="fa-solid fa-triangle-exclamation" /> Missing LinkedIn profile link in header section</div>
          </div>
        </div>
      </section>

      <section id="features" className="section white">
        <div className="container">
          <div className="section-head">
            <span>Features</span>
            <h2>Everything You Need For An ATS-Friendly CV</h2>
            <p>Our comprehensive resume checking suite breaks down your CV into actionable insights, helping you beat automated screening software.</p>
          </div>
          <div className="feature-grid">
            {features.map(([tone, icon, title, text]) => (
              <article className="feature" key={title}>
                <div className={`feature-icon ${tone}`}><i className={icon} /></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section gray">
        <div className="container">
          <div className="section-head">
            <h2>What is an Applicant Tracking System (ATS)?</h2>
            <p>Learn why ATS-friendly resumes are essential for landing interviews and how ResumCheck helps you optimize your resume.</p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <h3>Understanding ATS Software</h3>
              <p>An Applicant Tracking System (ATS) is software used by employers to collect, organize, and filter job applications. Before a recruiter reads your resume, the ATS scans it for keywords, skills, formatting, and job relevance.</p>
              <p>If your resume isn&apos;t ATS-friendly, it may never reach a hiring manager—even if you&apos;re highly qualified for the position. ResumCheck identifies parsing errors, missing keywords, and formatting blockers so your application stands out.</p>
            </div>
            <div className="about-features">
              <div><i className="fa-solid fa-magnifying-glass-chart" /><h4>ATS Analysis</h4><p>Analyze your resume&apos;s compatibility with Applicant Tracking Systems.</p></div>
              <div><i className="fa-solid fa-chart-line" /><h4>Resume Score</h4><p>Get a clear score that shows where your resume stands.</p></div>
              <div><i className="fa-solid fa-key" /><h4>Keywords</h4><p>Find important skills and job-specific keywords.</p></div>
              <div><i className="fa-solid fa-file-circle-check" /><h4>Optimization</h4><p>Get practical suggestions for improvement.</p></div>
            </div>
          </div>
        </div>
      </section>

      <UploadAnalyzer />

      <section id="contact" className="section white">
        <div className="container">
          <div className="section-head">
            <h2>Contact Us</h2>
            <p>Have questions, suggestions, or feedback about ATS resume optimization? We&apos;d love to hear from you.</p>
          </div>
          <div className="contact-grid">
            <ContactForm />
            <div className="contact-info">
              <div><i className="fa-solid fa-envelope" /><span><b>Email Support</b><small>resumcheck@gmail.com</small></span></div>
              <div><i className="fa-solid fa-phone" /><span><b>Phone</b><small>+92 300 1234567</small></span></div>
              <div><i className="fa-solid fa-location-dot" /><span><b>Location</b><small>Chiniot, Punjab, Pakistan</small></span></div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-grid">
          <div>
            <div className="footer-brand"><i className="fa-solid fa-file-waveform" /> ResumCheck</div>
            <p>AI-powered Resume ATS Checker that helps job seekers improve their resumes, pass applicant tracking systems, and land more interview opportunities.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="#home">Home</a><a href="#features">Features</a><a href="#about">About ATS Software</a><a href="#upload">Upload Resume</a><a href="#contact">Contact</a>
          </div>
          <div>
            <h4>Contact</h4><p>Email: resumcheck@gmail.com</p><p>Phone: +92 300 1234567</p><p>Location: Pakistan</p>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>© 2026 ResumCheck. All Rights Reserved.</span><span>Free AI ATS Resume Checker &amp; Analyzer</span>
        </div>
      </footer>
    </div>
  );
}
