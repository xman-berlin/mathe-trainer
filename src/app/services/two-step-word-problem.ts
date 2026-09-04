import {
  NumberRange,
  TwoStepWordProblem,
} from '../models/word-problem.model';

const BOY_NAMES = ['Bobbi', 'Tim', 'Max', 'Finn', 'Leon', 'Paul', 'Ben', 'Jonas'];
const GIRL_NAMES = ['Lilo', 'Emma', 'Mia', 'Lea', 'Ida', 'Anna', 'Sophie', 'Lara'];
const BROTHER_NAMES = ['Carlo', 'Tim', 'Max', 'Paul', 'Lukas', 'Jonas'];
const SISTER_NAMES = ['Mimi', 'Anna', 'Sophie', 'Marie', 'Lara', 'Nina'];
const FRIEND_BOYS = ['Tom', 'Nico', 'Jan', 'Luis'];
const FRIEND_GIRLS = ['Eva', 'Kim', 'Nele', 'Pia'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function rangeFromMax(maxValue?: number): NumberRange {
  return (maxValue ?? 100) <= 20 ? 'bis20' : 'bis100';
}

function formatAddends(addends: number[], unitSuffix: string): string {
  return addends.map((n) => `${n}${unitSuffix}`).join(' + ');
}

function moneyFamilyProblem(
  name: string,
  possessive: 'seinen' | 'ihren',
  adultPrice: number,
  discount: number,
  vehicle: string,
): TwoStepWordProblem {
  const childPrice = adultPrice - discount;
  const expectedAddends = [adultPrice, adultPrice, childPrice];
  const total = expectedAddends.reduce((sum, n) => sum + n, 0);
  const unitSuffix = '€';

  return {
    kind: 'two-step',
    type: 'two-step',
    theme: 'money-family',
    storyText:
      `${name} fährt mit ${possessive} Eltern mit dem ${vehicle}. ` +
      `Eine Erwachsenenkarte kostet ${adultPrice}€. Kinder bezahlen ${discount}€ weniger. ` +
      `Wie viel muss die Familie bezahlen?`,
    icon: vehicle === 'Bus' ? '🚌' : vehicle === 'Zug' ? '🚆' : '🎫',
    templateId: 'money-family-tickets',
    givenNumbers: [adultPrice, discount],
    intermediateValues: [childPrice],
    expectedAddends,
    correctAnswer: total,
    unit: 'euro',
    sampleRechnung: `${formatAddends(expectedAddends, ' ' + unitSuffix)} = ${total} ${unitSuffix}`,
    sampleAntwort: `Die Familie bezahlt ${total}€.`,
    answerKeywords: ['familie', 'eltern', 'bezal', 'zahl', 'zusammen', 'kost'],
    numberRange: 'bis100',
  };
}

function relativeAgesProblem(
  name: string,
  brother: string,
  sister: string,
  baseAge: number,
  olderBy: number,
  youngerBy: number,
  possessiveBrother: 'Ihr' | 'Sein',
  possessiveSister: 'Ihre' | 'Seine',
): TwoStepWordProblem {
  const brotherAge = baseAge + olderBy;
  const sisterAge = baseAge - youngerBy;
  const expectedAddends = [baseAge, brotherAge, sisterAge];
  const total = expectedAddends.reduce((sum, n) => sum + n, 0);

  return {
    kind: 'two-step',
    type: 'two-step',
    theme: 'relative-ages',
    storyText:
      `${name} ist ${baseAge} Jahre alt. ${possessiveBrother} Bruder ${brother} ist ${olderBy} Jahre älter. ` +
      `${possessiveSister} Schwester ${sister} ist ${youngerBy} Jahre jünger. ` +
      `Wie alt sind die 3 Kinder zusammen?`,
    icon: '👨‍👩‍👧',
    templateId: 'relative-ages',
    givenNumbers: [baseAge, olderBy, youngerBy],
    intermediateValues: [brotherAge, sisterAge],
    expectedAddends,
    correctAnswer: total,
    unit: 'years',
    sampleRechnung: `${expectedAddends.join(' + ')} = ${total}`,
    sampleAntwort: `Alle zusammen sind ${total} Jahre alt.`,
    answerKeywords: ['zusammen', 'kinder', 'jahr', 'alle', 'alt'],
    numberRange: 'bis100',
  };
}

function relativeAmountsProblem(
  name: string,
  friend: string,
  other: string,
  item: string,
  itemPlural: string,
  icon: string,
  base: number,
  more: number,
  less: number,
): TwoStepWordProblem {
  const friendAmount = base + more;
  const otherAmount = base - less;
  const expectedAddends = [base, friendAmount, otherAmount];
  const total = expectedAddends.reduce((sum, n) => sum + n, 0);

  return {
    kind: 'two-step',
    type: 'two-step',
    theme: 'relative-amounts',
    storyText:
      `${name} hat ${base} ${itemPlural}. ${friend} hat ${more} ${itemPlural} mehr. ` +
      `${other} hat ${less} ${itemPlural} weniger. Wie viele ${itemPlural} haben sie zusammen?`,
    icon,
    templateId: `relative-amounts-${item}`,
    givenNumbers: [base, more, less],
    intermediateValues: [friendAmount, otherAmount],
    expectedAddends,
    correctAnswer: total,
    unit: 'count',
    sampleRechnung: `${expectedAddends.join(' + ')} = ${total}`,
    sampleAntwort: `Zusammen haben sie ${total} ${itemPlural}.`,
    answerKeywords: ['zusammen', 'haben', 'alle', itemPlural.toLowerCase()],
    numberRange: 'bis100',
  };
}

function pocketMoneyProblem(
  name: string,
  sibling: string,
  relation: string,
  base: number,
  more: number,
): TwoStepWordProblem {
  const siblingAmount = base + more;
  const expectedAddends = [base, siblingAmount];
  const total = expectedAddends.reduce((sum, n) => sum + n, 0);

  return {
    kind: 'two-step',
    type: 'two-step',
    theme: 'money-family',
    storyText:
      `${name} bekommt ${base}€ Taschengeld. ${relation} ${sibling} bekommt ${more}€ mehr. ` +
      `Wie viel Taschengeld bekommen beide zusammen?`,
    icon: '💶',
    templateId: 'pocket-money',
    givenNumbers: [base, more],
    intermediateValues: [siblingAmount],
    expectedAddends,
    correctAnswer: total,
    unit: 'euro',
    sampleRechnung: `${base} € + ${siblingAmount} € = ${total} €`,
    sampleAntwort: `Beide bekommen zusammen ${total}€.`,
    answerKeywords: ['zusammen', 'beide', 'bekomm', 'taschengeld', 'euro'],
    numberRange: 'bis100',
  };
}

function shoppingPairProblem(
  name: string,
  item1: string,
  item2: string,
  price: number,
  discount: number,
): TwoStepWordProblem {
  const cheaper = price - discount;
  const expectedAddends = [price, cheaper];
  const total = expectedAddends.reduce((sum, n) => sum + n, 0);

  return {
    kind: 'two-step',
    type: 'two-step',
    theme: 'money-family',
    storyText:
      `Ein ${item1} kostet ${price}€. Ein ${item2} kostet ${discount}€ weniger. ` +
      `${name} kauft ein ${item1} und ein ${item2}. Wie viel muss ${name} bezahlen?`,
    icon: '🛒',
    templateId: 'shopping-pair',
    givenNumbers: [price, discount],
    intermediateValues: [cheaper],
    expectedAddends,
    correctAnswer: total,
    unit: 'euro',
    sampleRechnung: `${price} € + ${cheaper} € = ${total} €`,
    sampleAntwort: `${name} muss ${total}€ bezahlen.`,
    answerKeywords: ['bezal', 'zahl', 'kost', 'zusammen', 'euro'],
    numberRange: 'bis100',
  };
}

/** Exact problems from the "SACHAUFGABEN LÖSEN" worksheet. */
export function getWorksheetExamples(): TwoStepWordProblem[] {
  return [
    moneyFamilyProblem('Bobbi', 'seinen', 17, 6, 'Bus'),
    relativeAgesProblem('Lilo', 'Carlo', 'Mimi', 12, 9, 7, 'Ihr', 'Ihre'),
  ];
}

function generateMoneyFamily(maxTotal: number): TwoStepWordProblem | null {
  const girl = Math.random() < 0.5;
  const name = girl ? pick(GIRL_NAMES) : pick(BOY_NAMES);
  const possessive = girl ? 'ihren' : 'seinen';
  const vehicle = pick(['Bus', 'Zug', 'Zug']);
  const maxAdult = Math.min(25, Math.max(8, Math.floor((maxTotal - 4) / 3)));
  if (maxAdult < 8) return null;

  for (let attempt = 0; attempt < 20; attempt++) {
    const adultPrice = randInt(8, maxAdult);
    const discount = randInt(2, Math.min(8, adultPrice - 3));
    const childPrice = adultPrice - discount;
    const total = adultPrice * 2 + childPrice;
    if (childPrice >= 1 && total <= maxTotal) {
      return moneyFamilyProblem(name, possessive, adultPrice, discount, vehicle);
    }
  }
  return null;
}

function generateRelativeAges(maxTotal: number): TwoStepWordProblem | null {
  const girl = Math.random() < 0.5;
  const name = girl ? pick(GIRL_NAMES) : pick(BOY_NAMES);
  const brother = pick(BROTHER_NAMES.filter((n) => n !== name));
  const sister = pick(SISTER_NAMES.filter((n) => n !== name));
  const possBro = girl ? 'Ihr' : 'Sein';
  const possSis = girl ? 'Ihre' : 'Seine';

  for (let attempt = 0; attempt < 20; attempt++) {
    const baseAge = randInt(8, 14);
    const olderBy = randInt(3, 9);
    const youngerBy = randInt(2, Math.min(7, baseAge - 3));
    const total = baseAge + (baseAge + olderBy) + (baseAge - youngerBy);
    if (baseAge - youngerBy >= 3 && total <= maxTotal) {
      return relativeAgesProblem(
        name,
        brother,
        sister,
        baseAge,
        olderBy,
        youngerBy,
        possBro,
        possSis,
      );
    }
  }
  return null;
}

function generateRelativeAmounts(maxTotal: number): TwoStepWordProblem | null {
  const girl = Math.random() < 0.5;
  const name = girl ? pick(GIRL_NAMES) : pick(BOY_NAMES);
  const friend = girl ? pick(FRIEND_GIRLS.filter((n) => n !== name)) : pick(FRIEND_BOYS);
  const other = girl ? pick(FRIEND_GIRLS.filter((n) => n !== name && n !== friend)) : pick(FRIEND_BOYS.filter((n) => n !== friend));
  const item = pick([
    { singular: 'Sticker', plural: 'Sticker', icon: '⭐' },
    { singular: 'Murmel', plural: 'Murmeln', icon: '⚫' },
    { singular: 'Apfel', plural: 'Äpfel', icon: '🍎' },
    { singular: 'Keks', plural: 'Kekse', icon: '🍪' },
  ]);

  for (let attempt = 0; attempt < 20; attempt++) {
    const base = randInt(8, Math.min(40, Math.floor(maxTotal / 3)));
    const more = randInt(3, 12);
    const less = randInt(2, Math.min(8, base - 2));
    const total = base + (base + more) + (base - less);
    if (base - less >= 1 && total <= maxTotal) {
      return relativeAmountsProblem(
        name,
        friend,
        other,
        item.singular,
        item.plural,
        item.icon,
        base,
        more,
        less,
      );
    }
  }
  return null;
}

function generatePocketMoney(maxTotal: number): TwoStepWordProblem | null {
  const girl = Math.random() < 0.5;
  const name = girl ? pick(GIRL_NAMES) : pick(BOY_NAMES);
  const siblingGirl = Math.random() < 0.5;
  const sibling = siblingGirl
    ? pick(SISTER_NAMES.filter((n) => n !== name))
    : pick(BROTHER_NAMES.filter((n) => n !== name));
  const relation = siblingGirl ? (girl ? 'Ihre Schwester' : 'Seine Schwester') : girl ? 'Ihr Bruder' : 'Sein Bruder';

  for (let attempt = 0; attempt < 20; attempt++) {
    const base = randInt(5, Math.min(20, Math.floor(maxTotal / 2) - 2));
    const more = randInt(2, 8);
    const total = base + (base + more);
    if (total <= maxTotal) {
      return pocketMoneyProblem(name, sibling, relation, base, more);
    }
  }
  return null;
}

function generateShoppingPair(maxTotal: number): TwoStepWordProblem | null {
  const name = pick([...BOY_NAMES, ...GIRL_NAMES]);
  const pair = pick([
    { a: 'Heft', b: 'Stift' },
    { a: 'Buch', b: 'Radiergummi' },
    { a: 'Brot', b: 'Apfel' },
    { a: 'Ball', b: 'Seil' },
  ]);

  for (let attempt = 0; attempt < 20; attempt++) {
    const price = randInt(6, Math.min(20, maxTotal - 3));
    const discount = randInt(2, Math.min(6, price - 2));
    const total = price + (price - discount);
    if (price - discount >= 1 && total <= maxTotal) {
      return shoppingPairProblem(name, pair.a, pair.b, price, discount);
    }
  }
  return null;
}

function fromWorksheet(index: number) {
  return (maxTotal: number): TwoStepWordProblem | null => {
    const example = getWorksheetExamples()[index];
    return example.correctAnswer <= maxTotal ? example : null;
  };
}

const GENERATORS: ((maxTotal: number) => TwoStepWordProblem | null)[] = [
  fromWorksheet(0),
  fromWorksheet(1),
  generateMoneyFamily,
  generateRelativeAges,
  generateRelativeAmounts,
  generatePocketMoney,
  generateShoppingPair,
];

let rotation = 0;

/** Reset generator rotation (for tests). */
export function resetTwoStepRotation(): void {
  rotation = 0;
}

export function generateTwoStepProblem(maxValue?: number): TwoStepWordProblem {
  const maxTotal = Math.max(20, maxValue ?? 100);
  const count = GENERATORS.length;

  for (let offset = 0; offset < count; offset++) {
    const generate = GENERATORS[(rotation + offset) % count];
    const problem = generate(maxTotal);
    if (problem && problem.correctAnswer <= maxTotal) {
      rotation = (rotation + offset + 1) % count;
      return { ...problem, numberRange: rangeFromMax(maxValue) };
    }
  }

  const fallback = getWorksheetExamples()[0];
  return { ...fallback, numberRange: rangeFromMax(maxValue) };
}

export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function subsetSums(values: number[]): number[] {
  const sums = new Set<number>();
  const n = values.length;
  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += values[i];
      }
    }
    sums.add(sum);
  }
  return [...sums];
}

