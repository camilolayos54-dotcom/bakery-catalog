// Default cover for products without a photo: an emoji and a soft background chosen from the product name
// (and its category), so every card is recognisable at a glance. A real photo always wins over this.

export type Cover = { emoji: string; bg: string };

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Most specific words first: the first rule that matches wins.
const RULES: [RegExp, string, string][] = [
  [/cerveza|aguila|poker|club colombia|heineken|corona|andina|costena|stella|budweiser|smirnoff|michelada/, '🍺', '#fdf0c9'],
  [/aguardiente|ron |whisky|vino|bosque de indias|licor|tequila|vodka/, '🥃', '#f4e1cf'],
  [/red bull|monster|speed|fury|energ|gatorade|powerade|vive 100|electrolit/, '⚡', '#fff3b8'],
  [/cigarrillo|malboro|marlboro|lucky|\blm\b|rothmans|star lite|belmont|pielroja/, '🚬', '#e8e8e8'],
  [/agua|brisa|cristal|manantial|acquan|aquan/, '💧', '#d9eefc'],
  // Lácteos antes que gaseosas: "colanta" contiene "cola".
  [/yogur|yogo|alpina|avena|kumis|alqueria|actiges|alpinette|boggy|kefir/, '🥛', '#e6f0ff'],
  [/leche|colanta|ricura|chocolatada|milo|chocolisto/, '🥛', '#eef3ff'],
  [/gelatina/, '🍮', '#ffe0ec'],
  [/postobon|manzana|pepsi|coca ?cola|\bcola\b|sprite|fanta|7 up|colombiana|kola|uva|gaseosa|refajo|premio|cuatro|squash|jugo hit|hit |tutti/, '🥤', '#fde0dc'],
  [/malta|pony|bretana/, '🍺', '#efdcc6'],
  [/del valle|jugo|nectar|limonada|te frio|lipton|fuze/, '🧃', '#ffe9c7'],
  [/arepa/, '🫓', '#fbeccd'],
  [/empanada|pastel de pollo|pastel de carne|papa rellena|aborrajado/, '🥟', '#fde3c0'],
  [/buñuelo|bunuelo|frito|chicharron|carimañola|carimanola|tequeño|tequeno|salchicha|hot dog|perro/, '🍤', '#fde3c0'],
  [/papita|papas|chips|cudiz|doritos|detodito|detodo|cheetos|chistris|choclito|boliqueso|natuchips|margarita|de todo|piqueo/, '🍟', '#fff0b3'],
  // Tortas antes que dulces: "torta de chocolate" es una torta.
  [/torta|brownie|cheesecake|postre|tres leches|merengue|alfajor|pastel de arequipe/, '🍰', '#ffe3ea'],
  [/trident|chicle|bubbaloo|clorets|trolli|gomita|frunas|jet|bom bom|bombon|chupeta|caramelo|dulce|chocolatina|chocorramo|ponque|bianchi|tosh|cocosette|festival|chocolate|mamit|chao|pin pop|quipitos|lenguas|mezclado/, '🍬', '#ffe0f0'],
  [/oreo|galleta|crackers|cracks|club social|saltin|ducales|tosh|wafer|waffer|festival/, '🍪', '#f6e3cf'],
  [/croissant|cruasan/, '🥐', '#fdeccc'],
  [/pastel|hojaldre|palito|palitroque/, '🥐', '#fdeccc'],
  [/mogolla|pan |pan$|almojabana|rosca|pandebono|pan de bono|pan chino|pan crema|pan agridulce|pan tradicional|pan hawaiano|pan ranchero|pan galleta|pan mariquite|pan chocha|pan de maiz/, '🥖', '#fbeccd'],
  [/sandwich|hamburguesa|tostada/, '🥪', '#fbeccd'],
  [/cafe|tinto|capuchino|capuccino|aromatica/, '☕', '#f2e1d3'],
];

// When the name says nothing, fall back to the category (by name, so it works with any custom categories too).
const CATEGORY: [RegExp, string, string][] = [
  [/cerveza/, '🍺', '#fdf0c9'],
  [/gaseosa|malta/, '🥤', '#fde0dc'],
  [/agua|hidratante/, '💧', '#d9eefc'],
  [/lacteo/, '🥛', '#e6f0ff'],
  [/frito|empanada/, '🥟', '#fde3c0'],
  [/torta|pasteleria/, '🍰', '#ffe3ea'],
  [/papita/, '🍟', '#fff0b3'],
  [/snack|dulce|cigarrillo/, '🍬', '#ffe0f0'],
  [/panaderia|pan/, '🥖', '#fbeccd'],
];

const DEFAULT: Cover = { emoji: '🛒', bg: '#f1e9de' };

export function coverFor(name: string, category?: string | null, subcategory?: string | null): Cover {
  const n = ` ${fold(name)} `;
  for (const [re, emoji, bg] of RULES) if (re.test(n)) return { emoji, bg };
  const c = fold(`${category ?? ''} ${subcategory ?? ''}`);
  for (const [re, emoji, bg] of CATEGORY) if (re.test(c)) return { emoji, bg };
  return DEFAULT;
}
