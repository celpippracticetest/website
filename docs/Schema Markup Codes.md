`Schema Markup Codes`

# **GLOBAL SCHEMA 1 — Organization**

**Placement:** Load on every page.

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "Organization",  
  "@id": "https://celpippracticetest.com/\#organization",  
  "name": "CELPIPPRACTICETEST.com",  
  "alternateName": "CELPIP Practice Test",  
  "url": "https://celpippracticetest.com/",  
  "description": "Independent third-party platform providing digital CELPIP practice tests, skill-based exercises, mock exams, and AI-assisted feedback for English language exam preparation.",  
  "email": "support@celpippracticetest.com",  
  "contactPoint": {  
    "@type": "ContactPoint",  
    "contactType": "customer support",  
    "email": "support@celpippracticetest.com",  
    "url": "https://celpippracticetest.com/contact-us",  
    "availableLanguage": "English"  
  }  
}  
\</script\>

# **GLOBAL SCHEMA 2 — WebSite**

**Placement:** Load on every page.

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "WebSite",  
  "@id": "https://celpippracticetest.com/\#website",  
  "url": "https://celpippracticetest.com/",  
  "name": "CELPIPPRACTICETEST.com",  
  "alternateName": "CELPIP Practice Test",  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "inLanguage": "en"  
}  
\</script\>  
---

# **HOMEPAGE**

**URL:** `https://celpippracticetest.com/`

The homepage therefore has:

1. Organization  
2. WebSite  
3. WebPage  
4. ItemList

The first two are the global schemas above.

## **Homepage Schema 3 — WebPage**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "WebPage",  
  "@id": "https://celpippracticetest.com/\#webpage",  
  "url": "https://celpippracticetest.com/",  
  "name": "CELPIP Practice Test Online",  
  "description": "Online CELPIP preparation platform offering mock exams, skill-based practice, study guides, and AI-powered scoring and feedback.",  
  "isPartOf": {  
    "@id": "https://celpippracticetest.com/\#website"  
  },  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "about": {  
    "@type": "Thing",  
    "name": "CELPIP test preparation"  
  },  
  "mainEntity": {  
    "@id": "https://celpippracticetest.com/\#practice-sections"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Homepage Schema 4 — ItemList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "ItemList",  
  "@id": "https://celpippracticetest.com/\#practice-sections",  
  "name": "CELPIP Practice and Learning Sections",  
  "numberOfItems": 7,  
  "itemListOrder": "https://schema.org/ItemListOrderAscending",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Listening Practice",  
        "url": "https://celpippracticetest.com/listening"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Speaking Practice",  
        "url": "https://celpippracticetest.com/speaking"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 3,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Writing Practice",  
        "url": "https://celpippracticetest.com/writing"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 4,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Reading Practice",  
        "url": "https://celpippracticetest.com/reading"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 5,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Mock Exams",  
        "url": "https://celpippracticetest.com/exam-overview"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 6,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Learning",  
        "url": "https://celpippracticetest.com/learning"  
      }  
    },  
    {  
      "@type": "ListItem",  
      "position": 7,  
      "item": {  
        "@type": "LearningResource",  
        "name": "CELPIP Vocabulary Tracker",  
        "url": "https://celpippracticetest.com/words"  
      }  
    }  
  \]  
}  
\</script\>  
---

# **SPEAKING PAGE**

**URL:** `https://celpippracticetest.com/speaking`

In addition to the two global schemas, this page requires four page-specific schemas.

