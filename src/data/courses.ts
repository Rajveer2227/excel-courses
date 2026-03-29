import {
    Code, Cpu, Globe, BarChart, Database, Brain, Palette, Video, Terminal, Layers, Coffee
} from 'lucide-react';

export interface Course {
    id: string;
    title: string;
    titleHook?: string;
    tagline?: string;
    overview?: string;
    highlightFeatures?: string[];
    benefits?: string[];
    whoShouldJoin?: string[];
    careerOutcomes?: string[];
    category: string;
    duration: string;
    fees: string;
    icon: any;
    color: string;
    popular: boolean;
    hasInternship: boolean;
    coverImage?: string;
}

/**
 * ==========================================
 * ADMIN / CONTENT MANAGER INSTRUCTIONS
 * ==========================================
 * To edit courses, locate the specific course object below and modify its values:
 * 
 * 1. CHANGE COURSE NAME: Edit the `title` field (e.g., title: 'New Java Course').
 * 2. CHANGE FEES: Edit the `fees` field (e.g., fees: '₹12,499').
 * 3. ADD/CHANGE COVER IMAGE: Add a `coverImage` field to the course object.
 *    - To ensure it fits perfectly in the card header, use an image sized 800x600 pixels (4:3 aspect ratio).
 *    - Place the image file in the `public/` folder, and set the path starting with a forward slash (e.g., coverImage: '/my-image.jpg').
 * 
 * NEW FIELDS FOR INDIVIDUAL PAGES:
 * - titleHook: The catchy headline (e.g., 'Become a Java Pro 🚀').
 * - tagline: A 1-line sub-headline.
 * - overview: 2-3 lines of description.
 * - highlightFeatures: 3 short points (Certificate, Weekly Tests, etc.).
 * - whoShouldJoin: List of target students.
 * - careerOutcomes: List of potential job roles or next steps.
 */

const DEFAULT_BENEFITS = [
    "100% Practical Training",
    "Doubt Solving Support",
    "Industry-Oriented Teaching",
    "Experienced Trainers",
    "25+ Years Experience",
    "Individual Student Attention"
];

const DEFAULT_HIGHLIGHTS = [
    "Certificate Included 🎓",
    "Weekly Tests 📝",
    "Practical Training 💻"
];
export const courseCategories = [
    'All Courses',
    '💻 Programming & Core Development',
    '⚡ Full Stack Development',
    '🌐 Web Development',
    '📊 Data & Analytics',
    '🗄 Database Technologies',
    '🤖 AI & Emerging Tech',
    '💼 Accounting & Business',
    '🎨 Design & Creative Tools'
];

