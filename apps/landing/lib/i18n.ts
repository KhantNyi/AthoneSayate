/* Landing-page copy in both languages. English is the source/SSR default;
   Burmese is a review-friendly first pass — a native speaker should refine
   the phrasing, but the structure and keys are stable.

   Note: product mockups (phone/desktop screens) stay in English in both
   locales — they represent the app UI as shown, and are marked lang="en"
   so they keep the Latin typeface regardless of page language. */

export const LOCALES = ["en", "my"] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_STORAGE_KEY = "athonesayate-lang";

export interface Copy {
  openApp: string;
  heroBadge: string;
  heroTitle: { pre: string; hi: string; post: string };
  heroLede: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroFootnote: string;
  statement1: string;
  statement2: string;
  showcaseTitle: string;
  showcaseSub: string;
  labelDashboard: string;
  labelTransactions: string;
  labelReports: string;
  swipeHint: string;
  featuresTitle: string;
  featuresSub: string;
  features: { title: string; body: string }[];
  quickBadge: string;
  quickTitle: { pre: string; hi: string };
  quickLede: string;
  quickSteps: string[];
  remindBadge: string;
  remindTitle: string;
  remindBody: string;
  desktopBadge: string;
  desktopTitle: string;
  desktopBody: string;
  installTitle: string;
  installSub: string;
  platforms: { label: string; note: string; steps: string[] }[];
  ctaTagline: string;
  ctaBody: string;
  ctaButton: string;
  footerOpen: string;
}

const en: Copy = {
  openApp: "Open app",
  heroBadge: "Free · Installable PWA · Phone & desktop",
  heroTitle: { pre: "Know where ", hi: "every baht", post: " goes." },
  heroLede:
    "Athonesayate is a fast, personal expense tracker. Log a purchase in seconds, see your budgets and trends at a glance, and get a nudge before bills are due — all in an app that lives on your home screen and works offline.",
  heroCtaPrimary: "Open the app",
  heroCtaSecondary: "Install on your phone",
  heroFootnote: "Nothing to download from an app store — it runs right in your browser.",
  statement1:
    "Most spending is invisible. A coffee here, a ride there — gone. Athonesayate turns it back into something you can see, and change.",
  statement2:
    "Feels native. Installs in a tap. Works offline. On your phone and your desktop — no app store between you and your money.",
  showcaseTitle: "One glance, full picture.",
  showcaseSub:
    "Dashboard, transactions, reports — every screen answers a question you actually have.",
  labelDashboard: "Dashboard",
  labelTransactions: "Transactions",
  labelReports: "Reports",
  swipeHint: "Swipe to see more screens →",
  featuresTitle: "Everything a money diary should be",
  featuresSub:
    "Built for people who actually track their spending every day — so every tap is fast, legible, and a little bit satisfying.",
  features: [
    {
      title: "Log spending in seconds",
      body: "A quick-add sheet that opens from anywhere — amount, category, done. No forms standing between you and getting on with your day."
    },
    {
      title: "See where money goes",
      body: "Spending pace, category mix, month-over-month trends — live charts that answer the question before you finish asking it."
    },
    {
      title: "Budgets & goals",
      body: "Set monthly budgets per category and savings goals, then watch the progress bars keep you honest."
    },
    {
      title: "Bill reminders",
      body: "Recurring rent, subscriptions, utilities — get a push notification before the due date, not a late fee after it."
    },
    {
      title: "Works offline",
      body: "It's a PWA: install it on your home screen and log expenses on the train, in a basement, anywhere. It syncs when you're back."
    },
    {
      title: "Light & dark, liquid glass",
      body: "An iOS-inspired glass interface that follows your system theme — flip the toggle above to see for yourself."
    }
  ],
  quickBadge: "Quick add",
  quickTitle: { pre: "Three taps.", hi: "Logged." },
  quickLede:
    "Keep scrolling — that's the whole flow. Amount, category, save. The sheet is already gone before your coffee arrives.",
  quickSteps: ["Type the amount", "Pick a category", "Save — synced and charted"],
  remindBadge: "Push notifications",
  remindTitle: "Never pay late again.",
  remindBody:
    "Set up rent, subscriptions, and utilities once. Athonesayate watches the calendar and taps you on the shoulder before the due date — right on your lock screen, even when the app is closed.",
  desktopBadge: "Desktop ready",
  desktopTitle: "Big screen, bigger picture.",
  desktopBody:
    "The same app scales up. Open Athonesayate in a browser tab — or install it as a desktop app — and the dashboard spreads out: four-up metrics, wide charts, and your whole month on one screen.",
  installTitle: "Install it anywhere",
  installSub:
    "Athonesayate installs like a native app — full screen, its own icon, push notifications — on your phone and your computer, without an app store in the way.",
  platforms: [
    {
      label: "iPhone & iPad",
      note: "Safari",
      steps: ["Open the app in Safari", "Tap the Share button", "Choose “Add to Home Screen”"]
    },
    {
      label: "Android",
      note: "Chrome",
      steps: [
        "Open the app in Chrome",
        "Tap the ⋮ menu",
        "Choose “Add to Home screen” / “Install app”"
      ]
    },
    {
      label: "Desktop",
      note: "Chrome · Edge",
      steps: [
        "Open the app in Chrome or Edge",
        "Click the install icon in the address bar",
        "Launch it from your dock or taskbar"
      ]
    }
  ],
  ctaTagline: "Know where every baht goes.",
  ctaBody: "Your first expense takes ten seconds to log. The habit pays for itself.",
  ctaButton: "Start tracking",
  footerOpen: "Open the app →"
};