export function buildAllowedNumbers(problem: TwoStepWordProblem): Set<number> {
  return new Set([
    ...problem.givenNumbers,
    ...problem.intermediateValues,
    ...problem.expectedAddends,
    ...subsetSums(problem.expectedAddends),
  ]);
}

/** Split a Rechnung into equation steps and return expr/result pairs. */
export function findEquations(input: string): { expr: string; result: number }[] {
  const normalized = input.replace(/[−–—]/g, '-');
  const re = /([0-9][0-9+\s€-]*)=\s*([0-9]+)/g;
  const out: { expr: string; result: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized))) {
    out.push({ expr: match[1].trim(), result: Number(match[2]) });
  }
  return out;
}

export function evaluateAddSub(expr: string): number | null {
  const cleaned = expr.replace(/[−–—]/g, '-').replace(/€/gi, '').replace(/[^0-9+-]/g, '');
  if (!cleaned) return null;
  const tokens = cleaned.match(/[+-]|[0-9]+/g);
  if (!tokens || tokens.length === 0) return null;
  if (!/^[0-9]+$/.test(tokens[0])) return null;

  let value = Number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const raw = tokens[i + 1];
    if (raw === undefined || (op !== '+' && op !== '-')) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    value = op === '+' ? value + n : value - n;
  }
  return value;
}