export const courses: Course[] = [
    // Programming & Core Development
    {
        id: 'c-programming',
        title: 'C Programming',
        titleHook: "Become a C Programmer 🚀",
        tagline: "Build strong programming logic and start your journey in software development",
        overview: "This course is designed for beginners to learn programming from scratch. You will develop strong logic-building skills and understand how software works.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no coding knowledge",
            "10th / 12th / Diploma / Degree students",
            "Students interested in IT field",
            "Anyone starting programming journey"
        ],
        careerOutcomes: [
            "Start advanced courses like Java / Python",
            "Apply for Junior Programmer roles",
            "Build base for Full Stack Development",
            "Prepare for Software Development career",
            "Improve logical thinking for IT interviews"
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹3,000',
        icon: Terminal,
        color: 'from-slate-600 to-slate-800',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'cpp-programming',
        title: 'C++ Programming',
        titleHook: "Master C++ Programming ⚡",
        tagline: "Level up from C and build high-performance applications with Object-Oriented Programming",
        overview: "C++ bridges low-level efficiency and high-level abstraction. This course covers OOP principles, memory management, STL, and real-world problem solving — making you industry-ready for software development roles.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who have completed C Programming",
            "Aspiring software developers",
            "Engineering / Diploma students",
            "Anyone preparing for competitive programming",
        ],
        careerOutcomes: [
            "Apply for C++ Developer / Software Engineer roles",
            "Build high-performance desktop applications",
            "Prepare for competitive coding interviews",
            "Transition to Game Development (Unreal Engine uses C++)",
            "Strong foundation for Data Structures & Algorithms",
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹3,000',
        icon: Code,
        color: 'from-blue-600 to-indigo-700',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'core-java',
        title: 'Core Java',
        titleHook: "Start Your Java Programming Journey ☕",
        tagline: "Learn core programming concepts and build a strong foundation for software development",
        overview: "Core Java teaches you the basics of programming using Java. You will learn important concepts like variables, loops, conditions, and Object-Oriented Programming.\nThis course builds a strong base for software development and helps you start your journey in the IT field.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no programming knowledge",
            "Students from 12th / Diploma / Degree",
            "Students who want to start coding",
            "Anyone interested in software development"
        ],
        careerOutcomes: [
            "Move to Advanced Java or Full Stack Java",
            "Build simple Java-based applications",
            "Understand programming logic clearly",
            "Prepare for software development learning path",
            "Improve problem-solving skills"
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹5,000',
        icon: Coffee,
        color: 'from-orange-600 to-red-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'adv-java',
        title: 'Advanced Java',
        titleHook: "Become a Java Backend Developer 🖥️",
        tagline: "Learn advanced Java concepts and build real-world web applications",
        overview: "Advanced Java focuses on building real-world applications using technologies like JDBC, Servlets, and JSP.\nYou will learn how to connect Java with databases and develop dynamic web applications used in real companies.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who have completed Core Java",
            "Students interested in backend development",
            "Engineering / Diploma students",
            "Anyone who wants to build real applications"
        ],
        careerOutcomes: [
            "Build dynamic web applications",
            "Work on backend development using Java",
            "Connect applications with databases",
            "Move towards Full Stack Java Development",
            "Apply for entry-level Java developer roles"
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: Layers,
        color: 'from-amber-500 to-orange-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'core-python',
        title: 'Core Python',
        titleHook: "Start Your Python Programming Journey 🐍",
        tagline: "Learn programming basics and build a strong foundation for software and data-related careers",
        overview: "Core Python teaches you the basics of programming in a simple and easy-to-understand way. You will learn variables, loops, functions, and Object-Oriented Programming concepts.\nPython is widely used in software development, data analytics, and automation, making it a great starting point for IT careers.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no programming knowledge",
            "Students from 12th / Diploma / Degree",
            "Students interested in IT, data, or software fields",
            "Anyone who wants to start coding in an easy language"
        ],
        careerOutcomes: [
            "Move to Advanced Python or Full Stack Python",
            "Start learning Data Analytics or AI/ML",
            "Build simple Python programs and scripts",
            "Understand programming logic clearly",
            "Improve problem-solving skills"
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹5,000',
        icon: Cpu,
        color: 'from-sky-500 to-blue-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'adv-python',
        title: 'Advanced Python',
        titleHook: "Become a Python Developer 🐍",
        tagline: "Learn advanced Python concepts and build real-world applications",
        overview: "Advanced Python focuses on building real-world applications using frameworks, file handling, databases, and APIs.\nYou will learn how Python is used in web development, automation, and data-related applications.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who have completed Core Python",
            "Students interested in software or backend development",
            "Students interested in automation or data-related fields",
            "Anyone who wants to build real-world Python applications"
        ],
        careerOutcomes: [
            "Build real-world Python applications",
            "Work on backend development using Python",
            "Start working on automation and scripting",
            "Move towards Full Stack Python or Data Analytics",
            "Apply for entry-level Python developer roles"
        ],
        category: '💻 Programming & Core Development',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: Code,
        color: 'from-cyan-500 to-blue-500',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'dsa',
        title: 'Data Structures',
        titleHook: "Master Data Structures and Problem Solving 💡",
        tagline: "Learn how to solve problems efficiently and prepare for coding interviews and software development roles",
        overview: "Data Structures helps you understand how data is stored, organized, and used in programs. You will learn concepts like arrays, linked lists, stacks, queues, trees, and searching and sorting techniques.\nThis course is very important for coding interviews and is a must for becoming a software developer.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who know basic programming (C, C++, Java, or Python)",
            "Engineering / Diploma students",
            "Students preparing for coding interviews",
            "Anyone who wants to improve problem-solving skills"
        ],
        careerOutcomes: [
            "Prepare for coding interviews in IT companies",
            "Solve complex programming problems",
            "Build strong logic and algorithm skills",
            "Improve performance of applications",
            "Move towards software development roles"
        ],
        category: '💻 Programming & Core Development',
        duration: '2 Months',
        fees: '₹7,000',
        icon: Layers,
        color: 'from-indigo-600 to-violet-700',
        popular: false,
        hasInternship: false,
    },

    // Full Stack Development
    {
        id: 'full-stack-java',
        title: 'Full Stack Development - Java',
        titleHook: "Become a Full Stack Java Developer ⚡",
        tagline: "Learn frontend and backend development to build complete web applications used in real companies",
        overview: "This course teaches you how to build full web applications from start to end. You will learn frontend technologies like HTML, CSS, JavaScript, and backend development using Java.\nYou will also learn how to connect applications with databases and create real-world projects used in the industry.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who know basic programming (Java preferred)",
            "Students who want to become software developers",
            "Engineering / Diploma students",
            "Anyone who wants a complete development skillset"
        ],
        careerOutcomes: [
            "Work as a Full Stack Java Developer",
            "Build complete web applications",
            "Work on frontend and backend development",
            "Apply for entry-level software developer roles",
            "Start freelance or project-based work"
        ],
        category: '⚡ Full Stack Development',
        duration: '6 Months',
        fees: '₹30,000',
        icon: Globe,
        color: 'from-rose-600 to-red-700',
        popular: true,
        hasInternship: true,
    },
    {
        id: 'full-stack-python',
        title: 'Full Stack Development - Python',
        titleHook: "Become a Full Stack Python Developer ⚡",
        tagline: "Learn frontend and backend development using Python to build complete web applications",
        overview: "This course teaches you how to build full web applications from start to end using Python. You will learn frontend technologies like HTML, CSS, and JavaScript, along with backend development using Python frameworks.\nYou will also learn how to connect applications with databases and work on real-world projects.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who know basic programming (Python preferred)",
            "Students who want to become software developers",
            "Engineering / Diploma students",
            "Anyone looking for a complete development skillset"
        ],
        careerOutcomes: [
            "Work as a Full Stack Python Developer",
            "Build complete web applications",
            "Work on backend development using Python",
            "Apply for entry-level developer roles",
            "Start freelance or project-based work"
        ],
        category: '⚡ Full Stack Development',
        duration: '6 Months',
        fees: '₹30,000',
        icon: Globe,
        color: 'from-blue-700 to-indigo-900',
        popular: true,
        hasInternship: true,
    },

    // Web Development
    {
        id: 'web-tech',
        title: 'Web Technologies (HTML, CSS, JS, Bootstrap)',
        titleHook: "Start Your Web Development Journey 🌐",
        tagline: "Learn how to create modern and responsive websites from scratch",
        overview: "In this course, you will learn how to build websites using HTML, CSS, JavaScript, and Bootstrap. You will understand how websites are structured, styled, and made interactive.\nThis is the first step to becoming a web developer and creating real-world websites.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no coding knowledge",
            "Students interested in website design and development",
            "Students from 10th / 12th / Diploma / Degree",
            "Anyone who wants to build websites"
        ],
        careerOutcomes: [
            "Create responsive websites",
            "Build personal or business websites",
            "Start freelance web development work",
            "Move to advanced courses like React or Full Stack",
            "Understand front-end development clearly"
        ],
        category: '🌐 Web Development',
        duration: '2 Months',
        fees: '₹7,000',
        icon: Globe,
        color: 'from-yellow-400 to-orange-500',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'react-js',
        title: 'React JS',
        titleHook: "Become a Frontend Developer with React ⚛️",
        tagline: "Build modern, fast, and dynamic web applications using React",
        overview: "React JS is a popular library used to build modern web applications. In this course, you will learn components, state management, and how to create interactive user interfaces.\nIt is widely used in the industry and is an important skill for frontend developers.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students who know HTML, CSS, and JavaScript",
            "Students interested in frontend development",
            "Students who want to build modern web apps",
            "Anyone looking to upgrade web development skills"
        ],
        careerOutcomes: [
            "Build modern web applications",
            "Work as a frontend developer",
            "Create interactive user interfaces",
            "Move towards Full Stack Development",
            "Work on real-world projects"
        ],
        category: '🌐 Web Development',
        duration: '2 Months',
        fees: '₹12,000',
        icon: Globe,
        color: 'from-cyan-400 to-sky-500',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'wordpress',
        title: 'WordPress Development',
        titleHook: "Create Websites Without Coding 🌐",
        tagline: "Build professional websites quickly using WordPress",
        overview: "WordPress allows you to create websites without writing code. In this course, you will learn how to design websites, use themes, plugins, and manage content.\nIt is widely used for business websites, blogs, and e-commerce platforms.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no coding knowledge",
            "Students interested in website design",
            "Business owners or freelancers",
            "Anyone who wants to create websites quickly"
        ],
        careerOutcomes: [
            "Create business and personal websites",
            "Work as a WordPress developer",
            "Start freelance website projects",
            "Build blogs and e-commerce sites",
            "Manage and maintain websites"
        ],
        category: '🌐 Web Development',
        duration: '2 Months',
        fees: '₹10,000',
        icon: Globe,
        color: 'from-blue-800 to-slate-900',
        popular: false,
        hasInternship: false,
    },

    // Data & Analytics
    {
        id: 'data-analytics',
        title: 'Data Analytics',
        titleHook: "Become a Data Analyst 📊",
        tagline: "Learn how to analyze data and create insights used by companies for decision making",
        overview: "In this course, you will learn how to work with data using tools like Excel, SQL, and Power BI. You will understand how to clean data, analyze it, and present it using reports and dashboards.\nThis course focuses on practical skills that are used in real companies.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in data and analytics",
            "Commerce, management, and IT students",
            "Job seekers and working professionals",
            "Anyone who wants a career in data field"
        ],
        careerOutcomes: [
            "Work as a Data Analyst (Entry Level)",
            "Create reports and dashboards",
            "Analyze business data",
            "Support decision-making in companies",
            "Work with real datasets"
        ],
        category: '📊 Data & Analytics',
        duration: '6 Months',
        fees: '₹30,000',
        icon: BarChart,
        color: 'from-purple-600 to-fuchsia-700',
        popular: true,
        hasInternship: true,
    },
    {
        id: 'power-bi',
        title: 'Power BI',
        titleHook: "Become a Data Analyst with Power BI 📊",
        tagline: "Learn how to visualize data and create professional dashboards",
        overview: "Power BI helps you convert raw data into meaningful reports and dashboards. You will learn data visualization, data cleaning, and how to present insights clearly.\nThis tool is widely used in companies for decision-making and business analysis.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in data and analytics",
            "Commerce, management, and IT students",
            "Job seekers and working professionals",
            "Anyone who wants to learn data visualization"
        ],
        careerOutcomes: [
            "Create professional dashboards and reports",
            "Work as a Data Analyst (Entry Level)",
            "Analyze business data",
            "Support decision-making in companies",
            "Move towards Data Analytics career"
        ],
        category: '📊 Data & Analytics',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: BarChart,
        color: 'from-amber-600 to-yellow-700',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'adv-excel',
        title: 'Advanced Excel',
        titleHook: "Master Advanced Excel for Real Work 📈",
        tagline: "Learn powerful Excel skills used in offices, businesses, and data-related jobs",
        overview: "Advanced Excel helps you work faster and smarter with data. You will learn formulas, functions, data analysis, charts, pivot tables, and automation features.\nThis course is very useful for office work, business tasks, and data handling in many industries.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students from any stream",
            "Job seekers and working professionals",
            "Commerce, management, and IT students",
            "Anyone who wants to improve Excel skills"
        ],
        careerOutcomes: [
            "Handle office data efficiently",
            "Create reports and dashboards",
            "Perform data analysis",
            "Improve productivity in jobs",
            "Apply for roles like Data Entry, MIS Executive, Analyst"
        ],
        category: '📊 Data & Analytics',
        duration: '1.5 Month',
        fees: '₹7,000',
        icon: BarChart,
        color: 'from-green-600 to-emerald-700',
        popular: false,
        hasInternship: false,
    },

    // Database Technologies
    {
        id: 'sql-server',
        title: 'SQL Server',
        titleHook: "Learn SQL Server for Data Management 🗄️",
        tagline: "Understand how to store, manage, and retrieve data used in real applications",
        overview: "SQL Server helps you manage data used in websites and software applications. You will learn how to write queries, manage tables, and work with real databases.\nIt is an essential skill for developers, analysts, and backend roles.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students from IT, Computer, or any stream",
            "Students learning programming or web development",
            "Data Analytics students",
            "Anyone interested in database management"
        ],
        careerOutcomes: [
            "Write SQL queries for real applications",
            "Work with databases in software development",
            "Support backend systems",
            "Prepare for roles like Database Developer or Analyst",
            "Improve data handling skills"
        ],
        category: '🗄 Database Technologies',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: Database,
        color: 'from-red-500 to-rose-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'mongodb',
        title: 'MongoDB',
        titleHook: "Learn MongoDB for Modern Applications 🍃",
        tagline: "Understand NoSQL databases used in modern web and mobile applications",
        overview: "MongoDB is a NoSQL database used in modern applications. You will learn how to store and manage data in flexible formats, which is useful for web and mobile development.\nIt is widely used with technologies like MERN Stack.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in web development",
            "Students learning MERN Stack",
            "IT and Computer students",
            "Anyone who wants to learn modern databases"
        ],
        careerOutcomes: [
            "Work with NoSQL databases",
            "Build backend for web applications",
            "Use MongoDB in MERN stack projects",
            "Manage large and flexible data",
            "Improve modern development skills"
        ],
        category: '🗄 Database Technologies',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: Database,
        color: 'from-green-500 to-emerald-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'oracle',
        title: 'Oracle Database',
        titleHook: "Master Oracle Database Management 🔴",
        tagline: "Learn how large organizations manage and secure their data",
        overview: "Oracle Database is widely used in large companies and enterprises. In this course, you will learn database concepts, SQL queries, and data management techniques.\nIt is important for roles in database administration and enterprise applications.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "IT and Computer students",
            "Students interested in database management",
            "Students preparing for backend roles",
            "Anyone who wants to work with enterprise systems"
        ],
        careerOutcomes: [
            "Work with enterprise-level databases",
            "Manage and organize large data systems",
            "Prepare for Database Administrator roles",
            "Support backend systems in companies",
            "Improve database knowledge"
        ],
        category: '🗄 Database Technologies',
        duration: '1.5 Months',
        fees: '₹7,000',
        icon: Database,
        color: 'from-red-800 to-black',
        popular: false,
        hasInternship: false,
    },

    // AI & Emerging Tech
    {
        id: 'ai-ml',
        title: 'Applications of AI & ML',
        titleHook: "Explore Applications of AI and Machine Learning 🤖",
        tagline: "Understand how AI is used in real-world systems and modern technology",
        overview: "This course introduces you to Artificial Intelligence and Machine Learning concepts and how they are used in real applications. You will understand how AI is used in chatbots, recommendation systems, automation, and data-driven decisions.\nIt is a great starting point to explore future technologies and advanced IT fields.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in AI and future technologies",
            "IT, Computer, and Engineering students",
            "Students interested in Data Analytics",
            "Anyone curious about how AI works"
        ],
        careerOutcomes: [
            "Understand real-world AI applications",
            "Move towards Data Science or Machine Learning courses",
            "Work on basic AI-based projects",
            "Improve knowledge of modern technologies",
            "Explore career paths in AI and Data fields"
        ],
        category: '🤖 AI & Emerging Tech',
        duration: '2 Months',
        fees: '₹10,000',
        icon: Brain,
        color: 'from-violet-600 to-purple-800',
        popular: true,
        hasInternship: false,
    },
    {
        id: 'comp-fund-ai',
        title: 'Computer Fundamentals with AI',
        titleHook: "Learn Computer Basics with AI Tools 💻",
        tagline: "Master essential computer skills and use AI tools for faster and smarter work",
        overview: "This course covers basic computer knowledge and important tools like MS Word, Excel, and PowerPoint along with AI tools that make work easier.\nYou will learn how to create documents, presentations, and manage data while using AI to improve speed and productivity.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no computer knowledge",
            "Students from school or college",
            "Job seekers and office workers",
            "Anyone who wants to improve basic computer skills"
        ],
        careerOutcomes: [
            "Use Word, Excel, and PowerPoint confidently",
            "Create professional documents and presentations",
            "Work faster using AI tools",
            "Improve office and computer skills",
            "Apply for basic computer-based jobs"
        ],
        category: '🤖 AI & Emerging Tech',
        duration: '2 Months',
        fees: '₹6,000',
        icon: Cpu,
        color: 'from-teal-500 to-cyan-600',
        popular: false,
        hasInternship: false,
    },

    // Accounting & Business
    {
        id: 'tally',
        title: 'Tally (Accounting, Inventory, Taxation)',
        titleHook: "Learn Tally for Accounting and Business 💼",
        tagline: "Manage accounts, inventory, and GST with practical training",
        overview: "Tally is widely used for accounting in businesses. In this course, you will learn how to manage accounts, inventory, and GST entries.\nIt helps you understand real business transactions and prepares you for accounting roles.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Commerce students",
            "Students interested in accounting and finance",
            "Job seekers looking for office jobs",
            "Business owners who want to manage accounts"
        ],
        careerOutcomes: [
            "Work as an Accountant or Tally Operator",
            "Manage business accounts and GST",
            "Handle billing and inventory",
            "Work in offices and companies",
            "Start freelance accounting work"
        ],
        category: '💼 Accounting & Business',
        duration: '3 Months',
        fees: '₹15,000',
        icon: Database,
        color: 'from-zinc-700 to-slate-900',
        popular: false,
        hasInternship: false,
    },

    // Design & Creative Tools
    {
        id: 'canva',
        title: 'Canva Design Mastery',
        titleHook: "Create Designs Easily with Canva 🎨",
        tagline: "Design social media posts, posters, and graphics without advanced skills",
        overview: "Canva is an easy-to-use design tool that helps you create professional designs quickly. You will learn how to design posts, banners, presentations, and marketing materials.\nIt is useful for students, businesses, and anyone interested in design.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Beginners with no design experience",
            "Students interested in social media content",
            "Business owners and marketers",
            "Anyone who wants to create designs easily"
        ],
        careerOutcomes: [
            "Create social media posts and designs",
            "Design posters, banners, and presentations",
            "Work on freelance design projects",
            "Support digital marketing activities",
            "Build basic design skills"
        ],
        category: '🎨 Design & Creative Tools',
        duration: '1.5 Month',
        fees: '₹4,000',
        icon: Palette,
        color: 'from-pink-500 to-rose-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'coreldraw',
        title: 'CorelDRAW',
        titleHook: "Learn CorelDRAW for Graphic Design ✍️",
        tagline: "Create professional designs for printing, branding, and marketing",
        overview: "CorelDRAW is used for creating professional designs like logos, banners, visiting cards, and print materials.\nIn this course, you will learn design tools, layouts, and how to create designs used in real business and printing work.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in graphic design",
            "Printing and design field beginners",
            "Business owners and freelancers",
            "Anyone who wants to create professional designs"
        ],
        careerOutcomes: [
            "Design logos, banners, and visiting cards",
            "Work in printing and design studios",
            "Take freelance design projects",
            "Create branding materials for businesses",
            "Build a career in graphic design"
        ],
        category: '🎨 Design & Creative Tools',
        duration: '1.5 Months',
        fees: '₹6,000',
        icon: Palette,
        color: 'from-lime-500 to-green-600',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'photoshop',
        title: 'Adobe Photoshop',
        titleHook: "Master Photo Editing with Photoshop 📸",
        tagline: "Edit images, create graphics, and design for digital and social media",
        overview: "Photoshop is widely used for photo editing and graphic design. In this course, you will learn image editing, retouching, effects, and creating designs for social media and digital platforms.\nIt is an important tool for designers, photographers, and content creators.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in photo editing and design",
            "Social media content creators",
            "Photography enthusiasts",
            "Anyone who wants to create digital designs"
        ],
        careerOutcomes: [
            "Edit and enhance photos professionally",
            "Create social media graphics",
            "Work as a graphic designer",
            "Take freelance editing and design projects",
            "Improve visual content quality"
        ],
        category: '🎨 Design & Creative Tools',
        duration: '1.5 Months',
        fees: '₹6,000',
        icon: Palette,
        color: 'from-blue-900 to-indigo-950',
        popular: false,
        hasInternship: false,
    },
    {
        id: 'video-editing',
        title: 'Video Editing',
        titleHook: "Learn Video Editing for Content Creation 🎬",
        tagline: "Edit videos for YouTube, Instagram, and professional projects",
        overview: "In this course, you will learn how to edit videos using modern tools. You will understand cutting, transitions, effects, audio editing, and video presentation.\nIt is useful for content creators, businesses, and media-related work.",
        highlightFeatures: DEFAULT_HIGHLIGHTS,
        benefits: DEFAULT_BENEFITS,
        whoShouldJoin: [
            "Students interested in content creation",
            "YouTubers and social media creators",
            "Marketing and media students",
            "Anyone who wants to learn video editing"
        ],
        careerOutcomes: [
            "Edit videos for YouTube and Instagram",
            "Work as a video editor",
            "Create reels and short videos",
            "Take freelance editing projects",
            "Improve content quality"
        ],
        category: '🎨 Design & Creative Tools',
        duration: '2 Months',
        fees: '₹10,000',
        icon: Video,
        color: 'from-fuchsia-500 to-pink-600',
        popular: false,
        hasInternship: false,
    }
];
