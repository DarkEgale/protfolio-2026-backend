import mongoose from "mongoose";

const navLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "main",
      unique: true,
      immutable: true,
    },
    brand: {
      name: { type: String, default: "MD SHIMUL" },
      accent: { type: String, default: "SHIMUL" },
      tagline: { type: String, default: "Full Stack MERN Developer" },
      logoImage: { type: String, default: "" },
    },
    navLinks: {
      type: [navLinkSchema],
      default: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Projects", href: "/projects" },
        { label: "Contact", href: "/contact" },
      ],
    },
    hero: {
      status: { type: String, default: "Available for new projects" },
      headline: { type: String, default: "FULL STACK DEVELOPER" },
      highlightedText: { type: String, default: "DEVELOPER" },
      intro: {
        type: String,
        default:
          "Hi, I'm Shimul. I build scalable web applications with the MERN stack and secure digital infrastructures.",
      },
      primaryButtonText: { type: String, default: "View Work" },
      primaryButtonHref: { type: String, default: "/projects" },
      secondaryButtonText: { type: String, default: "Contact Me" },
      secondaryButtonHref: { type: String, default: "/contact" },
      heroImage: { type: String, default: "" },
      profileImage: { type: String, default: "" },
      experienceLabel: { type: String, default: "Years Exp." },
      experienceValue: { type: String, default: "1+" },
    },
    profile: {
      eyebrow: { type: String, default: "Who am I?" },
      name: { type: String, default: "Shimul Hossen" },
      title: { type: String, default: "Developer & Tech Enthusiast" },
      bio: {
        type: String,
        default:
          "Based in Dhaka, I am a dedicated MERN Stack Developer and a student of Computer Technology.",
      },
      secondBio: {
        type: String,
        default:
          "My journey is fueled by clean user interfaces, secure systems, and continuous learning.",
      },
      image: { type: String, default: "" },
      resumeUrl: { type: String, default: "" },
      educationTitle: { type: String, default: "Diploma in Engineering" },
      educationBody: { type: String, default: "Computer Technology, BTEB" },
      focus: {
        type: String,
        default:
          "Creating secure and performance-optimized web solutions with scalable code and intuitive UI.",
      },
    },
    services: {
      heading: { type: String, default: "MY SERVICES" },
      subheading: {
        type: String,
        default:
          "Turning complex problems into elegant, secure, and high-performance digital solutions.",
      },
      items: {
        type: [serviceSchema],
        default: [
          {
            title: "Full-Stack Development",
            description:
              "Building scalable web applications from scratch using MongoDB, Express, React, and Node.js.",
            tags: ["MongoDB", "Express", "React", "Node"],
          },
          {
            title: "Frontend Engineering",
            description:
              "Converting designs into responsive and high-performance user interfaces.",
            tags: ["TypeScript", "Tailwind", "React"],
          },
          {
            title: "Cyber Security & Audit",
            description:
              "Implementing secure authentication and practical web security best practices.",
            tags: ["JWT", "Security", "Audit"],
          },
        ],
      },
    },
    contact: {
      heading: { type: String, default: "GET IN TOUCH" },
      subheading: {
        type: String,
        default:
          "Have a project in mind or just want to say hi? Feel free to reach out.",
      },
      email: { type: String, default: "hello@mdshimul.top" },
      phone: { type: String, default: "+880 1XXX XXXXXX" },
      location: { type: String, default: "Dhaka, Bangladesh" },
      socialLinks: {
        type: [socialLinkSchema],
        default: [
          { label: "Email", href: "mailto:hello@mdshimul.top" },
          { label: "GitHub", href: "#" },
          { label: "LinkedIn", href: "#" },
        ],
      },
    },
    footer: {
      description: {
        type: String,
        default:
          "Full Stack MERN Developer dedicated to building secure, scalable, and high-performance web applications.",
      },
      copyrightName: { type: String, default: "MD SHIMUL HOSSEN" },
      madeWith: { type: String, default: "using MERN." },
    },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model("SiteContent", siteContentSchema);

export default SiteContent;