const my: Copy = {
  openApp: "အက်ပ်ဖွင့်ရန်",
  heroBadge: "အခမဲ့ · တင်သွင်းနိုင် · ဖုန်း & ကွန်ပျူတာ",
  heroTitle: { pre: "", hi: "ငွေတစ်ပြားစီ", post: " ဘယ်ရောက်လဲ သိလိုက်ပါ။" },
  heroLede:
    "Athonesayate သည် မြန်ဆန်သော ကိုယ်ပိုင်အသုံးစရိတ် မှတ်တမ်းတင်စနစ်ဖြစ်သည်။ အသုံးစရိတ်ကို စက္ကန့်ပိုင်းအတွင်း မှတ်တမ်းတင်ပါ၊ ဘတ်ဂျက်နှင့် အသုံးစွဲမှုလားရာကို တစ်ချက်တည်းဖြင့် မြင်ပါ၊ ဘီလ်များ မကျရောက်မီ သတိပေးချက်ရယူပါ — ဖုန်းမျက်နှာပြင်ပေါ်တွင် တင်ထားနိုင်ပြီး အင်တာနက်မရှိလည်း အလုပ်လုပ်သည့် အက်ပ်တစ်ခုတည်းဖြင့်။",
  heroCtaPrimary: "အက်ပ်ဖွင့်ပါ",
  heroCtaSecondary: "ဖုန်းတွင် တင်သွင်းပါ",
  heroFootnote: "App store မှ ဒေါင်းလုဒ်လုပ်စရာမလို — သင့်ဘရောက်ဇာတွင် တိုက်ရိုက်အလုပ်လုပ်သည်။",
  statement1:
    "အသုံးစရိတ်အများစုက မမြင်ရဘူး။ ဒီမှာ ကော်ဖီတစ်ခွက်၊ ဟိုမှာ ကားခတစ်ခေါက် — ပျောက်သွားပြီ။ Athonesayate က ၎င်းကို ပြန်မြင်နိုင်ပြီး ပြောင်းလဲနိုင်အောင် လုပ်ပေးတယ်။",
  statement2:
    "မူရင်းအက်ပ်လို ခံစားရတယ်။ တစ်ချက်နှိပ်ရုံနဲ့ တင်သွင်းပြီ။ အင်တာနက်မရှိလည်း အလုပ်လုပ်တယ်။ ဖုန်းရော ကွန်ပျူတာမှာပါ — သင်နဲ့ သင့်ငွေကြားမှာ app store မလိုတော့ဘူး။",
  showcaseTitle: "တစ်ချက်ကြည့်ရုံနဲ့ အပြည့်အစုံ။",
  showcaseSub:
    "ဒက်ရှ်ဘုတ်၊ ငွေစာရင်း၊ အစီရင်ခံစာ — မျက်နှာပြင်တိုင်းက သင်တကယ်သိချင်တဲ့ မေးခွန်းကို ဖြေပေးတယ်။",
  labelDashboard: "ဒက်ရှ်ဘုတ်",
  labelTransactions: "ငွေစာရင်း",
  labelReports: "အစီရင်ခံစာ",
  swipeHint: "နောက်ထပ်မျက်နှာပြင်များ ကြည့်ရန် ပွတ်ဆွဲပါ →",
  featuresTitle: "ငွေစာရင်းမှတ်တမ်းတစ်ခု ဖြစ်သင့်တာအားလုံး",
  featuresSub:
    "နေ့စဉ်အသုံးစရိတ်ကို တကယ်မှတ်တမ်းတင်သူများအတွက် တည်ဆောက်ထားတာမို့ — နှိပ်တိုင်း မြန်ဆန်၊ ဖတ်ရလွယ်ကူပြီး စိတ်ကျေနပ်စရာ ကောင်းတယ်။",
  features: [
    {
      title: "စက္ကန့်ပိုင်းအတွင်း မှတ်တမ်းတင်ပါ",
      body: "မည်သည့်နေရာကမဆို ဖွင့်နိုင်တဲ့ quick-add — ပမာဏ၊ အမျိုးအစား၊ ပြီးပြီ။ သင့်နေ့စဉ်လုပ်ငန်းနဲ့ ကြားမှာ ပုံစံဖြည့်စရာ မလိုတော့ဘူး။"
    },
    {
      title: "ငွေဘယ်ရောက်လဲ မြင်ပါ",
      body: "အသုံးစွဲနှုန်း၊ အမျိုးအစားခွဲဝေမှု၊ လစဉ်လားရာ — မေးခွန်းမေးပြီး မကြာမီ ဖြေပေးတဲ့ တိုက်ရိုက်ဇယားများ။"
    },
    {
      title: "ဘတ်ဂျက်နှင့် ရည်မှန်းချက်",
      body: "အမျိုးအစားအလိုက် လစဉ်ဘတ်ဂျက်နဲ့ ငွေစုရည်မှန်းချက်တွေ သတ်မှတ်ပြီး တိုးတက်မှုဘားတွေက သင့်ကို လမ်းမှန်ပေါ်ထားပေးတယ်။"
    },
    {
      title: "ဘီလ် သတိပေးချက်",
      body: "အိမ်လခ၊ subscription၊ မီတာခ — နောက်ကျကြေးမကျခင် ကြိုတင်ပြီး push notification ရမယ်။"
    },
    {
      title: "အင်တာနက်မရှိလည်း အလုပ်လုပ်",
      body: "ဒါဟာ PWA တစ်ခုပါ — ဖုန်းမျက်နှာပြင်မှာ တင်ထားပြီး ရထားပေါ်၊ မြေအောက်ခန်း၊ ဘယ်နေရာမဆို မှတ်တမ်းတင်ပါ။ ပြန်ချိတ်ဆက်တဲ့အခါ sync ဖြစ်သွားမယ်။"
    },
    {
      title: "အလင်း & အမှောင်၊ liquid glass",
      body: "သင့်စနစ်၏ theme ကို လိုက်နာတဲ့ iOS-စတိုင် glass interface — အပေါ်က ခလုတ်ကို နှိပ်ကြည့်လိုက်ပါ။"
    }
  ],
  quickBadge: "အမြန်ထည့်",
  quickTitle: { pre: "သုံးချက်နှိပ်။", hi: "ပြီးပြီ။" },
  quickLede:
    "ဆက်ဆွဲကြည့်ပါ — ဒါက လုပ်ငန်းစဉ်တစ်ခုလုံးပဲ။ ပမာဏ၊ အမျိုးအစား၊ သိမ်း။ သင့်ကော်ဖီမရောက်ခင် sheet ပျောက်သွားပြီ။",
  quickSteps: ["ပမာဏ ရိုက်ထည့်ပါ", "အမျိုးအစား ရွေးပါ", "သိမ်းပါ — sync နဲ့ ဇယားထဲ ရောက်သွားမယ်"],
  remindBadge: "Push notification",
  remindTitle: "နောက်ကျမှ မပေးဖြစ်တော့ဘူး။",
  remindBody:
    "အိမ်လခ၊ subscription နဲ့ မီတာခတွေ တစ်ကြိမ်သတ်မှတ်လိုက်ပါ။ Athonesayate က ပြက္ခဒိန်ကို စောင့်ကြည့်ပြီး ကျရောက်ရက်မတိုင်ခင် သင့်ကို သတိပေးမယ် — အက်ပ်ပိတ်ထားရင်တောင် lock screen ပေါ်မှာ။",
  desktopBadge: "ကွန်ပျူတာအတွက်",
  desktopTitle: "မျက်နှာပြင်ကြီး၊ ပုံရိပ်ပိုကြီး။",
  desktopBody:
    "အက်ပ်တူတူပဲ ချဲ့သွားတယ်။ Athonesayate ကို browser tab မှာဖွင့် — ဒါမှမဟုတ် ကွန်ပျူတာအက်ပ်အဖြစ် တင်သွင်း — ရင် ဒက်ရှ်ဘုတ်က ကျယ်ပြန့်သွားမယ်— metric လေးခု၊ ဇယားကျယ်များနဲ့ တစ်လလုံးကို မျက်နှာပြင်တစ်ခုတည်းမှာ။",
  installTitle: "ဘယ်နေရာမဆို တင်သွင်းပါ",
  installSub:
    "Athonesayate က မူရင်းအက်ပ်လို တင်သွင်းလို့ရတယ် — မျက်နှာပြင်အပြည့်၊ ကိုယ်ပိုင် icon၊ push notification — ဖုန်းရော ကွန်ပျူတာမှာပါ၊ app store မလိုဘဲ။",
  platforms: [
    {
      label: "iPhone & iPad",
      note: "Safari",
      steps: [
        "Safari မှာ အက်ပ်ဖွင့်ပါ",
        "Share ခလုတ်ကို နှိပ်ပါ",
        "“Add to Home Screen” ကို ရွေးပါ"
      ]
    },
    {
      label: "Android",
      note: "Chrome",
      steps: [
        "Chrome မှာ အက်ပ်ဖွင့်ပါ",
        "⋮ မီနူးကို နှိပ်ပါ",
        "“Add to Home screen / Install app” ကို ရွေးပါ"
      ]
    },
    {
      label: "ကွန်ပျူတာ",
      note: "Chrome · Edge",
      steps: [
        "Chrome သို့မဟုတ် Edge မှာ ဖွင့်ပါ",
        "လိပ်စာဘားက install icon ကို နှိပ်ပါ",
        "Dock သို့မဟုတ် taskbar မှ ဖွင့်ပါ"
      ]
    }
  ],
  ctaTagline: "ငွေတစ်ပြားစီ ဘယ်ရောက်လဲ သိလိုက်ပါ။",
  ctaBody:
    "ပထမဆုံးအသုံးစရိတ်ကို မှတ်တမ်းတင်ဖို့ ဆယ်စက္ကန့်ပဲ ကြာတယ်။ အဲဒီအလေ့အထက အဖိုးထိုက်တန်ပါတယ်။",
  ctaButton: "စတင်မှတ်တမ်းတင်ပါ",
  footerOpen: "အက်ပ်ဖွင့်ရန် →"
};

export const dictionary: Record<Locale, Copy> = { en, my };
