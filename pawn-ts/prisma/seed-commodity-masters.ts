import { PrismaClient } from '@prisma/client';
import { resetMasterSequences } from '../src/lib/reset-sequences.js';

export type CategorySeed = { nameEn: string; nameTa: string; status?: boolean };
export type SubCategorySeed = {
  categoryNameEn: string;
  nameEn: string;
  nameTa: string;
  status?: boolean;
};
export type SubItemSeed = {
  categoryNameEn: string;
  subCategoryNameEn: string;
  nameEn: string;
  nameTa: string;
  status?: boolean;
};

export type CommodityMasterSeedResult = {
  categoriesByNameEn: Map<string, { id: number; nameEn: string }>;
  subCategoriesByKey: Map<string, { id: number; commodityTypeId: number; nameEn: string }>;
  subItemsByKey: Map<string, { id: bigint; commodityTypeId: number; subCategoryId: number; nameEn: string }>;
};

const DEFAULT_CATEGORIES: CategorySeed[] = [
  { nameEn: 'Gold', nameTa: 'தங்கம்' },
  { nameEn: 'Silver', nameTa: 'வெள்ளி' },
];

const DEFAULT_SUB_CATEGORIES: SubCategorySeed[] = [
  { categoryNameEn: 'Gold', nameEn: 'Chain', nameTa: 'செயின்' },
  { categoryNameEn: 'Gold', nameEn: 'Ring', nameTa: 'மோதிரம்' },
  { categoryNameEn: 'Gold', nameEn: 'Bangle', nameTa: 'வளையல்' },
  { categoryNameEn: 'Gold', nameEn: 'Earring', nameTa: 'தோடு' },
  { categoryNameEn: 'Gold', nameEn: 'Amulet', nameTa: 'தாயத்து' },
  { categoryNameEn: 'Gold', nameEn: 'Dollar Pendant', nameTa: 'டாலர்' },
  { categoryNameEn: 'Gold', nameEn: 'Thali Pendant', nameTa: 'தாலி' },
  { categoryNameEn: 'Gold', nameEn: 'Nose Stud', nameTa: 'மூக்குத்தி' },
  { categoryNameEn: 'Gold', nameEn: 'Bracelet', nameTa: 'கைப்பையம்' },
  { categoryNameEn: 'Gold', nameEn: 'Necklace', nameTa: 'நெக்லஸ்' },
  { categoryNameEn: 'Gold', nameEn: 'Ear Ornament', nameTa: 'கொப்பு' },
  { categoryNameEn: 'Gold', nameEn: 'Heavy Ear Ornament', nameTa: 'தண்டட்டி' },
  { categoryNameEn: 'Gold', nameEn: 'Mattal', nameTa: 'மாட்டல்' },
  { categoryNameEn: 'Gold', nameEn: 'Gold Coin', nameTa: 'தங்க காசு/காயின்' },
  { categoryNameEn: 'Gold', nameEn: 'Gold Bar', nameTa: 'தங்க கட்டி' },
  { categoryNameEn: 'Silver', nameEn: 'Anklet', nameTa: 'கொலுசு' },
  { categoryNameEn: 'Silver', nameEn: 'Ring', nameTa: 'மோதிரம்' },
  { categoryNameEn: 'Silver', nameEn: 'Toe Ring (Metti)', nameTa: 'மிஞ்சி' },   
  { categoryNameEn: 'Silver', nameEn: 'Silver Coin', nameTa: 'வெள்ளி காசு/காயின்' },
  { categoryNameEn: 'Silver', nameEn: 'Silver Bar', nameTa: 'வெள்ளி கட்டி' },
  { categoryNameEn: 'Silver', nameEn: 'Cup', nameTa: 'கிண்ணம்' },
  { categoryNameEn: 'Silver', nameEn: 'Plate', nameTa: 'தட்டு' },
  { categoryNameEn: 'Silver', nameEn: 'Bowl', nameTa: 'கிண்ணம்' },
  { categoryNameEn: 'Silver', nameEn: 'Spoon', nameTa: 'கரண்டி' },
  { categoryNameEn: 'Silver', nameEn: 'Lamp', nameTa: 'விளக்கு' },
];

