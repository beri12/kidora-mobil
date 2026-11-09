/**
 * English source strings. Every other language must have exactly these keys
 * (the `Dictionary` type enforces it at compile time). `{name}` placeholders
 * are filled by t(key, { name }).
 *
 * Messages that come from the API (error text, course titles) are not here:
 * the server sends them in English today.
 */
export const en = {
  tabs: {
    home: 'Home',
    islands: 'Islands',
    games: 'Games',
    kai: 'Kai',
    me: 'Me',
    family: 'Family',
    activity: 'Activity',
    classes: 'Classes',
    library: 'Library',
  },
  signIn: {
    title: 'Welcome back to Kidora',
    subtitle: 'Log in to keep learning.',
    email: 'Email',
    password: 'Password',
    mfaCode: 'Authenticator code',
    mfaPrompt: 'Enter the 6-digit code from your authenticator app.',
    forgot: 'Forgot password?',
    submit: 'Log in',
    phone: 'Log in with a phone code',
    newHere: 'New to Kidora? ',
    createAccount: 'Create an account',
    failed: 'Sign-in failed.',
  },
  social: {
    or: 'or continue with',
    google: 'Continue with Google',
    facebook: 'Continue with Facebook',
    failed: 'Sign-in failed. Please try again.',
  },
  settings: {
    title: 'Settings',
    feel: 'Feel',
    sounds: 'Sounds',
    soundsHint: 'Cheers and clicks in games',
    vibration: 'Vibration',
    vibrationHint: 'A little buzz for right and wrong answers',
    calm: 'Calm motion',
    calmHint: 'Fewer animations and no confetti',
    dailyGoal: 'Daily goal',
    minutes: '{n} min',
    language: 'Language',
    languageSystem: 'Phone setting',
    account: 'Account',
    privacy: 'Privacy policy',
    terms: 'Terms',
    logout: 'Log out',
    logoutTitle: 'Log out?',
    logoutBody: 'Lessons saved on this phone for offline use will be removed.',
    cancel: 'Cancel',
  },
  join: {
    title: 'Join with a code',
    hint: 'Type the course code your teacher gave you, like CPP-7K4M9X.',
    label: 'Course code',
    submit: 'Join course',
    badFormat: 'A course code looks like CPP-7K4M9X.',
    joined: "You're in: {title}",
    already: "You're already in {title}.",
    open: 'Open course',
    entry: 'Have a code from your teacher?',
  },
  browse: {
    title: 'Find a course',
    search: 'Search',
    placeholder: 'Fractions, reading, space…',
    empty: 'No courses found',
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof en>;