export function gradeRechnung(input: string, problem: TwoStepWordProblem): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const equations = findEquations(trimmed);
  let expr: string;
  let claimed: number | null = null;

  if (equations.length > 0) {
    const last = equations[equations.length - 1];
    expr = last.expr;
    claimed = last.result;
  } else {
    expr = trimmed;
  }

  const value = evaluateAddSub(expr);
  if (value === null) return false;
  if (claimed !== null && claimed !== problem.correctAnswer) return false;
  if (value !== problem.correctAnswer) return false;

  const nums = extractNumbers(expr);
  if (nums.length < 2) return false;

  const allowed = buildAllowedNumbers(problem);
  return nums.every((n) => allowed.has(n));
}

function foldGerman(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

function containsWholeNumber(text: string, n: number): boolean {
  return new RegExp(`(^|\\D)${n}(\\D|$)`).test(text);
}

function hasKeyword(folded: string, keywords: string[]): boolean {
  const words = folded.split(/[^a-z0-9]+/).filter(Boolean);
  for (const keyword of keywords) {
    const kw = foldGerman(keyword);
    if (!kw) continue;
    if (folded.includes(kw)) return true;
    for (const word of words) {
      if (word.includes(kw) || (word.length >= 3 && kw.includes(word))) return true;
      const maxDist = kw.length <= 4 ? 1 : 2;
      if (word.length >= 3 && levenshtein(word, kw) <= maxDist) return true;
    }
  }
  return false;
}

export function gradeAntwort(input: string, problem: TwoStepWordProblem): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const folded = foldGerman(trimmed.replace(/€/g, ' euro ').replace(/[.,!?;:()]/g, ' '));
  if (!containsWholeNumber(folded, problem.correctAnswer)) return false;
  return hasKeyword(folded, problem.answerKeywords);
}

export interface TwoStepGradeResult {
  rechnungCorrect: boolean;
  antwortCorrect: boolean;
  isCorrect: boolean;
}

export function gradeTwoStep(
  rechnung: string,
  antwort: string,
  problem: TwoStepWordProblem,
): TwoStepGradeResult {
  const rechnungCorrect = gradeRechnung(rechnung, problem);
  const antwortCorrect = gradeAntwort(antwort, problem);
  return {
    rechnungCorrect,
    antwortCorrect,
    isCorrect: rechnungCorrect && antwortCorrect,
  };
}