## **Speaking Schema 1 — CollectionPage**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "CollectionPage",  
  "@id": "https://celpippracticetest.com/speaking\#webpage",  
  "url": "https://celpippracticetest.com/speaking",  
  "name": "CELPIP Speaking Practice",  
  "description": "CELPIP speaking practice covering all eight speaking task types, with test-format guidance, score-improvement tips, and practice material.",  
  "isPartOf": {  
    "@id": "https://celpippracticetest.com/\#website"  
  },  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "about": {  
    "@type": "Thing",  
    "name": "CELPIP Speaking"  
  },  
  "mainEntity": {  
    "@id": "https://celpippracticetest.com/speaking\#learning-resource"  
  },  
  "breadcrumb": {  
    "@id": "https://celpippracticetest.com/speaking\#breadcrumb"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Speaking Schema 2 — LearningResource**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "LearningResource",  
  "@id": "https://celpippracticetest.com/speaking\#learning-resource",  
  "url": "https://celpippracticetest.com/speaking",  
  "name": "CELPIP Speaking Practice",  
  "description": "CELPIP speaking practice covering all eight speaking task types, with test-format guidance, score-improvement tips, and practice material.",  
  "learningResourceType": \[  
    "Practice Test",  
    "Exam Preparation"  
  \],  
  "educationalUse": \[  
    "Practice",  
    "Exam Preparation"  
  \],  
  "teaches": \[  
    "English speaking fluency",  
    "Pronunciation",  
    "Vocabulary",  
    "Organizing spoken responses",  
    "Responding to everyday speaking scenarios"  
  \],  
  "assesses": \[  
    "English speaking ability",  
    "Fluency",  
    "Pronunciation",  
    "Vocabulary",  
    "Response organization"  
  \],  
  "audience": {  
    "@type": "EducationalAudience",  
    "audienceType": "CELPIP test candidates"  
  },  
  "provider": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "hasPart": {  
    "@id": "https://celpippracticetest.com/speaking\#task-list"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Speaking Schema 3 — ItemList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "ItemList",  
  "@id": "https://celpippracticetest.com/speaking\#task-list",  
  "name": "CELPIP Speaking Practice Tasks",  
  "numberOfItems": 8,  
  "itemListOrder": "https://schema.org/ItemListOrderAscending",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Task 1: Giving Advice",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f454ba16846d97ecbde9f0"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Task 2: Talking About Personal Experience",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f454d316846d97ecbde9f1"  
    },  
    {  
      "@type": "ListItem",  
      "position": 3,  
      "name": "Task 3: Describing a Scene",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f454ef16846d97ecbde9f2"  
    },  
    {  
      "@type": "ListItem",  
      "position": 4,  
      "name": "Task 4: Making Predictions",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f4550216846d97ecbde9f3"  
    },  
    {  
      "@type": "ListItem",  
      "position": 5,  
      "name": "Task 5: Comparing and Persuading",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f4551416846d97ecbde9f4"  
    },  
    {  
      "@type": "ListItem",  
      "position": 6,  
      "name": "Task 6: Dealing With a Difficult Situation",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f4552d16846d97ecbde9f5"  
    },  
    {  
      "@type": "ListItem",  
      "position": 7,  
      "name": "Task 7: Expressing Opinions",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f4553d16846d97ecbde9f6"  
    },  
    {  
      "@type": "ListItem",  
      "position": 8,  
      "name": "Task 8: Describing an Unusual Situation",  
      "url": "https://celpippracticetest.com/speaking?taskId=67f4555616846d97ecbde9f7"  
    }  
  \]  
}  
\</script\>

## **Speaking Schema 4 — BreadcrumbList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "BreadcrumbList",  
  "@id": "https://celpippracticetest.com/speaking\#breadcrumb",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Home",  
      "item": "https://celpippracticetest.com/"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Speaking Practice",  
      "item": "https://celpippracticetest.com/speaking"  
    }  
  \]  
}  
\</script\>  
---

# **WRITING PAGE**

**URL:** `https://celpippracticetest.com/writing`

