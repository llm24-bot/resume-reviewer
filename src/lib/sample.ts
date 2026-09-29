// Fictional documents and a deliberately hand-written demonstration.
// Never present this as an AI analysis of a visitor's own documents.
export const SAMPLE_RESUME = `Alex Morgan
Computer Science student | Seeking a software engineering internship

PROJECTS
Campus Task Tracker | React, TypeScript, Supabase
- Made a task management app for students.
- Added task creation, editing, filtering, and deletion.
- Used Supabase authentication and PostgreSQL to save tasks per user.
- Deployed the app on Vercel and used Git for version control.

Study Room | React, Node.js, Socket.io
- Built a shared study timer and real-time chat.
- Worked with a classmate using GitHub pull requests.

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, Git

EDUCATION
B.S. Computer Science, expected May 2028
Coursework: Data Structures, Databases, Software Engineering`;

export const SAMPLE_JOB = `Software Engineering Intern
Northstar Labs | Summer internship

Help our product team build thoughtful tools for students.
You will implement accessible interfaces, integrate backend APIs,
collaborate through code reviews, and test features before release.

Required qualifications
- Currently pursuing a degree in Computer Science or a related field
- Experience with JavaScript and React
- Familiarity with Git and collaborative development
- Clear written communication and a willingness to learn

Preferred qualifications
- TypeScript and SQL experience
- Building or consuming REST APIs
- Unit or integration testing
- Knowledge of web accessibility

Tell us about something you built, the decisions you made, and what
you learned. Personal and classroom projects are welcome.`;

export const SAMPLE_REVIEW = `## Top three improvements
1. **Lead with what you built, not “Made an app.”** Your task tracker already demonstrates full-stack work. Name its users, core workflow, and technologies in the first bullet.
2. **Make collaboration visible.** Your GitHub pull-request experience maps directly to the role's code-review requirement. Explain what you reviewed or how feedback changed the project.
3. **Clarify testing and accessibility.** Neither is demonstrated yet. If you have done this work, add a concrete example. If not, these are useful next steps, not claims to add.

## Skills not demonstrated
- **Required: written communication.** The resume mentions collaboration but offers no example of documentation or explaining a technical decision.
- **Preferred: REST APIs.** Node.js is listed, but building or consuming a REST endpoint is not explicit. Supabase use alone does not establish this.
- **Preferred: testing and accessibility.** No test cases, keyboard checks, or accessible form work are described. This is missing evidence, not proof of missing ability.

## Bullet improvements
**Original:** “Made a task management app for students.”

**Try:** “Built a student task tracker with React and TypeScript, supporting task creation, editing, filtering, and deletion.”

**Why:** It replaces a vague statement with a specific user workflow, using only details already in the resume.

**Original:** “Used Supabase authentication and PostgreSQL to save tasks per user.”

**Try:** “Integrated Supabase authentication and PostgreSQL to support signed-in users and user-specific task storage.”

**Ask yourself:** How did you enforce user isolation? Only describe row-level security if you actually implemented it.

**Original:** “Worked with a classmate using GitHub pull requests.”

**Try:** “Collaborated with a classmate on a real-time study room using GitHub pull requests.”

**Ask yourself:** Can you name one piece of feedback you gave or implemented? That would make the collaboration more concrete.

## Keyword alignment
**Already supported:** React, JavaScript, TypeScript, SQL/PostgreSQL, Git, collaborative development.

**Worth clarifying if true:** code reviews, REST APIs, unit testing, integration testing, web accessibility.

Use terms inside evidence-backed project bullets, not a keyword dump. No score can guarantee that an ATS or a recruiter will select your application.`;
