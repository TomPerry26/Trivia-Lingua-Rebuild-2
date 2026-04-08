export default function AboutPageSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does Trivia Lingua help you learn Spanish?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pure comprehensible input. No explicit grammar or translations."
        }
      },
      {
        "@type": "Question",
        "name": "Why use trivia quizzes to learn Spanish?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Short, interactive quizzes make reading feel like play instead of homework. Familiar topics (film, music, geography) provide context to guess meanings naturally, while tracking words/streaks keeps you motivated."
        }
      },
      {
        "@type": "Question",
        "name": "What Spanish levels (A1, A2, B1, B2) does Trivia Lingua cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "There are currently three levels: Superbeginner (~A1), Beginner (~A2), and Intermediate (~B1). Start with what feels comfortable! Remember each level is a spectrum: easier beginner quizzes, for example, would lean towards A1, harder ones towards B1. If a quiz feels too difficult, simply come back later—it's a great way to measure progress! Advanced (~B2) quizzes will be available in the future."
        }
      },
      {
        "@type": "Question",
        "name": "Will Trivia Lingua teach other languages besides Spanish?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! The initial focus is expanding Spanish content across the full spectrum (A1 to B2+), taking you from your first words to native-level material. In the future, other languages will be added under the Trivia Lingua brand."
        }
      },
      {
        "@type": "Question",
        "name": "How many Spanish quizzes are added daily?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can expect 3-5 new trivia quizzes every single day, including weekends, so you can practice your Spanish reading daily."
        }
      },
      {
        "@type": "Question",
        "name": "Can I request topics for quizzes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely—use the in-app feedback form to suggest topics. We'd love to hear your ideas!"
        }
      },
      {
        "@type": "Question",
        "name": "What's the best way to support Trivia Lingua?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The biggest way you can help right now is by spreading the word! Tell friends, family or classmates learning Spanish, share your progress or favourite quizzes on Reddit, Discord or social media, and recommend it in language learning communities. If you're really enjoying the daily quizzes and want to help add even more quizzes faster (new topics, levels and more), you can also buy me a coffee – entirely optional but hugely appreciated."
        }
      },
      {
        "@type": "Question",
        "name": "Is Trivia Lingua free or paid?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The core app and a large library of quizzes will always remain completely free and accessible to everyone. As the platform grows, I plan to add an optional premium subscription to help sustain daily updates and new features. Premium would unlock things like full access to the entire quiz library, more daily updates, and extra features. If you'd like to support faster growth now, you can buy me a coffee – entirely optional but hugely appreciated!"
        }
      },
      {
        "@type": "Question",
        "name": "How do I report bugs or suggest features?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The platform is currently in beta, so occasional bugs are possible. Please report them via the in-app Feedback button."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data safe?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We only collect what's needed: Google profile for login, quiz progress for stats. No ads, no selling data. See our Privacy Policy for details."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need a Google account to log in?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, at the moment Trivia Lingua uses 'Sign in with Google' for login. But don't worry — you do not need a Gmail address! Any email address linked to a Google Account works (for example, your YouTube, work, or personal non-Gmail email). If you already use Google services with that email, you're good to go."
        }
      },
      {
        "@type": "Question",
        "name": "Can I download Trivia Lingua as a mobile app?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes—it's a progressive web app (PWA). You can install it on both iOS and Android for a native-like experience. Instructions are available on your Profile page."
        }
      },
      {
        "@type": "Question",
        "name": "What's the long-term vision for Trivia Lingua?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "To become the go-to reading companion for immersion language learners worldwide—the 'Dreaming Spanish for reading.' Starting with Spanish, the roadmap includes superbeginner to advanced levels, then expansion to other languages (French, Italian, German and beyond). Ultimately: thousands of quizzes, millions of words, varied question formats, optional audio, deeper analytics, community challenges, leaderboards, and more. If this is helping your journey, your feedback—and support—will directly shape the future."
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