## **Writing Schema 1 — CollectionPage**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "CollectionPage",  
  "@id": "https://celpippracticetest.com/writing\#webpage",  
  "url": "https://celpippracticetest.com/writing",  
  "name": "CELPIP Writing Practice",  
  "description": "CELPIP writing practice covering Writing an Email and Survey Questions, with test-format guidance, timing advice, score-improvement tips, and practice exercises.",  
  "isPartOf": {  
    "@id": "https://celpippracticetest.com/\#website"  
  },  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "about": {  
    "@type": "Thing",  
    "name": "CELPIP Writing"  
  },  
  "mainEntity": {  
    "@id": "https://celpippracticetest.com/writing\#learning-resource"  
  },  
  "breadcrumb": {  
    "@id": "https://celpippracticetest.com/writing\#breadcrumb"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Writing Schema 2 — LearningResource**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "LearningResource",  
  "@id": "https://celpippracticetest.com/writing\#learning-resource",  
  "url": "https://celpippracticetest.com/writing",  
  "name": "CELPIP Writing Practice",  
  "description": "CELPIP writing practice covering Writing an Email and Survey Questions, with test-format guidance, timing advice, score-improvement tips, and practice exercises.",  
  "learningResourceType": \[  
    "Practice Test",  
    "Exam Preparation"  
  \],  
  "educationalUse": \[  
    "Practice",  
    "Exam Preparation"  
  \],  
  "teaches": \[  
    "English writing",  
    "Email writing",  
    "Responding to survey questions",  
    "Organizing written responses",  
    "Grammar and punctuation",  
    "Writing under timed conditions"  
  \],  
  "assesses": \[  
    "Written English communication",  
    "Response organization",  
    "Grammar",  
    "Spelling",  
    "Vocabulary"  
  \],  
  "audience": {  
    "@type": "EducationalAudience",  
    "audienceType": "CELPIP test candidates"  
  },  
  "provider": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "hasPart": {  
    "@id": "https://celpippracticetest.com/writing\#task-list"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Writing Schema 3 — ItemList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "ItemList",  
  "@id": "https://celpippracticetest.com/writing\#task-list",  
  "name": "CELPIP Writing Practice Tasks",  
  "numberOfItems": 2,  
  "itemListOrder": "https://schema.org/ItemListOrderAscending",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Task 1: Writing an Email",  
      "url": "https://celpippracticetest.com/writing?taskId=67f203dfa44a7cf5683b80cd"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Task 2: Survey Questions",  
      "url": "https://celpippracticetest.com/writing?taskId=67f203eda44a7cf5683b80ce"  
    }  
  \]  
}  
\</script\>

## **Writing Schema 4 — BreadcrumbList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "BreadcrumbList",  
  "@id": "https://celpippracticetest.com/writing\#breadcrumb",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Home",  
      "item": "https://celpippracticetest.com/"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Writing Practice",  
      "item": "https://celpippracticetest.com/writing"  
    }  
  \]  
}  
\</script\>  
---

# **READING PAGE**

**URL:** `https://celpippracticetest.com/reading`

## **Reading Schema 1 — CollectionPage**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "CollectionPage",  
  "@id": "https://celpippracticetest.com/reading\#webpage",  
  "url": "https://celpippracticetest.com/reading",  
  "name": "CELPIP Reading Practice",  
  "description": "CELPIP reading practice covering Correspondence, Apply a Diagram, Information, and Viewpoints, with test-format guidance, reading strategies, and practice exercises.",  
  "isPartOf": {  
    "@id": "https://celpippracticetest.com/\#website"  
  },  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "about": {  
    "@type": "Thing",  
    "name": "CELPIP Reading"  
  },  
  "mainEntity": {  
    "@id": "https://celpippracticetest.com/reading\#learning-resource"  
  },  
  "breadcrumb": {  
    "@id": "https://celpippracticetest.com/reading\#breadcrumb"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Reading Schema 2 — LearningResource**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "LearningResource",  
  "@id": "https://celpippracticetest.com/reading\#learning-resource",  
  "url": "https://celpippracticetest.com/reading",  
  "name": "CELPIP Reading Practice",  
  "description": "CELPIP reading practice covering Correspondence, Apply a Diagram, Information, and Viewpoints, with test-format guidance, reading strategies, and practice exercises.",  
  "learningResourceType": \[  
    "Practice Test",  
    "Exam Preparation"  
  \],  
  "educationalUse": \[  
    "Practice",  
    "Exam Preparation"  
  \],  
  "teaches": \[  
    "English reading comprehension",  
    "Skimming",  
    "Scanning",  
    "Understanding correspondence",  
    "Interpreting diagrams",  
    "Extracting information from texts",  
    "Understanding viewpoints",  
    "Vocabulary development"  
  \],  
  "assesses": \[  
    "English reading comprehension",  
    "Information retrieval",  
    "Understanding written correspondence",  
    "Interpreting written information",  
    "Understanding arguments and viewpoints"  
  \],  
  "audience": {  
    "@type": "EducationalAudience",  
    "audienceType": "CELPIP test candidates"  
  },  
  "provider": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "hasPart": {  
    "@id": "https://celpippracticetest.com/reading\#task-list"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Reading Schema 3 — ItemList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "ItemList",  
  "@id": "https://celpippracticetest.com/reading\#task-list",  
  "name": "CELPIP Reading Practice Tasks",  
  "numberOfItems": 4,  
  "itemListOrder": "https://schema.org/ItemListOrderAscending",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Task 1: Correspondence",  
      "url": "https://celpippracticetest.com/reading?taskId=67f168022f0ca7f9a751ed3a"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Task 2: Apply a Diagram",  
      "url": "https://celpippracticetest.com/reading?taskId=67f1680b2f0ca7f9a751ed3b"  
    },  
    {  
      "@type": "ListItem",  
      "position": 3,  
      "name": "Task 3: Information",  
      "url": "https://celpippracticetest.com/reading?taskId=67f168182f0ca7f9a751ed3c"  
    },  
    {  
      "@type": "ListItem",  
      "position": 4,  
      "name": "Task 4: Viewpoints",  
      "url": "https://celpippracticetest.com/reading?taskId=67f168222f0ca7f9a751ed3d"  
    }  
  \]  
}  
\</script\>