const DEFAULT_SUB_ITEMS: SubItemSeed[] = [

  // RING
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Ring', nameTa: 'மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Oval Ring', nameTa: 'ஓவல் மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: "Ladies Ring", nameTa: 'லேடீஸ் மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Baby Ring', nameTa: 'பேபி மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Square Ring', nameTa: 'சதுர மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: "Men's Stone Ring", nameTa: 'கல் மோதிரம் ஆண்கள்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: "Women's Stone Ring", nameTa: 'கல் மோதிரம் பெண்கள்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'TV Ring', nameTa: 'T.V மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Coral Ring', nameTa: 'பவள மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Bangle Ring', nameTa: 'வனளயமோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Initial Ring', nameTa: 'இனிசியல் மோதிரம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ring', nameEn: 'Elephant Hair Ring', nameTa: 'யானைமுடி மோதிரம்' },

  // EARRING
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Earring', nameTa: 'தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Leaf Earring', nameTa: 'இலை தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Jhumka', nameTa: 'ஜிம்மிகி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Stone Earring', nameTa: 'கல் தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Fancy Earring', nameTa: 'பேன்சி தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Fancy Stone Earring', nameTa: 'பேன்சி கல் தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Side Mattal', nameTa: 'சைடு மாட்டல்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Side Hoop', nameTa: 'சைடு வலயம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Titanic Earring', nameTa: 'டைட்டானிக் தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Baby Earring', nameTa: 'பேபி தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Hoop Earring', nameTa: 'வளையத்தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Maapinju Earring', nameTa: 'மாபிஞ்சு தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Saudi Earring', nameTa: 'சவுடி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Ball Earring', nameTa: 'குண்டுதோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Honeycomb Earring', nameTa: 'தேன்கூடு தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Jhumka with Stud', nameTa: 'ஜிமிக்கி+தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Dangling Earring', nameTa: 'ஆட்டம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Stone Dangling Earring', nameTa: 'கல்ஆட்டம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Side Stud', nameTa: 'சைடுதோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Onappu Thattu', nameTa: 'ஒனப்புதட்டு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Paasi Earring', nameTa: 'பாசித்தோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Screw Back', nameTa: 'திருகாணி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Kodangi Stone', nameTa: 'கோடாங்கி கல்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Pichi Flower Earring', nameTa: 'பிச்சிப்பூதோடு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Earring', nameEn: 'Casting Model Earring', nameTa: 'கேஸ்டிங் மாடல் தோடு' },

  // BANGLE
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Bangle', nameTa: 'வளையல்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Bangles', nameTa: 'பங்கிள்ஸ்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Bracelet', nameTa: 'ப்ரஸ்லேட்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Waist Chain', nameTa: 'இடுப்பு கொடி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Thaayathu', nameTa: 'தாயாட்தூ' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bangle', nameEn: 'Gold Kada', nameTa: 'தங்க காப்பு' },

  // THALI
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Thali', nameTa: 'தாலி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Thali Coin', nameTa: 'தாலி காசு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Thali Bead', nameTa: 'தாலி குண்டு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Thali Tube', nameTa: 'தாலி குலாய்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Pottu Thali', nameTa: 'பொட்டு தாலி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Leaf Thali Coin', nameTa: 'இலைதாலி காசு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Maapinju', nameTa: 'மாபிஞ்சு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Thali Pendant', nameEn: 'Coral Beads', nameTa: 'பவளப்பாசி' },

  // CHAIN
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Chain', nameTa: 'செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Bracelet Chain', nameTa: 'ப்ரஸ்லேட் கை செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Dollar Chain', nameTa: 'டாலர் செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Mala', nameTa: 'மாலை' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Flat Chain', nameTa: 'பட்டை செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Double Strand Chain', nameTa: 'இரண்டு சாரம் செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Stone Pendant Chain', nameTa: 'கல் முகப்பு செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Baby Bracelet Chain', nameTa: 'பேபி கைசெயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Thali Chain', nameTa: 'தாலிசெயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Om Dollar Chain', nameTa: 'ஓம்டலர்செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Fish Dollar Chain', nameTa: 'மீன்டாலர்செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Bead Chain', nameTa: 'பாசி செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Stone Dollar Chain', nameTa: 'கல்டாலர் செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Gold Rope Chain', nameTa: 'தங்க கொடி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Cross Thali Chain', nameTa: 'சிலுவை தாலிச்செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Kerala Mala', nameTa: 'கேரளா மாலை' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Rudraksha Bead Chain', nameTa: 'ருத்திராச்சம் குமிழ்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Apple Chain', nameTa: 'ஆப்பிள் செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Wheat Chain', nameTa: 'கோதுமை செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Chain Bracelet', nameTa: 'செயின் வலையம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Stone Pendant Chain', nameTa: 'கல் பதக்க செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Heart Dollar Chain', nameTa: 'ஹார்ட் டாலர் செயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Chain', nameEn: 'Cutting Chain', nameTa: 'கட்டிங் செயின்' },

  // NECKLACE
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Necklace', nameEn: 'Necklace', nameTa: 'நெக்லஸ்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Necklace', nameEn: 'Stone Necklace', nameTa: 'கல் நெக்லஸ்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Necklace', nameEn: 'Bulugal Necklace', nameTa: 'புளுகல் நெக்லஸ்' },

  // AMULET
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Amulet', nameEn: 'Amulet', nameTa: 'தாயத்து' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Amulet', nameEn: 'Tiger Claw Pendant', nameTa: 'புலிநகம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Amulet', nameEn: 'Roll Amulet', nameTa: 'உருட்டு தாயத்து' },

  // NOSE STUD
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Nose Stud', nameEn: 'Nose Stud', nameTa: 'மூக்குத்தி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Nose Stud', nameEn: 'Stone Nose Stud', nameTa: 'கல் மூக்குத்தி' },

  // DOLLAR
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Dollar', nameTa: 'டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Om Dollar', nameTa: 'ஓம் டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Fish Dollar', nameTa: 'மீன் டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Cross Dollar', nameTa: 'சிலுவை டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Stone Dollar', nameTa: 'கல் டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Tirupati Dollar', nameTa: 'திருப்பதி டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Heart Dollar', nameTa: 'இதயம் டாலர்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Dollar Pendant', nameEn: 'Vel Dollar', nameTa: 'வேல் டாலர்' },

  // OTHERS
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Bracelet', nameEn: 'Bracelet', nameTa: 'கைப்பையம்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Ear Ornament', nameEn: 'Ear Ornament', nameTa: 'கொப்பு' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Heavy Ear Ornament', nameEn: 'Heavy Ear Ornament', nameTa: 'தண்டட்டி' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Gold Bar', nameEn: 'Gold Bar', nameTa: 'தங்க கட்டி' },

  // COINS
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Gold Coin', nameEn: 'Gold Coin', nameTa: 'தங்க காசு/காயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Gold Coin', nameEn: 'J Coin', nameTa: 'ஜெ. காயின்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Gold Coin', nameEn: 'Muthoot Coin', nameTa: 'முத்தூட் காயின்' },

  // MATTAL
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Mattal', nameEn: 'Mattal', nameTa: 'மாட்டல்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Mattal', nameEn: 'Side Mattal', nameTa: 'சைடு மாட்டல்' },
  { categoryNameEn: 'Gold', subCategoryNameEn: 'Mattal', nameEn: 'Stone Mattal', nameTa: 'கல்மாட்டல்' },

  // Silver
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Anklet', nameEn: 'Anklet', nameTa: 'கொலுசு' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Ring', nameEn: 'Ring', nameTa: 'மோதிரம்' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Toe Ring (Metti)', nameEn: 'Toe Ring (Metti)', nameTa: 'மிஞ்சி' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Silver Coin', nameEn: 'Silver Coin', nameTa: 'வெள்ளி காசு/காயின்' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Silver Bar', nameEn: 'Silver Bar', nameTa: 'வெள்ளி கட்டி' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Cup', nameEn: 'Cup', nameTa: 'கிண்ணம்' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Plate', nameEn: 'Plate', nameTa: 'தட்டு' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Bowl', nameEn: 'Bowl', nameTa: 'கிண்ணம்' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Spoon', nameEn: 'Spoon', nameTa: 'கரண்டி' },
  { categoryNameEn: 'Silver', subCategoryNameEn: 'Lamp', nameEn: 'Lamp', nameTa: 'விளக்கு' }

];

