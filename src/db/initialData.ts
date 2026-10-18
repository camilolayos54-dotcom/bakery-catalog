export type SeedProduct = {
  name: string;
  price_cents: number;
  subcategory: string;
  promo_qty?: number | null;
  promo_price_cents?: number | null;
};

export type SeedCategory = {
  name: string;
  sort_order: number;
  subcategories: string[];
  products: SeedProduct[];
};

export const INITIAL_CATALOG: SeedCategory[] = [
  {
    name: 'Panadería Horneada',
    sort_order: 1,
    subcategories: ['Panes Tradicionales y Rellenos', 'Croissants', 'Pasteles y Hojaldres'],
    products: [
      {
        name: 'Almojábana',
        price_cents: 130000, // $1.300 c/u
        subcategory: 'Panes Tradicionales y Rellenos',
        promo_qty: 4,
        promo_price_cents: 500000, // 4 por $5.000
      },
      {
        name: 'Pan agridulce',
        price_cents: 90000, // $900 c/u
        subcategory: 'Panes Tradicionales y Rellenos',
        promo_qty: 3,
        promo_price_cents: 250000, // 3 por $2.500
      },
      {
        name: 'Pan chino',
        price_cents: 100000, // $1.000 c/u
        subcategory: 'Panes Tradicionales y Rellenos',
      },
      {
        name: 'Palitroques',
        price_cents: 60000, // $600 c/u
        subcategory: 'Pasteles y Hojaldres',
        promo_qty: 4,
        promo_price_cents: 200000, // 4 por $2.000
      },
      { name: 'Pan crema', price_cents: 400000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Croissant de jamón y queso (personal)', price_cents: 400000, subcategory: 'Croissants' },
      { name: 'Croissant de jamón y queso (grande)', price_cents: 800000, subcategory: 'Croissants' },
      { name: 'Croissant de queso', price_cents: 350000, subcategory: 'Croissants' },
      { name: 'Croissant de chocolate', price_cents: 400000, subcategory: 'Croissants' },
      { name: 'Pan mariquiteño (pequeño)', price_cents: 200000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan mariquiteño (grande)', price_cents: 1000000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan tradicional', price_cents: 250000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan Hawaiano', price_cents: 600000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan ranchero', price_cents: 1000000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan de maíz y queso', price_cents: 800000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan chocha', price_cents: 800000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Mogolla de mozzarella', price_cents: 350000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Pan galleta', price_cents: 300000, subcategory: 'Panes Tradicionales y Rellenos' },
      { name: 'Palito de queso horneado', price_cents: 400000, subcategory: 'Pasteles y Hojaldres' },
      { name: 'Pastel de queso y arequipe', price_cents: 400000, subcategory: 'Pasteles y Hojaldres' },
      { name: 'Pastel de guayaba y queso', price_cents: 400000, subcategory: 'Pasteles y Hojaldres' },
      { name: 'Pastel de arequipe', price_cents: 350000, subcategory: 'Pasteles y Hojaldres' },
      { name: 'Chicharrón horneado', price_cents: 350000, subcategory: 'Pasteles y Hojaldres' },
    ],
  },
  {
    name: 'Fritos y Empanadas',
    sort_order: 2,
    subcategories: ['Empanadas', 'Fritos Típicos', 'Buñuelos'],
    products: [
      { name: 'Empanada paisa', price_cents: 350000, subcategory: 'Empanadas' },
      { name: 'Empanada papa y carne', price_cents: 350000, subcategory: 'Empanadas' },
      { name: 'Empanada arroz y carne', price_cents: 350000, subcategory: 'Empanadas' },
      { name: 'Palito de queso frito', price_cents: 400000, subcategory: 'Fritos Típicos' },
      { name: 'Pastel de pollo', price_cents: 500000, subcategory: 'Fritos Típicos' },
      { name: 'Arepa de huevo', price_cents: 500000, subcategory: 'Fritos Típicos' },
      { name: 'Papa rellena', price_cents: 350000, subcategory: 'Fritos Típicos' },
      { name: 'Buñuelo pequeño', price_cents: 50000, subcategory: 'Buñuelos' },
      { name: 'Buñuelo mediano', price_cents: 100000, subcategory: 'Buñuelos' },
      { name: 'Buñuelo grande', price_cents: 200000, subcategory: 'Buñuelos' },
    ],
  },
  {
    name: 'Tortas y Pastelería',
    sort_order: 3,
    subcategories: ['Tortas', 'Postres y Gelatinas', 'Dulces y Repostería'],
    products: [
      { name: 'Torta grande', price_cents: 6000000, subcategory: 'Tortas' },
      { name: 'Torta media', price_cents: 3700000, subcategory: 'Tortas' },
      { name: 'Torta pequeña', price_cents: 2500000, subcategory: 'Tortas' },
      { name: 'Porción de torta', price_cents: 400000, subcategory: 'Tortas' },
      { name: 'Torta de choclo', price_cents: 250000, subcategory: 'Tortas' },
      { name: 'Postre de la casa', price_cents: 1200000, subcategory: 'Postres y Gelatinas' },
      { name: 'Postre de pan', price_cents: 1000000, subcategory: 'Postres y Gelatinas' },
      { name: 'Postre de gelatina grande', price_cents: 800000, subcategory: 'Postres y Gelatinas' },
      { name: 'Gelatina', price_cents: 400000, subcategory: 'Postres y Gelatinas' },
      { name: 'Piononitos', price_cents: 200000, subcategory: 'Dulces y Repostería' },
      { name: 'Rollo decorado', price_cents: 350000, subcategory: 'Dulces y Repostería' },
      { name: 'Rollo rojo', price_cents: 300000, subcategory: 'Dulces y Repostería' },
      { name: 'Suspiro', price_cents: 150000, subcategory: 'Dulces y Repostería' },
      { name: 'Corazón de chocolate', price_cents: 300000, subcategory: 'Dulces y Repostería' },
      { name: 'Pera', price_cents: 350000, subcategory: 'Dulces y Repostería' },
      { name: 'Milhoja', price_cents: 450000, subcategory: 'Dulces y Repostería' },
      { name: 'Encarcelado', price_cents: 450000, subcategory: 'Dulces y Repostería' },
      { name: 'Cocada', price_cents: 250000, subcategory: 'Dulces y Repostería' },
      { name: 'Alfajor', price_cents: 150000, subcategory: 'Dulces y Repostería' },
      { name: 'Galletas de figura', price_cents: 350000, subcategory: 'Dulces y Repostería' },
      { name: 'Galletas tradicionales', price_cents: 150000, subcategory: 'Dulces y Repostería' },
    ],
  },
  {
    name: 'Gaseosas y Maltas',
    sort_order: 4,
    subcategories: ['Postobón', 'Maltas', 'Jugos Hit', 'Del Valle', 'Otras Bebidas'],
    products: [
      { name: 'Postobón chiquita', price_cents: 250000, subcategory: 'Postobón' },
      { name: 'Postobón 400 ml', price_cents: 400000, subcategory: 'Postobón' },
      { name: 'Postobón Litro', price_cents: 550000, subcategory: 'Postobón' },
      { name: 'Postobón Litro y medio', price_cents: 750000, subcategory: 'Postobón' },
      { name: 'Malta chiquita', price_cents: 250000, subcategory: 'Maltas' },
      { name: 'Malta Vidrio', price_cents: 370000, subcategory: 'Maltas' },
      { name: 'Malta Personal', price_cents: 400000, subcategory: 'Maltas' },
      { name: 'Malta Litro', price_cents: 650000, subcategory: 'Maltas' },
      { name: 'Malta Litro y cuarto', price_cents: 850000, subcategory: 'Maltas' },
      { name: 'Hit personal', price_cents: 400000, subcategory: 'Jugos Hit' },
      { name: 'Hit grande', price_cents: 650000, subcategory: 'Jugos Hit' },
      { name: 'Hit de caja', price_cents: 250000, subcategory: 'Jugos Hit' },
      { name: 'Del Valle personal', price_cents: 350000, subcategory: 'Del Valle' },
      { name: 'Del Valle litro y medio', price_cents: 700000, subcategory: 'Del Valle' },
      { name: 'Gaseosas en vidrio', price_cents: 370000, subcategory: 'Otras Bebidas' },
      { name: 'Mr Tea', price_cents: 400000, subcategory: 'Otras Bebidas' },
      { name: 'Tampico', price_cents: 150000, subcategory: 'Otras Bebidas' },
      { name: 'Bretaña', price_cents: 700000, subcategory: 'Otras Bebidas' },
      { name: 'Soda / Soda Pool', price_cents: 350000, subcategory: 'Otras Bebidas' },
      { name: 'Hatsu soda', price_cents: 500000, subcategory: 'Otras Bebidas' },
      { name: 'H2O', price_cents: 350000, subcategory: 'Otras Bebidas' },
    ],
  },
  {
    name: 'Aguas e Hidratantes',
    sort_order: 5,
    subcategories: ['Aguas', 'Energizantes e Hidratantes'],
    products: [
      { name: 'Agua pequeña', price_cents: 150000, subcategory: 'Aguas' },
      { name: 'Agua con gas', price_cents: 200000, subcategory: 'Aguas' },
      { name: 'Agua saborizada', price_cents: 250000, subcategory: 'Aguas' },
      { name: 'Agua personal', price_cents: 300000, subcategory: 'Aguas' },
      { name: 'Agua Cristal con gas', price_cents: 350000, subcategory: 'Aguas' },
      { name: 'Gatorade', price_cents: 550000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Hidralyte', price_cents: 600000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Saviloe pequeño', price_cents: 350000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Saviloe grande', price_cents: 450000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Speed Max chiquito', price_cents: 300000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Speed Max grande', price_cents: 500000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Vive 100 pequeño', price_cents: 300000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Vive 100 personal', price_cents: 450000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Vive 100 grande', price_cents: 600000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'AMPER', price_cents: 500000, subcategory: 'Energizantes e Hidratantes' },
      { name: 'Like', price_cents: 600000, subcategory: 'Energizantes e Hidratantes' },
    ],
  },
  {
    name: 'Lácteos',
    sort_order: 6,
    subcategories: ['Yogurt y Avena', 'Leches y Chocolatadas'],
    products: [
      { name: 'Yogo Yogo vaso', price_cents: 500000, subcategory: 'Yogurt y Avena' },
      { name: 'Yogo Yogo bolsa', price_cents: 350000, subcategory: 'Yogurt y Avena' },
      { name: 'Alquemix chiquito', price_cents: 450000, subcategory: 'Yogurt y Avena' },
      { name: 'Alquemix grande', price_cents: 500000, subcategory: 'Yogurt y Avena' },
      { name: 'BONJOUR', price_cents: 550000, subcategory: 'Yogurt y Avena' },
      { name: 'Alpin bolsa', price_cents: 400000, subcategory: 'Leches y Chocolatadas' },
      { name: 'Alpin caja', price_cents: 450000, subcategory: 'Leches y Chocolatadas' },
      { name: 'Chocoleche', price_cents: 450000, subcategory: 'Leches y Chocolatadas' },
      { name: 'Milo caja', price_cents: 400000, subcategory: 'Leches y Chocolatadas' },
    ],
  },
  {
    name: 'Cervezas',
    sort_order: 7,
    subcategories: ['Nacionales', 'Importadas / Premium'],
    products: [
      { name: 'Cerveza Andina', price_cents: 500000, subcategory: 'Nacionales' },
      { name: 'Cerveza Poker', price_cents: 600000, subcategory: 'Nacionales' },
      { name: 'Cerveza Club Colombia', price_cents: 800000, subcategory: 'Nacionales' },
      { name: 'Cerveza Heineken', price_cents: 700000, subcategory: 'Importadas / Premium' },
    ],
  },
  {
    name: 'Snacks, Dulces y Cigarrillos',
    sort_order: 8,
    subcategories: ['Cigarrillos', 'Chicles y Caramelos', 'Snacks Salados'],
    products: [
      { name: 'Cigarrillo Marlboro', price_cents: 100000, subcategory: 'Cigarrillos' },
      { name: 'Cigarrillo Star Lite', price_cents: 80000, subcategory: 'Cigarrillos' },
      { name: 'Cigarrillo Mentolado', price_cents: 120000, subcategory: 'Cigarrillos' },
      { name: 'Cuates chiquitos', price_cents: 550000, subcategory: 'Snacks Salados' },
      { name: 'Cuates grandes', price_cents: 850000, subcategory: 'Snacks Salados' },
      { name: 'Paquete de Trident', price_cents: 250000, subcategory: 'Chicles y Caramelos' },
      { name: 'Trident caja', price_cents: 150000, subcategory: 'Chicles y Caramelos' },
      { name: 'Trident individuales', price_cents: 50000, subcategory: 'Chicles y Caramelos' },
      { name: 'Halls barra', price_cents: 250000, subcategory: 'Chicles y Caramelos' },
    ],
  },
];