## **Reading Schema 4 — BreadcrumbList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "BreadcrumbList",  
  "@id": "https://celpippracticetest.com/reading\#breadcrumb",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Home",  
      "item": "https://celpippracticetest.com/"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Reading Practice",  
      "item": "https://celpippracticetest.com/reading"  
    }  
  \]  
}  
\</script\>

You're right — the **Listening page was missing**. The live page contains six listening task types: Problem Solving, A Daily Life Conversation, Information, News Item, Discussion, and Viewpoints. ([CELPIP Practice Test](https://celpippracticetest.com/listening))

For this page, the developer should output **6 schema blocks total**:

1. `Organization` — global  
2. `WebSite` — global  
3. `CollectionPage`  
4. `LearningResource`  
5. `ItemList`  
6. `BreadcrumbList`

# **Listening Page**

**URL:** `https://celpippracticetest.com/listening`

## **Schema 1 — Organization**

**Global — load on all pages**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "Organization",  
  "@id": "https://celpippracticetest.com/\#organization",  
  "name": "CELPIPPRACTICETEST.com",  
  "alternateName": "CELPIP Practice Test",  
  "url": "https://celpippracticetest.com/",  
  "description": "Independent third-party platform providing digital CELPIP practice tests, skill-based exercises, mock exams, and AI-assisted feedback for English language exam preparation.",  
  "email": "support@celpippracticetest.com",  
  "contactPoint": {  
    "@type": "ContactPoint",  
    "contactType": "customer support",  
    "email": "support@celpippracticetest.com",  
    "url": "https://celpippracticetest.com/contact-us",  
    "availableLanguage": "English"  
  }  
}  
\</script\>

## **Schema 2 — WebSite**

