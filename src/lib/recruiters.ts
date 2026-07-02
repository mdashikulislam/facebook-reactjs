export type Recruiter = {
  id: string
  name: string
  title: string
  team: string
  location: string
  bio: string
  photo: string
  focus: string[]
  linkedin?: string
}

export const teams = [
  "All teams",
  "Social Media",
  "Digital Marketing",
  "Brand & Content",
] as const

export const recruiters: Recruiter[] = [
  {
    id: "lewis-alexander",
    name: "Lewis Alexander",
    title: "Senior Recruiter, Social Media",
    team: "Social Media",
    location: "Menlo Park, CA",
    bio: "Lewis leads hiring for Meta's Social Media org, placing VP and Director-level leaders across Facebook, Instagram, and Threads. He'll give you a clear picture of scope, team structure, and what success looks like.",
    photo: "/recruiters/recruiter-1.jpg",
    focus: ["VP Social Media", "Head of Social", "Director-level"],
    linkedin: "https://www.linkedin.com/in/lewisalexander",
  },
  {
    id: "alex-lim",
    name: "Alex Lim",
    title: "Recruiting Lead, Digital Marketing",
    team: "Digital Marketing",
    location: "New York, NY",
    bio: "Alex recruits senior marketing leaders for Meta's performance and brand marketing teams. Ask him about the interview process, expectations for the role, and how to position your experience.",
    photo: "/recruiters/recruiter-2.jpg",
    focus: ["VP Digital Marketing", "Performance Marketing", "Growth"],
    linkedin: "https://www.linkedin.com/in/alexlim30",
  },
  {
    id: "kety-leetch",
    name: "Kety Leetch",
    title: "Recruiter, Brand & Content",
    team: "Brand & Content",
    location: "London, UK",
    bio: "Kety partners with Meta's Brand and Content teams to hire creative and strategic leaders across EMEA. He'll help you understand how your background maps to open opportunities.",
    photo: "/recruiters/recruiter-3.svg",
    focus: ["Brand Strategy", "Content Leadership", "Creative Direction"],
    linkedin: "https://www.linkedin.com/in/ketyleetch",
  },
]

export const meetingTypes = [
  "VP / Director role exploration",
  "Interview preparation",
  "Compensation & leveling questions",
  "Application follow-up",
]