function norm(name: string) {
  return name.trim().toLowerCase();
}

function subCategoryKey(commodityTypeId: number, nameEn: string) {
  return `${commodityTypeId}:${norm(nameEn)}`;
}

function subItemKey(commodityTypeId: number, subCategoryId: number, nameEn: string) {
  return `${commodityTypeId}:${subCategoryId}:${norm(nameEn)}`;
}

/** Read current master rows from DB (source of truth when data already exists). */
async function readMastersFromDb(prisma: PrismaClient) {
  const [categories, subCategories, subItems] = await Promise.all([
    prisma.commodityMainCategory.findMany({ where: { isDeleted: false }, orderBy: { id: 'asc' } }),
    prisma.commoditySubCategory.findMany({
      where: { isDeleted: false },
      include: { commodityType: true },
      orderBy: { id: 'asc' },
    }),
    prisma.commoditySubItem.findMany({
      where: { isDeleted: false },
      include: { commodityType: true, subCategory: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  if (categories.length === 0) return null;

  return {
    categories: categories.map((c) => ({
      nameEn: c.nameEn,
      nameTa: c.nameTa,
      status: c.status,
    })),
    subCategories: subCategories.map((s) => ({
      categoryNameEn: s.commodityType.nameEn,
      nameEn: s.nameEn,
      nameTa: s.nameTa,
      status: s.status,
    })),
    subItems: subItems.map((i) => ({
      categoryNameEn: i.commodityType.nameEn,
      subCategoryNameEn: i.subCategory.nameEn,
      nameEn: i.nameEn,
      nameTa: i.nameTa,
      status: i.status,
    })),
  };
}

async function upsertCategory(prisma: PrismaClient, seed: CategorySeed) {
  const existing = await prisma.commodityMainCategory.findFirst({
    where: { nameEn: { equals: seed.nameEn, mode: 'insensitive' }, isDeleted: false },
  });

  if (existing) {
    return prisma.commodityMainCategory.update({
      where: { id: existing.id },
      data: { nameTa: seed.nameTa, status: seed.status ?? existing.status },
    });
  }

  return prisma.commodityMainCategory.create({
    data: {
      nameEn: seed.nameEn.trim(),
      nameTa: seed.nameTa.trim(),
      status: seed.status ?? true,
    },
  });
}

async function upsertSubCategory(
  prisma: PrismaClient,
  commodityTypeId: number,
  seed: SubCategorySeed
) {
  const existing = await prisma.commoditySubCategory.findFirst({
    where: {
      commodityTypeId,
      nameEn: { equals: seed.nameEn, mode: 'insensitive' },
      isDeleted: false,
    },
  });

  if (existing) {
    return prisma.commoditySubCategory.update({
      where: { id: existing.id },
      data: { nameTa: seed.nameTa, status: seed.status ?? existing.status },
    });
  }

  return prisma.commoditySubCategory.create({
    data: {
      commodityTypeId,
      nameEn: seed.nameEn.trim(),
      nameTa: seed.nameTa.trim(),
      status: seed.status ?? true,
    },
  });
}

async function upsertSubItem(
  prisma: PrismaClient,
  commodityTypeId: number,
  subCategoryId: number,
  seed: SubItemSeed
) {
  const existing = await prisma.commoditySubItem.findFirst({
    where: {
      commodityTypeId,
      subCategoryId,
      nameEn: { equals: seed.nameEn, mode: 'insensitive' },
      isDeleted: false,
    },
  });

  if (existing) {
    return prisma.commoditySubItem.update({
      where: { id: existing.id },
      data: { nameTa: seed.nameTa, status: seed.status ?? existing.status },
    });
  }

  return prisma.commoditySubItem.create({
    data: {
      commodityTypeId,
      subCategoryId,
      nameEn: seed.nameEn.trim(),
      nameTa: seed.nameTa.trim(),
      status: seed.status ?? true,
    },
  });
}

/**
 * Seed commodity main / sub category / sub item masters from existing DB rows,
 * or default bilingual data when tables are empty. Never sets explicit IDs.
 */
export async function seedCommodityMasters(
  prisma: PrismaClient
): Promise<CommodityMasterSeedResult> {
  const fromDb = await readMastersFromDb(prisma);

  const categories = fromDb?.categories ?? DEFAULT_CATEGORIES;
  const subCategories = fromDb?.subCategories ?? DEFAULT_SUB_CATEGORIES;
  const subItems = fromDb?.subItems ?? DEFAULT_SUB_ITEMS;

  const categoriesByNameEn = new Map<string, { id: number; nameEn: string }>();
  const subCategoriesByKey = new Map<
    string,
    { id: number; commodityTypeId: number; nameEn: string }
  >();
  const subItemsByKey = new Map<
    string,
    { id: bigint; commodityTypeId: number; subCategoryId: number; nameEn: string }
  >();

  for (const cat of categories) {
    const row = await upsertCategory(prisma, cat);
    categoriesByNameEn.set(norm(row.nameEn), { id: row.id, nameEn: row.nameEn });
  }

  for (const sub of subCategories) {
    const cat = categoriesByNameEn.get(norm(sub.categoryNameEn));
    if (!cat) {
      console.warn(`Skipping sub-category "${sub.nameEn}": category "${sub.categoryNameEn}" not found`);
      continue;
    }
    const row = await upsertSubCategory(prisma, cat.id, sub);
    subCategoriesByKey.set(subCategoryKey(row.commodityTypeId, row.nameEn), {
      id: row.id,
      commodityTypeId: row.commodityTypeId,
      nameEn: row.nameEn,
    });
  }

  for (const item of subItems) {
    const cat = categoriesByNameEn.get(norm(item.categoryNameEn));
    if (!cat) {
      console.warn(`Skipping sub-item "${item.nameEn}": category "${item.categoryNameEn}" not found`);
      continue;
    }
    const sub = subCategoriesByKey.get(subCategoryKey(cat.id, item.subCategoryNameEn));
    if (!sub) {
      console.warn(
        `Skipping sub-item "${item.nameEn}": sub-category "${item.subCategoryNameEn}" not found`
      );
      continue;
    }
    const row = await upsertSubItem(prisma, cat.id, sub.id, item);
    subItemsByKey.set(subItemKey(row.commodityTypeId, row.subCategoryId, row.nameEn), {
      id: row.id,
      commodityTypeId: row.commodityTypeId,
      subCategoryId: row.subCategoryId,
      nameEn: row.nameEn,
    });
  }

  await resetMasterSequences();

  const source = fromDb ? 'existing database' : 'default templates';
  console.log(
    `Commodity masters seeded from ${source}: ${categoriesByNameEn.size} categories, ${subCategoriesByKey.size} sub-categories, ${subItemsByKey.size} sub-items`
  );

  return { categoriesByNameEn, subCategoriesByKey, subItemsByKey };
}

/** Run standalone: npm run db:seed-masters */
async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { refreshCommodityIdCache } = await import('../src/lib/interest.js');
  const prisma = new PrismaClient();
  try {
    await seedCommodityMasters(prisma);
    await refreshCommodityIdCache();
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seed-commodity-masters.ts');
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