**Global — load on all pages**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "WebSite",  
  "@id": "https://celpippracticetest.com/\#website",  
  "url": "https://celpippracticetest.com/",  
  "name": "CELPIPPRACTICETEST.com",  
  "alternateName": "CELPIP Practice Test",  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Schema 3 — CollectionPage**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "CollectionPage",  
  "@id": "https://celpippracticetest.com/listening\#webpage",  
  "url": "https://celpippracticetest.com/listening",  
  "name": "CELPIP Listening Practice",  
  "description": "CELPIP listening practice covering six listening task types, with test-format guidance, listening strategies, and practice exercises.",  
  "isPartOf": {  
    "@id": "https://celpippracticetest.com/\#website"  
  },  
  "publisher": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "about": {  
    "@type": "Thing",  
    "name": "CELPIP Listening"  
  },  
  "mainEntity": {  
    "@id": "https://celpippracticetest.com/listening\#learning-resource"  
  },  
  "breadcrumb": {  
    "@id": "https://celpippracticetest.com/listening\#breadcrumb"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Schema 4 — LearningResource**

The live page provides listening practice, note-taking guidance, timing advice, error review, identifying key details, distractors, transitions, speaker intent, and paraphrased information. ([CELPIP Practice Test](https://celpippracticetest.com/listening))

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "LearningResource",  
  "@id": "https://celpippracticetest.com/listening\#learning-resource",  
  "url": "https://celpippracticetest.com/listening",  
  "name": "CELPIP Listening Practice",  
  "description": "CELPIP listening practice covering six listening task types, with test-format guidance, listening strategies, and practice exercises.",  
  "learningResourceType": \[  
    "Practice Test",  
    "Exam Preparation"  
  \],  
  "educationalUse": \[  
    "Practice",  
    "Exam Preparation"  
  \],  
  "teaches": \[  
    "English listening comprehension",  
    "Listening for key details",  
    "Note-taking while listening",  
    "Understanding paraphrased information",  
    "Identifying speaker intent",  
    "Recognizing transitions and distractors",  
    "Listening under timed conditions"  
  \],  
  "assesses": \[  
    "English listening comprehension",  
    "Understanding everyday conversations",  
    "Understanding spoken information",  
    "Understanding news items",  
    "Understanding discussions",  
    "Understanding viewpoints"  
  \],  
  "audience": {  
    "@type": "EducationalAudience",  
    "audienceType": "CELPIP test candidates"  
  },  
  "provider": {  
    "@id": "https://celpippracticetest.com/\#organization"  
  },  
  "hasPart": {  
    "@id": "https://celpippracticetest.com/listening\#task-list"  
  },  
  "inLanguage": "en"  
}  
\</script\>

## **Schema 5 — ItemList**

These six task URLs are the actual task destinations currently linked from the Listening page. ([CELPIP Practice Test](https://celpippracticetest.com/listening))

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "ItemList",  
  "@id": "https://celpippracticetest.com/listening\#task-list",  
  "name": "CELPIP Listening Practice Tasks",  
  "numberOfItems": 6,  
  "itemListOrder": "https://schema.org/ItemListOrderAscending",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Task 1: Problem Solving",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebefda187829d27daac3c4"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Task 2: A Daily Life Conversation",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebefe2187829d27daac3c5"  
    },  
    {  
      "@type": "ListItem",  
      "position": 3,  
      "name": "Task 3: Information",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebefe7187829d27daac3c6"  
    },  
    {  
      "@type": "ListItem",  
      "position": 4,  
      "name": "Task 4: News Item",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebefec187829d27daac3c7"  
    },  
    {  
      "@type": "ListItem",  
      "position": 5,  
      "name": "Task 5: Discussion",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebeffe187829d27daac3c8"  
    },  
    {  
      "@type": "ListItem",  
      "position": 6,  
      "name": "Task 6: Viewpoints",  
      "url": "https://celpippracticetest.com/listening?taskId=67ebf003187829d27daac3c9"  
    }  
  \]  
}  
\</script\>

## **Schema 6 — BreadcrumbList**

\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "BreadcrumbList",  
  "@id": "https://celpippracticetest.com/listening\#breadcrumb",  
  "itemListElement": \[  
    {  
      "@type": "ListItem",  
      "position": 1,  
      "name": "Home",  
      "item": "https://celpippracticetest.com/"  
    },  
    {  
      "@type": "ListItem",  
      "position": 2,  
      "name": "Listening Practice",  
      "item": "https://celpippracticetest.com/listening"  
    }  
  \]  
}  
\</script\>

### **Developer implementation**

For the coded implementation, the **task name, task URL, position, and `numberOfItems` should come from the same data source used to render the six task cards**, so the schema updates automatically if the Listening exercises change.

## **Developer implementation structure**

This is the structure I would give the developer:

GLOBAL — LOAD ON ALL PAGES  
1\. Organization  
2\. WebSite

HOME  
3\. WebPage  
4\. ItemList

/SPEAKING  
3\. CollectionPage  
4\. LearningResource  
5\. ItemList  
6\. BreadcrumbList

/WRITING  
3\. CollectionPage  
4\. LearningResource  
5\. ItemList  
6\. BreadcrumbList

/READING  
3\. CollectionPage  
4\. LearningResource  
5\. ItemList  
6\. BreadcrumbList  
/listening

/LISTENING  
1\. Organization       \[Global\]  
2\. WebSite            \[Global\]  
3\. CollectionPage     \[Page-specific\]  
4\. LearningResource   \[Page-specific\]  
5\. ItemList           \[Page-specific\]  
6\. BreadcrumbList     \[Page-specific\]