import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { refreshCommodityIdCache } from '../src/lib/interest.js';
import { seedInterestSlabsForBranch } from '../src/lib/interest-slabs.js';
import { seedCommodityMasters, type CommodityMasterSeedResult } from './seed-commodity-masters.js';

const prisma = new PrismaClient();

async function seedOrganization() {
  await prisma.organizationSettings.upsert({
    where: { id: 1 },
    update: {
      companyName: 'Kabilan Pawn Shop',
      proprietor: 'Prop.: M. Kabilan, M.E.,',
    },
    create: {
      id: 1,
      companyName: 'Kabilan Pawn Shop',
      proprietor: 'Prop.: M. Kabilan, M.E.,',
    },
  });
}

async function seedBranch() {
  await prisma.branch.upsert({
    where: { id: 1 },
    update: {
      name: 'Main',
      address: 'Nagai kadai Pazar, Nadar New Street Usilampatti.',
      landline: '04552 - 250369',
      phone: '94867-12212',
      whatsapp: '94867-12212',
    },
    create: {
      id: 1,
      code: 'MAIN',
      name: 'Main',
      address: 'Nagai kadai Pazar, Nadar New Street Usilampatti.',
      landline: '04552 - 250369',
      phone: '94867-12212',
      whatsapp: '94867-12212',
    },
  });
  await prisma.branch.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, code: 'NORTH', name: 'North Branch' },
  });
}

async function seedMasters(commodityMasters: CommodityMasterSeedResult) {
  const gold = commodityMasters.categoriesByNameEn.get('gold');
  const silver = commodityMasters.categoriesByNameEn.get('silver');

  await prisma.purity.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nameTamil: 'KDM 916', nameEng: 'KDM 916' },
  });
  await prisma.purity.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nameTamil: 'Ordinary', nameEng: 'Ordinary' },
  });
  await prisma.purity.upsert({
    where: { id: 3 },
    update: { nameTamil: 'Hallmark', nameEng: 'Hallmark' },
    create: { id: 3, nameTamil: 'Hallmark', nameEng: 'Hallmark' },
  });
  await prisma.purity.upsert({
    where: { id: 4 },
    update: { nameTamil: 'பொருந்தாது', nameEng: 'N/A' },
    create: { id: 4, nameTamil: 'பொருந்தாது', nameEng: 'N/A' },
  });

  await prisma.loanCondition.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nameEn: 'Personal', nameTn: 'Personal' },
  });
  await prisma.loanCondition.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nameEn: 'General', nameTn: 'General' },
  });

  await prisma.loanCustomerType.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nameEn: 'General', nameTn: 'General customer' },
  });
  await prisma.loanCustomerType.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nameEn: 'Other shop', nameTn: 'Other shop' },
  });

  if (gold && silver) {
    for (const branchId of [1, 2]) {
      await seedInterestSlabsForBranch(branchId);
    }
  }
}

async function seedCustomersAndLoan(commodityMasters: CommodityMasterSeedResult) {
  let customer = await prisma.customer.findFirst({ where: { customerId: 1000n } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        customerId: 1000n,
        name: 'Ramesh Kumar',
        fatherHusbandName: 'Suresh Kumar',
        address1: '12 MG Road',
        mobileNo: '9876543210',
        city: 'Chennai',
        state: 'Tamil Nadu',
        createdBy: 1n,
        updatedBy: 1n,
      },
    });
  }

  const gold = commodityMasters.categoriesByNameEn.get('gold');
  const chainSub = gold
    ? commodityMasters.subCategoriesByKey.get(`${gold.id}:chain`)
    : undefined;
  const chainItem =
    gold && chainSub
      ? commodityMasters.subItemsByKey.get(`${gold.id}:${chainSub.id}:chain`)
      : undefined;

  const existingLoan = await prisma.loan.findFirst({
    where: { branchId: 1, invoiceNo: 50001n },
  });
  if (!existingLoan && gold && chainSub && chainItem) {
    const loanDate = new Date();
    loanDate.setHours(0, 0, 0, 0);
    const renewalDate = new Date(loanDate);
    renewalDate.setMonth(renewalDate.getMonth() + 12);

    await prisma.loan.create({
      data: {
        customerId: customer.id,
        invoiceNo: 50001n,
        loanDate,
        loanCondition: 2,
        loanCustomerType: 1,
        commodityTypeId: gold.id,
        netWeightGold: 8.5,
        loanAmount: 10000,
        loanAmountWords: 'Ten thousand Rupees only',
        interest: 2.5,
        renewalDate,
        branchId: 1,
        createdBy: 1n,
        updatedBy: 1n,
        items: {
          create: [
            {
              itemId: chainItem.id,
              subCategoryId: chainSub.id,
              purityId: 1,
              noOfItems: 1,
              netWeight: 8.5,
            },
          ],
        },
      },
    });
  }
}

