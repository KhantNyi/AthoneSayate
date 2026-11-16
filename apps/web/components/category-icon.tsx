import {
  Baby,
  Banknote,
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Ticket,
  TrendingUp,
  Utensils,
  Wrench,
  type LucideIcon
} from "lucide-react";

/** Icon keys stored on a category (`categories.icon`). */
const ICONS_BY_KEY: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  home: House,
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  ticket: Ticket,
  "piggy-bank": PiggyBank
};

/**
 * Categories people create themselves are stored with a generic key ("tag" or
 * the column default "circle"), so the icon is read off the name instead.
 * First match wins: keep the more specific patterns above the broader ones.
 */
const ICONS_BY_NAME: [RegExp, LucideIcon][] = [
  [/grocer|supermarket|market\b|ဈေး/, ShoppingCart],
  [/coffee|cafe|café|tea\b|ကော်ဖီ|လက်ဖက်ရည်/, Coffee],
  [/food|dining|restaurant|meal|\beat|lunch|dinner|breakfast|snack|အစား|စားသောက်/, Utensils],
  [/shop|cloth|fashion|apparel|ဈေးဝယ်|အဝတ်/, ShoppingBag],
  [/shirt|laundry/, Shirt],
  [/\brent|hous|home|mortgage|အိမ်/, House],
  [/travel|\btrip|flight|vacation|holiday|hotel|ခရီး/, Plane],
  [/transport|car\b|taxi|grab|\bbus\b|train|fuel|gas|petrol|commut|parking|သယ်ယူ|ကား/, Car],
  [/phone|mobile|internet|wifi|data|ဖုန်း/, Smartphone],
  [/bill|utilit|electric|water|ဘီလ်|မီတာ/, Receipt],
  [/subscri|membership/, Repeat],
  [/health|medical|medicine|doctor|hospital|pharma|clinic|dental|ကျန်းမာ|ဆေး/, HeartPulse],
  [/gym|fitness|sport|exercise|အားကစား/, Dumbbell],
  [/game|gaming/, Gamepad2],
  [/entertain|movie|cinema|\bfun\b|concert|party|ဖျော်ဖြေ/, Ticket],
  [/educat|school|tuition|course|book|study|class|ပညာ|ကျောင်း/, GraduationCap],
  [/gift|present|လက်ဆောင်/, Gift],
  [/donat|charit|အလှူ/, HandHeart],
  [/\bpets?\b|dog|cat\b|vet/, PawPrint],
  [/baby|kid|child|ကလေး/, Baby],
  [/beauty|hair|salon|\bspa\b|cosmetic|personal care|အလှ/, Scissors],
  [/insur|အာမခံ/, ShieldCheck],
  [/invest|stock|crypto|dividend|ရင်းနှီး/, TrendingUp],
  [/saving|စုဆောင်း|စုငွေ/, PiggyBank],
  [/debt|loan|credit|အကြွေး|ချေးငွေ/, CreditCard],
  [/salary|wage|payroll|paycheck|လစာ/, Briefcase],
  [/freelanc|\bside|business|client|လုပ်ငန်း/, Laptop],
  [/bonus|refund|cashback|allowance|pocket|interest|income|ဝင်ငွေ/, HandCoins],
  [/repair|maintenance|fix|service|ပြင်/, Wrench],
  [/cash|transfer|withdraw|ငွေ/, Banknote]
];

export function resolveCategoryIcon(name?: string, icon?: string): LucideIcon {
  const stored = icon ? ICONS_BY_KEY[icon] : undefined;
  if (stored) return stored;

  const normalized = (name ?? "").trim().toLowerCase();
  if (normalized) {
    for (const [pattern, match] of ICONS_BY_NAME) {
      if (pattern.test(normalized)) return match;
    }
  }

  return Tag;
}

const TILE_SIZES = {
  sm: { tile: "size-5 rounded-md", icon: 12 },
  md: { tile: "size-7 rounded-lg", icon: 15 }
};

/**
 * A category's icon on a tile of its colour. It stands where the plain colour
 * dot used to, so it still keys rows to their chart slice.
 */
export function CategoryIcon({
  name,
  icon,
  color,
  size = "sm",
  bare = false
}: {
  name?: string;
  icon?: string;
  /** Falls back to a neutral tile for uncategorised rows. */
  color?: string;
  size?: keyof typeof TILE_SIZES;
  /** Just the glyph in the current text colour, for use on an already-coloured surface. */
  bare?: boolean;
}) {
  const Icon = resolveCategoryIcon(name, icon);
  const { tile, icon: iconSize } = TILE_SIZES[size];

  if (bare) {
    return <Icon size={iconSize + 2} className="shrink-0" aria-hidden />;
  }

  return (
    <span className={`grid shrink-0 place-items-center text-white ${tile}`} style={{ background: color ?? "#64748b" }} aria-hidden>
      <Icon size={iconSize} strokeWidth={2.25} />
    </span>
  );
}