async function seedUsers() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@pawn.local' },
    update: {},
    create: {
      email: 'admin@pawn.local',
      passwordHash: hash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      preferredLanguage: 'en',
    },
  });
  const mgrHash = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@pawn.local' },
    update: {},
    create: {
      email: 'manager@pawn.local',
      passwordHash: mgrHash,
      name: 'Branch Manager',
      role: 'BRANCH_MANAGER',
      branchId: 1,
      preferredLanguage: 'ta',
    },
  });
  const mgr2Hash = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager2@pawn.local' },
    update: {},
    create: {
      email: 'manager2@pawn.local',
      passwordHash: mgr2Hash,
      name: 'North Branch Manager',
      role: 'BRANCH_MANAGER',
      branchId: 2,
      preferredLanguage: 'en',
    },
  });
}

async function seedGlAccounts() {
  const accounts = [
    { code: '1000', nameEn: 'Cash', nameTa: 'பணம்', accountType: 'asset' },
    { code: '1100', nameEn: 'Loans Receivable', nameTa: 'கடன் பெறத்தக்கது', accountType: 'asset' },
    { code: '2100', nameEn: 'Customer Payable', nameTa: 'வாடிக்கையாளர் செலுத்தவேண்டியது', accountType: 'liability' },
    { code: '3000', nameEn: 'Owner Capital', nameTa: 'உரிமையாளர் மூலதனம்', accountType: 'equity' },
    { code: '4000', nameEn: 'Interest Income', nameTa: 'வட்டி வருமானம்', accountType: 'income' },
    { code: '4100', nameEn: 'Penalties Income', nameTa: 'அபராத வருமானம்', accountType: 'income' },
    { code: '4200', nameEn: 'Auction Charges Income', nameTa: 'விற்பனை கட்டண வருமானம்', accountType: 'income' },
    { code: '5000', nameEn: 'Interest Expense', nameTa: 'வட்டி செலவு', accountType: 'expense' },
  ];
  for (const branchId of [1, 2]) {
    for (const a of accounts) {
      await prisma.glAccount.upsert({
        where: { branchId_code: { branchId, code: a.code } },
        update: {},
        create: { branchId, ...a },
      });
    }
  }
}

async function seedNotificationTemplates() {
  const templates = [
    {
      key: 'renewal_due',
      channel: 'sms',
      bodyEn:
        'Hi {customer_name}, your loan {loan_id} is due on {due_date}. Amount: ₹{amount}. Visit {branch_name}.',
      bodyTa:
        '{customer_name}, உங்கள் கடன் {loan_id} {due_date} இல் அவசியம். தொகை: ₹{amount}. {branch_name}.',
    },
    {
      key: 'auction_notice',
      channel: 'sms',
      bodyEn:
        'LEGAL NOTICE: Your pledged item will be auctioned on {auction_date} at {branch_name}. Redeem by paying ₹{amount} before {redemption_date}.',
      bodyTa:
        'சட்ட அறிவிப்பு: உங்கள் பொருள் {auction_date} இல் {branch_name}இல் விற்கப்படும். ₹{amount} செலுத்தி {redemption_date}க்கு முன் மீட்டெடுக்கவும்.',
    },
    {
      key: 'auction_refund',
      channel: 'sms',
      bodyEn:
        'Your item was auctioned. Sale: ₹{sale_amount}. Refund due: ₹{refund_amount}. Visit {branch_name}.',
      bodyTa:
        'உங்கள் பொருள் விற்கப்பட்டது. விற்பனை: ₹{sale_amount}. திரும்பப் பெற: ₹{refund_amount}. {branch_name} வருக.',
    },
  ];
  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    });
  }
}

async function main() {
  await seedOrganization();
  await seedBranch();
  const commodityMasters = await seedCommodityMasters(prisma);
  await refreshCommodityIdCache();
  await seedMasters(commodityMasters);
  await seedUsers();
  await seedGlAccounts();
  await seedNotificationTemplates();
  await seedCustomersAndLoan(commodityMasters);
  console.log('Seed completed (admin@pawn.local / admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
